
export interface Entry {
  id: string;
  profileId: string; // 'personal' or business ID
  date: string; // YYYY-MM-DD for grouping
  time?: string; // HH:mm exact time matching bank info
  timestamp: string; // ISO String for precise tracking
  description: string;
  amount: number; // For transfers, this is positive amount in entity's currency
  baseAmount?: number; // REQUIRED for transfers: the absolute value in the base (source) currency
  baseCurrency?: string; // REQUIRED for transfers: the currency of the baseAmount
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out' | 'profit_allocation';
  subtype?: 'STANDARD' | 'INTERNAL_TRANSFER' | 'DISTRIBUTION' | 'BAD_DEBT';
  transfer_id?: string;
  from_entity_id?: string;
  to_entity_id?: string;
  isLoanTransaction?: boolean;
  internalLoanId?: string;
  ownership_snapshot?: number;
  bucketAdjustments?: { name: string, amount: number }[];
  distributionBreakdown?: Record<string, number>;
  category: string;
  isDirectAllocation?: boolean; // If true, adds directly to bucket instead of splitting
  isRecurring?: boolean; // Deprecated or kept for backwards compatibility
  frequency?: string; // 'one_time' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'yearly' | 'custom' | `custom:${number}:${string}`;
  status?: 'active' | 'paused' | 'stopped';
  incomeSourceType?: 'SALARY' | 'BUSINESS_DISTRIBUTION' | 'ASSET_INCOME' | 'OTHER';
  hoursWorked: number; 
  affectsCashflow?: boolean;
  affectsIncome?: boolean;
  actorId?: string;
  actorName?: string;
  actorRole?: 'Founder' | 'Team' | 'External';
  submittedBy?: string; // ID of the team member who added this
  linkedGoalId?: string; // Links this expense to a specific goal completion
  originalAmount?: number;
  originalCurrency?: string;
}

export interface PendingEntry extends Omit<Entry, 'id'> {
  id: string;
  status: 'pending';
  submittedAt: string;
  submittedBy: string; // Name or ID of staff
  submittedByName: string;
}

export interface MonthlyRecord {
    id: string;
    date: string; // YYYY-MM-DD (Specific day)
    monthStr: string; // YYYY-MM (Grouping Key)
    income: number;
    otherIncome: number;
    expenses: number;
    hoursWorked: number;
    notes?: string;
    timestamp: string;
}

export interface ValuationData {
    lastUpdated: string;
    monthlyRecords: MonthlyRecord[];
    
    // Calculated Metrics
    weightedAvgProfit: number;
    annualizedProfit: number;
    
    // Scores (0-10)
    stabilityScore: number;
    growthScore: number;
    dependencyScore: number;
    
    // Valuation
    baseMultiplier: number;
    adjustedMultiplier: number;
    calculatedValue: number;
    confidenceScore: number; // 0-100%
}

export interface Asset {
  id: string;
  profileId: string;
  date: string; // Date Acquired
  timestamp?: string; // Last Updated
  description: string;
  
  // Value Tracking
  initialAmount: number; // Purchase Price / Original Loan Amount
  amount: number; // Current Market Value / Current Outstanding Balance
  
  type: 'asset' | 'liability' | 'business_equity'; 
  assetClass?: string; // Unified "Sector"
  
  monthlyIncome?: number; // Cashflow produced (Assets only)
  
  // Liability Specifics (Optional)
  interestRate?: number; // Annual Interest Rate %
  rateIsAnnual?: boolean; // Whether the interest rate is annual or total per term
  repaymentTerm?: 'Monthly' | 'Quarterly' | 'Yearly' | 'One-Time';
  monthlyPayment?: number; // Calculated debt service
  
  // Term-Aware Loan Tracker
  termType?: 'one_time' | 'monthly' | 'yearly';
  paymentFrequency?: 'monthly' | 'yearly';
  termMonths?: number;
  principalPaid?: number;
  interestPaid?: number;
  loanStatus?: 'active' | 'completed' | 'overdue';
  
  // Enhanced Liability Data
  termValue?: number;
  termUnit?: string; // 'Months' | 'Years' | 'One-Time'
  repaymentDate?: string;
  nextDueDate?: string; // Tracks the specific date of the next payment
  linkedAssetId?: string; // For identifying "Good Debt"
  autoRepayBucketId?: string; // The bucket id to auto-deduct funds from for this liability

  isAutomated?: boolean; 
  assetClassMetadata?: string; 
  originalCurrency?: string;
  originalAmount?: number;

  // Asset specifically used for True Net Worth calculation when producing income
  isIncomeProducing?: boolean;

  internalLoanId?: string; // Links the sender asset and receiver liability
  counterpartyId?: string; // The other entity involved
  agreementStatus?: 'pending' | 'signed' | 'completed';
  agreementReason?: string;
  agreementSignedAt?: string;

