import React, { useContext, useMemo, useState } from 'react';
import { AppContext, MoneyDisplay } from '../App';
import { Card } from '../components/Shared';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, ComposedChart 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, BarChart3, ShieldCheck, 
  Clock, Layers, ArrowUpRight, ArrowDownRight, Compass, Sparkles, 
  AlertCircle, CheckCircle2, PieChart as PieIcon
} from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#6366f1'];

const CustomTooltip = ({ active, payload, label, symbol }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50 min-w-[160px]">
        <p className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2 border-b border-gray-100 dark:border-white/10 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-3 text-xs py-0.5">
            <span className="flex items-center gap-1.5 font-medium text-gray-600 dark:text-gray-300">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.payload.fill }} />
              {entry.name}:
            </span>
            <span className="font-bold text-gray-900 dark:text-white">
              {symbol}{Number(entry.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

type TimeframeFilter = '30D' | '90D' | 'YTD' | '12M' | 'ALL';
type ActiveTab = 'cashflow' | 'balance' | 'buckets' | 'quadrant';

const AnalyticsView = () => {
  const context = useContext(AppContext)!;
  const { profileData, symbol, activeProfileId, data, metrics } = context;

  const [timeframe, setTimeframe] = useState<TimeframeFilter>('12M');
  const [activeTab, setActiveTab] = useState<ActiveTab>('cashflow');

  const isBusiness = activeProfileId !== 'personal';

  // Filter entries based on selected timeframe
  const filteredEntries = useMemo(() => {
    const now = new Date();
    return profileData.entries.filter(entry => {
      const entryDate = new Date(entry.date);
      if (timeframe === '30D') {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 30);
        return entryDate >= cutoff;
      }
      if (timeframe === '90D') {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 90);
        return entryDate >= cutoff;
      }
      if (timeframe === 'YTD') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return entryDate >= startOfYear;
      }
      if (timeframe === '12M') {
        const cutoff = new Date(now);
        cutoff.setFullYear(cutoff.getFullYear() - 1);
        return entryDate >= cutoff;
      }
      return true; // 'ALL'
    });
  }, [profileData.entries, timeframe]);

  // Executive Top KPI Metrics
  const summaryKPIs = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    
    filteredEntries.forEach(entry => {
      if (entry.subtype === 'INTERNAL_TRANSFER') return;
      if (entry.type === 'income') {
        totalInflow += entry.amount;
      } else if (entry.type === 'expense' && entry.subtype !== 'DISTRIBUTION') {
        totalOutflow += entry.amount;
      }
    });

    const netSurplus = totalInflow - totalOutflow;
    const marginPct = totalInflow > 0 ? (netSurplus / totalInflow) * 100 : 0;

    // Liquid cash reserve across active allocations
    const liquidCash = profileData.allocations.reduce((sum, a) => sum + (a.balance || 0), 0);
    const monthlyBurn = totalOutflow / (timeframe === '30D' ? 1 : timeframe === '90D' ? 3 : timeframe === 'YTD' ? Math.max(1, new Date().getMonth() + 1) : 12);
    const runwayMonths = monthlyBurn > 0 ? (liquidCash / monthlyBurn) : (liquidCash > 0 ? 99 : 0);

    return {
      totalInflow,
      totalOutflow,
      netSurplus,
      marginPct,
      liquidCash,
      monthlyBurn,
      runwayMonths
    };
  }, [filteredEntries, profileData.allocations, timeframe]);

  // Monthly aggregated trend data
  const monthlyChartData = useMemo(() => {
    const monthlyData: Record<string, { month: string, income: number, expense: number, net: number, cumulative: number }> = {};

    filteredEntries.forEach(entry => {
      const date = new Date(entry.date);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthStr]) {
        monthlyData[monthStr] = { month: monthStr, income: 0, expense: 0, net: 0, cumulative: 0 };
      }

      if (entry.subtype === 'INTERNAL_TRANSFER') return;

      if (entry.type === 'income') {
        monthlyData[monthStr].income += entry.amount;
        monthlyData[monthStr].net += entry.amount;
      } else if (entry.type === 'expense' && entry.subtype !== 'DISTRIBUTION') {
        monthlyData[monthStr].expense += entry.amount;
        monthlyData[monthStr].net -= entry.amount;
      } else if (entry.type === 'expense' && entry.subtype === 'DISTRIBUTION') {
        monthlyData[monthStr].net -= entry.amount;
      }
    });

    const sorted = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    let running = 0;
    sorted.forEach(d => {
      running += d.net;
      d.cumulative = running;
    });

    return sorted;
  }, [filteredEntries]);

  // Category expense distribution
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredEntries.forEach(entry => {
      if (entry.type === 'expense' && entry.subtype !== 'INTERNAL_TRANSFER' && entry.subtype !== 'DISTRIBUTION') {
        const cat = entry.category || 'Uncategorized';
        map[cat] = (map[cat] || 0) + entry.amount;
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredEntries]);

  // Asset class breakdown
  const assetAllocationData = useMemo(() => {
    const grouped: Record<string, number> = {};
    profileData.assets.forEach(a => {
      if (a.type === 'asset' || a.type === 'business_equity') {
        const cls = a.assetClass || 'General Asset';
        grouped[cls] = (grouped[cls] || 0) + a.amount;
      }
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [profileData.assets]);

  // Assets vs Liabilities
  const balanceSheetSummary = useMemo(() => {
    const tangible = profileData.assets
      .filter(a => a.type === 'asset' || a.type === 'business_equity')
      .reduce((sum, a) => sum + (a.amount || 0), 0);
    const liabilities = profileData.assets
      .filter(a => a.type === 'liability')
      .reduce((sum, a) => sum + (a.amount || 0), 0);
    const netEquity = tangible - liabilities;
    const debtToAsset = tangible > 0 ? (liabilities / tangible) * 100 : (liabilities > 0 ? 100 : 0);

    return { tangible, liabilities, netEquity, debtToAsset };
  }, [profileData.assets]);

  // Savings / Bucket Health
  const savingsData = useMemo(() => {
    return profileData.allocations.map(a => ({
      name: a.name,
      balance: a.balance,
      target: a.targetBalance || 0,
      percentage: a.percentage || 0
    })).sort((a, b) => b.balance - a.balance);
  }, [profileData.allocations]);

  // ESBI Quadrant Income Breakdown
  const esbiBreakdown = useMemo(() => {
    let e = 0, s = 0, b = 0, i = 0;
    filteredEntries.forEach(entry => {
      if (entry.type === 'income' && entry.subtype !== 'INTERNAL_TRANSFER') {
        const q = entry.quadrant || 'E';
        if (q === 'E') e += entry.amount;
        else if (q === 'S') s += entry.amount;
        else if (q === 'B') b += entry.amount;
        else if (q === 'I') i += entry.amount;
      }
    });
    const total = e + s + b + i;
    const passive = b + i;
    const passiveRatio = total > 0 ? (passive / total) * 100 : 0;

    return [
      { name: 'E (Employee)', value: e, color: '#3b82f6', desc: 'Active Wage Labor' },
      { name: 'S (Self-Employed)', value: s, color: '#f59e0b', desc: 'Specialist / Sole Proprietor' },
      { name: 'B (Business System)', value: b, color: '#10b981', desc: 'Automated Operations' },
      { name: 'I (Investor)', value: i, color: '#8b5cf6', desc: 'Compounding Capital' },
    ].filter(item => item.value > 0);
  }, [filteredEntries]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-primary" size={24} />
            Analytics & Financial Intelligence
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Deep multi-dimensional analysis for {isBusiness ? 'Enterprise' : 'Personal Wealth'}.
          </p>
        </div>

        {/* Timeframe Selector Pills */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl border border-gray-200/80 dark:border-white/5">
          {(['30D', '90D', 'YTD', '12M', 'ALL'] as TimeframeFilter[]).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeframe === tf
                  ? 'bg-white dark:bg-slate-700 text-primary shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Top Executive KPI Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-gray-100 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{isBusiness ? 'Gross Revenue' : 'Total Income'}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {symbol}{summaryKPIs.totalInflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-gray-400 mt-1 font-medium">Over selected {timeframe} window</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-gray-100 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Operating Expenses</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
              <ArrowDownRight size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {symbol}{summaryKPIs.totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-gray-400 mt-1 font-medium">Burn velocity: ~{symbol}{summaryKPIs.monthlyBurn.toFixed(0)}/mo</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-gray-100 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Net Cashflow</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${summaryKPIs.netSurplus >= 0 ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'}`}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${summaryKPIs.netSurplus >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {symbol}{summaryKPIs.netSurplus.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-gray-400 mt-1 font-medium">
            Operating Margin: <span className="font-bold text-gray-700 dark:text-gray-300">{summaryKPIs.marginPct.toFixed(1)}%</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-gray-100 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Reserves & Runway</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {summaryKPIs.runwayMonths >= 99 ? '∞' : `${summaryKPIs.runwayMonths.toFixed(1)} Mo`}
          </div>
          <div className="text-[11px] text-gray-400 mt-1 font-medium">
            Liquid cash: <span className="font-bold text-gray-700 dark:text-gray-300">{symbol}{summaryKPIs.liquidCash.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Analytical Sections */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('cashflow')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'cashflow'
              ? 'bg-primary text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp size={16} />
          Cashflow & Burn Velocity
        </button>

        <button
          onClick={() => setActiveTab('balance')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'balance'
              ? 'bg-primary text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck size={16} />
          Balance Sheet & Net Wealth
        </button>

        <button
          onClick={() => setActiveTab('buckets')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'buckets'
              ? 'bg-primary text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers size={16} />
          Profit Buckets & Runway
        </button>

        <button
          onClick={() => setActiveTab('quadrant')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'quadrant'
              ? 'bg-primary text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <Compass size={16} />
          ESBI Quadrant Intelligence
        </button>
      </div>

      {/* TAB 1: Cashflow & Burn Velocity */}
      {activeTab === 'cashflow' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Primary Cashflow Trend */}
            <div className="lg:col-span-2">
              <Card title={`${isBusiness ? "Revenue" : "Income"} vs Expense Velocity (${timeframe})`}>
                <div className="h-80 w-full mt-4">
                  {monthlyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(val) => `${symbol}${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`} />
                        <Tooltip content={<CustomTooltip symbol={symbol} />} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Bar dataKey="income" name={isBusiness ? "Revenue" : "Income"} fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                        <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
                        <Line type="monotone" dataKey="net" name="Net Margin" stroke="#6366f1" strokeWidth={3} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                      <BarChart3 size={32} className="mb-2 opacity-40" />
                      No transaction entries recorded in this timeframe.
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Expense Distribution Donut */}
            <div>
              <Card title="Expenses by Category">
                <div className="h-80 w-full mt-4 flex flex-col items-center justify-center">
                  {expenseByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseByCategory}
                          cx="50%"
                          cy="45%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {expenseByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip symbol={symbol} />} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-gray-400 text-sm text-center">No categorized expenses recorded.</div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Cumulative Net Curve */}
          <Card title="Cumulative Net Surplus Trajectory">
            <div className="h-72 w-full mt-4">
              {monthlyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(val) => `${symbol}${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`} />
                    <Tooltip content={<CustomTooltip symbol={symbol} />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="cumulative" name="Cumulative Saved Surplus" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCumulative)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No cumulative trend data</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Balance Sheet & Net Wealth */}
      {activeTab === 'balance' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">Tangible Assets</div>
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">
                {symbol}{balanceSheetSummary.tangible.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400/80 mt-1">Cash, property, equities, businesses</div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40">
              <div className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider mb-1">Total Liabilities (Debt)</div>
              <div className="text-2xl font-bold text-rose-900 dark:text-rose-300">
                {symbol}{balanceSheetSummary.liabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-rose-700 dark:text-rose-400/80 mt-1">Mortgages, loans, payables, cards</div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40">
              <div className="text-xs font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider mb-1">Debt-to-Asset Ratio</div>
              <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-300">
                {balanceSheetSummary.debtToAsset.toFixed(1)}%
              </div>
              <div className="text-xs text-indigo-700 dark:text-indigo-400/80 mt-1">
                {balanceSheetSummary.debtToAsset < 30 ? '✅ Healthy conservative leverage' : balanceSheetSummary.debtToAsset < 60 ? '⚠️ Moderate leverage' : '🚨 High leverage risk'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Asset Class Allocation Pie */}
            <Card title="Asset Class Allocation">
              <div className="h-80 w-full mt-4 flex items-center justify-center">
                {assetAllocationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetAllocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {assetAllocationData.map((entry, index) => (
                          <Cell key={`asset-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip symbol={symbol} />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-400 text-sm">No assets registered under this profile.</div>
                )}
              </div>
            </Card>

            {/* Net Worth Calculation Breakdown Card */}
            <Card title="Equity & Solvency Health">
              <div className="space-y-4 mt-2">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-100 dark:border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Gross Asset Base:</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {symbol}{balanceSheetSummary.tangible.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Total Obligations:</span>
                    <span className="font-bold text-rose-500">
                      -{symbol}{balanceSheetSummary.liabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-white/10 pt-2 flex justify-between items-center font-bold text-base">
                    <span>Net Worth Equity:</span>
                    <span className="text-primary font-bold">
                      {symbol}{balanceSheetSummary.netEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 leading-relaxed bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/60 dark:border-amber-800/40 text-amber-900 dark:text-amber-300">
                  💡 <strong>Asset Velocity Rule:</strong> Real wealth grows when tangible cash-flowing assets exceed liabilities. Keep liabilities low-interest and amortizing, while channeling surplus into compounding asset classes.
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: Profit Buckets & Runway */}
      {activeTab === 'buckets' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card title="Profit-First Bucket Balances & Allocation Targets">
            <div className="h-80 w-full mt-4">
              {savingsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={savingsData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(val) => `${symbol}${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} width={120} />
                    <Tooltip content={<CustomTooltip symbol={symbol} />} />
                    <Bar dataKey="balance" name="Current Balance" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={22}>
                      {savingsData.map((entry, index) => (
                        <Cell key={`buck-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No allocation buckets defined.</div>
              )}
            </div>
          </Card>

          {/* Runway Sensitivity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/5 shadow-xs">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Baseline Runway</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {summaryKPIs.runwayMonths >= 99 ? '∞' : `${summaryKPIs.runwayMonths.toFixed(1)} Months`}
              </div>
              <div className="text-xs text-gray-500 mt-1">Based on current monthly burn of {symbol}{summaryKPIs.monthlyBurn.toFixed(0)}</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 shadow-xs">
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">+15% Burn Reduction</div>
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">
                {summaryKPIs.monthlyBurn > 0 ? (summaryKPIs.liquidCash / (summaryKPIs.monthlyBurn * 0.85)).toFixed(1) : '∞'} Months
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">Extends buffer by trimming non-essential recurring bills</div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 shadow-xs">
              <div className="text-xs font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider mb-1">6-Month Capital War Chest</div>
              <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-300">
                {symbol}{(summaryKPIs.monthlyBurn * 6).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">Target reserve balance for impenetrable solvency</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ESBI Quadrant Intelligence */}
      {activeTab === 'quadrant' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Cashflow Quadrants (E, S, B, I)">
              <div className="h-80 w-full mt-4 flex items-center justify-center">
                {esbiBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={esbiBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {esbiBreakdown.map((entry, index) => (
                          <Cell key={`esbi-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip symbol={symbol} />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-400 text-sm">No quadrant-tagged income entries found.</div>
                )}
              </div>
            </Card>

            <Card title="Freedom Multiplier Roadmap">
              <div className="space-y-4 mt-2">
                <p className="text-sm text-gray-500">
                  Financial freedom occurs when your <strong>B</strong> (Business System) and <strong>I</strong> (Investor) cashflow matches or exceeds your monthly burn rate.
                </p>

                <div className="space-y-3">
                  {esbiBreakdown.map(item => (
                    <div key={item.name} className="p-3 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-100 dark:border-white/5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-500">{item.desc}</div>
                      </div>
                      <div className="font-bold text-gray-900 dark:text-white text-base">
                        {symbol}{item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsView;
