import { OwnershipGraph } from './ownershipEngine';

export type TransactionType = 'EXPENSE' | 'INTERNAL_TRANSFER' | 'DISTRIBUTION';

export interface FinancialTransaction {
    id: string;
    type: TransactionType;
    from_entity_id: string;
    to_entity_id: string | null;
    amount: number;
    timestamp: string;
    bucket_id?: string;
    reference_id?: string;
    ownership_snapshot?: number;
}

export interface LedgerEntry {
    id: string;
    transaction_id: string;
    reference_id?: string;
    entity_id: string;
    ledger_type: 'INCOME' | 'EXPENSE' | 'DISTRIBUTION_OUT' | 'DISTRIBUTION_IN';
    amount: number;
    timestamp: string;
}

export class TransactionEngine {
    private transactions: Map<string, FinancialTransaction> = new Map();
    private ledger: LedgerEntry[] = [];
    private ownershipEngine: OwnershipGraph;

    constructor(ownershipEngine: OwnershipGraph) {
        this.ownershipEngine = ownershipEngine;
    }

    /**
     * Executes a transaction in the system, rigorously validating it and applying 
     * double-entry-like logical ledger entries to maintain exact system consistency.
     */
    public executeTransaction(txInput: Partial<FinancialTransaction>): FinancialTransaction {
        // 1. Strict Request Validation
        this.validateInput(txInput);

        const tx: FinancialTransaction = {
            id: txInput.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: txInput.type as TransactionType,
            from_entity_id: txInput.from_entity_id!,
            to_entity_id: txInput.to_entity_id || null,
            amount: txInput.amount!,
            timestamp: txInput.timestamp || new Date().toISOString(),
            bucket_id: txInput.bucket_id,
            reference_id: txInput.reference_id || `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        // 2. Behavior Application & Ledger Generation
        switch (tx.type) {
            case 'EXPENSE':
                this.handleExpense(tx);
                break;
            case 'INTERNAL_TRANSFER':
                this.handleInternalTransfer(tx);
                break;
            case 'DISTRIBUTION':
                this.handleDistribution(tx);
                break;
            default:
                throw new Error("Invalid transaction type");
        }

        // 3. Commit Transaction
        this.transactions.set(tx.id, tx);
        return tx;
    }

    private validateInput(tx: Partial<FinancialTransaction>) {
        if (!tx.type) throw new Error("Missing transaction type");
        if (!tx.from_entity_id) throw new Error("Missing from_entity_id");
        if (tx.amount === undefined || tx.amount <= 0) throw new Error("Negative or zero amount");

        if (tx.type === 'EXPENSE') {
            if (tx.to_entity_id) throw new Error("INVALID CASE: EXPENSE with to_entity_id is not allowed. Operational expenses must leave the system.");
        }

        if (tx.type === 'INTERNAL_TRANSFER') {
            if (!tx.to_entity_id) throw new Error("INVALID CASE: INTERNAL_TRANSFER must have a to_entity_id.");
            if (tx.from_entity_id === tx.to_entity_id) throw new Error("INVALID CASE: INTERNAL_TRANSFER sender and receiver cannot be the same entity.");
            // Internal Transfers do not increase wealth, they are strictly zero-sum in the ledger.
        }

        if (tx.type === 'DISTRIBUTION') {
            if (!tx.to_entity_id) throw new Error("INVALID CASE: DISTRIBUTION must have a to_entity_id.");
            if (tx.from_entity_id === tx.to_entity_id) throw new Error("INVALID CASE: DISTRIBUTION sender and receiver cannot be the same.");
            
            // Check Ownership Link (Receiver must own the Sender, directly or indirectly)
            // parent_entity_id = owner (receiver), child_entity_id = holding (sender)
            const owners = this.ownershipEngine.getAllOwnersForEntity(tx.from_entity_id);
            if (!owners[tx.to_entity_id]) {
                throw new Error("INVALID CASE: DISTRIBUTION without ownership link. Distributions can only flow upward to owners.");
            }
        }
    }

    private handleExpense(tx: FinancialTransaction) {
        // Operational expense - reduces profit of sender, no income generated
        this.ledger.push({
            id: `le_exp_${tx.id}`,
            transaction_id: tx.id,
            reference_id: tx.reference_id,
            entity_id: tx.from_entity_id,
            ledger_type: 'EXPENSE',
            amount: tx.amount,
            timestamp: tx.timestamp
        });
    }

    private handleInternalTransfer(tx: FinancialTransaction) {
        // Creates ONE logical transfer that behaves as:
        // -> EXPENSE in sender
        // -> INCOME in receiver
        // Sharing the same reference_id ensures perfectly matched zero-sum operation
        
        // Sender Side
        this.ledger.push({
            id: `le_snd_${tx.id}`,
            transaction_id: tx.id,
            reference_id: tx.reference_id,
            entity_id: tx.from_entity_id,
            ledger_type: 'EXPENSE',
            amount: tx.amount,
            timestamp: tx.timestamp
        });

        // Receiver Side
        this.ledger.push({
            id: `le_rcv_${tx.id}`,
            transaction_id: tx.id,
            reference_id: tx.reference_id,
            entity_id: tx.to_entity_id!,
            ledger_type: 'INCOME',
            amount: tx.amount,
            timestamp: tx.timestamp
        });
    }

    private handleDistribution(tx: FinancialTransaction) {
        // Profit flow to owner
        // Behavior: Does NOT act as an operational expense (doesn't hurt EBITDA), reduces retained earnings
        // Increases income for receiving entity
        
        // Sender Side (Retained earnings reduction)
        this.ledger.push({
            id: `le_dist_out_${tx.id}`,
            transaction_id: tx.id,
            reference_id: tx.reference_id,
            entity_id: tx.from_entity_id,
            ledger_type: 'DISTRIBUTION_OUT',
            amount: tx.amount,
            timestamp: tx.timestamp
        });

        // Receiver Side (Income)
        this.ledger.push({
            id: `le_dist_in_${tx.id}`,
            transaction_id: tx.id,
            reference_id: tx.reference_id,
            entity_id: tx.to_entity_id!,
            ledger_type: 'DISTRIBUTION_IN',
            amount: tx.amount,
            timestamp: tx.timestamp
        });
    }

    public getLedger() {
        return this.ledger;
    }

    public getLedgerForEntity(entityId: string) {
        return this.ledger.filter(l => l.entity_id === entityId);
    }
    
    public getTransactions() {
        return Array.from(this.transactions.values());
    }

    public verifySystemIntegrity(): boolean {
        // Verify that Internal Transfers are perfectly balanced (zero-sum)
        const transfers = Array.from(this.transactions.values()).filter(t => t.type === 'INTERNAL_TRANSFER');
        for (const tx of transfers) {
            const relatedEntries = this.ledger.filter(l => l.reference_id === tx.reference_id);
            if (relatedEntries.length !== 2) return false;
            
            const expense = relatedEntries.find(l => l.ledger_type === 'EXPENSE');
            const income = relatedEntries.find(l => l.ledger_type === 'INCOME');
            
            if (!expense || !income) return false;
            if (expense.amount !== income.amount) return false;
            if (expense.amount !== tx.amount) return false;
        }
        return true;
    }
}