  // NEW: Valuation Engine Data
  valuationData?: ValuationData;
  status?: 'active' | 'terminated';
}

export interface Investment {
  id: string;
  profileId: string;
  name: string;
  type: 'Stock' | 'Crypto' | 'Real Estate' | 'Bond' | 'ETF' | 'Business' | 'Other';
  initialValue: number;
  currentValue: number;
  monthlyPassiveIncome: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  dateAcquired: string;
  timestamp?: string; // Added
  isAutomated?: boolean; 
  originalInitialValue?: number;
  originalCurrentValue?: number;
  originalPassiveIncome?: number;
  originalCurrency?: string;
}

export interface Goal {
  id: string;
  profileId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: 'Savings' | 'Debt Payoff' | 'Investment' | 'Purchase' | 'Other';
  linkedAllocationId?: string; 
  notes?: string;
  isAchieved?: boolean;
  originalTargetAmount?: number;
  originalCurrentAmount?: number;
  originalCurrency?: string;
}

export interface AllocationCategory {
  id: string;
  profileId: string;
  name: string;
  percentage: number;
  balance: number;
  parentId?: string;
  originalBalance?: number;
  originalCurrency?: string;
}

// THE B-I TRIANGLE: 8 Integrities of a Business
export interface BITriangle {
    mission: number; // 0-10: Clarity of spiritual/corporate mission
    leadership: number; // 0-10: Ability to lead, not just do
    team: number; // 0-10: Quality of specialists (CPA, Attorney, etc.)
    cashflow: number; // 0-10: Management of cash cycle
    communications: number; // 0-10: Sales and internal comms
    systems: number; // 0-10: SOPs, Automation, Manufacturing
    legal: number; // 0-10: IP, Contracts, Entity protection
    product: number; // 0-10: The actual good/service (least important)
}

export type AccessLevel = 'admin' | 'partner' | 'finance_staff' | 'viewer';

export interface TeamMember {
  id: string;
  businessId: string;
  name: string;
  roleTitle: string; // e.g., "CFO", "Sales Rep"
  accessLevel: AccessLevel;
  accessLink?: string; // Simulated secure link
}

export interface BusinessEntity {
  id: string;
  name: string;
  logo?: string; // Business logo image URL or base64 data URL
  avatar?: string; // Optional alias for logo
  industry: string;
  currency: string;
  ownershipStake: number; // Percentage owned by the personal profile (0-100)
  // Deep Dive for AI
  employeeCount: number;
  hasSystems: boolean; 
  entityType: 'Sole Prop' | 'Partnership' | 'LLC' | 'Corp'; 
  weeklyHours: number; // Owner effort
  biTriangle: BITriangle;
  // Targets
  revenueTarget?: number; // Annual Revenue Goal
  profitTarget?: number; // Annual Profit Goal
  monthlyRevenueTarget?: number; // NEW: Monthly Target
  monthlyProfitTarget?: number; // NEW: Monthly Target
  originalRevenueTarget?: number;
  originalProfitTarget?: number;
  originalMonthlyRevenueTarget?: number;
  originalMonthlyProfitTarget?: number;
  originalCurrency?: string;
  // Team & Workflow
  teamMembers?: TeamMember[];
  pendingEntries?: PendingEntry[];
}

export interface Notification {
  id: string;
  profileId: string;
  date: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  actionLink?: string; // e.g., "goals", "settings", "assets"
  read: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  options?: { label: string; path: string }[];
  predictedQuestions?: { label: string; query: string }[];
}

export interface ChatSession {
  id: string;
  title: string;
  profileId: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  advisorState?: any; // Generic for deterministic engine state
}

export interface UserProfile {
  name: string;
  avatar?: string; // Profile picture image URL or base64 data URL
  photoUrl?: string; // Optional alias for avatar
  dob: string; 
  occupation: string;
  dream: string;
  currency: string;
  freedomTarget: number;
  originalFreedomTarget?: number;
  originalCurrency?: string;
  // Deep Dive
  weeklyWorkHours: number;
  financialKnowledge: 'Beginner' | 'Intermediate' | 'Advanced';
  syncKey?: string;
  role?: AccessLevel;
  pendingEntries?: PendingEntry[];
}

export interface CategoryDef {
    name: string;
    multiplier: number;
}

export interface Entity {
  id: string;
  name: string;
  type: string; // 'PERSON', 'BUSINESS'
  metadata?: any;
}

export interface OwnershipEdge {
  id: string;
  parent_entity_id: string;
  child_entity_id: string;
  percentage: number;
}

export interface DistributionMeta {
  frequency: 'one_time' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'yearly';
  isRecurring: boolean;
  time?: string;
  lastExecutedAt?: string;
  autoDistribute?: boolean;
  sequenceId?: string; // Links recurring instances together
  targetAmount?: number;
  sourceBucket?: string;
  targetDescription?: string;
  actorRole?: string;
  isActive?: boolean;
}

