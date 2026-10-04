
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Asset, MonthlyRecord, ValuationData, CategoryDef, BUSINESS_SECTORS, PERSONAL_SECTORS } from '../types';
import { Modal, Input, Button, Select } from './Shared';
import { AppContext } from '../App';
import { Plus, Trash2, TrendingUp, Calculator, Save, Info, ChevronDown, ChevronRight, Edit2, Wand2 } from 'lucide-react';

interface ValuationModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset;
    onSave: (updatedAsset: Asset) => void;
}

export const ValuationModal: React.FC<ValuationModalProps> = ({ isOpen, onClose, asset, onSave }) => {
    const { formatAmount, symbol, openCalculator, openCurrencyConverter, data, setData, activeProfileId } = useContext(AppContext)!;
    const isBusiness = activeProfileId !== 'personal';
    
    // Core State
    const [activeTab, setActiveTab] = useState<'input' | 'results'>('input');
    const [records, setRecords] = useState<MonthlyRecord[]>([]);
    
    // Config State
    const [selectedCategory, setSelectedCategory] = useState(asset.assetClass || 'Other');
    const [assetTypeMultiplier, setAssetTypeMultiplier] = useState(30);
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

    // Scores State (0-10) - Default to 0
    const [stabilityScore, setStabilityScore] = useState(0);
    const [growthScore, setGrowthScore] = useState(0);
    const [dependencyScore, setDependencyScore] = useState(0); // 0 = Automated/Good, 10 = High Labor/Bad
    const [autoCalced, setAutoCalced] = useState(false);
    
    // New Record State
    const [newRecord, setNewRecord] = useState<Partial<MonthlyRecord>>({
        date: new Date().toISOString().split('T')[0],
        income: 0,
        otherIncome: 0,
        expenses: 0,
        hoursWorked: 0,
        notes: ''
    });

    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

    // Context Sectors
    const contextSectors = isBusiness ? BUSINESS_SECTORS : PERSONAL_SECTORS;
    const allCategories = [
        ...Object.keys(contextSectors).map(k => ({ value: k, label: k, multiplier: contextSectors[k] })),
        ...(data.customCategories || []).map(c => ({ value: c.name, label: c.name, multiplier: c.multiplier })),
        { value: 'NEW_CUSTOM', label: '+ Add New Sector', multiplier: 30 }
    ];

    // --- INITIALIZATION ---
    useEffect(() => {
        if (isOpen && asset) {
            if (asset.valuationData) {
                setRecords(asset.valuationData.monthlyRecords || []);
                setStabilityScore(asset.valuationData.stabilityScore);
                setGrowthScore(asset.valuationData.growthScore);
                setDependencyScore(asset.valuationData.dependencyScore);
                setAssetTypeMultiplier(asset.valuationData.baseMultiplier || 30);
            } else {
                setRecords([]);
                const cat = asset.assetClass || (isBusiness ? 'Other Business' : 'Other Personal');
                setSelectedCategory(cat);
                updateMultiplierFromCategory(cat);
            }
            setActiveTab('input');
        }
    }, [isOpen, asset]);

    // Update Multiplier when category changes
    const updateMultiplierFromCategory = (category: string) => {
        const match = allCategories.find(c => c.value === category);
        if (match) {
            setAssetTypeMultiplier(match.multiplier);
            setIsCustomCategory(false);
        } else {
            // Unrecognized custom category fallback
            setIsCustomCategory(true);
            setAssetTypeMultiplier(30); 
        }
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const cat = e.target.value;
        if (cat === 'NEW_CUSTOM') {
            setIsCustomCategory(true);
            setSelectedCategory('');
            setAssetTypeMultiplier(30);
        } else {
            setSelectedCategory(cat);
            setIsCustomCategory(false);
            updateMultiplierFromCategory(cat);
        }
    };

    // --- SMART LOGIC ---
    useEffect(() => {
        // Run logic whenever records change to auto-adjust sliders
        if (records.length > 0) {
            calculateSmartScores(records);
        }
    }, [records]);

    const calculateSmartScores = (currentRecords: MonthlyRecord[]) => {
        if (currentRecords.length === 0) return;

        // 1. Dependency: Based on average hours worked
        // If 0 hours -> Score 0 (Good). If 40 hours -> Score 10 (Bad).
        const avgHours = currentRecords.reduce((s, r) => s + r.hoursWorked, 0) / currentRecords.length;
        let calcDependency = 0;
        if (avgHours === 0) calcDependency = 0;
        else calcDependency = Math.min(10, (avgHours / 40) * 10);
        
        // 2. Growth: Trend of Net Income
        // Simple comparison: First half average vs Last half average
        const sorted = [...currentRecords].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let calcGrowth = 5; // Default middle
        if (sorted.length >= 2) {
            const mid = Math.floor(sorted.length / 2);
            const firstHalf = sorted.slice(0, mid);
            const lastHalf = sorted.slice(mid);
            
            const firstAvg = firstHalf.reduce((s,r) => s + (r.income + r.otherIncome - r.expenses), 0) / (firstHalf.length || 1);
            const lastAvg = lastHalf.reduce((s,r) => s + (r.income + r.otherIncome - r.expenses), 0) / (lastHalf.length || 1);
            
            if (lastAvg > firstAvg) {
                const growthPct = (lastAvg - firstAvg) / (Math.abs(firstAvg) || 1);
                calcGrowth = Math.min(10, 5 + (growthPct * 10)); // +50% growth = 10 score
            } else {
                const declinePct = (firstAvg - lastAvg) / (Math.abs(firstAvg) || 1);
                calcGrowth = Math.max(0, 5 - (declinePct * 10));
            }
        }

        // 3. Stability: Variance relative to mean
        // Low Variance = High Stability Score
        const allNets = currentRecords.map(r => r.income + r.otherIncome - r.expenses);
        const mean = allNets.reduce((a,b) => a+b, 0) / allNets.length;
        
        let calcStability = 5;
        if (allNets.length > 1) {
            const variance = allNets.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / allNets.length;
            const stdDev = Math.sqrt(variance);
            const cv = mean !== 0 ? stdDev / Math.abs(mean) : 1;
            // CV of 0 = Perfect Stability (Score 10). CV of 1.0 = Volatile (Score 0).
            calcStability = Math.max(0, Math.min(10, 10 - (cv * 10)));
        }

        setDependencyScore(Math.round(calcDependency));
        setGrowthScore(Math.round(calcGrowth));
        setStabilityScore(Math.round(calcStability));
        setAutoCalced(true);
    };

    // --- CALCULATIONS ---
    const calculateValuation = () => {
        if (records.length === 0) return { weightedAvg: 0, finalValue: 0, annualProfit: 0 };

        let totalProfitAllTime = 0;
        let totalProfitLast365 = 0;
        
        const sortedRecords = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstTransactionDate = new Date(sortedRecords[0].date);
        
        let mostRecentDate = new Date();
        if (new Date(sortedRecords[sortedRecords.length - 1].date) > mostRecentDate) {
            mostRecentDate = new Date(sortedRecords[sortedRecords.length - 1].date);
        }

        const businessAgeTime = mostRecentDate.getTime() - firstTransactionDate.getTime();
        const businessAgeDays = Math.max(1, Math.floor(businessAgeTime / (1000 * 60 * 60 * 24)));

        const cutoff365 = new Date(mostRecentDate);
        cutoff365.setDate(cutoff365.getDate() - 365);

        records.forEach(r => {
            const net = (r.income + (r.otherIncome||0)) - r.expenses;
            totalProfitAllTime += net;
            if (new Date(r.date) >= cutoff365) {
                totalProfitLast365 += net;
            }
        });

        let annualProfit = 0;
        let dailyAvg = 0;
        if (businessAgeDays <= 365) {
            dailyAvg = totalProfitAllTime / businessAgeDays;
            annualProfit = dailyAvg * 365;
            console.log(`[DEBUG Modal] businessAgeDays: ${businessAgeDays}, totalProfitAllTime: ${totalProfitAllTime}, totalProfitLast365: ${totalProfitLast365}, dailyAvg: ${dailyAvg}, Annual_Net: ${annualProfit}`);
        } else {
            annualProfit = totalProfitLast365;
            console.log(`[DEBUG Modal] businessAgeDays: ${businessAgeDays}, totalProfitAllTime: ${totalProfitAllTime}, totalProfitLast365: ${totalProfitLast365}, Annual_Net: ${annualProfit}`);
        }

        // Multiplier Adjustment
        // Scale 0-10. 5 is neutral. 
        // Stability: 0 (Bad) -> -2.5. 10 (Good) -> +2.5.
        // Growth: 0 (Bad) -> -2.5. 10 (Good) -> +2.5.
        // Dependency: 0 (Good/Low) -> +2.5. 10 (Bad/High) -> -2.5.
        const adjustment = ((stabilityScore - 5) * 0.5) + ((growthScore - 5) * 0.5) - ((dependencyScore - 5) * 0.5);
        const finalMultiplier = Math.max(1, assetTypeMultiplier + adjustment);

        const finalValue = Math.max(0, annualProfit * finalMultiplier);

        return {
            weightedAvg: annualProfit / 12,
            annualProfit,
            finalMultiplier,
            finalValue,
            adjustment
        };
    };

    const results = calculateValuation();

    // --- HANDLERS ---
    const saveRecord = () => {
        if (!newRecord.income && !newRecord.expenses && !newRecord.date) return;
        
        const monthStr = newRecord.date!.slice(0, 7); // YYYY-MM
        const record: MonthlyRecord = {
            id: editingRecordId || Date.now().toString(),
            timestamp: new Date().toISOString(),
            date: newRecord.date!,
            monthStr: monthStr,
            income: newRecord.income || 0,
            otherIncome: newRecord.otherIncome || 0,
            expenses: newRecord.expenses || 0,
            hoursWorked: newRecord.hoursWorked || 0,
            notes: newRecord.notes
        };
        
        let newRecords = [];
        if (editingRecordId) {
            newRecords = records.map(r => r.id === editingRecordId ? record : r);
            setEditingRecordId(null);
        } else {
            newRecords = [record, ...records];
        }
        
        setRecords(newRecords);
        setExpandedMonths(prev => new Set(prev).add(monthStr));
        setNewRecord({ ...newRecord, income: 0, otherIncome: 0, expenses: 0, hoursWorked: 0, notes: '' });
        
        // Trigger smart calculation explicitly
        calculateSmartScores(newRecords);
    };

    const editRecord = (r: MonthlyRecord) => {
        setNewRecord(r);
        setEditingRecordId(r.id);
    };

    const deleteRecord = (id: string) => {
        if(window.confirm("Are you sure you want to delete this entry?")) {
            const newRecords = records.filter(r => r.id !== id);
            setRecords(newRecords);
            calculateSmartScores(newRecords);
        }
    };

    const toggleMonth = (month: string) => {
        const newSet = new Set(expandedMonths);
        if (newSet.has(month)) newSet.delete(month); else newSet.add(month);
        setExpandedMonths(newSet);
    };

    const handleSave = () => {
        const valData: ValuationData = {
            lastUpdated: new Date().toISOString(),
            monthlyRecords: records,
            weightedAvgProfit: results.weightedAvg,
            annualizedProfit: results.annualProfit,
            stabilityScore,
            growthScore,
            dependencyScore,
            baseMultiplier: assetTypeMultiplier,
            adjustedMultiplier: results.finalMultiplier,
            calculatedValue: results.finalValue,
            confidenceScore: records.length >= 3 ? 90 : records.length > 0 ? 50 : 0
        };

        const finalCategory = selectedCategory || 'Custom';
        
        // PERSISTENCE LOGIC
        // If it's a known category but multiplier changed, OR it's a new category
        // We always update/add to customCategories to persist user preference
        const match = allCategories.find(c => c.value === finalCategory);
        
        if (!match || match.multiplier !== assetTypeMultiplier) {
             setData(prev => {
                 const existingCats = prev.customCategories || [];
                 const otherCats = existingCats.filter(c => c.name !== finalCategory);
                 return {
                     ...prev,
                     customCategories: [...otherCats, { name: finalCategory, multiplier: assetTypeMultiplier }]
                 };
             });
        }

        const updatedAsset: Asset = {
            ...asset,
            assetClass: finalCategory, 
            amount: results.finalValue > 0 ? results.finalValue : asset.amount, 
            monthlyIncome: results.weightedAvg, 
            valuationData: valData
        };

        onSave(updatedAsset);
        onClose();
    };

    const groupedRecords = useMemo(() => {
        const groups: Record<string, MonthlyRecord[]> = {};
        records.forEach(r => {
            if(!groups[r.monthStr]) groups[r.monthStr] = [];
            groups[r.monthStr].push(r);
        });
        return groups;
    }, [records]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Valuation: ${asset.description}`}>
            <div className="flex flex-col h-[80vh] sm:h-[650px]">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-white/10 mb-4">
                    <button 
                        onClick={() => setActiveTab('input')} 
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'input' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
                    >
                        1. Financial Data
                    </button>
                    <button 
                        onClick={() => setActiveTab('results')} 
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'results' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
                        disabled={records.length === 0}
                    >
                        2. Valuation Result
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                    {activeTab === 'input' && (
                        <div className="space-y-6 animate-in fade-in">
                            
                            {/* Configuration Section */}
                            <div className="bg-white dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col gap-3">
                                <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
                                    <div className="flex-1 w-full">
                                        {isCustomCategory ? (
                                            <Input 
                                                label="New Sector Name" 
                                                value={selectedCategory} 
                                                onChange={e => setSelectedCategory(e.target.value)} 
                                                placeholder="e.g. Vintage Watches" 
                                                className="!mb-0"
                                            />
                                        ) : (
                                            <Select 
                                                label="Sector / Category" 
                                                options={allCategories} 
                                                value={selectedCategory} 
                                                onChange={handleCategoryChange} 
                                                className="!mb-0"
                                            />
                                        )}
                                    </div>
                                    <div className="w-full sm:w-32 relative">
                                        <Input 
                                            label="Base Mult." 
                                            type="number" 
                                            value={assetTypeMultiplier} 
                                            onChange={e => setAssetTypeMultiplier(parseFloat(e.target.value))} 
                                            className="!mb-0"
                                            title="Manually adjust base multiplier for this category"
                                        />
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                    <Info size={12}/> 
                                    {isCustomCategory 
                                        ? "This sector and multiplier will be saved globally." 
                                        : "Adjusting the multiplier here will update the default for this sector."}
                                </div>
                            </div>

                            {/* Add Entry Form */}
                            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                                    <Calculator size={16}/> {editingRecordId ? 'Edit Entry' : 'Add Financial Entry'}
                                </h4>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <Input label="Date" type="date" value={newRecord.date} onChange={e => setNewRecord({...newRecord, date: e.target.value})} className="!mb-0" />
                                    <Input label="Hours/Wk" type="number" value={newRecord.hoursWorked || ''} onChange={e => setNewRecord({...newRecord, hoursWorked: parseFloat(e.target.value)})} className="!mb-0" />
                                </div>
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    <Input label={`Income (${symbol})`} type="number" value={newRecord.income || ''} onChange={e => setNewRecord({...newRecord, income: parseFloat(e.target.value)})} className="!mb-0" enableCalculator enableCurrencyConvert />
                                    <Input label={`Other Inc. (${symbol})`} type="number" value={newRecord.otherIncome || ''} onChange={e => setNewRecord({...newRecord, otherIncome: parseFloat(e.target.value)})} className="!mb-0" enableCalculator enableCurrencyConvert />
                                    <Input label={`Expenses (${symbol})`} type="number" value={newRecord.expenses || ''} onChange={e => setNewRecord({...newRecord, expenses: parseFloat(e.target.value)})} className="!mb-0" enableCalculator enableCurrencyConvert />
                                </div>
                                <Input label="Notes" value={newRecord.notes || ''} onChange={e => setNewRecord({...newRecord, notes: e.target.value})} className="!mb-3" placeholder="e.g. Week 1 Sales"/>
                                <div className="flex gap-2">
                                    {editingRecordId && <Button variant="secondary" onClick={() => {setEditingRecordId(null); setNewRecord({...newRecord, income:0, expenses:0, notes: ''});}} className="py-2 text-sm">Cancel</Button>}
                                    <Button onClick={saveRecord} className="w-full justify-center py-2 text-sm">{editingRecordId ? 'Update Entry' : 'Add Entry'}</Button>
                                </div>
                            </div>

                            {/* Records List */}
                            <div>
                                <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">History ({records.length} entries)</h4>
                                <div className="space-y-2">
                                    {records.length === 0 ? <div className="text-center text-sm text-gray-400 italic py-4">No data yet. Add entries above.</div> : 
                                    Object.entries(groupedRecords).sort((a,b) => b[0].localeCompare(a[0])).map(([month, items]) => {
                                        const monthRecords = items as MonthlyRecord[];
                                        const monthTotal = monthRecords.reduce((s, r) => s + (r.income + r.otherIncome - r.expenses), 0);
                                        const isExpanded = expandedMonths.has(month);
                                        return (
                                            <div key={month} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-black/20">
                                                <div 
                                                    className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
                                                    onClick={() => toggleMonth(month)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                        <span className="font-bold text-sm">{month}</span>
                                                        <span className="text-xs bg-gray-100 dark:bg-white/10 px-1.5 rounded-full text-gray-500">{monthRecords.length} entries</span>
                                                    </div>
                                                    <span className={`font-mono font-bold text-sm ${monthTotal >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {formatAmount(monthTotal)}
                                                    </span>
                                                </div>
                                                {isExpanded && (
                                                    <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/40">
                                                        {monthRecords.map(r => (
                                                            <div key={r.id} className="flex justify-between items-center p-2 pl-8 border-b last:border-0 border-gray-100 dark:border-gray-800 text-xs">
                                                                <div className="flex-1">
                                                                    <span className="block font-medium">{new Date(r.date).getDate()}th - {r.notes || 'Entry'}</span>
                                                                    <span className="text-gray-400">{r.hoursWorked} hrs</span>
                                                                </div>
                                                                <div className="text-right mr-4">
                                                                    <span className="block text-green-600">+{formatAmount(r.income + r.otherIncome)}</span>
                                                                    <span className="block text-red-500">-{formatAmount(r.expenses)}</span>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <button onClick={() => editRecord(r)} className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded text-blue-500"><Edit2 size={12}/></button>
                                                                    <button onClick={() => deleteRecord(r.id)} className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded text-red-500"><Trash2 size={12}/></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* Qualitative Scores */}
                            {records.length > 0 && (
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold">Qualitative Adjustments</h4>
                                            {autoCalced && <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 rounded flex items-center gap-1"><Wand2 size={8}/> Auto-Calculated</span>}
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${results.adjustment >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            Impact: {results.adjustment > 0 ? '+' : ''}{results.adjustment.toFixed(2)}x
                                        </span>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-xs mb-1"><span>Income Stability</span><span className="font-bold">{stabilityScore}/10</span></div>
                                            <input type="range" min="0" max="10" value={stabilityScore} onChange={e => { setStabilityScore(parseInt(e.target.value)); setAutoCalced(false); }} className="w-full accent-primary h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer transition-all duration-500" />
                                            <p className="text-[10px] text-gray-500">0=Volatile, 10=Recurring Contract</p>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1"><span>Growth Trend</span><span className="font-bold">{growthScore}/10</span></div>
                                            <input type="range" min="0" max="10" value={growthScore} onChange={e => { setGrowthScore(parseInt(e.target.value)); setAutoCalced(false); }} className="w-full accent-primary h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer transition-all duration-500" />
                                            <p className="text-[10px] text-gray-500">0=Declining, 10=Hypergrowth</p>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1"><span>Owner Dependency</span><span className="font-bold">{dependencyScore}/10</span></div>
                                            <input type="range" min="0" max="10" value={dependencyScore} onChange={e => { setDependencyScore(parseInt(e.target.value)); setAutoCalced(false); }} className="w-full accent-red-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer transition-all duration-500" />
                                            <p className="text-[10px] text-gray-500">0=Automated (Good), 10=Heavy Workload (Bad)</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'results' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="text-center py-6 bg-gradient-to-b from-primary/10 to-transparent rounded-2xl border border-primary/20">
                                <p className="text-xs font-semibold uppercase text-primary tracking-wider mb-2">Estimated Market Value</p>
                                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white mb-1 break-words">{formatAmount(results.finalValue)}</h2>
                                <p className="text-sm text-gray-500">Based on {records.length} entries</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Monthly Net (Avg)</p>
                                    <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{formatAmount(results.weightedAvg)}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Annualized</p>
                                    <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{formatAmount(results.annualProfit)}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                <h4 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-2"><TrendingUp size={16}/> Multiplier Logic ({selectedCategory || 'Custom'})</h4>
                                <div className="flex justify-between items-center text-sm mb-1">
                                    <span>Base Multiplier</span>
                                    <span className="font-mono">{assetTypeMultiplier}x</span>
                                </div>
                                <div className="flex justify-between items-center text-sm mb-1 text-gray-500">
                                    <span>Adjustments (Qualitative)</span>
                                    <span className={`font-mono ${results.adjustment >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {results.adjustment > 0 ? '+' : ''}{results.adjustment.toFixed(2)}x
                                    </span>
                                </div>
                                <div className="border-t border-indigo-200 dark:border-indigo-800 pt-2 mt-2 flex justify-between items-center font-bold text-indigo-700 dark:text-indigo-400">
                                    <span>Final Multiplier</span>
                                    <span>{results.finalMultiplier.toFixed(2)}x Monthly</span>
                                </div>
                            </div>

                            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg flex gap-3 text-xs text-yellow-800 dark:text-yellow-500 items-start">
                                <Info size={16} className="shrink-0 mt-0.5"/>
                                <p>This valuation is an estimate based on the "Seller's Discretionary Earnings" (SDE) method. Real market value depends on finding a buyer.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                    {activeTab === 'input' ? (
                        <Button onClick={() => setActiveTab('results')} disabled={records.length === 0} className="w-full sm:w-auto">Calculate Value</Button>
                    ) : (
                        <>
                            <Button variant="secondary" onClick={() => setActiveTab('input')}>Back to Data</Button>
                            <Button onClick={handleSave} className="w-full sm:w-auto gap-2"><Save size={16}/> Apply to Asset</Button>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
};
