
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { AppContext, MoneyDisplay } from '../App';
import { Card, Button, Modal, Input, Select } from '../components/Shared';
import { Plus, Trash2, Building, AlertOctagon, Lock, Info, Briefcase, FileText, Layers, Tag, Edit2, Download, Filter, Search, TrendingUp, HelpCircle, Wallet, ArrowRight, Calculator as CalculatorIcon, Calendar, Link as LinkIcon, DollarSign, Clock, Percent, RefreshCw, Save, ChevronDown, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { Asset, calculateBusinessValuation, convertCurrency, CategoryDef, BUSINESS_SECTORS, PERSONAL_SECTORS, getSystemTimeString, buildEntryTimestamp } from '../types';
import { FREQUENCY_OPTIONS } from '../constants';
import { ValuationModal } from '../components/ValuationModal';
import { InlineCurrencyConverter } from '../components/InlineCurrencyConverter';
import { buildHierarchicalOptions, getEffectiveBalance } from '../services/bucketEngine';
import { downloadLoanAgreement, downloadReceipt } from '../services/receiptService';

// --- COMPONENT: LIABILITY CALCULATOR FORM ---
export const LiabilityCalculatorForm = ({ details, setDetails, isBusiness, amount, formatAmount, isEditMode, buckets, isInternalLoan }: any) => {
    // Calculated Preview State
    const [previewTotal, setPreviewTotal] = useState(0);
    const isReadOnly = isInternalLoan && isEditMode;

    useEffect(() => {
        const principal = amount || 0;
        const rate = details.interestRate || 0;
        const isAnnual = details.rateIsAnnual !== false;
        
        let totalInterest = 0;
        let payment = 0;
        const termMonths = details.termUnit === 'yearly' || details.termUnit === 'Years' 
            ? (details.termValue || 1) * 12 
            : (details.termUnit === 'one_time' || details.termUnit === 'One-Time' ? 1 : (details.termValue || 1));

        if (isAnnual) {
            totalInterest = principal * (rate / 100) * (termMonths / 12);
        } else {
            totalInterest = principal * (rate / 100);
        }
        
        const totalDebt = principal + totalInterest;
        setPreviewTotal(totalDebt);

        if (!isEditMode) {
            if (details.termUnit === 'one_time' || details.termUnit === 'One-Time') { 
                payment = totalDebt; 
            } else {
                if (termMonths > 0) payment = totalDebt / termMonths;
            }
            if (Math.abs(details.monthlyPayment - payment) > 0.01) {
                setDetails((prev: any) => ({ ...prev, monthlyPayment: payment }));
            }
        }
    }, [amount, details.interestRate, details.termValue, details.termUnit, details.rateIsAnnual, isEditMode]); 

    return (
        <div className="space-y-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
            <div className="flex items-center gap-2 mb-2 text-red-700 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                <CalculatorIcon size={14}/> {isEditMode ? 'Debt Details' : 'Debt Engine'}
            </div>
            
            {!isInternalLoan && (
                <Input label={isBusiness ? "Lender / Source" : "Loan Provider"} placeholder="e.g. Chase Bank" value={details.provider} onChange={e => setDetails({...details, provider: e.target.value})} className="!mb-0" />
            )}
            
            <div className="flex flex-wrap sm:flex-nowrap items-end gap-2 sm:gap-3 w-full">
                <div className="flex-1 min-w-[30%]">
                    <Input label={isBusiness ? "Interest %" : "Interest Rate (%)"} type="number" placeholder="0.0" value={details.interestRate || ''} onChange={e => setDetails({...details, interestRate: parseFloat(e.target.value)})} className="!mb-0" enableCalculator={!isReadOnly} disabled={isReadOnly}/>
                </div>
                {!isReadOnly && (
                    <div className="flex items-center min-w-[20%] pt-6">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300 font-medium">
                            <input type="checkbox" checked={details.rateIsAnnual !== false} onChange={e => setDetails({...details, rateIsAnnual: e.target.checked})} className="rounded border-red-300 text-red-600 focus:ring-red-500 bg-transparent" />
                            Annual Rate
                        </label>
                    </div>
                )}
                {details.termUnit !== 'one_time' && details.termUnit !== 'One-Time' && (
                    <div className="flex-1 min-w-[20%]">
                        <Input label="Term" type="number" placeholder="12" value={details.termValue || ''} onChange={e => setDetails({...details, termValue: parseFloat(e.target.value)})} className="!mb-0" disabled={isReadOnly}/>
                    </div>
                )}
                <div className={`flex-1 ${details.termUnit === 'one_time' || details.termUnit === 'One-Time' ? 'min-w-[65%]' : 'min-w-[40%]'}`}>
                    <Select label="Frequency" options={FREQUENCY_OPTIONS.filter(o => ['monthly', 'yearly', 'one_time'].includes(o.value))} value={['monthly', 'yearly', 'one_time'].includes(details.termUnit) ? details.termUnit : (details.termUnit === 'Months' ? 'monthly' : details.termUnit === 'Years' ? 'yearly' : 'one_time')} onChange={e => setDetails({...details, termUnit: e.target.value})} className="!mb-0" disabled={isReadOnly}/>
                </div>
            </div>

            {(details.termUnit === 'one_time' || details.termUnit === 'One-Time') && (
                <Input label="Repayment Date" type="date" value={details.repaymentDate || ''} onChange={e => setDetails({...details, repaymentDate: e.target.value})} disabled={isReadOnly}/>
            )}

            {!isInternalLoan && (
                <div className="pt-2 border-t border-red-100 dark:border-red-900/50">
                    <label className="block text-[11px] font-bold text-red-700 dark:text-red-400 mb-1">Auto-Repayment Source</label>
                    <Select 
                        options={[{value: '', label: 'None (Manual Payment)'}, ...buckets]} 
                        value={details.autoRepayBucketId || ''} 
                        onChange={e => setDetails({...details, autoRepayBucketId: e.target.value})} 
                        className="!mb-0 !py-1.5 !text-xs"
                    />
                    <p className="text-[9px] text-gray-500 mt-1">If set, funds will be deducted from this bucket automatically after the due date.</p>
                </div>
            )}

            {!isEditMode && (
                <div className="mt-2 bg-white dark:bg-black/20 p-3 rounded-lg border border-red-200 dark:border-red-900/50 shadow-sm">
                    <div className="flex justify-between items-center mb-2 border-b border-gray-100 dark:border-white/10 pb-2">
                        <span className="text-xs text-gray-500">Principal</span>
                        <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{formatAmount(amount)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                        <span className="text-xs text-gray-500">Interest ({details.interestRate}%)</span>
                        <span className="font-mono font-bold text-red-500">+{formatAmount(previewTotal - amount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Total Owed</span>
                        <span className="text-lg font-semibold text-red-600 dark:text-red-400">{formatAmount(previewTotal)}</span>
                    </div>
                    <div className="mt-2 text-right">
                        <span className="text-[10px] text-gray-400 uppercase mr-2">Est. Payment</span>
                        <span className="font-bold text-gray-700 dark:text-gray-200">{formatAmount(details.monthlyPayment)} / {details.termUnit === 'One-Time' ? 'Total' : 'mo'}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export const getEffectiveMonthlyIncome = (asset: Asset): number => {
    if (!asset.monthlyIncome) return 0;
    
    // Check if it's considered a loan
    const isLoanAsset = asset.internalLoanId || (asset.assetClass && asset.assetClass.toLowerCase().includes('loan'));
    
    if (isLoanAsset) {
        const isActive = asset.loanStatus === 'active';
        // Use initialAmount and amount (current balance) to ensure it's still being paid off
        const principalBalance = asset.amount || 0; 
        
        if (!isActive || principalBalance <= 0) {
            return 0; // Stop counting as recurring if paid off, completed, or dead
        }
    }
    
    return asset.monthlyIncome;
};

const AssetRow: React.FC<{ item: Asset, onEdit: (a: Asset) => void, onPay: (a: Asset) => void, onValuate: (a: Asset) => void, onViewAgreement?: (a: Asset) => void, onTerminate?: (a: Asset) => void, profileName: string, currency: string, isViewer: boolean }> = ({ item, onEdit, onPay, onValuate, onViewAgreement, onTerminate, profileName, currency, isViewer }) => {
    const context = useContext(AppContext)!;
    const { data, formatAmount, deleteAsset } = context;

    let annualYield = 0;
    const effectiveIncome = getEffectiveMonthlyIncome(item);
    if (item.type === 'asset' && effectiveIncome) {
        const costBasis = item.initialAmount > 0 ? item.initialAmount : item.amount;
        if (costBasis > 0) annualYield = ((effectiveIncome * 12) / costBasis) * 100;
    }
    const gain = (item.amount || 0) - (item.initialAmount || 0);
    const gainPercent = item.initialAmount > 0 ? (gain / item.initialAmount) * 100 : 0;

    // Liability Breakdown Calculation
    const interestRate = item.interestRate || 0;
    const remainingPrincipal = item.type === 'liability' ? ((item.initialAmount || item.amount) - (item.principalPaid || 0)) : 0;

    const now = new Date();
    const creationDate = new Date(item.date || now);
    let termText = '';
    const isCompleted = item.amount <= 0 || item.loanStatus === 'completed';

    if (item.termUnit === 'One-Time' || item.termUnit === 'one_time') {
        termText = isCompleted ? 'Completed' : 'One-Time';
    } else if (item.termValue || item.termMonths) {
        const totalPeriods = item.termValue || item.termMonths || 1;
        const rawUnit = (item.termUnit || item.paymentFrequency || 'monthly').toLowerCase();
        const unitLabel = (rawUnit === 'monthly' || rawUnit === 'months') ? 'Months' : (rawUnit === 'yearly' || rawUnit === 'years') ? 'Years' : 'Periods';
        
        let periodsPassed = 0;
        const principalTotal = item.initialAmount || item.amount || 1; 
        const principalPaid = item.principalPaid || 0;
        
        if (isCompleted) {
            periodsPassed = totalPeriods;
        } else {
            periodsPassed = Math.floor((principalPaid / principalTotal) * totalPeriods);
        }
        
        const periodsLeft = Math.max(0, totalPeriods - periodsPassed);
        termText = `${periodsPassed} of ${totalPeriods} ${unitLabel} (${periodsLeft} remaining)`;
    }

    let bizDetails = null;
    if (item.type === 'business_equity') {
        const bizId = item.id.replace('equity_asset_', '');
        const biz = data.businesses.find(b => b.id === bizId);
        if (biz) {
            let totalOwnershipPct = (biz.ownershipStake || 100) / 100;
            try {
                if (context && context.engine) {
                    const ownershipResult = context.engine.calculateOwnership('personal', biz.id);
                    totalOwnershipPct = ownershipResult.totalOwnership / 100;
                }
            } catch(e) {}
            const val = calculateBusinessValuation(biz, data.entries, data.assets, totalOwnershipPct);
            const personalCurrency = data.profile.currency;
            bizDetails = { ...val, name: biz.name, displayTotalValuation: convertCurrency(val.totalValuation, biz.currency, personalCurrency), displayUserValue: convertCurrency(val.userValue, biz.currency, personalCurrency) };
        }
    }

    let linkedAssetName = '';
    if (item.type === 'liability' && item.linkedAssetId) {
        const linkedAsset = data.assets.find(a => a.id === item.linkedAssetId);
        if (linkedAsset) linkedAssetName = linkedAsset.description;
    }

    const confirmDelete = (assetToDel: Asset) => {
        if (assetToDel.internalLoanId && assetToDel.type === 'asset') {
            if (onTerminate) onTerminate(assetToDel);
        } else {
            if(window.confirm("Are you sure you want to delete this item? This cannot be undone.")) {
                deleteAsset(assetToDel.id);
            }
        }
    };

    return (
    <div className={`p-4 rounded-xl border mb-3 last:mb-0 transition-all hover:shadow-sm ${item.type === 'business_equity' ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* LEFT SIDE (Info) */}
            <div className="flex-1 w-full sm:w-auto min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="font-bold text-gray-800 dark:text-gray-100 text-base break-words max-w-full">{item.description}</span>
                    {item.provider && <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">{item.provider}</span>}
                    {item.type === 'business_equity' && <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0"><Lock size={8}/> AUTO</span>}
                    <span className="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">{item.assetClass || (item.type === 'liability' ? 'Debt' : 'General')}</span>
                    {item.loanStatus && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 font-bold ${item.loanStatus === 'completed' ? 'bg-green-100 text-green-700' : item.loanStatus === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {item.loanStatus}
                        </span>
                    )}
                </div>
                
                {/* LENDER / LOAN CARD TERMS (LENDER VIEW) */}
                {item.type === 'asset' && item.termType && (
                    <div className="text-xs text-gray-500 mb-1 break-words">
                        Repayment: {item.termType === 'one_time' ? `One-time${item.nextDueDate ? ` on ${new Date(item.nextDueDate).toLocaleDateString()}` : ''}` : `${item.paymentFrequency || 'Monthly'} for ${item.termMonths || 12} months`}
                        {item.nextDueDate && item.termType !== 'one_time' && ` • Next: ${formatAmount(item.monthlyPayment || item.monthlyIncome || 0)} on ${new Date(item.nextDueDate).toLocaleDateString()}`}
                        {item.principalPaid !== undefined && ` • Remaining: ${formatAmount(Math.max(0, (item.initialAmount || item.amount) - item.principalPaid))} principal`}
                    </div>
                )}
                
                {bizDetails ? (
                    <div className="mt-2 text-xs grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 bg-white/50 dark:bg-black/20 p-2 rounded border border-gray-200 dark:border-gray-700 w-full lg:max-w-md">
                            <div className="text-gray-500">Business Equity Value:</div><div className="font-semibold text-right break-words"><MoneyDisplay amount={bizDetails.displayTotalValuation} symbol={currency} /></div>
                            <div className="text-gray-500" title="Includes direct ownership and indirect ownership via holding companies">Effective Stake:</div><div className="font-semibold text-right" title="Includes direct ownership and indirect ownership via holding companies">{(bizDetails.ownershipPct * 100).toFixed(0)}%</div>
                            <div className="text-indigo-600 font-semibold border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">Your Equity:</div><div className="font-semibold text-right border-t border-gray-200 dark:border-gray-600 pt-1 mt-1 text-indigo-600 break-words"><MoneyDisplay amount={bizDetails.displayUserValue} symbol={currency} /></div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1 mt-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 min-w-0">
                            <span className="flex items-center gap-1 shrink-0"><Layers size={10}/> {new Date(item.date).toLocaleDateString()}{item.time ? ` • ${item.time}` : ''}</span>
                            {item.type === 'asset' && effectiveIncome !== 0 && (
                                <span className={`font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 max-w-full break-words ${effectiveIncome > 0 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-500 bg-red-50 dark:bg-red-900/20'}`}>
                                    <TrendingUp size={10} className={effectiveIncome < 0 ? 'rotate-180 shrink-0' : 'shrink-0'} /> <span className="break-words">{effectiveIncome > 0 ? '+' : ''}<MoneyDisplay amount={effectiveIncome} symbol={currency} />/mo</span>
                                </span>
                            )}
                            {item.type === 'asset' && item.initialAmount > 0 && (
                                <span className={`font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 max-w-full break-words ${gain >= 0 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-500 bg-red-50 dark:bg-red-900/20'}`}>
                                    <span className="break-words">{gain >= 0 ? '+' : ''}{gainPercent.toFixed(1)}% Total ROI/Growth</span>
                                </span>
                            )}
                            {linkedAssetName && <span className="font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 max-w-full break-words" title="This debt funded this asset"><LinkIcon size={10} className="shrink-0" /> <span className="break-words">Linked: {linkedAssetName}</span></span>}
                            {item.type === 'asset' && item.internalLoanId && termText && (
                                <span className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-1.5 py-0.5 rounded text-green-700 dark:text-green-300 break-words min-w-0 max-w-full">
                                    Term: <strong>{termText}</strong>
                                </span>
                            )}
                        </div>
                        {item.type === 'liability' && (
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-500 flex-wrap min-w-0">
                                <span className="bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded text-red-800 dark:text-red-300 border border-red-100 dark:border-red-900/30 break-words min-w-0 max-w-full">
                                    Prin: <strong><MoneyDisplay amount={remainingPrincipal > 0 ? remainingPrincipal : item.amount} symbol={currency} /></strong>
                                </span>
                                {item.interestRate !== undefined && item.interestRate > 0 && (
                                    <span className="bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded text-orange-800 dark:text-orange-300 border border-orange-100 dark:border-orange-900/30 break-words min-w-0 max-w-full">
                                        Int: <strong>{item.interestRate}% {item.rateIsAnnual === false ? 'Total' : 'APR'}</strong>
                                    </span>
                                )}
                                {termText && (
                                    <span className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300 break-words min-w-0 max-w-full">
                                        Term: <strong>{termText}</strong>
                                    </span>
                                )}
                            </div>
                        )}
                        {item.valuationData && item.type === 'asset' && (
                            <div className="mt-1">
                                <span className="text-[9px] bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-800 shrink-0">
                                    Valuation Confidence: {item.valuationData.confidenceScore}%
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* RIGHT SIDE: Values & Actions */}
            <div className="flex flex-col items-start sm:items-end justify-between w-full sm:w-auto gap-2.5 shrink-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-700/60 pt-3 sm:pt-0 mt-2 sm:mt-0">
                <div className="flex flex-col sm:items-end w-full sm:w-auto gap-1">
                    <div className="flex flex-wrap sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-x-3 gap-y-0.5 w-full">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider block">CURRENT VALUE</span>
                        <span className={`block text-xl sm:text-2xl font-semibold tracking-tight whitespace-normal break-words ${item.type === 'business_equity' ? 'text-indigo-600 dark:text-indigo-400' : item.type === 'liability' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`} title={formatAmount(item.amount)}>
                            <MoneyDisplay amount={item.amount} symbol={currency} />
                        </span>
                    </div>
                    {annualYield !== 0 && (
                        <div className={`text-xs font-medium self-start sm:self-end inline-flex items-center gap-1 ${annualYield > 0 ? 'text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full' : 'text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full'}`}>
                            <span>{annualYield.toFixed(1)}% Yield (APR)</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 w-full sm:w-auto">
                    {/* LIABILITY ACTIONS */}
                    {item.type === 'liability' && (
                        <div className="flex items-center gap-2 max-w-full">
                             <div className="text-left sm:text-right mr-1 min-w-0">
                                 {item.nextDueDate ? (
                                     <span className="block text-[9px] text-gray-500 font-semibold uppercase">Due: {new Date(item.nextDueDate).toLocaleDateString()}</span>
                                 ) : (
                                     <span className="block text-[9px] text-gray-400 font-semibold uppercase">No Date Set</span>
                                 )}
                                 <span className="block text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap"><MoneyDisplay amount={item.monthlyPayment || 0} symbol={currency} />/mo</span>
                             </div>
                             {!isViewer && (
                                 <Button 
                                    onClick={() => onPay(item)} 
                                    disabled={item.amount <= 0 || item.loanStatus === 'completed'}
                                    className={`!py-1.5 !px-3 text-sm font-bold shadow-sm shrink-0 h-auto ${item.amount <= 0 || item.loanStatus === 'completed' ? 'bg-gray-400 dark:bg-gray-600 opacity-50 cursor-not-allowed text-white' : 'bg-green-600 hover:bg-green-700'}`}>
                                     {item.amount <= 0 || item.loanStatus === 'completed' ? 'Paid' : 'Pay'}
                                 </Button>
                             )}
                        </div>
                    )}

                    {/* Standard Actions */}
                    <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 text-sm w-full sm:w-auto">
                        {item.internalLoanId && onViewAgreement && (
                            <button onClick={() => onViewAgreement(item)} className="py-1.5 px-3 text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-1.5 font-semibold transition-colors shrink-0" title="View Loan Agreement">
                                <FileText size={14}/> {item.agreementStatus === 'pending' ? 'Review Agreement' : 'View Agreement'}
                            </button>
                        )}
                        {item.type === 'asset' && !item.isAutomated && !isViewer && !item.internalLoanId && (
                            <button onClick={() => onValuate(item)} className="py-1.5 px-3 text-purple-600 hover:text-purple-700 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center gap-1.5 font-semibold transition-colors shrink-0" title="Use Valuation Tool">
                                <CalculatorIcon size={14}/> Valuate
                            </button>
                        )}
                        {item.type !== 'business_equity' && !isViewer && (
                            <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
                                <button onClick={() => onEdit(item)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center" title="Edit"><Edit2 size={16} /></button>
                                {!(item.type === 'liability' && item.internalLoanId) && (
                                   <button onClick={() => confirmDelete(item)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center" title="Delete"><Trash2 size={16} /></button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
};

  const AssetsView = () => {
    const context = useContext(AppContext)!;
    const { filteredData, addAsset, updateAsset, deleteAsset, repayLiability, activeCurrencyCode, symbol, fullCurrencyName, activeProfileId, data, setData, formatAmount, simulatedUser, metrics, timeFilter } = context;

  const isBusiness = activeProfileId !== 'personal';
  const isViewer = simulatedUser?.accessLevel === 'viewer';
  const profileName = activeProfileId === 'personal' ? data.profile.name : data.businesses.find(b => b.id === activeProfileId)?.name || 'Unknown Business';

  const [isModalOpen, setModalOpen] = useState(false);
  const [isPayModalOpen, setPayModalOpen] = useState(false);
  const [isValuationModalOpen, setValuationModalOpen] = useState(false);
  const [isAgreementModalOpen, setAgreementModalOpen] = useState(false);
  const [agreementTarget, setAgreementTarget] = useState<Asset | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Custom Category State
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [currentBaseMultiplier, setCurrentBaseMultiplier] = useState(30);
  
  const [isValuatingDraft, setIsValuatingDraft] = useState(false);
  const [fundingMethod, setFundingMethod] = useState<'bucket' | 'liability'>('bucket');
  const [selectedBucket, setSelectedBucket] = useState('');
  const [viewMode, setViewMode] = useState<'standard'|'true'>('true');

  
  const [payTarget, setPayTarget] = useState<Asset | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [paySourceBucket, setPaySourceBucket] = useState('');
  const [payDate, setPayDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [payTime, setPayTime] = useState<string>(() => getSystemTimeString());
  const [valuationTarget, setValuationTarget] = useState<Asset | null>(null);
  const [terminationState, setTerminationState] = useState<{ isOpen: boolean, step: number, reason: string, keyword: string, asset: Asset | null }>({ isOpen: false, step: 1, reason: '', keyword: '', asset: null });

  const executeTermination = () => {
    if (terminationState.keyword !== 'TERMINATE' || !terminationState.asset) return;
    
    context.setData(prev => {
        let newEntries = [...prev.entries];
        let newAssets = [...prev.assets];

        const loanAsset = terminationState.asset!;
        const unpaidPrincipal = loanAsset.amount; 

        // Write audit record
        const auditEntry = {
            id: `adj_${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now(),
            description: `Loan Terminated - Valuation Adjustment (Bad Debt): ${terminationState.reason}`,
            amount: unpaidPrincipal,
            type: 'expense' as const,
            subtype: 'BAD_DEBT',
            isDirectAllocation: true, 
            profileId: loanAsset.profileId,
            category: 'Bad Debt Write-off'
        };
        newEntries.push(auditEntry);

        // Update assets to zero out and halt automations
        newAssets = newAssets.map(a => {
            if (a.internalLoanId === loanAsset.internalLoanId) {
                return { ...a, amount: 0, nextDueDate: undefined, monthlyIncome: 0, initialAmount: 0, isAutomated: false, status: 'terminated' };
            }
            return a;
        });

        return { ...prev, entries: newEntries, assets: newAssets };
    });
    setTerminationState({ isOpen: false, step: 1, reason: '', keyword: '', asset: null });
  };

  // UNIFIED LIABILITY STATE
  const [liabilityDetails, setLiabilityDetails] = useState<{
      provider: string; interestRate: number; termValue: number; termUnit: string; monthlyPayment: number; repaymentDate: string; nextDueDate: string; linkedAssetId: string; autoRepayBucketId: string; rateIsAnnual?: boolean;
  }>({ provider: '', interestRate: 0, termValue: 12, termUnit: 'Months', monthlyPayment: 0, repaymentDate: '', nextDueDate: '', linkedAssetId: '', autoRepayBucketId: '', rateIsAnnual: true });

  const [newAsset, setNewAsset] = useState<Partial<Asset>>({ date: new Date().toISOString().split('T')[0], time: getSystemTimeString(), description: '', amount: 0, initialAmount: 0, type: 'asset', monthlyIncome: 0, assetClass: isBusiness ? 'SaaS (B2B High Growth)' : 'Stocks/ETFs' });
  const [isMarketValueEdited, setIsMarketValueEdited] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    timeRange: 'Any time',
    exactDate: '',
    assetClass: 'All',
    nextDueRange: 'Any time',
    repaymentTerm: 'All'
  });

  const uniqueAssetClasses = useMemo(() => {
    if (!filteredData || !filteredData.assets) return [];
    return Array.from(new Set(filteredData.assets.map((a: any) => a.assetClass))).filter(Boolean).sort();
  }, [filteredData]);

  const filteredAssetsBase = (filteredData?.assets || []).filter((a: any) => {
    let keep = true;
    
    if (advancedFilters.timeRange !== 'Any time') {
        const now = new Date();
        const dateStr = a.date ? String(a.date) : '';
        const entryDate = new Date(dateStr || now);
        const diffDays = Math.ceil(Math.abs(now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
        if (advancedFilters.timeRange === 'Today') keep = keep && diffDays <= 1;
        else if (advancedFilters.timeRange === 'This week') keep = keep && diffDays <= 7;
        else if (advancedFilters.timeRange === 'This month') keep = keep && dateStr.startsWith(now.toISOString().slice(0, 7));
        else if (advancedFilters.timeRange === 'Past 3 months') keep = keep && diffDays <= 90;
        else if (advancedFilters.timeRange === 'This year') keep = keep && dateStr.startsWith(now.getFullYear().toString());
        else if (advancedFilters.timeRange === 'Exact date' && advancedFilters.exactDate) keep = keep && dateStr === advancedFilters.exactDate;
    }

    if (advancedFilters.assetClass !== 'All') {
        keep = keep && a.assetClass === advancedFilters.assetClass;
    }

    if (a.type === 'liability') {
       if (advancedFilters.repaymentTerm !== 'All') {
           keep = keep && a.repaymentTerm === advancedFilters.repaymentTerm;
       }
       if (advancedFilters.nextDueRange !== 'Any time' && a.nextDueDate) {
           const now = new Date();
           const nextDueStr = String(a.nextDueDate);
           const dueDate = new Date(nextDueStr);
           const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
           if (advancedFilters.nextDueRange === 'Overdue') keep = keep && diffDays < 0;
           else if (advancedFilters.nextDueRange === 'Due Today') keep = keep && diffDays === 0;
           else if (advancedFilters.nextDueRange === 'Due this week') keep = keep && diffDays >= 0 && diffDays <= 7;
           else if (advancedFilters.nextDueRange === 'Due this month') keep = keep && nextDueStr.startsWith(now.toISOString().slice(0, 7));
       } else if (advancedFilters.nextDueRange !== 'Any time' && !a.nextDueDate) {
           keep = false; // Filter out if there's no due date but a due range is selected
       }
    }

    if (searchQuery.trim()) {
       const lowerQ = searchQuery.toLowerCase();
       keep = keep && (
        (a.description && a.description.toLowerCase().includes(lowerQ)) || 
        (a.assetClass && a.assetClass.toLowerCase().includes(lowerQ)) ||
        (a.type && a.type.toLowerCase().includes(lowerQ)) ||
        (a.date && a.date.toLowerCase().includes(lowerQ)) ||
        (a.amount && a.amount.toString().includes(lowerQ)) ||
        (a.provider && a.provider.toLowerCase().includes(lowerQ))
       );
    }
    
    return keep;
  });

  const assets = filteredAssetsBase.filter(a => {
      if (a.status === 'terminated') return false;
      if (a.type !== 'asset' && a.type !== 'business_equity') return false;
      if (viewMode === 'true') {
          // True View only shows income-generating assets
          if (a.type === 'business_equity') return true; // Assuming business is income generating for this basic view, or it could be checked via calculation
          return a.isIncomeProducing || getEffectiveMonthlyIncome(a) > 0;
      }
      return true;
  });
  const liabilities = filteredAssetsBase.filter(a => a.type === 'liability' && a.status !== 'terminated');
  
  // BUCKET LOGIC: Use "Main Revenue Bucket" or "Main Income Bucket" display label
  const uncatBucket = filteredData.allocations.find(
    (a) => a.name === "Uncategorized"
  );
  const otherBuckets = filteredData.allocations.filter(
    (a) => a.name !== "Uncategorized"
  );

  const buckets = [
      {
          value: uncatBucket?.id || '',
          label: `${isBusiness ? 'Main Revenue Bucket (Landing)' : 'Main Income Bucket (Landing)'} (${formatAmount(uncatBucket?.balance || 0)})`,
          name: 'Uncategorized'
      },
      ...buildHierarchicalOptions(
          otherBuckets, 
          (a) => `${a.name} (${formatAmount(getEffectiveBalance(filteredData.allocations, a.id))})`, 
          undefined, 
          0, 
          'id'
      )
  ];

  const assetOptions = assets.map(a => ({ value: a.id, label: `${a.description} (${formatAmount(a.monthlyIncome || 0)}/mo income)` }));

  useEffect(() => {
      if (buckets.length > 0) {
          if (!selectedBucket) setSelectedBucket(buckets[0].value);
          if (!paySourceBucket) setPaySourceBucket(buckets[0].value);
      }
  }, [buckets, isModalOpen, isPayModalOpen, selectedBucket, paySourceBucket]);

  // Sync Current Market Value with Initial ONLY IF user hasn't edited market value
  const handleInitialAmountChange = (val: number) => {
      setNewAsset(prev => {
          const updates: any = { initialAmount: val };
          if (!isMarketValueEdited) {
              updates.amount = val;
          }
          return { ...prev, ...updates };
      });
  };

  let displayAssets = [...assets];
  if (viewMode === 'standard') {
      const spendableCash = filteredData.allocations.reduce((sum, a) => sum + a.balance, 0);
      if (spendableCash > 0) {
          displayAssets.unshift({
              id: 'virtual_cash_balance',
              type: 'asset',
              description: 'Total Spendable Cash (Buckets)',
              amount: spendableCash,
              date: new Date().toISOString().split('T')[0],
              assetClass: 'Cash/Equivalents',
              monthlyIncome: 0,
              profileId: activeProfileId,
              initialAmount: spendableCash
          } as any);
      }
  }

  const groupedAssets: Record<string, Asset[]> = {};
  displayAssets.forEach(a => { const cls = a.assetClass || 'Uncategorized'; if (!groupedAssets[cls]) groupedAssets[cls] = []; groupedAssets[cls].push(a); });

  const totalAssets = displayAssets.reduce((acc, curr) => acc + curr.amount, 0);
  const totalLiabilities = liabilities.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPassiveIncome = displayAssets.reduce((acc, curr) => acc + getEffectiveMonthlyIncome(curr), 0);

  // Sector Definitions Based on Context
  const contextSectors = isBusiness ? BUSINESS_SECTORS : PERSONAL_SECTORS;
  const allCategories = [
      ...Object.keys(contextSectors).map(k => ({ value: k, label: k, multiplier: contextSectors[k] })),
      ...(data.customCategories || []).map(c => ({ value: c.name, label: c.name, multiplier: c.multiplier }))
  ];

  const handleEdit = (asset: Asset) => {
      setNewAsset(asset);
      setIsMarketValueEdited(true); // Assume editing an existing asset implies market value is specific
      const isKnown = allCategories.some(c => c.value === asset.assetClass);
      
      if(asset.type === 'asset') { 
          setIsCustomCategory(!isKnown);
          // Find multiplier
          const match = allCategories.find(c => c.value === asset.assetClass);
          setCurrentBaseMultiplier(match ? match.multiplier : 30);
      }
      
      if (asset.type === 'liability') {
          setLiabilityDetails({
              provider: asset.provider || asset.description, interestRate: asset.interestRate || 0, termValue: asset.termValue || 12,
              termUnit: asset.termUnit || 'Months', monthlyPayment: asset.monthlyPayment || 0,
              repaymentDate: asset.repaymentDate || '', nextDueDate: asset.nextDueDate || '', linkedAssetId: asset.linkedAssetId || '',
              autoRepayBucketId: asset.autoRepayBucketId || '',
              rateIsAnnual: asset.rateIsAnnual !== false
          });
      }
      setIsEditMode(true);
      setModalOpen(true);
  };

  const handleValuate = (asset: Asset) => {
      setValuationTarget(asset);
      setValuationModalOpen(true);
  };

  const openPayModal = (asset: Asset) => {
      setPayTarget(asset);
      setPayAmount(asset.monthlyPayment || 0); 
      const defaultBucket = buckets.find(b => b.name === 'Uncategorized') || buckets[0];
      setPaySourceBucket(defaultBucket?.value || '');
      setPayDate(new Date().toISOString().split('T')[0]);
      setPayTime(getSystemTimeString());
      setPayModalOpen(true);
  }

  const openAgreementModal = (asset: Asset) => {
      setAgreementTarget(asset);
      setAgreementModalOpen(true);
  }

  const handleSignAgreement = () => {
      if (!agreementTarget || !agreementTarget.internalLoanId) return;

      if (!window.confirm("Are you sure you want to digitally sign this agreement? This verifies your acceptance of the terms.")) return;

      const timestamp = new Date().toISOString();
      const loanId = agreementTarget.internalLoanId;

      setData(prev => {
          let updatedAssets = prev.assets.map(a => 
              (a.internalLoanId === loanId)
                  ? { ...a, agreementStatus: 'signed', agreementSignedAt: timestamp }
                  : a
          );
          
          return {
              ...prev,
              assets: updatedAssets
          };
      });

      setAgreementModalOpen(false);
      setAgreementTarget(null);
  };

  const handleRepaySubmit = () => {
      if(payTarget && payAmount > 0 && paySourceBucket) {
          if (!window.confirm(`Process payment of ${formatAmount(payAmount)} for ${payTarget.description}?`)) return;
          repayLiability(payTarget.id, payAmount, paySourceBucket, payDate, payTime || getSystemTimeString());
          setPayModalOpen(false);
          setPayTarget(null);
      }
  }

  const closeModal = () => {
      setModalOpen(false); setIsEditMode(false); setIsCustomCategory(false); setIsMarketValueEdited(false);
      setNewAsset({ date: new Date().toISOString().split('T')[0], time: getSystemTimeString(), description: '', amount: 0, initialAmount: 0, type: 'asset', monthlyIncome: 0, assetClass: isBusiness ? 'SaaS (B2B High Growth)' : 'Stocks/ETFs' });
      setFundingMethod('bucket'); setSelectedBucket(buckets[0]?.value || '');
      setLiabilityDetails({ provider: '', interestRate: 0, termValue: 12, termUnit: 'Months', monthlyPayment: 0, repaymentDate: '', nextDueDate: '', linkedAssetId: '', rateIsAnnual: true, autoRepayBucketId: '' });
  };

  const calculateFullDebt = () => {
      const principal = newAsset.initialAmount || 0;
      const rate = liabilityDetails.interestRate || 0;
      const total = principal + (principal * (rate / 100));
      setNewAsset(prev => ({...prev, amount: total}));
  };

  const handleSectorChange = (val: string) => {
      setNewAsset({...newAsset, assetClass: val});
      const match = allCategories.find(c => c.value === val);
      if (match) setCurrentBaseMultiplier(match.multiplier);
  };

  const handleSubmit = () => {
    if (!newAsset.description || (!newAsset.amount && !newAsset.initialAmount)) return;
    
    // CUSTOM CATEGORY / MULTIPLIER PERSISTENCE
    if (newAsset.type === 'asset' && newAsset.assetClass) {
        // If it's a new custom sector OR an existing one with a modified multiplier
        const existingCat = allCategories.find(c => c.value === newAsset.assetClass);
        
        if (!existingCat || existingCat.multiplier !== currentBaseMultiplier) {
             // Save to global customCategories
             const newCatDef: CategoryDef = { name: newAsset.assetClass, multiplier: currentBaseMultiplier };
             setData(prev => {
                 const others = (prev.customCategories || []).filter(c => c.name !== newAsset.assetClass);
                 return { ...prev, customCategories: [...others, newCatDef] };
             });
        }
    }

    // STRICTLY SEPARATE: Market Value (Amount) vs Purchase Price (InitialAmount)
    let finalAmount = Number(newAsset.amount || 0); // Market Value
    let finalInitialAmount = Number(newAsset.initialAmount || 0); // Purchase Price

    // If no market value is provided, default to purchase price.
    // BUT NEVER allow market value to overwrite purchase price if purchase price is 0.
    if (finalAmount === 0 && finalInitialAmount > 0) finalAmount = finalInitialAmount;

    if (newAsset.type === 'liability' && !isEditMode) {
        const principal = finalInitialAmount;
        finalAmount = principal; 
        finalInitialAmount = principal; 
    }

    const effectiveTime = (newAsset.time && newAsset.time.trim().length >= 4) ? newAsset.time.trim() : getSystemTimeString();
    const { timestamp: finalTimestamp } = buildEntryTimestamp(newAsset.date || new Date().toISOString().split('T')[0], effectiveTime);

    const assetToSave: any = {
        ...newAsset,
        time: effectiveTime,
        amount: finalAmount, 
        initialAmount: finalInitialAmount, 
        monthlyIncome: Number(newAsset.monthlyIncome || 0),
        timestamp: finalTimestamp
    };

    if (isEditMode && newAsset.id) {
        if (!window.confirm("Update this asset/liability?")) return;
        if (assetToSave.type === 'liability') {
            assetToSave.provider = liabilityDetails.provider;
            assetToSave.interestRate = liabilityDetails.interestRate;
            assetToSave.rateIsAnnual = liabilityDetails.rateIsAnnual;
            assetToSave.termValue = liabilityDetails.termValue;
            assetToSave.termUnit = liabilityDetails.termUnit;
            assetToSave.monthlyPayment = liabilityDetails.monthlyPayment;
            assetToSave.repaymentDate = liabilityDetails.repaymentDate;
            assetToSave.nextDueDate = liabilityDetails.nextDueDate;
            assetToSave.linkedAssetId = liabilityDetails.linkedAssetId;
            assetToSave.autoRepayBucketId = liabilityDetails.autoRepayBucketId;
        }
        updateAsset(assetToSave as Asset);
    } else {
        if (!window.confirm("Add this asset/liability?")) return;
        if (newAsset.type === 'asset') {
            // Force selection if empty (fallback to first available bucket ID)
            let finalSourceBucket = selectedBucket;
            if (fundingMethod === 'bucket' && !finalSourceBucket && buckets.length > 0) {
                finalSourceBucket = buckets[0].value;
            }
            
            // NOTE: The 'addAsset' function in AppContext uses 'initialAmount' to deduct from bucket.
            // We ensure 'assetToSave.initialAmount' is strictly the Purchase Price user entered.
            addAsset(assetToSave as Asset, { method: fundingMethod, sourceId: finalSourceBucket, liabilityDetails: fundingMethod === 'liability' ? liabilityDetails : undefined });
        } else {
            assetToSave.provider = liabilityDetails.provider;
            assetToSave.interestRate = liabilityDetails.interestRate;
            assetToSave.rateIsAnnual = liabilityDetails.rateIsAnnual;
            assetToSave.termValue = liabilityDetails.termValue;
            assetToSave.termUnit = liabilityDetails.termUnit;
            assetToSave.monthlyPayment = liabilityDetails.monthlyPayment;
            assetToSave.repaymentDate = liabilityDetails.repaymentDate;
            assetToSave.linkedAssetId = liabilityDetails.linkedAssetId;
            addAsset(assetToSave as Asset);
        }
    }
    closeModal();
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20">
      {/* ... Header and Cards ... */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-xl sm:text-2xl font-bold">{isBusiness ? 'Balance Sheet' : 'Balance Sheet'}</h2>
            <p className="text-xs sm:text-sm text-gray-500">{isBusiness ? 'Track Productive Assets vs. Liabilities' : 'Track everything you own (Assets) vs. owe (Liabilities).'}</p>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg" data-tour="balance-sheet-true-view">
            <button 
                className={`px-4 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-colors ${viewMode === 'true' ? 'bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'}`}
                onClick={() => setViewMode('true')}
                title="Only includes income-generating assets"
            >
                B-Quadrant View (Freedom)
            </button>
            <button 
                className={`px-4 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-colors ${viewMode === 'standard' ? 'bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'}`}
                onClick={() => setViewMode('standard')}
            >
                Standard Accounting View
            </button>
        </div>

        
        <div className="flex-1 w-full max-w-md relative flex bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm group">
            <div className="pl-3 flex items-center pointer-events-none flex-shrink-0">
              <Search className="h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search or filter records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-2 pr-3 py-2 bg-transparent border-none focus:ring-0 text-sm placeholder-gray-400"
            />
            <div className="relative border-l border-gray-100 dark:border-gray-800">
               <button 
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  className={`h-full px-3 flex items-center gap-1.5 text-xs font-bold transition-colors ${isFilterMenuOpen || advancedFilters.timeRange !== 'Any time' || advancedFilters.assetClass !== 'All' ? 'text-primary bg-primary/5' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                  title="Advanced Filter Options"
               >
                  <Filter size={14} />
                  <span className="hidden sm:inline">Filters</span>
               </button>
               
               {isFilterMenuOpen && (
                 <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 z-50 transform origin-top-right transition-all">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-sm">Search filters</h3>
                      <button onClick={() => setIsFilterMenuOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={16}/></button>
                    </div>

                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Upload / Acquisition date</label>
                        <select 
                          value={advancedFilters.timeRange}
                          onChange={(e) => setAdvancedFilters({...advancedFilters, timeRange: e.target.value})}
                          className="w-full text-sm bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                        >
                          <option>Any time</option>
                          <option>Today</option>
                          <option>This week</option>
                          <option>This month</option>
                          <option>Past 3 months</option>
                          <option>This year</option>
                          <option>Exact date</option>
                        </select>
                      </div>

                      {advancedFilters.timeRange === 'Exact date' && (
                         <div>
                          <input type="date" value={advancedFilters.exactDate} onChange={(e) => setAdvancedFilters({...advancedFilters, exactDate: e.target.value})} className="w-full text-sm bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none" />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Asset Class / Feature</label>
                        <select 
                          value={advancedFilters.assetClass}
                          onChange={(e) => setAdvancedFilters({...advancedFilters, assetClass: e.target.value})}
                          className="w-full text-sm bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                        >
                           <option value="All">All</option>
                           {uniqueAssetClasses.map((ac: any) => (
                             <option key={ac} value={ac}>{ac}</option>
                           ))}
                        </select>
                      </div>

                      <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                         <h4 className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Liability Filters</h4>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Repayment Term</label>
                            <select 
                              value={advancedFilters.repaymentTerm}
                              onChange={(e) => setAdvancedFilters({...advancedFilters, repaymentTerm: e.target.value})}
                              className="w-full text-sm bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                            >
                               <option value="All">All terms</option>
                               <option value="Monthly">Monthly</option>
                               <option value="Quarterly">Quarterly</option>
                               <option value="Yearly">Yearly</option>
                               <option value="One-Time">One-Time</option>
                            </select>
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Next Payment Due</label>
                            <select 
                              value={advancedFilters.nextDueRange}
                              onChange={(e) => setAdvancedFilters({...advancedFilters, nextDueRange: e.target.value})}
                              className="w-full text-sm bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
                            >
                               <option value="Any time">Any time</option>
                               <option value="Overdue">Overdue</option>
                               <option value="Due Today">Due Today</option>
                               <option value="Due this week">Due this week</option>
                               <option value="Due this month">Due this month</option>
                            </select>
                         </div>
                      </div>

                    </div>
                    
                    <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button 
                          className="flex-1 px-3 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                          onClick={() => setAdvancedFilters({ timeRange: 'Any time', exactDate: '', assetClass: 'All', nextDueRange: 'Any time', repaymentTerm: 'All' })}
                        >
                          Clear
                        </button>
                        <button 
                          className="flex-1 px-3 py-2 text-sm font-bold text-white bg-primary hover:opacity-90 rounded-lg"
                          onClick={() => setIsFilterMenuOpen(false)}
                        >
                          Apply
                        </button>
                    </div>
                 </div>
               )}
            </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button className="flex flex-col justify-center items-center py-2 h-auto sm:hidden" variant="secondary" onClick={() => downloadReceipt(filteredData.assets, "Balance_Sheet_Report", 'list', { profileName, currency: fullCurrencyName })}><Download size={16} /> <span className="text-[10px] mt-1">Download</span></Button>
            <Button className="hidden sm:flex sm:flex-none !px-3" variant="secondary" onClick={() => downloadReceipt(filteredData.assets, "Balance_Sheet_Report", 'list', { profileName, currency: fullCurrencyName })}><Download size={16} /></Button>
            {!isViewer && (
                <>
                    <Button className="flex items-center justify-center gap-1 w-full sm:w-auto py-2 sm:py-1.5 h-auto" onClick={() => { setNewAsset({...newAsset, type: 'asset', assetClass: isBusiness ? 'SaaS (B2B High Growth)' : 'Stocks/ETFs'}); setModalOpen(true); }} data-tour="action-add-asset"><Plus size={18} /> Asset</Button>
                    <Button className="flex items-center justify-center gap-1 w-full sm:w-auto py-2 sm:py-1.5 h-auto" variant="secondary" onClick={() => { setNewAsset({...newAsset, type: 'liability'}); setModalOpen(true); }} data-tour="action-add-liability"><Plus size={18} /> Liability</Button>
                </>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ASSETS */}
        <Card title={isBusiness ? "Business Assets" : "Personal Assets"}>
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-100 dark:border-green-900/30">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3"><div className="p-2 bg-white dark:bg-black/20 text-green-600 rounded-lg shadow-sm">{isBusiness ? <Briefcase size={20} /> : <Building size={20} />}</div><div className="min-w-0 flex-1"><p className="text-xs text-green-700 dark:text-green-400 font-semibold uppercase tracking-wider">Total Value</p><h3 className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight text-gray-900 dark:text-white break-words"><MoneyDisplay amount={totalAssets} symbol={symbol} /></h3></div></div>
                </div>
                {totalPassiveIncome !== 0 && (<div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800/50 flex items-center justify-between text-sm"><div className={`flex items-center gap-1 ${totalPassiveIncome > 0 ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`}><TrendingUp size={14} className={totalPassiveIncome < 0 ? 'rotate-180' : ''}/><span>{isBusiness ? 'Net Cashflow' : 'Net Recurring Passive Income/mo'}: <strong>{formatAmount(totalPassiveIncome)}/mo</strong></span></div></div>)}
            </div>
            <div className="space-y-4">
                {Object.entries(groupedAssets).map(([category, items]) => items.length === 0 ? null : (
                    <div key={category} className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                        <button 
                            onClick={() => setExpandedCategories(prev => ({...prev, [category]: !prev[category]}))}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                {expandedCategories[category] ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                                <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{category}</h5>
                                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{items.length} Asset{items.length !== 1 ? 's' : ''}</span>
                            </div>
                        </button>
                        {expandedCategories[category] && (
                            <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-white/10 space-y-3">
                                {items.map(asset => <AssetRow key={asset.id} item={asset} onEdit={handleEdit} onPay={openPayModal} onValuate={handleValuate} profileName={profileName} currency={symbol} isViewer={isViewer} onViewAgreement={openAgreementModal} onTerminate={(a) => setTerminationState({ isOpen: true, step: 1, reason: '', keyword: '', asset: a })} />)}
                            </div>
                        )}
                    </div>
                ))}
                {assets.length === 0 && (<div className="text-center py-10 opacity-60"><Building size={48} className="mx-auto mb-2 text-gray-300" /><p className="text-sm">No assets recorded.</p></div>)}
            </div>
        </Card>

        {/* LIABILITIES */}
        <Card title={isBusiness ? "Business Liabilities" : "Personal Liabilities"}>
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-100 dark:border-red-900/30">
                <div className="flex items-center gap-3"><div className="p-2 bg-white dark:bg-black/20 text-red-600 rounded-lg shadow-sm"><AlertOctagon size={20} /></div><div className="min-w-0 flex-1"><p className="text-xs text-red-700 dark:text-red-400 font-semibold uppercase tracking-wider">Total Debt</p><h3 className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight text-gray-900 dark:text-white break-words"><MoneyDisplay amount={totalLiabilities} symbol={symbol} /></h3></div></div>
            </div>
            <div className="space-y-3">
                {liabilities.length === 0 && (<div className="text-center py-10 opacity-60"><AlertOctagon size={48} className="mx-auto mb-2 text-gray-300" /><p className="text-sm">Debt free! No liabilities recorded.</p></div>)}
                {liabilities.map(item => <AssetRow key={item.id} item={item} onEdit={handleEdit} onPay={openPayModal} onValuate={handleValuate} profileName={profileName} currency={symbol} isViewer={isViewer} onViewAgreement={openAgreementModal} />)}
            </div>
        </Card>
      </div>

      {/* Agreement Modal */}
      <Modal isOpen={isAgreementModalOpen} onClose={() => {setAgreementModalOpen(false); setAgreementTarget(null);}} title="Internal Loan Agreement">
          {agreementTarget && (
             <div className="space-y-4 text-sm text-gray-800 dark:text-gray-200">
                <div className="p-4 bg-gray-50 dark:bg-slate-800 border rounded-xl">
                   <h3 className="font-bold text-lg mb-4 text-center border-b pb-2">LOAN AGREEMENT</h3>
                   <div className="space-y-2">
                       {(() => {
                            const lenderId = agreementTarget.type === 'asset' ? agreementTarget.profileId : agreementTarget.counterpartyId;
                            const borrowerId = agreementTarget.type === 'liability' ? agreementTarget.profileId : agreementTarget.counterpartyId;
                            const resolveName = (id: string) => id === 'personal' ? `${data.profile.name} (Personal Account)` : (data.businesses.find(b => b.id === id)?.name || 'Unknown');
                            const lenderName = resolveName(lenderId || '');
                            const borrowerName = resolveName(borrowerId || '');

                            return (
                                <>
                                    <p><strong>Lender:</strong> {lenderName}</p>
                                    <p><strong>Borrower:</strong> {borrowerName}</p>
                                </>
                            );
                       })()}
                       <p><strong>Principal Amount:</strong> {formatAmount(agreementTarget.initialAmount || agreementTarget.amount)}</p>
                       <p><strong>Interest Rate:</strong> {agreementTarget.interestRate || 0}%</p>
                       <p><strong>Term:</strong> {agreementTarget.termValue || 0} {agreementTarget.termUnit}</p>
                       <p><strong>Monthly Payment:</strong> {formatAmount(agreementTarget.monthlyPayment || 0)}</p>
                       <p><strong>Reason / Terms:</strong> {agreementTarget.agreementReason || 'Standard internal transfer loan.'}</p>
                       <p><strong>Date Issued:</strong> {new Date(agreementTarget.date).toLocaleDateString()}</p>
                   </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-xl">
                   <p><strong>Status:</strong> {agreementTarget.agreementStatus === 'pending' ? 'Pending Signature' : `Signed on ${new Date(agreementTarget.agreementSignedAt || '').toLocaleString()}`}</p>
                   {agreementTarget.agreementStatus === 'pending' && agreementTarget.type === 'liability' && agreementTarget.profileId === activeProfileId && (
                       <div className="mt-3">
                           <p className="text-xs mb-2">As the Borrower ({profileName}), you must sign to acknowledge this debt obligation to the Lender.</p>
                           <Button onClick={handleSignAgreement} className="w-full bg-blue-600 hover:bg-blue-700 text-white">Accept & Sign Agreement</Button>
                       </div>
                   )}
                </div>

                <div className="flex flex-wrap justify-between gap-2 pt-2">
                    <Button variant="secondary" onClick={() => {setAgreementModalOpen(false); setAgreementTarget(null);}}>Close</Button>
                    <Button variant="outline" onClick={() => {
                        const lenderId = agreementTarget.type === 'asset' ? agreementTarget.profileId : agreementTarget.counterpartyId;
                        const borrowerId = agreementTarget.type === 'liability' ? agreementTarget.profileId : agreementTarget.counterpartyId;
                        const resolveName = (id: string) => id === 'personal' ? `${data.profile.name} (Personal Account)` : (data.businesses.find(b => b.id === id)?.name || 'Unknown');
                        const lenderName = resolveName(lenderId || '');
                        const borrowerName = resolveName(borrowerId || '');
                        downloadLoanAgreement(lenderName, borrowerName, agreementTarget, formatAmount);
                    }}><Download size={14} className="mr-2"/> Download Agreement (.html)</Button>
                </div>
             </div>
          )}
      </Modal>

      {/* Pay Modal (Unchanged) */}
      <Modal isOpen={isPayModalOpen} onClose={() => setPayModalOpen(false)} title="Quick Repay">
          {/* ... */}
          <div className="space-y-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Target Liability</p>
                  <p className="font-bold text-lg">{payTarget?.description}</p>
                  <div className="flex justify-between items-end mt-1">
                      <p className="text-sm text-red-600">Owed: {formatAmount(payTarget?.amount || 0)}</p>
                      {payTarget?.nextDueDate && <p className="text-[10px] text-gray-500 bg-white dark:bg-black/20 px-2 rounded">Due: {new Date(payTarget.nextDueDate).toLocaleDateString()}</p>}
                  </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Payment Date" type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
                  <Input label="Payment Time (Bank Info)" type="time" value={payTime} onChange={e => setPayTime(e.target.value)} />
              </div>
              <InlineCurrencyConverter 
                  targetCurrency={activeCurrencyCode || context?.activeCurrencyCode || context?.data?.profile?.currency || 'USD'} 
                  onApply={(val) => setPayAmount(val)} 
              />
              <Input label={`Payment Amount (${symbol})`} type="number" value={payAmount} onChange={e => setPayAmount(parseFloat(e.target.value))} enableCalculator enableCurrencyConvert />
              <Select label="Pay From" options={buckets} value={paySourceBucket} onChange={e => setPaySourceBucket(e.target.value)} />
              <div className="flex justify-end pt-4 gap-2">
                  <Button variant="secondary" onClick={() => setPayModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleRepaySubmit}>Confirm Payment</Button>
              </div>
          </div>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={`${isEditMode ? 'Edit' : 'Add'} ${newAsset.type === 'asset' ? (isBusiness ? 'Business Asset' : 'Personal Asset') : (isBusiness ? 'Business Liability' : 'Personal Liability')}`}>
        <div className="space-y-4">
            <Input label="Name / Description" value={newAsset.description} onChange={e => setNewAsset({...newAsset, description: e.target.value})} placeholder={newAsset.type === 'asset' ? (isBusiness ? "e.g. Work Truck, Generator" : "e.g. Apple Stock, Rental House") : "e.g. Credit Card, Loan"}/>
            
            <InlineCurrencyConverter 
                targetCurrency={activeCurrencyCode || context?.activeCurrencyCode || context?.data?.profile?.currency || 'USD'} 
                onApply={(val) => {
                    setNewAsset(prev => ({
                        ...prev,
                        amount: val,
                        initialAmount: prev.initialAmount ? prev.initialAmount : val
                    }));
                    setIsMarketValueEdited(true);
                }} 
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {newAsset.type === 'liability' && !isEditMode ? (
                    <div className="sm:col-span-2">
                        <Input label={`Principal Amount (Borrowed) (${symbol})`} type="number" value={newAsset.initialAmount || ''} onChange={e => setNewAsset({...newAsset, initialAmount: parseFloat(e.target.value)})} placeholder="0.00" enableCalculator enableCurrencyConvert />
                        <p className="text-[10px] text-gray-400 mt-1">Enter the original amount borrowed. Interest will be added automatically below.</p>
                    </div>
                ) : (
                    <>
                        <div className="relative">
                            <Input 
                                label={newAsset.type === 'asset' ? `Purchase Price (Cost) (${symbol})` : `Principal Amount (${symbol})`} 
                                type="number" 
                                value={newAsset.initialAmount || ''} 
                                onChange={e => handleInitialAmountChange(parseFloat(e.target.value))} 
                                placeholder="0.00" 
                                enableCalculator={!newAsset.internalLoanId}
                                enableCurrencyConvert={!newAsset.internalLoanId}
                                disabled={!!newAsset.internalLoanId}
                            />
                            {newAsset.internalLoanId ? (
                                <p className="text-[10px] text-gray-400 mt-1">Managed automatically by loan terms.</p>
                            ) : (
                                <p className="text-[10px] text-gray-400 -mt-2 mb-2 absolute right-0">Expense recorded from Bucket</p>
                            )}
                        </div>
                        
                        {newAsset.type === 'liability' ? (
                            <div className="relative">
                                <Input label={`Outstanding Balance (Owed) (${symbol})`} type="number" value={newAsset.amount || ''} onChange={e => setNewAsset({...newAsset, amount: parseFloat(e.target.value)})} placeholder="0.00" enableCalculator={!newAsset.internalLoanId} enableCurrencyConvert={!newAsset.internalLoanId} disabled={!!newAsset.internalLoanId}/>
                                {!newAsset.internalLoanId && (
                                    <button onClick={calculateFullDebt} className="absolute right-0 top-7 text-[10px] text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-bl-lg rounded-tr-lg border border-blue-200 flex items-center gap-1 font-bold" title="Reset based on Principal + Interest">
                                        <RefreshCw size={10}/> Reset
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="relative">
                                <Input 
                                    label={newAsset.internalLoanId || (typeof newAsset.assetClass === 'string' && newAsset.assetClass.toLowerCase().includes('loan')) ? `Remaining Balance (${symbol})` : `Current Market Value (${symbol})`} 
                                    type="number" 
                                    value={newAsset.amount === 0 ? 0 : newAsset.amount || ''} 
                                    onChange={e => { setNewAsset({...newAsset, amount: parseFloat(e.target.value)}); setIsMarketValueEdited(true); }} 
                                    placeholder={newAsset.initialAmount ? newAsset.initialAmount.toString() : "0.00"} 
                                    enableCalculator={!newAsset.internalLoanId && !(typeof newAsset.assetClass === 'string' && newAsset.assetClass.toLowerCase().includes('loan'))}
                                    enableCurrencyConvert={!newAsset.internalLoanId && !(typeof newAsset.assetClass === 'string' && newAsset.assetClass.toLowerCase().includes('loan'))}
                                    disabled={!!newAsset.internalLoanId || (typeof newAsset.assetClass === 'string' && newAsset.assetClass.toLowerCase().includes('loan'))}
                                />
                                {!newAsset.internalLoanId && (
                                    <button 
                                        onClick={() => {
                                            const tempAsset = { ...newAsset, id: newAsset.id || 'temp_draft', timestamp: new Date().toISOString() } as Asset;
                                            setValuationTarget(tempAsset);
                                            setIsValuatingDraft(true);
                                            setValuationModalOpen(true);
                                        }}
                                        className="absolute right-0 top-7 text-[10px] text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-bl-lg rounded-tr-lg border border-purple-200 flex items-center gap-1 font-bold transition-colors" 
                                        title="Open Valuation Engine"
                                    >
                                        <CalculatorIcon size={10}/> Estimate
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {newAsset.type === 'liability' ? (
                <>
                    <LiabilityCalculatorForm details={liabilityDetails} setDetails={setLiabilityDetails} isBusiness={isBusiness} amount={newAsset.initialAmount || newAsset.amount} formatAmount={formatAmount} isEditMode={isEditMode} buckets={buckets} isInternalLoan={!!newAsset.internalLoanId}/>
                    {isEditMode && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                            <Input label="Next Payment Date" type="date" value={liabilityDetails.nextDueDate} onChange={e => setLiabilityDetails({...liabilityDetails, nextDueDate: e.target.value})} disabled={!!newAsset.internalLoanId}/>
                        </div>
                    )}
                    <div className="mt-2 border-t border-gray-100 pt-2"><label className="block text-xs font-bold text-gray-500 mb-1">Is this "Good Debt"?</label><Select options={[{value: '', label: 'No (Bad Debt)'}, ...assetOptions]} value={liabilityDetails.linkedAssetId} onChange={e => setLiabilityDetails({...liabilityDetails, linkedAssetId: e.target.value})}/></div>
                </>
            ) : (
                !isEditMode && (<div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10"><label className="block text-sm font-bold mb-2">How are you paying for this?</label><div className="flex gap-2 mb-3"><button onClick={() => setFundingMethod('bucket')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${fundingMethod === 'bucket' ? 'bg-primary border-primary text-white' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-600'}`}>Pay from Bucket (Cash)</button><button onClick={() => setFundingMethod('liability')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${fundingMethod === 'liability' ? 'bg-red-500 border-red-500 text-white' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-600'}`}>Pay via Liability (Loan)</button></div>{fundingMethod === 'bucket' ? (<div className="animate-in fade-in"><Select label="Select Source Bucket" options={buckets} value={selectedBucket} onChange={e => setSelectedBucket(e.target.value)}/><p className="text-[10px] text-gray-500 mt-1">This will deduct {formatAmount(newAsset.initialAmount || 0)} from the bucket and record an Expense.</p></div>) : (<LiabilityCalculatorForm details={liabilityDetails} setDetails={setLiabilityDetails} isBusiness={isBusiness} amount={newAsset.initialAmount || newAsset.amount} formatAmount={formatAmount} isEditMode={isEditMode} buckets={buckets}/>)}</div>)
            )}
            
            {newAsset.type === 'asset' && (<div className="relative"><Input label={isBusiness ? "Revenue Generated (Monthly)" : "Monthly Cashflow (+/-)"} type="number" value={newAsset.monthlyIncome || ''} onChange={e => setNewAsset({...newAsset, monthlyIncome: parseFloat(e.target.value)})} placeholder="0.00" enableCalculator={!newAsset.internalLoanId && newAsset.assetClass !== 'Cash/Equivalents'} disabled={!!newAsset.internalLoanId || newAsset.assetClass === 'Cash/Equivalents'}/><p className="text-[10px] text-gray-400 mt-1">{newAsset.internalLoanId ? "Auto-calculated based on interest term." : newAsset.assetClass === 'Cash/Equivalents' ? "Cash is dormant and produces no recurring income. Deploy it to generate returns." : "Use negative values for assets that cost money."}</p></div>)}
            
            {/* isIncomeProducing Checkbox */}
            {newAsset.type === 'asset' && (
                <div className="flex items-center gap-2 mt-2">
                    <input 
                        type="checkbox" 
                        checked={newAsset.isIncomeProducing || false} 
                        onChange={e => setNewAsset({...newAsset, isIncomeProducing: e.target.checked})} 
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                        id="isIncomeProducing" 
                        disabled={!!newAsset.internalLoanId}
                    />
                    <label htmlFor="isIncomeProducing" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Is an Income-Producing Asset? <span className="text-xs text-gray-400 font-normal">(Used for True Net Worth)</span>
                    </label>
                </div>
            )}
            
            {/* Unified Sector + Multiplier Inputs */}
            {newAsset.type === 'asset' && !newAsset.internalLoanId && (
                <div className="pt-2">
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Sector / Category</label>
                        <button onClick={() => { setIsCustomCategory(!isCustomCategory); if(!isCustomCategory) { setNewAsset({...newAsset, assetClass: ''}); setCurrentBaseMultiplier(30); }}} className="text-xs text-primary font-bold hover:underline">{isCustomCategory ? 'Select from List' : '+ New Sector'}</button>
                    </div>
                    <div className="flex gap-2 items-start">
                        <div className="flex-1">
                            {isCustomCategory ? (
                                <Input value={newAsset.assetClass || ''} onChange={e => setNewAsset({...newAsset, assetClass: e.target.value})} placeholder="e.g. Vintage Cars..." className="!mt-0"/>
                            ) : (
                                <Select options={allCategories} value={newAsset.assetClass || 'Uncategorized'} onChange={e => handleSectorChange(e.target.value)} className="!mt-0"/>
                            )}
                        </div>
                        <div className="w-24">
                            <Input 
                                type="number" 
                                placeholder="Mult." 
                                value={currentBaseMultiplier} 
                                onChange={e => setCurrentBaseMultiplier(parseFloat(e.target.value))} 
                                className="!mt-0" 
                                title="Base Multiplier (Monthly Profit)"
                            />
                        </div>
                    </div>
                    <p className="text-[9px] text-gray-400 -mt-2">Sector Multiplier: x{currentBaseMultiplier} monthly profit. Edits save globally.</p>
                </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label={newAsset.type === 'asset' ? "Date Acquired" : "Date Borrowed"} type="date" value={newAsset.date} onChange={e => setNewAsset({...newAsset, date: e.target.value})} disabled={!!newAsset.internalLoanId}/>
                <Input label="Time (Bank Info)" type="time" value={newAsset.time || getSystemTimeString()} onChange={e => setNewAsset({...newAsset, time: e.target.value})} disabled={!!newAsset.internalLoanId}/>
            </div>
            <div className="pt-4 flex justify-end gap-2"><Button variant="secondary" onClick={closeModal}>Cancel</Button><Button onClick={handleSubmit}>{isEditMode ? 'Update Record' : 'Save Record'}</Button></div>
        </div>
      </Modal>

      <Modal isOpen={terminationState.isOpen} onClose={() => setTerminationState({ ...terminationState, isOpen: false })} title="Secure Loan Termination">
          <div className="space-y-4">
              {terminationState.step === 1 ? (
                  <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">What is the reason for terminating this loan?</p>
                      <Input
                          value={terminationState.reason}
                          onChange={e => setTerminationState({ ...terminationState, reason: e.target.value })}
                          placeholder="e.g. Borrower defaulted, mutually forgiven"
                      />
                      <div className="mt-4 flex justify-end gap-2">
                          <Button variant="secondary" onClick={() => setTerminationState({ ...terminationState, isOpen: false })}>Cancel</Button>
                          <Button disabled={!terminationState.reason.trim()} onClick={() => setTerminationState({ ...terminationState, step: 2 })}>Next</Button>
                      </div>
                  </div>
              ) : (
                  <div>
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-xs rounded-xl border border-red-100 dark:border-red-800/50 mb-4">
                          <p className="font-bold flex items-center gap-1 mb-1"><AlertTriangle size={14}/> Permanent Write-Off (Bad Debt)</p>
                          This will instantly halt all automations, reduce your Net Income via a non-cash expense adjustment to reflect the lost value, and zero the asset balance. Past records will be locked for audit.
                      </div>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Type TERMINATE to permanently end this loan and adjust your balances.</p>
                      <Input
                          value={terminationState.keyword}
                          onChange={e => setTerminationState({ ...terminationState, keyword: e.target.value })}
                          placeholder="TERMINATE"
                      />
                      <div className="mt-4 flex justify-end gap-2">
                          <Button variant="secondary" onClick={() => setTerminationState({ ...terminationState, step: 1 })}>Back</Button>
                          <Button disabled={terminationState.keyword !== 'TERMINATE'} className="bg-red-600 hover:bg-red-700 disabled:opacity-50" onClick={executeTermination}>Confirm Termination</Button>
                      </div>
                  </div>
              )}
          </div>
      </Modal>

      {/* Valuation Modal */}
      {valuationTarget && (
          <ValuationModal 
            isOpen={isValuationModalOpen} 
            onClose={() => { setValuationModalOpen(false); setValuationTarget(null); setIsValuatingDraft(false); }}
            asset={valuationTarget}
            onSave={(updated) => {
                if (isValuatingDraft) {
                    setNewAsset(prev => ({
                        ...prev,
                        amount: updated.amount,
                        assetClass: updated.assetClass, // Sync back category
                        valuationData: updated.valuationData,
                        monthlyIncome: updated.monthlyIncome
                    }));
                } else {
                    updateAsset(updated);
                }
            }}
          />
      )}
    </div>
  );
};

export default AssetsView;