export interface DistributionRecord {
  id: string;
  businessId: string;
  distributionId: string;
  recipientId: string;
  amount: number;
  status: 'pending_claim' | 'claimed';
  timestamp?: string;
  token?: string;
  meta?: DistributionMeta;
  frequency?: 'one_time' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'yearly' | 'custom';
}

export interface RecurringIncomeRecord {
  id: string;
  profileId: string;
  name: string;
  amount: number;
  frequency: string;
  startDate: string;
  isActive: boolean;
  autoLog: boolean;
  category: string;
  assetId?: string; // Optional link to an asset
}

export interface AppData {
  profile: UserProfile;
  businesses: BusinessEntity[];
  entities?: Entity[];         // NEW flexible layer
  ownershipEdges?: OwnershipEdge[]; // NEW graph layer
  entries: Entry[];
  assets: Asset[];
  investments: Investment[];
  goals: Goal[];
  allocations: AllocationCategory[];
  notifications: Notification[];
  chatSessions: ChatSession[];
  customCategories?: CategoryDef[]; // New: Store custom asset categories
  distributionRecords?: DistributionRecord[]; // NEW: Track distribution claims
  recurringIncomeRecords?: RecurringIncomeRecord[]; // Track recurring income models
}

import { 
  WORLD_CURRENCIES, 
  WORLD_CURRENCY_SYMBOLS, 
  WORLD_CURRENCY_RATES, 
  getExchangeRate as getServiceExchangeRate, 
  convertCurrency as convertServiceCurrency,
  CurrencyInfo 
} from './services/currencyService';

export { WORLD_CURRENCIES, type CurrencyInfo };

// --- CONSTANTS ---

export const CURRENCY_SYMBOLS: Record<string, string> = WORLD_CURRENCY_SYMBOLS;

export const DEFAULT_ALLOCATIONS = [
  { name: 'Uncategorized', percentage: 0 },
  { name: 'Necessities', percentage: 50 },
  { name: 'Savings', percentage: 10 },
  { name: 'Investments', percentage: 20 },
  { name: 'Education', percentage: 10 },
  { name: 'Play', percentage: 10 },
];

export const DEFAULT_BUSINESS_ALLOCATIONS = [
    { name: 'Uncategorized', percentage: 0 },
    { name: 'Operations (OpEx)', percentage: 40 },
    { name: 'Taxes', percentage: 30 },
    { name: 'Profit Account', percentage: 20 },
    { name: 'Owner Pay', percentage: 10 },
];

// 2026 BASE MULTIPLIERS (Monthly Net Profit Basis)
// Split by Context: Business vs Personal Asset
export const BUSINESS_SECTORS: Record<string, number> = {
    'SaaS (B2B High Growth)': 100, // ~8.3x Annual
    'SaaS (B2C / Stable)': 50,     // ~4.1x Annual
    'E-commerce (Brand)': 40,      // ~3.3x Annual
    'E-commerce (Dropship)': 20,   // ~1.6x Annual (Risk)
    'Digital Agency': 30,          // ~2.5x Annual
    'Content/YouTube': 32,         // ~2.6x Annual
    'Newsletter/Media': 40,        // ~3.3x Annual
    'Mobile App (Sub)': 50,        // ~4.1x Annual
    'Manufacturing': 42,           // ~3.5x Annual
    'Logistics/3PL': 40,           // ~3.3x Annual
    'Trades/Construction': 28,     // ~2.3x Annual
    'Retail (Physical)': 24,       // ~2x Annual
    'Restaurant/Cafe': 24,         // ~2x Annual
    'Professional Svcs': 30,       // ~2.5x Annual
    'Consulting/Coach': 24,        // ~2x Annual
    'Healthcare/Med': 48,          // ~4x Annual
    'Franchise (Food)': 36,        // ~3x Annual
    'Other Business': 30
};

export const PERSONAL_SECTORS: Record<string, number> = {
    'Real Estate (Rental)': 150, // ~12.5x Annual (e.g., 8% Cap Rate)
    'Real Estate (Comm.)': 180,  // ~15x Annual (Lower cap rate, higher stability)
    'Real Estate (Land)': 120,   // ~10x Annual (Speculative)
    'Stocks/ETFs': 25,           // ~25 P/E Ratio (Market Standard)
    'Crypto (Blue Chip)': 15,    // High risk, lower earnings multiple typically
    'Crypto (Altcoin)': 8,       // Very High risk
    'Private Equity': 10,        // Illiquidity Discount
    'Side Hustle': 24,           // ~2x Annual Cashflow
    'Commodities (Gold)': 20,    // Proxy multiplier for long term hold
    'Luxury Watches': 12,        // ~1x Annual (Retains value)
    'Collectibles': 12,          // ~1x Annual
    'Vehicles (Classic)': 10,    // ~0.8x Annual
    'Equipment/Tools': 5,        // Depreciating asset
    'Cash/Savings': 1,           // 1x Face Value
    'IP/Royalties': 48,          // ~4x Annual (Royalties are valuable)
    'Other Personal': 10
};

