
import React, { useContext, useState, useMemo } from 'react';
import { AppContext, MoneyDisplay } from '../App';
import { Card, Button, Modal, Input, Select } from '../components/Shared';
import { InlineCurrencyConverter } from '../components/InlineCurrencyConverter';
import { Plus, Trash2, TrendingUp, DollarSign, Activity, PieChart as PieIcon, Sparkles, Loader2, Lock, Download, Filter } from 'lucide-react';
import { Investment } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Sector } from 'recharts';
import * as AIService from '../services/aiService';
import { downloadReceipt } from '../services/receiptService';

const InvestmentsView = () => {
  const context = useContext(AppContext)!;
  const { data, setData, symbol, fullCurrencyName, formatAmount, activeProfileId } = context;

  const [isModalOpen, setModalOpen] = useState(false);
  const [newInv, setNewInv] = useState<Partial<Investment>>({
    name: '',
    type: 'Stock',
    initialValue: 0,
    currentValue: 0,
    monthlyPassiveIncome: 0,
    riskLevel: 'Medium',
    dateAcquired: new Date().toISOString().split('T')[0]
  });

  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [localTimeFilter, setLocalTimeFilter] = useState<'24h' | '7d' | 'month' | 'year' | 'all'>('all');
  
  // Profile Name Logic
  const profileName = activeProfileId === 'personal' 
    ? data.profile.name 
    : data.businesses.find(b => b.id === activeProfileId)?.name || 'Unknown Business';

  // Chart interaction state
  const [activeIndex, setActiveIndex] = useState(0);

  const investments = useMemo(() => {
      let items = data.investments || [];
      const now = new Date();
      now.setFullYear(2026);

      // We filter based on Acquisition Date for investments
      if (localTimeFilter !== 'all') {
          items = items.filter(e => {
              const d = new Date(e.dateAcquired);
              const diffTime = Math.abs(now.getTime() - d.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

              if (localTimeFilter === '24h') return diffDays <= 1;
              if (localTimeFilter === '7d') return diffDays <= 7;
              if (localTimeFilter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              if (localTimeFilter === 'year') return d.getFullYear() === now.getFullYear();
              return true;
          });
      }
      return items;
  }, [data.investments, localTimeFilter]);

  const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalPassive = investments.reduce((sum, inv) => sum + inv.monthlyPassiveIncome, 0);
  const totalInitial = investments.reduce((sum, inv) => sum + inv.initialValue, 0);
  const totalROI = totalInitial > 0 ? ((totalValue - totalInitial) / totalInitial) * 100 : 0;

  const isBusiness = activeProfileId !== 'personal';

  const addInvestment = () => {
    if (!newInv.name || !newInv.currentValue) return;
    const inv: Investment = {
        ...newInv as Investment,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
    };
    setData(prev => ({
        ...prev,
        investments: [...(prev.investments || []), inv]
    }));
    setModalOpen(false);
    setNewInv({
        name: '',
        type: 'Stock',
        initialValue: 0,
        currentValue: 0,
        monthlyPassiveIncome: 0,
        riskLevel: 'Medium',
        dateAcquired: new Date().toISOString().split('T')[0]
    });
  };

  const deleteInvestment = (id: string) => {
    setData(prev => ({
        ...prev,
        investments: prev.investments.filter(i => i.id !== id)
    }));
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
        const result = await AIService.analyzePortfolio(investments, symbol);
        setAiAnalysis(result);
    } catch (e) {
        setAiAnalysis("Could not connect to AI service.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  // Chart Data
  const typeData = Object.entries(investments.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + curr.currentValue;
    return acc;
  }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

  const riskData = Object.entries(investments.reduce((acc, curr) => {
    acc[curr.riskLevel] = (acc[curr.riskLevel] || 0) + curr.currentValue;
    return acc;
  }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  const RISK_COLORS: Record<string, string> = { 'Low': '#10b981', 'Medium': '#f59e0b', 'High': '#ef4444' };

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 8}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        {/* Simple center label for currently hovered item */}
         <text x={cx} y={cy} dy={-6} textAnchor="middle" fill="#888" fontSize={10} className="uppercase font-bold tracking-widest">
            {payload.name}
         </text>
         <text x={cx} y={cy} dy={14} textAnchor="middle" fill={fill} fontSize={16} fontWeight="bold">
            {`${(percent * 100).toFixed(0)}%`}
         </text>
      </g>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold">{isBusiness ? 'Business Securities' : 'Investment Portfolio'}</h2>
            <p className="text-sm text-gray-500">{isBusiness ? 'Treasury Management & Capital Allocation.' : 'Track your "I" Quadrant assets.'}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
             {/* Filter Bar */}
            <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                {(['all', 'year', 'month', '7d', '24h'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setLocalTimeFilter(f)}
                        className={`px-3 py-1 text-xs font-bold rounded-md capitalize transition-all ${localTimeFilter === f ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <Button variant="secondary" onClick={() => downloadReceipt(investments, "Portfolio_Report", 'list', { profileName, currency: fullCurrencyName })} className="flex-1 sm:flex-none !px-3">
                <Download size={16} />
            </Button>

            <Button variant="secondary" onClick={handleAnalyze} disabled={investments.length === 0 || isAnalyzing} className="flex-1 sm:flex-none">
                {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} Insights
            </Button>
            <Button onClick={() => setModalOpen(true)} className="flex-1 sm:flex-none">
                <Plus size={18} /> Add
            </Button>
        </div>
      </div>

      {aiAnalysis && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800 animate-in fade-in slide-in-from-top-4">
            <h4 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                <Sparkles size={20} /> Portfolio Analysis
            </h4>
            <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-line">
                {aiAnalysis}
            </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-indigo-500/10 border-primary/20">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/20 rounded-lg text-primary"><DollarSign size={20} /></div>
                <span className="text-[13px] sm:text-sm font-bold text-gray-500 dark:text-gray-400">Total Value</span>
            </div>
            <p className="text-base sm:text-xl font-bold break-words"><MoneyDisplay amount={totalValue} symbol={symbol}/></p>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg text-green-600"><TrendingUp size={20} /></div>
                <span className="text-[13px] sm:text-sm font-bold text-gray-500 dark:text-gray-400">Total Recurring Passive Income</span>
            </div>
            <p className="text-base sm:text-xl font-bold break-words"><MoneyDisplay amount={totalPassive} symbol={symbol}/><span className="text-sm font-normal text-gray-500">/mo</span></p>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-600"><Activity size={20} /></div>
                <span className="text-[13px] sm:text-sm font-bold text-gray-500 dark:text-gray-400">Total ROI</span>
            </div>
            <p className={`text-base sm:text-xl font-bold break-words ${totalROI >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}%
            </p>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-500/20 rounded-lg text-orange-600"><PieIcon size={20} /></div>
                <span className="text-[13px] sm:text-sm font-bold text-gray-500 dark:text-gray-400">Total Invested</span>
            </div>
            <p className="text-base sm:text-xl font-bold break-words"><MoneyDisplay amount={totalInitial} symbol={symbol}/></p>
        </Card>
      </div>

      {investments.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Allocation Chart */}
            <Card title="Asset Allocation">
                <div className="h-64 min-h-[250px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                {...{ activeIndex } as any}
                                activeShape={renderActiveShape}
                                onMouseEnter={onPieEnter}
                                data={typeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {typeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {typeData.map((entry, index) => (
                        <div key={index} className="flex items-center gap-1 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span>{entry.name}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Risk Chart */}
            <Card title="Risk Distribution">
                 <div className="h-64 min-h-[250px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={riskData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
                            <YAxis hide />
                            <Tooltip 
                                cursor={{fill: 'rgba(0,0,0,0.05)', radius: 8}} 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                            />
                            <Bar dataKey="value" radius={[8, 8, 8, 8]} animationDuration={1000}>
                                {riskData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name] || '#ccc'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-center text-xs text-gray-500 mt-4">Exposure by Risk Level</p>
            </Card>

            {/* Investment List */}
            <Card title="Holdings" className="lg:col-span-3">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left border-b border-gray-200 dark:border-white/10">
                                <th className="pb-3 font-medium text-gray-500">Asset</th>
                                <th className="pb-3 font-medium text-gray-500">Type</th>
                                <th className="pb-3 font-medium text-gray-500 text-right">Market Value</th>
                                <th className="pb-3 font-medium text-gray-500 text-right">ROI</th>
                                <th className="pb-3 font-medium text-gray-500 text-right">Passive Inc.</th>
                                <th className="pb-3 font-medium text-gray-500 text-center">Risk</th>
                                <th className="pb-3 font-medium text-gray-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {investments.map(inv => {
                                const roi = inv.initialValue > 0 ? ((inv.currentValue - inv.initialValue) / inv.initialValue) * 100 : 0;
                                return (
                                    <tr key={inv.id} className={`border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${inv.isAutomated ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                                        <td className="py-3 font-semibold min-w-[120px]">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    {inv.name}
                                                    {inv.isAutomated && <span title="Auto-Calculated Business Equity" className="flex items-center"><Lock size={12} className="text-indigo-500" /></span>}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {new Date(inv.dateAcquired).toLocaleDateString()} {inv.timestamp && `• ${new Date(inv.timestamp).toLocaleTimeString()}`}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs whitespace-nowrap">{inv.type}</span>
                                        </td>
                                        <td className="py-3 text-right">{formatAmount(inv.currentValue)}</td>
                                        <td className={`py-3 text-right font-medium ${roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                                        </td>
                                        <td className="py-3 text-right text-green-600">
                                            {inv.monthlyPassiveIncome > 0 ? `+${formatAmount(inv.monthlyPassiveIncome)}/mo` : '-'}
                                        </td>
                                        <td className="py-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs text-white ${inv.riskLevel === 'High' ? 'bg-red-500' : inv.riskLevel === 'Medium' ? 'bg-orange-500' : 'bg-green-500'}`}>
                                                {inv.riskLevel}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => downloadReceipt(inv, "Portfolio_Receipt", 'single', { profileName, currency: fullCurrencyName })} className="p-2 text-gray-400 hover:text-indigo-500 transition-colors" title="Download Receipt">
                                                    <Download size={16} />
                                                </button>
                                                {!inv.isAutomated && (
                                                    <button onClick={() => deleteInvestment(inv.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
      ) : (
        <Card className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400 mb-4">
                <PieIcon size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">No Investments Yet</h3>
            <p className="text-gray-500 mb-6">Start building your "I" quadrant by adding stocks, real estate, or other assets.</p>
            <Button onClick={() => setModalOpen(true)}>Add First Investment</Button>
        </Card>
      )}

      {/* Add Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Add Investment">
        <div className="space-y-4">
            <Input 
                label="Asset Name" 
                value={newInv.name} 
                onChange={e => setNewInv({...newInv, name: e.target.value})} 
                placeholder="e.g. Apple Stock, Rental Unit 1"
            />
            <InlineCurrencyConverter 
                targetCurrency={context.data.profile.currency || 'USD'} 
                onApply={(val) => setNewInv(prev => ({ ...prev, currentValue: val, initialValue: prev.initialValue || val }))} 
            />
            <div className="grid grid-cols-2 gap-4">
                <Select 
                    label="Type" 
                    options={[
                        { value: 'Stock', label: 'Stock' },
                        { value: 'ETF', label: 'ETF' },
                        { value: 'Crypto', label: 'Crypto' },
                        { value: 'Real Estate', label: 'Real Estate' },
                        { value: 'Bond', label: 'Bond' },
                        { value: 'Business', label: 'Business Equity' },
                        { value: 'Other', label: 'Other' },
                    ]}
                    value={newInv.type}
                    onChange={e => setNewInv({...newInv, type: e.target.value as any})}
                />
                <Select 
                    label="Risk Level" 
                    options={[
                        { value: 'Low', label: 'Low' },
                        { value: 'Medium', label: 'Medium' },
                        { value: 'High', label: 'High' },
                    ]}
                    value={newInv.riskLevel}
                    onChange={e => setNewInv({...newInv, riskLevel: e.target.value as any})}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <Input 
                    label={`Initial Investment (${symbol})`} 
                    type="number" 
                    value={newInv.initialValue || ''} 
                    onChange={e => setNewInv({...newInv, initialValue: parseFloat(e.target.value)})} 
                    enableCalculator
                    enableCurrencyConvert
                />
                <Input 
                    label={`Current Value (${symbol})`} 
                    type="number" 
                    value={newInv.currentValue || ''} 
                    onChange={e => setNewInv({...newInv, currentValue: parseFloat(e.target.value)})} 
                    enableCalculator
                    enableCurrencyConvert
                />
            </div>
            <Input 
                label={`Monthly Recurring Passive Income (${symbol})`} 
                type="number" 
                value={newInv.monthlyPassiveIncome || ''} 
                onChange={e => setNewInv({...newInv, monthlyPassiveIncome: parseFloat(e.target.value)})} 
                placeholder="e.g. Dividends, Rent"
                enableCalculator
                enableCurrencyConvert
            />
            <Input 
                label="Date Acquired" 
                type="date" 
                value={newInv.dateAcquired} 
                onChange={e => setNewInv({...newInv, dateAcquired: e.target.value})} 
            />
            <div className="pt-4 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button onClick={addInvestment}>Save to Portfolio</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default InvestmentsView;