export const DEFAULT_DATA: AppData = {
  profile: {
    name: 'Guest User',
    dob: '1995-01-01',
    occupation: 'Freedom Seeker',
    dream: 'Retire Young, Retire Rich',
    currency: 'USD',
    freedomTarget: 10000,
    weeklyWorkHours: 40,
    financialKnowledge: 'Beginner'
  },
  businesses: [],
  entries: [],
  assets: [],
  investments: [],
  goals: [],
  allocations: DEFAULT_ALLOCATIONS.map((a, i) => ({ ...a, id: i.toString(), balance: 0, profileId: 'personal' })),
  notifications: [],
  chatSessions: [],
  customCategories: []
};

// --- DEMO BUSINESS FOR WALKTHROUGH ---
export const DEMO_BUSINESS: BusinessEntity = {
    id: 'demo_guest_biz',
    name: 'Guest Inc. (Demo)',
    industry: 'Technology',
    currency: 'USD',
    ownershipStake: 100,
    employeeCount: 5,
    hasSystems: true,
    entityType: 'LLC',
    weeklyHours: 15,
    biTriangle: { mission: 8, leadership: 7, team: 6, cashflow: 8, communications: 5, systems: 8, legal: 4, product: 9 },
    revenueTarget: 1000000,
    profitTarget: 250000,
    monthlyRevenueTarget: 85000,
    monthlyProfitTarget: 20000,
    teamMembers: [],
    pendingEntries: []
};

export interface StructuralVariables {
    founderDependence: number;
    systemization: number;
    delegation: number;
    processMaturity: number;
    scalability: number;
    risk: number;
    strategicAlignment: number;
}

export const calculateStructuralVariables = (tr: any): StructuralVariables => {
    const sys = tr.systems ?? 5;
    const tm = tr.team ?? 5;
    const ldr = tr.leadership ?? 5;
    const com = tr.communications ?? 5;
    const leg = tr.legal ?? 5;
    const msn = tr.mission ?? 5;
    const prd = tr.product ?? 5;
    const csh = tr.cashflow ?? 5;

    const systemization = sys;
    const delegation = tm;
    const founderDependence = Math.max(0, 10 - ldr); // Leadership increases -> dependence decreases? The prompt says "Leadership up -> founder dependence down". Wait, actually usually founder dependence is inversely correlated with team and systems too, but let's follow the prompt exactly: `Leadership ↑ → Founder Dependence ↓` and `Team ↑ → Delegation ↑` and `Systems ↑ → Systemization ↑`.
    
    // We can make Founder Dependence a combination of Leadership, Team, and Systems.
    // If you have high leadership, you empower others. If you have high team, you delegate. If you have systems, you don't need to be there.
    const founderDep = 10 - ((ldr + tm + sys) / 3);

    const processMaturity = com;
    const scalability = (sys + tm + prd) / 3;
    const risk = 10 - leg; 
    const strategicAlignment = msn;

    return {
        founderDependence: founderDep, // 0 to 10 (higher means more dependent)
        systemization,
        delegation,
        processMaturity,
        scalability,
        risk, // 0 to 10 (higher means more risky)
        strategicAlignment
    };
};

export const calculateBusinessQuality = (tr: any) => {
    const msn = tr.mission ?? 5;
    const ldr = tr.leadership ?? 5;
    const tm = tr.team ?? 5;
    const csh = tr.cashflow ?? 5;
    const com = tr.communications ?? 5;
    const sys = tr.systems ?? 5;
    const leg = tr.legal ?? 5;
    const prd = tr.product ?? 5;

    const opStrength = (sys + tm + com) / 3;
    const finStrength = csh; // Assuming we use cashflow for now
    const structStrength = leg; // using legal for now
    const visStrength = (msn + ldr) / 2;

    const bqs = (opStrength * 0.4) + (finStrength * 0.3) + (structStrength * 0.15) + (visStrength * 0.15);
    return {
        bqs,
        opStrength,
        finStrength,
        structStrength,
        visStrength
    };
};

export const calculateAnnualNet = (business: BusinessEntity, allEntries: Entry[]): number => {
    // Only consider entries that actually impact profit (not internal transfers)
    const bizEntries = allEntries.filter(e => {
        if (e.profileId !== business.id) return false;
        if (e.subtype === 'INTERNAL_TRANSFER') return false;
        if (e.subtype === 'BAD_DEBT') return false; // Exclude non-cash impairments
        
        // Exclude manual loan principal from P&L, but include interest
        if (e.isLoanTransaction && !e.description.toLowerCase().includes('interest')) return false;

        // Distribution OUT (expense) does not affect the sender's Annual Net Profit. 
        // Distribution IN (income) does affect the receiver's Annual Net Profit.
        if (e.subtype === 'DISTRIBUTION' && e.type === 'expense') return false;
        return e.type === 'income' || e.type === 'expense';
    });
    if (bizEntries.length === 0) return 0;

    let totalProfitAllTime = 0;
    let totalProfitLast365 = 0;
    
    // Determine the true first transaction date that impacted profit
    const sortedEntries = [...bizEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstTransactionDate = new Date(sortedEntries[0].date);
    const today = new Date();
    
    let mostRecentDate = today;
    if (new Date(sortedEntries[sortedEntries.length - 1].date) > today) {
        mostRecentDate = new Date(sortedEntries[sortedEntries.length - 1].date);
    }

    const businessAgeTime = mostRecentDate.getTime() - firstTransactionDate.getTime();
    const businessAgeDays = Math.max(1, Math.floor(businessAgeTime / (1000 * 60 * 60 * 24)));

    const cutoff365 = new Date(mostRecentDate);
    cutoff365.setDate(cutoff365.getDate() - 365);

    bizEntries.forEach(e => {
        let net = 0;
        if (e.type === 'income') net = e.amount;
        else if (e.type === 'expense') net = -e.amount;

        totalProfitAllTime += net;
        
        if (new Date(e.date) >= cutoff365) {
            totalProfitLast365 += net;
        }
    });

    let annualProfit = 0;
    let dailyAvg = 0;
    if (businessAgeDays <= 365) {
        // Enforce a minimum 30-day smoothing period for new businesses so 1-day spikes don't create hyper-inflated annual valuations
        const smoothingDays = Math.max(30, businessAgeDays);
        dailyAvg = totalProfitAllTime / smoothingDays;
        annualProfit = dailyAvg * 365;
        console.log(`[DEBUG SSOT] businessAgeDays: ${businessAgeDays}, smoothingDays: ${smoothingDays}, totalProfitAllTime: ${totalProfitAllTime}, totalProfitLast365: ${totalProfitLast365}, dailyAvg: ${dailyAvg}, Annual_Net: ${annualProfit}`);
        return annualProfit;
    } else {
        annualProfit = totalProfitLast365;
        console.log(`[DEBUG SSOT] businessAgeDays: ${businessAgeDays}, totalProfitAllTime: ${totalProfitAllTime}, totalProfitLast365: ${totalProfitLast365}, Annual_Net: ${annualProfit}`);
        return annualProfit;
    }
};

export const calculateConfidenceScore = (business: BusinessEntity, allEntries: Entry[]): number => {
    const bizEntries = allEntries.filter(e => {
        if (e.profileId !== business.id) return false;
        if (e.subtype === 'INTERNAL_TRANSFER' || e.subtype === 'DISTRIBUTION' || e.subtype === 'BAD_DEBT') return false;
        return e.type === 'income' || e.type === 'expense';
    });
    
    if (bizEntries.length === 0) return 0;
    
    // Sort to determine business age
    const sortedEntries = [...bizEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstTransactionDate = new Date(sortedEntries[0].date);
    const today = new Date();
    
    let mostRecentDate = today;
    if (new Date(sortedEntries[sortedEntries.length - 1].date) > today) {
        mostRecentDate = new Date(sortedEntries[sortedEntries.length - 1].date);
    }

    const businessAgeTime = mostRecentDate.getTime() - firstTransactionDate.getTime();
    const businessAgeDays = Math.max(1, Math.floor(businessAgeTime / (1000 * 60 * 60 * 24)));

    // 1. Data Coverage (40%)
    const coverageScore = Math.min(100, (businessAgeDays / 365) * 100);

    // 2. Earnings Consistency (40%)
    // Group profit by month
    const monthlyProfits: Record<string, number> = {};
    bizEntries.forEach(e => {
        const monthStr = e.date.substring(0, 7); // YYYY-MM
        if (!monthlyProfits[monthStr]) monthlyProfits[monthStr] = 0;
        
        if (e.type === 'income') {
            monthlyProfits[monthStr] += e.amount;
        } else if (e.type === 'expense') {
            monthlyProfits[monthStr] -= e.amount;
        }
    });

    const months = Object.values(monthlyProfits);
    let consistencyScore = 100;
    
    if (months.length > 1) {
        const avgProfit = months.reduce((sum, val) => sum + val, 0) / months.length;
        
        if (avgProfit !== 0) {
            const variance = months.reduce((sum, val) => sum + Math.pow(val - avgProfit, 2), 0) / months.length;
            const stdDev = Math.sqrt(variance);
            
            consistencyScore = 100 - ((stdDev / Math.abs(avgProfit)) * 100);
            consistencyScore = Math.max(0, Math.min(100, consistencyScore)); // Clamp between 0-100
        } else {
            consistencyScore = 0;
        }
    } else if (months.length === 1) {
        consistencyScore = 50; // Fallback for 1 month data
    } else {
        consistencyScore = 0;
    }

    // 3. Activity Frequency (20%)
    const activeDaysSet = new Set(bizEntries.map(e => e.date.substring(0, 10)));
    const activeDays = activeDaysSet.size;
    
    const activeDaysRatio = activeDays / businessAgeDays;
    const frequencyScore = Math.max(0, Math.min(100, activeDaysRatio * 100));

    // FINAL FORMULA
    const confidenceScore = (coverageScore * 0.4) + (consistencyScore * 0.4) + (frequencyScore * 0.2);

    return Math.round(confidenceScore);
};

/**
 * Standardized Business Valuation Logic (GAAP/IFRS aligned)
 * STRICT VALUATION LAYER - Timeframe Independent
 */
export const calculateBusinessValuation = (business: BusinessEntity, allEntries: Entry[], allAssets: Asset[], overrideOwnershipPct?: number) => {
    // 1. Single Source of Truth for Annual Net
    const Annual_Net = calculateAnnualNet(business, allEntries);

    // 2. Read-only Confidence Score
    const Confidence_Score = calculateConfidenceScore(business, allEntries);

    // 3. New Confidence + Projection Layer
    const bizEntries = allEntries.filter(e => {
        if (e.profileId !== business.id) return false;
        if (e.subtype === 'INTERNAL_TRANSFER' || e.subtype === 'DISTRIBUTION' || e.subtype === 'BAD_DEBT') return false;
        return e.type === 'income' || e.type === 'expense';
    });
    
    const sortedEntries = [...bizEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const now = new Date();
    now.setFullYear(2026); // Simulation year
    const firstTransactionDate = sortedEntries.length > 0 ? new Date(sortedEntries[0].date) : now;
    const activeDays = Math.max(Math.ceil((now.getTime() - firstTransactionDate.getTime()) / (1000 * 60 * 60 * 24)), 1);

    const confidenceScore = Math.min(100, Math.round((activeDays / 90) * 100));
    const maturityFactor = Math.min(activeDays / 90, 1);
    
    let dataConfidenceFactor = (confidenceScore / 100 * 0.6) + (maturityFactor * 0.4);
    dataConfidenceFactor = Math.max(0.2, Math.min(dataConfidenceFactor, 1));

    const stabilizedAnnualNet = Annual_Net * dataConfidenceFactor;

    let valuationConfidenceLabel;
    if (confidenceScore < 60) {
        valuationConfidenceLabel = "Very Low Confidence";
    } else if (confidenceScore <= 85) {
        valuationConfidenceLabel = "Improving Confidence";
    } else {
        valuationConfidenceLabel = "High Confidence";
    }

    let projectionLabel;
    if (confidenceScore < 60) {
        projectionLabel = "Projected Annual Net";
    } else if (confidenceScore <= 85) {
        projectionLabel = "Stabilized Annual Net";
    } else {
        projectionLabel = "Verified Annual Net";
    }

    let projectionStatusTag;
    if (confidenceScore < 25) {
        projectionStatusTag = "Early Projection";
    } else if (confidenceScore < 60) {
        projectionStatusTag = "Stabilizing Projection";
    } else {
        projectionStatusTag = "Reliable Projection";
    }

    // Multipliers Logic
    const tr = business.biTriangle || {};
    const bqsData = calculateBusinessQuality(tr);
    const structData = calculateStructuralVariables(tr);

    let baseMultiplier = 2.0; 
    switch (business.industry) {
        case 'AI / SaaS': baseMultiplier = 4.5; break;
        case 'Tech Services': baseMultiplier = 3.0; break;     
        case 'Agency / Marketing': baseMultiplier = 2.25; break; 
        case 'Content / YouTube': baseMultiplier = 3.0; break; 
        case 'E-commerce': baseMultiplier = 3.5; break;        
        case 'Education / Coaching': baseMultiplier = 2.5; break; 
        case 'Local Business': baseMultiplier = 1.75; break;   
        case 'Other': baseMultiplier = 2.0; break;             
    }

    // A. System Score Factor (B-I Triangle Score Adjustment)
    const biScore = bqsData.bqs * 10;
    let systemScoreFactor = 1.0; 
    // We'll treat systemScoreFactor as a multiplicative adjustment or additive.
    // Let's use it conventionally: >90 = x 1.5, >70 = x 1.2, else x 1.0. 
    // But keeping existing logic shape:
    let biAdjustment = 0;
    if (biScore >= 90) biAdjustment = 1.0;
    else if (biScore >= 70) biAdjustment = 0.5;
    else if (biScore >= 50) biAdjustment = 0.2;

    // We can define systemic multiplier components cleanly:
    // Adjusted_Multiplier = Industry_Base_Multiplier * (1 + biAdjustment + esbiAdjustment + growthAdjustment) * Risk_Factor

    // B. ESBI Distribution
    let esbiAdjustment = 0;
    if (structData.founderDependence > 7) esbiAdjustment = -0.5; 
    else if (structData.systemization > 7 && structData.delegation > 7) esbiAdjustment = 0.5; 

    // C. Growth Factor (Derived from last 6 mo if possible, else 0)
    let growthAdjustment = 0;
    // We can compute basic trend if needed, but since AnnualNet handles TTM, growth doesn't need to recalculate old monthly.
    // Keeping simple fallback for growth adjustment
    
    // Risk Factor based on entity type
    let riskFactor = 1.0;
    let entityRiskMsg = "Standard setup";
    switch (business.entityType) {
        case 'Sole Prop': 
            riskFactor = 0.8; 
            entityRiskMsg = "High personal liability (Risk)";
            break;
        case 'Partnership':
            riskFactor = 0.9;
            entityRiskMsg = "Shared liability (Moderate Risk)";
            break;
        case 'LLC':
            riskFactor = 1.0;
            entityRiskMsg = "Protected assets (Neutral)";
            break;
        case 'Corp':
            riskFactor = 1.15;
            entityRiskMsg = "Highly transferable (+15% bonus)";
            break;
    }

    // Additional struct risk
    if (structData.founderDependence > 8) riskFactor *= 0.9; // Extra penalty

    // Existing multiplier logic (unadjusted)
    let systemGeneratedMultiplier = baseMultiplier * (1 + biAdjustment + esbiAdjustment + growthAdjustment) * riskFactor;
    if (systemGeneratedMultiplier < 1.0) systemGeneratedMultiplier = 1.0;
    if (systemGeneratedMultiplier > 10.0) systemGeneratedMultiplier = 10.0;

    // Multiplier Adjustment Factor (New Layer)
    let multiplierAdjustmentFactor = (confidenceScore / 100 * 0.6) + (Math.min(activeDays / 90, 1) * 0.4);
    multiplierAdjustmentFactor = Math.max(0.2, Math.min(multiplierAdjustmentFactor, 1));

    const finalAdjustedMultiplier = systemGeneratedMultiplier * multiplierAdjustmentFactor;

    const bizAssets = allAssets.filter(a => a.profileId === business.id);
    const manualCashAssets = bizAssets.filter(a => a.type === 'asset' && a.category === 'Cash').reduce((sum, a) => sum + a.amount, 0); 
    
    // Calculate accumulated retained cash from entries
    const accumulatedCash = allEntries.filter(e => e.profileId === business.id).reduce((sum, e) => {
        if (e.type === 'income' || e.type === 'transfer_in') return sum + e.amount;
        if (e.type === 'expense' || e.type === 'transfer_out') return sum - e.amount;
        return sum;
    }, 0);
    
    const totalCash = manualCashAssets + accumulatedCash;
    const totalLiabilities = bizAssets.filter(a => a.type === 'liability').reduce((sum, a) => sum + a.amount, 0);
    
    // netDebt can be negative (which means positive net cash)
    const netDebt = totalLiabilities - totalCash; 

    // Enterprise Value evaluates the operations
    const enterpriseValue = (stabilizedAnnualNet > 0) ? (stabilizedAnnualNet * finalAdjustedMultiplier) : 0;

    // Standard View: EV - Debt = EV - (Liabilities - Cash) = EV - Liabilities + Cash
    const equityValue = Math.max(0, enterpriseValue - netDebt);
    
    // True View: EV - Total Liabilities (Excluding Cash)
    const trueEquityValue = Math.max(0, enterpriseValue - totalLiabilities);

    const ownershipPct = overrideOwnershipPct !== undefined ? overrideOwnershipPct : (business.ownershipStake || 100) / 100;
    const userValue = equityValue * ownershipPct;
    const trueUserValue = trueEquityValue * ownershipPct;

    return {
        Annual_Net: Annual_Net,
        Confidence_Score: Confidence_Score,
        multiplier: finalAdjustedMultiplier,
        unadjustedMultiplier: systemGeneratedMultiplier,
        multiplierAdjustmentFactor: multiplierAdjustmentFactor,
        baseMultiplier: baseMultiplier,
        enterpriseValue: enterpriseValue,
        netDebt: netDebt,
        totalValuation: equityValue, // Standard View
        trueValuation: trueEquityValue, // True View
        userValue: userValue, // Standard View User Equity
        trueUserValue: trueUserValue, // True View User Equity
        ownershipPct,
        entityFactor: riskFactor,
        entityRiskMsg,
        // New fields
        activeDays,
        valuationConfidenceScore: confidenceScore,
        valuationConfidenceLabel,
        projectionWeightFactor: dataConfidenceFactor,
        displayAnnualNet: stabilizedAnnualNet,
        rawAnnualNet: Annual_Net,
        projectionLabel,
        projectionStatusTag
    };
};

export const CURRENCY_EXCHANGE_RATES: Record<string, number> = WORLD_CURRENCY_RATES;

export const getExchangeRate = (fromCurrency: string, toCurrency: string): number => {
    return getServiceExchangeRate(fromCurrency, toCurrency);
};

export const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
    return convertServiceCurrency(amount, fromCurrency, toCurrency);
};

export interface StateSnapshot {
  timestamp: string;
  income: number;
  expenses: number;
  netCashflow: number;
  recurringIncome: number;
  systemScore: number;
  valuation: number;
  netWorth: number;
  esbi: { e: number; s: number; b: number; i: number };
  currency?: string;
  timeframe?: string;
}

export interface IntelligenceEvent {
  type: 'INCOME_ADDED' | 'EXPENSE_ADDED' | 'ASSET_ADDED' | 'LIABILITY_ADDED' | 'GOAL_UPDATED' | 'SYSTEM_SCORE_CHANGED' | 'SETTINGS_UPDATED';
  timestamp: string;
  previousValue?: any;
  newValue?: any;
  entityId: string;
}

export interface AppMetrics {
  netWorth: number;
  passiveIncome: number; // recurringPassive in App.tsx?
  activeIncome: number;
  financialFreedomRate: number;
  businessIncomePerHour: Record<string, number>;
  cashflow: number;
  quadrantSplit: { e: number; s: number; b: number; i: number };
  totalIncome: number;
  totalExpenses: number;
  calculatedWeeklyHours: number;
  trueProfit: number;
  internalInflows: number;
  internalOutflows: number;
  burnRate?: number;
  runway?: number;
}

export interface InsightContext {
  profileType: "personal" | "business";
  timeframe: "24h" | "1w" | "1m" | "1y" | "all";
  financials: {
    totalIncome: number;
    totalExpenses: number;
    netCashflow: number;
    recurringIncome: number;
    assets: number;
    liabilities: number;
    netWorth: number;
    burnRate?: number;
    runway?: number;
  };
  previousFinancials?: StateSnapshot;
  businessMetrics?: {
    systemScore: number;
    valuation: number;
    multiplier: number;
    confidenceScore: number;
    biTriangle?: BITriangle;
    industry?: string;
  };
  goals: {
    targetIncome: number;
    financialFreedomProgress: number;
    dream?: string;
  };
  structure: {
    numberOfIncomeStreams: number;
    dependencyRatio?: number;
    incomeConsistency?: number; // 0-100
  };
  personalData?: {
    age: number;
    financialKnowledge: string;
  };
  buckets?: { name: string; balance: number; percentage: number }[];
  notifications?: { type: string; title: string }[];
  currency: string;
  events?: IntelligenceEvent[];
  lastUserActionTimestamp?: number;
  sessionStartTimestamp?: number;
  quadrantSplit?: { E: number; S: number; B: number; I: number };
}

export interface InsightResult {
  title: string;
  insight: string;
  action: string;
  tone: "warning" | "neutral" | "positive";
}

/**
 * Returns current local system time as "HH:mm" (24-hour format)
 */
export const getSystemTimeString = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Builds a valid ISO timestamp and effective HH:mm string from date and optional time.
 * If time is not provided or empty, falls back to the current OS system time.
 */
export const buildEntryTimestamp = (dateStr: string, timeStr?: string): { timestamp: string; time: string } => {
  const effectiveTime = (timeStr && timeStr.trim().length >= 4) ? timeStr.trim() : getSystemTimeString();
  const safeDate = dateStr && dateStr.includes('-') ? dateStr : new Date().toISOString().split('T')[0];
  const [y, m, d] = safeDate.split('-').map(Number);
  const [hh, mm] = effectiveTime.split(':').map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
  const timestamp = !isNaN(dateObj.getTime()) ? dateObj.toISOString() : new Date().toISOString();
  return { timestamp, time: effectiveTime };
};

/**
 * Formats entry time for display. If entry has an explicit time (HH:mm), formats it nicely.
 * If not, extracts the logged OS time from timestamp.
 */
export const formatEntryTime = (entry?: { time?: string; timestamp?: string } | null): string => {
  if (!entry) return '';
  if (entry.time && entry.time.trim()) {
    const parts = entry.time.trim().split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        const d = new Date();
        d.setHours(h, m, 0);
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
    }
    return entry.time;
  }
  if (entry.timestamp) {
    try {
      const d = new Date(entry.timestamp);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
    } catch (e) {
      // ignore
    }
  }
  return '';
};
