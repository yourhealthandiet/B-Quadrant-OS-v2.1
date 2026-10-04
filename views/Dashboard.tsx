
import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { AppContext, MoneyDisplay } from '../App';
import DashboardLaunchpad from '../components/DashboardLaunchpad';
import { InsightCard } from '../components/InsightCard';
import { useAdaptiveIntelligence } from '../hooks/useAdaptiveIntelligence';
import { Card, Button, Modal, Input, Select } from '../components/Shared';
import { ArrowUp, ArrowDown, Target, TrendingUp, CheckCircle, CheckCircle2, Bell, ChevronDown, Flame, Lock, Clock, Triangle, Briefcase, Users, Cog, Scale, Wallet, PieChart as PieIcon, RefreshCw, Zap, AlertCircle, Check, X, HelpCircle, Info, Lightbulb, TrendingDown, Banknote, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { calculateBusinessValuation, calculateBusinessQuality, InsightContext, InsightResult, getSystemTimeString, formatEntryTime } from '../types';
import { FREQUENCY_OPTIONS } from '../constants';
import * as AIService from '../services/aiService';
import { generateInsight } from '../services/insightEngine';
import { getChildren, getTopLevelBuckets, getEffectiveBalance, hasChildren, buildHierarchicalOptions } from '../services/bucketEngine';

const StatCard = ({ title, value, subValue, icon: Icon, color, trend, isCurrency = true, note, symbol }: any) => (
  <Card className="relative overflow-hidden min-h-[85px] flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-md cursor-default h-full">
    <div className={`absolute -right-4 -top-4 w-14 h-14 sm:w-20 sm:h-20 rounded-full opacity-10 ${color}`}></div>
    <div className="flex justify-between items-start">
      <div className={`p-1 sm:p-2 rounded-lg shrink-0 ${color.replace('bg-', 'bg-opacity-10 text-')}`}>
        <Icon size={14} className="sm:w-5 sm:h-5" />
      </div>
      {subValue && (
          <div className={`flex items-center gap-1 text-[10px] sm:text-xs font-bold shrink-0 ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
              {trend === 'up' ? <ArrowUp size={10} /> : trend === 'down' ? <ArrowDown size={10} /> : null}
          </div>
      )}
    </div>
    <div className="mt-2 min-w-0 flex flex-col">
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mb-0.5 break-words whitespace-normal shrink-0">{title}</p>
        <div className="text-[clamp(18px,3.8vw,26px)] font-semibold tracking-tight break-words whitespace-normal leading-snug text-gray-900 dark:text-gray-100 py-0.5">
           {isCurrency ? <MoneyDisplay amount={typeof value === 'number' ? value : 0} symbol={symbol} /> : value}
        </div>
        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap items-center gap-1 break-words whitespace-normal font-medium">
            {subValue}
        </div>
        {note && <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-400 mt-1 leading-snug break-words whitespace-normal font-normal">{note}</p>}
    </div>
  </Card>
);

const AllocationItem = ({ alloc, allAllocations, idx, symbol, level = 0 }: any) => {
    const isSpecial = alloc.name === 'Uncategorized';
    const effectiveBalance = getEffectiveBalance(allAllocations, alloc.id);
    const children = getChildren(allAllocations, alloc.id);
    const hasChildBuckets = children.length > 0;
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="flex flex-col gap-1 w-full relative">
            {level > 0 && (
                <div className="absolute -left-2 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700 pointer-events-none"></div>
            )}
            <div 
                className={`${isSpecial ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50 shadow-sm border-2' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 border'} p-3 rounded-xl flex flex-col justify-between transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-md ${hasChildBuckets ? 'cursor-pointer' : ''}`}
                onClick={hasChildBuckets ? () => setExpanded(!expanded) : undefined}
            >
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-2">
                        {hasChildBuckets && (
                            <div className="text-gray-400 shrink-0">
                                <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                            </div>
                        )}
                        <span className={`font-semibold text-xs sm:text-sm break-words ${isSpecial ? 'text-blue-800 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>
                            {isSpecial ? 'Main Income Bucket' : alloc.name}
                        </span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ${isSpecial ? 'bg-blue-200 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>{alloc.percentage}%</span>
                </div>
                <div className="flex justify-between items-end gap-2">
                    <div className="min-w-0 flex-1">
                        <p className={`text-[10px] uppercase break-words ${isSpecial ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500'}`}>{hasChildBuckets ? 'Total Balance' : 'Balance'}</p>
                        <p className={`font-bold text-sm sm:text-base break-words ${effectiveBalance < 0 ? 'text-red-500' : ''}`}><MoneyDisplay amount={effectiveBalance} symbol={symbol} /></p>
                    </div>
                    <div className={`w-1.5 h-6 rounded-full shrink-0`} style={{ backgroundColor: isSpecial ? '#3b82f6' : ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][idx % 5]}}></div>
                </div>
            </div>
            
            {hasChildBuckets && expanded && (
                <div className="pl-4 mt-2 flex flex-col gap-2 relative">
                    {children.map((child, cIdx) => (
                        <AllocationItem 
                            key={child.id} 
                            alloc={child} 
                            allAllocations={allAllocations} 
                            idx={(idx * 10) + cIdx + 1} 
                            symbol={symbol}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const DashboardView = () => {
  const context = useContext(AppContext)!;
  const [isPayOwnersOpen, setPayOwnersOpen] = useState(false);
  const [payOwnersAmount, setPayOwnersAmount] = useState<number>(0);
  const [payOwnersDate, setPayOwnersDate] = useState<string>(() => { const d = new Date(); d.setFullYear(2026); return d.toISOString().split('T')[0]; });
  const [payOwnersTime, setPayOwnersTime] = useState<string>(() => getSystemTimeString());
  const [payOwnersDesc, setPayOwnersDesc] = useState<string>('Profit Distribution');
  const [payOwnersFrequency, setPayOwnersFrequency] = useState<string>("one_time");
  const [payOwnersCustomVal, setPayOwnersCustomVal] = useState<number>(1);
  const [payOwnersCustomUnit, setPayOwnersCustomUnit] = useState<string>("months");
  const [payOwnersAuto, setPayOwnersAuto] = useState<boolean>(false);
  const [payOwnersIsDirect, setPayOwnersIsDirect] = useState<boolean>(false);
  const [payOwnersBucket, setPayOwnersBucket] = useState<string>("Uncategorized");
  const [valuationMode, setValuationMode] = useState<'income' | 'total'>('income');
  const [showDetailedDashboard, setShowDetailedDashboard] = useState(() => {
    try { return localStorage.getItem('bquad_detailed_dashboard') === 'true'; } catch { return false; }
  });
  const updateDetailedDashboard = (visible: boolean) => {
    setShowDetailedDashboard(visible);
    try { localStorage.setItem('bquad_detailed_dashboard', String(visible)); } catch {}
  };


  const { metrics, symbol, activeCurrencyCode, fullCurrencyName, data, activeProfileId, setActiveProfileId, timeFilter, setTimeFilter, distributeFunds, distributeBusinessProfit, undoDistribution, redoDistribution, canUndoDistribution, canRedoDistribution, undoCount, redoCount, formatAmount, filteredData, approveEntry, rejectEntry, simulatedUser, effectiveRole } = context;

  const currentProfileName = activeProfileId === 'personal' ? 'Personal' : data.businesses.find(b => b.id === activeProfileId)?.name || 'Unknown';
  const isBusiness = activeProfileId !== 'personal';
  const activeBusiness = data.businesses.find(b => b.id === activeProfileId);
  const pendingEntries = filteredData.pendingEntries || [];
  const isViewer = effectiveRole === 'viewer';

  useEffect(() => {
      if (isBusiness) {
          window.dispatchEvent(new CustomEvent('trigger-tour', { detail: 'nav-dashboard-bus' }));
      } else {
          window.dispatchEvent(new CustomEvent('trigger-tour', { detail: 'nav-dashboard' }));
      }
  }, [isBusiness]);

  const retainedEarningsStats = useMemo(() => {
      const entityEntries = (data.entries || []).filter(e => e.profileId === activeProfileId);
      const totalIncome = entityEntries.filter(e => e.type === 'income' && e.subtype !== 'INTERNAL_TRANSFER').reduce((sum, e) => sum + e.amount, 0);
      const totalExpenses = entityEntries.filter(e => e.type === 'expense' && e.subtype !== 'INTERNAL_TRANSFER' && e.subtype !== 'DISTRIBUTION').reduce((sum, e) => sum + e.amount, 0);
      const totalDistributions = entityEntries.filter(e => e.type === 'expense' && e.subtype === 'DISTRIBUTION').reduce((sum, e) => sum + e.amount, 0);
      const retainedEarnings = totalIncome - totalExpenses - totalDistributions;
      return { totalIncome, totalExpenses, totalDistributions, retainedEarnings };
  }, [data.entries, activeProfileId]);

  const owners = useMemo(() => {
      return context.engine.edges.filter(e => e.child_entity_id === activeProfileId);
  }, [context.engine.edges, activeProfileId]);

  const bucketOptions = useMemo(() => {
      const profileAllocations = data.allocations.filter((a) => a.profileId === activeProfileId);
      const uncatBucket = profileAllocations.find((a) => a.name === "Uncategorized");
      const otherBuckets = profileAllocations.filter((a) => a.name !== "Uncategorized");

      return [
          {
          value: "Uncategorized",
          label: `Proportional / Main Bucket (${formatAmount(uncatBucket?.balance || 0)})`,
          },
          ...buildHierarchicalOptions(otherBuckets, (a: any) => `${a.name} (${formatAmount(getEffectiveBalance(profileAllocations, a.id))})`)
      ];
  }, [data.allocations, activeProfileId]);

  const distBucketOptions = useMemo(() => {
    const profileAllocations = data.allocations.filter((a) => a.profileId === activeProfileId);
    const otherBuckets = profileAllocations.filter((a) => a.name !== "Uncategorized");
    return [
        ...buildHierarchicalOptions(otherBuckets, (a: any) => `${a.name} (${formatAmount(getEffectiveBalance(profileAllocations, a.id))})`)
    ];
  }, [data.allocations, activeProfileId]);

  const handlePayOwnersSubmit = () => {
      const maxAmount = retainedEarningsStats.retainedEarnings;

      if (isNaN(payOwnersAmount) || payOwnersAmount <= 0) {
          alert('Invalid amount.');
          return;
      }
      if (payOwnersAmount > maxAmount) {
          alert(`Insufficient retained earnings. Maximum available is ${formatAmount(maxAmount)}.`);
          return;
      }

      let finalBucket = payOwnersBucket;
      if (payOwnersBucket !== "Uncategorized") {
          const profileAllocations = data.allocations.filter((a) => a.profileId === activeProfileId);
          const targetBucket = profileAllocations.find(a => a.name === payOwnersBucket);
          const bBalance = targetBucket ? getEffectiveBalance(profileAllocations, targetBucket.id) : 0;
          if (payOwnersAmount > bBalance) {
              const totalProfileCash = profileAllocations.reduce((sum, a) => sum + a.balance, 0);
              if (totalProfileCash < payOwnersAmount) {
                 alert(`Insufficient total funds. Your total cash across all buckets is ${formatAmount(totalProfileCash)}, but you are trying to distribute ${formatAmount(payOwnersAmount)}.`);
                 return;
              }
              if (!confirm(`Insufficient funds in selected bucket (${formatAmount(bBalance)}).\n\nDo you want to instead use the default method and remove the money dynamically from all buckets?`)) {
                  return;
              } else {
                  finalBucket = "Uncategorized"; // Switch to proportional
              }
          }
      }
      
      if (!window.confirm("Add this distribution?")) {
        return;
      }
      
      try {
          const sequenceId = payOwnersFrequency !== 'one_time' ? `seq_${Date.now()}` : undefined;
          const actualFrequency = payOwnersFrequency === 'custom' ? `custom:${payOwnersCustomVal}:${payOwnersCustomUnit}` : payOwnersFrequency;
          distributeBusinessProfit(activeProfileId, payOwnersAmount, payOwnersDesc, payOwnersDate, finalBucket, {
             frequency: actualFrequency as any,
             isRecurring: payOwnersFrequency !== 'one_time',
             lastExecutedAt: new Date().toISOString(),
             autoDistribute: payOwnersAuto,
             sourceBucket: finalBucket,
             sequenceId,
             targetAmount: payOwnersAmount,
             targetDescription: payOwnersDesc,
             isActive: true,
             time: payOwnersTime || getSystemTimeString()
          }, undefined, payOwnersTime || getSystemTimeString());
          setPayOwnersOpen(false);
          setPayOwnersAmount(0);
          setPayOwnersDesc('Profit Distribution');
          setPayOwnersFrequency('one_time');
          setPayOwnersAuto(false);
          setPayOwnersBucket('Uncategorized');
          setPayOwnersTime(getSystemTimeString());
          alert('Successfully processed distribution.');
      } catch (err: any) {
          alert(err.message || 'Distribution failed.');
      }
  };

  const distributionActions = !isViewer ? (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-1">
          <button 
              onClick={distributeFunds} 
              className="flex items-center justify-center gap-1 text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1.5 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
          >
              <Scale size={12}/> {isBusiness ? 'Allocate Profit' : 'Allocate Income'}
          </button>
          {isBusiness && (
              <button 
                  data-tour="dashboard-bus-payout"
                  onClick={() => {
                      if (retainedEarningsStats.retainedEarnings <= 0) {
                          alert('No available profit to distribute. Retained earnings must be positive.');
                          return;
                      }
                      setPayOwnersAmount(retainedEarningsStats.retainedEarnings);
                      setPayOwnersOpen(true);
                  }} 
                  className="flex items-center justify-center gap-1 text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-1.5 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
              >
                  <Scale size={12}/> Payout (Distribution)
              </button>
          )}
      </div>
  ) : null;
  
  const canApprove = effectiveRole === 'admin' || effectiveRole === 'partner';
  
  const freedomProgress = Math.min(100, Math.round(metrics.financialFreedomRate * 100));

  const { context: insightCtx, dashboardInsight: insight } = useAdaptiveIntelligence(data, activeProfileId, metrics, timeFilter, context);

  // --- Logic Split: Personal vs Business ---
  
  const annualExpenses = (metrics.totalExpenses * 12) || 1; 
  const assetScore = Math.min(50, Math.max(0, (metrics.netWorth / annualExpenses) * 50));
  const freedomScore = Math.min(50, Math.max(0, metrics.financialFreedomRate * 50));
  const healthScore = Math.round(assetScore + freedomScore);

  let Annual_Net = 0;
  let displayAnnualNet = 0;
  let valuationConfidenceScore = 0;
  let valuationConfidenceLabel = "";
  let projectionLabel = "";
  let activeDaysValuation = 0;
  let projectionWeightFactor = 0;
  let enterpriseValue = 0;
  let equityValue = 0;
  let trueEquityValue = 0;
  let assetBasedEquity = 0;
  let netBusinessAssets = 0;
  let netDebt = 0;
  let valuationMultiple = 0;
  let unadjustedMultiplier = 0;
  let multiplierAdjustmentFactor = 1;
  let isTrueBusiness = false;
  let entityRiskMsg = "";
  let entityFactor = 1;

  // Business Specific Logic
  let targets = { revenue: 0, profit: 0, label: 'Target' };
  let revenueProgress = 0;
  let profitProgress = 0;

  if (isBusiness && activeBusiness) {
      let totalOwnershipPct = (activeBusiness.ownershipStake || 100) / 100;
      try {
          const ownershipResult = context.engine.calculateOwnership('personal', activeBusiness.id);
          totalOwnershipPct = ownershipResult.totalOwnership / 100;
      } catch(e) {}

      // Pass ASSETS to enable Net Debt calculation
      const val = calculateBusinessValuation(activeBusiness, context.data.entries, context.data.assets, totalOwnershipPct); 
      Annual_Net = val.Annual_Net;
      displayAnnualNet = val.displayAnnualNet;
      valuationConfidenceScore = val.valuationConfidenceScore;
      valuationConfidenceLabel = val.valuationConfidenceLabel;
      projectionLabel = val.projectionLabel;
      activeDaysValuation = val.activeDays;
      projectionWeightFactor = val.projectionWeightFactor;
      unadjustedMultiplier = val.unadjustedMultiplier;
      multiplierAdjustmentFactor = val.multiplierAdjustmentFactor;

      enterpriseValue = val.enterpriseValue;
      equityValue = val.totalValuation; // Using Equity Value as the main 'Total Valuation'
      trueEquityValue = val.trueValuation;
      
      const bizAssets = (context.data.assets || []).filter(a => a.profileId === activeBusiness.id);
      const totalAssetsValue = bizAssets.filter(a => a.type === 'asset').reduce((sum, a) => sum + a.amount, 0);
      const manualCashAssets = bizAssets.filter(a => a.type === 'asset' && a.category === 'Cash').reduce((sum, a) => sum + a.amount, 0); 
      
      // Calculate Net Business Assets (GAAP)
      // -netDebt = totalCash - totalLiab. nonCashAssets = totalAssetsValue - manualCashAssets
      netBusinessAssets = (totalAssetsValue - manualCashAssets) - val.netDebt;
      
      // Calculate Total Value Mode (Asset Based Equity)
      // We use enterpriseValue (operations only) + Net Business Assets to prevent double-subtracting liabilities
      if (enterpriseValue === 0) {
          assetBasedEquity = netBusinessAssets;
      } else if (netBusinessAssets < 0) {
          assetBasedEquity = enterpriseValue - Math.abs(netBusinessAssets);
      } else {
          assetBasedEquity = enterpriseValue + netBusinessAssets;
      }

      netDebt = val.netDebt;
      valuationMultiple = val.multiplier;
      entityRiskMsg = val.entityRiskMsg;
      entityFactor = val.entityFactor;
      isTrueBusiness = (activeBusiness.biTriangle.systems > 7) && (metrics.calculatedWeeklyHours < 10);

      // Scale Targets based on Time Filter
      const mRev = activeBusiness.monthlyRevenueTarget || 0;
      const mProf = activeBusiness.monthlyProfitTarget || 0;
      const aRev = activeBusiness.revenueTarget || 0;
      const aProf = activeBusiness.profitTarget || 0;

      switch(timeFilter) {
          case '24h': targets = { revenue: mRev / 30, profit: mProf / 30, label: 'Daily Target' }; break;
          case '1w': targets = { revenue: mRev / 4, profit: mProf / 4, label: 'Weekly Target' }; break;
          case '1m': targets = { revenue: mRev, profit: mProf, label: 'Monthly Target' }; break;
          case '1y': targets = { revenue: aRev, profit: aProf, label: 'Annual Target' }; break;
          default: targets = { revenue: aRev, profit: aProf, label: 'Target' };
      }

      revenueProgress = targets.revenue > 0 ? Math.min(100, (metrics.totalIncome / targets.revenue) * 100) : 0;
      profitProgress = targets.profit > 0 ? Math.min(100, (metrics.cashflow / targets.profit) * 100) : 0;
  }
  
  // B-I Triangle Data
  const biData = activeBusiness?.biTriangle ? [
      { subject: 'Mission', A: activeBusiness.biTriangle.mission || 0, fullMark: 10 },
      { subject: 'Team', A: activeBusiness.biTriangle.team || 0, fullMark: 10 },
      { subject: 'Lead', A: activeBusiness.biTriangle.leadership || 0, fullMark: 10 },
      { subject: 'Cash', A: activeBusiness.biTriangle.cashflow || 0, fullMark: 10 },
      { subject: 'Comms', A: activeBusiness.biTriangle.communications || 0, fullMark: 10 },
      { subject: 'Sys', A: activeBusiness.biTriangle.systems || 0, fullMark: 10 },
      { subject: 'Legal', A: activeBusiness.biTriangle.legal || 0, fullMark: 10 },
      { subject: 'Prod', A: activeBusiness.biTriangle.product || 0, fullMark: 10 },
  ] : [];

  const bqsData = activeBusiness?.biTriangle ? calculateBusinessQuality(activeBusiness.biTriangle) : null;
  const biScore = bqsData ? bqsData.bqs : 0;
    
  // Strongest / Weakest Link Logic
  const sortedBi = [...biData].sort((a,b) => a.A - b.A); 
  let weakestLink = sortedBi[0];
  const strongestLink = sortedBi[sortedBi.length - 1];
  
  const getLinkAdvice = (subject: string, type: 'weak' | 'strong') => {
      if (type === 'weak') {
          if(subject === 'Cash') return "Fragile. One bad month could kill the business.";
          if(subject === 'Sys') return "Owner Trapped. Business cannot scale without you.";
          if(subject === 'Legal') return "Exposed. IP theft or lawsuit could destroy value.";
          if(subject === 'Comms') return "Invisible. Great product, but nobody knows it.";
          return "This limits your growth ceiling.";
      } else {
          if(subject === 'Cash') return "Stable. You can weather storms and invest.";
          if(subject === 'Sys') return "Scalable. You can franchise or sell easily.";
          if(subject === 'Team') return "Leverage. You have smart people solving problems.";
          return "This is your competitive advantage.";
      }
  };

  // --- DETAILED S vs B ANALYSIS ---
  const weeklyHours = metrics.calculatedWeeklyHours || 0;
  const sysScore = activeBusiness?.biTriangle?.systems || 0;
  const timeFilterLabel = ({ '24h': 'Today', '1w': 'This week', '1m': 'This month', '1y': 'This year', all: 'All time', month: 'This month', year: 'This year', '7d': 'Past 7 days' } as Record<string, string>)[timeFilter] || 'Selected period';


  return (
    <div className="space-y-2.5 sm:space-y-3.5 pb-20 lg:pb-0 -mt-2">
      <DashboardLaunchpad onOpenDetails={(target) => {
        updateDetailedDashboard(true);
        window.setTimeout(() => document.getElementById(target === 'approvals' ? 'approval-queue' : 'detailed-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }} />
      <div id="detailed-dashboard" className="border-t border-slate-200 dark:border-slate-700/70 pt-5 mt-7 scroll-mt-32">
        <button type="button" onClick={() => updateDetailedDashboard(!showDetailedDashboard)} aria-expanded={showDetailedDashboard} aria-controls="dashboard-deep-content" className="flex items-center justify-between gap-3 w-full text-left rounded-2xl px-5 py-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-colors">
          <span className="font-bold text-slate-900 dark:text-white">Detailed financial dashboard <span className="block text-xs font-normal text-slate-500 dark:text-slate-400 mt-1">Original analytics, financial models, fund allocation and pending approvals</span></span>
          <ChevronDown className={`shrink-0 transition-transform ${showDetailedDashboard ? 'rotate-180' : ''}`} size={20}/>
        </button>
        {showDetailedDashboard && (
          <div id="dashboard-deep-content" className="space-y-4 mt-4">
      {/* Top Bar - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row justify-start items-start gap-3 sm:gap-4 -ml-1">
         <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto no-scrollbar" data-tour="dashboard-time-toggles">
             <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-gray-200 dark:border-white/10 min-w-max shadow-sm">
                {([
                  { value: '24h', label: 'Today' },
                  { value: '1w', label: 'Week' },
                  { value: '1m', label: 'Month' },
                  { value: '1y', label: 'Year' },
                  { value: 'all', label: 'All time' },
                ] as const).map(({ value, label }) => (
                    <button 
                        key={value}
                        onClick={() => setTimeFilter(value)}
                        className={`px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-md transition-all ${timeFilter === value ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-primary'}`}
                    >
                        {label}
                    </button>
                ))}
             </div>
         </div>
      </div>

          {/* Centralized Insight Card */}
          {effectiveRole !== 'finance_staff' && insight && (
            <div id="central-insight-region">
                <InsightCard result={insight} />
            </div>
          )}

      {/* Valuation Mode Toggle for Business */}
      {isBusiness && (
          <div className="flex justify-end mb-2" data-tour="nav-dashboard-bus">
              <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex shadow-inner" data-tour="dashboard-valuation-mode">
                  <button onClick={() => setValuationMode('income')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${valuationMode === 'income' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      Income Value Mode {valuationMode === 'income' ? '✅' : ''}
                  </button>
                  <button onClick={() => setValuationMode('total')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${valuationMode === 'total' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      Total Value Mode {valuationMode === 'total' ? '✅' : ''}
                  </button>
              </div>
          </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4" data-tour="dashboard-kpis">
        {effectiveRole !== 'finance_staff' ? (
          <StatCard 
            title={isBusiness ? (valuationMode === 'income' ? "Business Value (Income Mode)" : "Total Value") : "Net Worth"}
            value={isBusiness ? (valuationMode === 'income' ? trueEquityValue : assetBasedEquity) : metrics.netWorth} 
            subValue={isBusiness ? (valuationMode === 'income' ? undefined : (
                <div className="flex flex-col gap-0.5 w-full">
                    <div className="flex justify-between"><span>Income Val:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{formatAmount(enterpriseValue)}</span></div>
                    <div className="flex justify-between"><span>Net Assets:</span> <span className="font-semibold text-gray-700 dark:text-gray-300">{netBusinessAssets < 0 ? '-' : '+'}{formatAmount(Math.abs(netBusinessAssets))}</span></div>
                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 mt-1 pt-1"><span>Total Value:</span> <span className="font-bold text-gray-900 dark:text-white">{formatAmount(assetBasedEquity)}</span></div>
                </div>
            )) : "Assets - Liabilities"}
            note={isBusiness ? (valuationMode === 'income' ? "Based on cashflow analysis only. Excludes cash, inventory, and assets." : "Income Value plus cash and other assets minus debt. GAAP book value added.") : "Net Worth = Total Assets - Total Liabilities"}
            trend="up"
            icon={isBusiness ? Briefcase : TrendingUp} 
            color="bg-primary"
            symbol={symbol}
          />
        ) : (
          <StatCard 
            title="Total Income" 
            value={metrics.totalIncome} 
            subValue={timeFilterLabel}
            note="Total Cash Inflow"
            trend="up"
            icon={ArrowUp} 
            color="bg-primary"
            symbol={symbol}
          />
        )}
        {effectiveRole !== 'finance_staff' ? (
          <StatCard 
            title={isBusiness ? projectionLabel : "Recurring Passive Inc"} 
            value={isBusiness ? displayAnnualNet : metrics.recurringPassive} 
            subValue={isBusiness ? (
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-gray-900 dark:text-gray-100">{valuationMultiple.toFixed(2)}x Multiplier</span>
                        {valuationConfidenceScore < 100 && (
                            <span className="text-[9px] text-gray-400 line-through opacity-60 font-medium">({unadjustedMultiplier.toFixed(2)}x Base)</span>
                        )}
                        <span className={`text-[9px] px-1 rounded font-semibold ${valuationConfidenceScore < 60 ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                            {valuationConfidenceLabel}
                        </span>
                        {valuationConfidenceScore < 100 && (
                             <span className="text-[9px] px-1 bg-red-50 text-red-600 border border-red-100 rounded font-semibold flex items-center gap-0.5" title="Multiplier adjusted based on data maturity and confidence level.">
                                <Zap size={8} /> Risk Adjusted
                             </span>
                        )}
                    </div>
                </div>
            ) : `${freedomProgress}% to Freedom`}
            note={isBusiness ? (
                <span className="flex items-center gap-1">
                   <Clock size={10} /> 
                   {valuationConfidenceScore < 90 
                     ? `Stabilized using ${activeDaysValuation} day(s) of data (${valuationConfidenceScore}%)`
                     : `Verified based on ${activeDaysValuation} day(s) of data`}
                </span>
            ) : "Monthly Recurring Passive Income vs Expenses"}
            trend="up"
            icon={isBusiness ? Scale : Target} 
            color="bg-secondary"
            symbol={symbol}
          />
        ) : (
          <StatCard 
            title="Total Expenses" 
            value={metrics.totalExpenses} 
            subValue={timeFilterLabel}
            note="Total Cash Outflow"
            trend="down"
            icon={ArrowDown} 
            color="bg-secondary"
            symbol={symbol}
          />
        )}
        <StatCard 
          title={`Cashflow (${timeFilter})`} 
          value={metrics.cashflow} 
          subValue={isBusiness ? `Net Profit: ${formatAmount(metrics.netProfit)}` : "Saved"}
          note={`Operating Cashflow in the last ${timeFilter}`}
          trend={metrics.cashflow > 0 ? 'up' : 'down'}
          icon={metrics.cashflow > 0 ? ArrowUp : ArrowDown} 
          color="bg-accent"
          symbol={symbol}
        />
        <StatCard 
          title={isBusiness ? "System Score" : "Fin. IQ"} 
          value={isBusiness ? (biScore * 10).toFixed(0) : healthScore} 
          subValue="/ 100"
          trend={healthScore > 70 ? 'up' : 'down'}
          icon={isBusiness ? Triangle : CheckCircle2} 
          color="bg-purple-500"
          isCurrency={false}
          symbol={symbol}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Left Column (Charts) */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
               {/* APPROVAL QUEUE (If items exist and user is Admin/Partner) */}
               {canApprove && pendingEntries.length > 0 && (
                   <Card id="approval-queue" title="Approvals Required" className="border-l-4 border-l-yellow-500 scroll-mt-32">
                       <div className="space-y-3">
                           <div className="bg-yellow-50 dark:bg-yellow-900/10 p-2 text-xs rounded text-yellow-800 dark:text-yellow-400">
                               <AlertCircle size={12} className="inline mr-1"/> Review pending revenue/expense entries from staff.
                           </div>
                           {pendingEntries.map(entry => (
                               <div key={entry.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                                   <div className="mb-2 sm:mb-0">
                                       <div className="flex items-center gap-2">
                                            <span className="font-bold">{entry.description}</span>
                                            <span className="text-[10px] bg-white dark:bg-black/20 px-1.5 rounded uppercase border border-gray-200">{entry.submittedByName}</span>
                                       </div>
                                       <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                                           <span>{new Date(entry.date).toLocaleDateString()} {formatEntryTime(entry) ? `• ${formatEntryTime(entry)}` : ''}</span>
                                           <span>{entry.category}</span>
                                           {entry.isDirectAllocation && <span className="text-blue-500 font-bold">DIRECT</span>}
                                       </div>
                                   </div>
                                   <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                       <span className={`font-bold ${entry.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                            {entry.type === 'income' ? '+' : '-'}{formatAmount(entry.amount)}
                                       </span>
                                       <div className="flex gap-1">
                                           <Button onClick={() => approveEntry(entry.id)} className="!p-1.5 h-auto rounded-lg bg-green-100 text-green-700 hover:bg-green-200">
                                               <Check size={16}/>
                                           </Button>
                                           <Button onClick={() => rejectEntry(entry.id)} className="!p-1.5 h-auto rounded-lg bg-red-100 text-red-700 hover:bg-red-200">
                                               <X size={16}/>
                                           </Button>
                                       </div>
                                   </div>
                               </div>
                           ))}
                       </div>
                   </Card>
               )}

          {isBusiness ? (
               /* BUSINESS DASHBOARD CONTENT */
               <>
               {/* VALUATION BREAKDOWN (GAAP Standard) */}
               <Card title="Valuation Breakdown (Standard Model)">
                   <div className="flex flex-col gap-4">
                       <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                           <div className="flex justify-between items-center mb-1 gap-2 flex-wrap">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300 break-words">Enterprise Value (Operations)</span>
                                <span className="font-bold text-gray-800 dark:text-gray-100 break-words"><MoneyDisplay amount={enterpriseValue} symbol={symbol} /></span>
                           </div>
                            <p className="text-[10px] text-gray-400">
                                {valuationConfidenceScore < 100 ? (
                                    <>
                                        Stabilized Annual Net ({formatAmount(displayAnnualNet)}) × 
                                        Adjusted Multiplier ({valuationMultiple.toFixed(2)}x)
                                        <span className="ml-1 opacity-60">({unadjustedMultiplier.toFixed(2)}x Base)</span>
                                    </>
                                ) : (
                                    <>Annual Net ({formatAmount(Annual_Net)}) × Industry & Adj. Multiplier ({valuationMultiple.toFixed(2)}x)</>
                                )}
                            </p>
                            {valuationConfidenceScore < 100 && (
                                <div className="flex flex-col gap-1 mt-1">
                                    <p className="text-[9px] text-amber-500 font-bold uppercase flex items-center gap-1 min-w-0 break-words">
                                        <Clock size={10} className="shrink-0"/> <span className="break-words">Stabilization applied (Confidence: {valuationConfidenceScore}%)</span>
                                    </p>
                                    <p className="text-[9px] text-red-500 font-semibold uppercase flex items-center gap-1 min-w-0 break-words">
                                        <Zap size={10} className="shrink-0"/> <span className="break-words">Multiplier Risk-Adjusted (-{Math.round((1 - multiplierAdjustmentFactor) * 100)}%)</span>
                                    </p>
                                </div>
                            )}
                       </div>
                       
                       <div className="flex justify-center -my-2 z-10"><ArrowDown className="text-gray-300" size={20}/></div>

                       <div className={`p-3 rounded-xl border ${valuationMode === 'total' ? (netBusinessAssets < 0 ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30" : "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30") : (netDebt >= 0 ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30" : "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30")}`}>
                           <div className="flex justify-between items-center mb-1 gap-2 flex-wrap">
                                <span className={`text-sm font-bold flex items-center gap-1 break-words ${valuationMode === 'total' ? (netBusinessAssets < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400") : (netDebt >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}`}>
                                    {valuationMode === 'total' ? (netBusinessAssets < 0 ? <TrendingDown size={14} className="shrink-0"/> : <TrendingUp size={14} className="shrink-0"/>) : (netDebt >= 0 ? <TrendingDown size={14} className="shrink-0"/> : <TrendingUp size={14} className="shrink-0"/>)} 
                                    {valuationMode === 'total' ? (netBusinessAssets < 0 ? "Less: Net Debt" : "Plus: Net Assets") : (netDebt >= 0 ? "Less: Net Debt" : "Plus: Net Cash")}
                                </span>
                                <span className={`font-bold break-words ${valuationMode === 'total' ? (netBusinessAssets < 0 ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400") : (netDebt >= 0 ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400")}`}>
                                    {valuationMode === 'total' ? (netBusinessAssets < 0 ? "-" : "+") : (netDebt >= 0 ? "-" : "+")}<MoneyDisplay amount={valuationMode === 'total' ? Math.abs(netBusinessAssets) : Math.abs(netDebt)} symbol={symbol} />
                                </span>
                           </div>
                           <p className={`text-[10px] ${valuationMode === 'total' ? (netBusinessAssets < 0 ? "text-red-400" : "text-green-400") : (netDebt >= 0 ? "text-red-400" : "text-green-400")}`}>
                               {valuationMode === 'total' ? (netBusinessAssets < 0 ? "Total Liabilities > Total Assets" : "GAAP Balance Sheet Value") : (netDebt >= 0 ? "Total Liabilities > Cash Reserves" : "Cash Reserves > Total Liabilities")}
                           </p>
                       </div>

                       {valuationMode === 'income' && (
                           <>
                               <div className="flex justify-center -my-2 z-10"><ArrowDown className="text-gray-300" size={20}/></div>
        
                               <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30 shadow-sm">
                                   <div className="flex justify-between items-center gap-2 flex-wrap">
                                        <span className="text-base font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide flex items-center gap-2 break-words"><Banknote size={18} className="shrink-0"/> <span className="break-words">Equity Value</span></span>
                                        <span className="text-lg font-semibold text-green-700 dark:text-green-400 break-words"><MoneyDisplay amount={equityValue} symbol={symbol} /></span>
                                   </div>
                                   <p className="text-[10px] text-green-600 dark:text-green-500 mt-1">This is the "Walk Away" number for shareholders.</p>
                               </div>
                           </>
                       )}
                   </div>
               </Card>

               <Card title={`Performance Targets (${targets.label})`}>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Revenue Target */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-bold uppercase text-gray-500">Revenue Goal</span>
                                <div className="text-right">
                                    <span className="text-base font-bold block leading-none">{formatAmount(metrics.totalIncome)}</span>
                                    <span className="text-[10px] text-gray-400">Target: {formatAmount(targets.revenue)}</span>
                                </div>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${revenueProgress >= 100 ? 'bg-green-500' : 'bg-primary'}`} 
                                    style={{ width: `${revenueProgress}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold">
                                <span>0%</span>
                                <span className={revenueProgress >= 100 ? 'text-green-500' : 'text-primary'}>{revenueProgress.toFixed(0)}% Achieved</span>
                            </div>
                        </div>

                        {/* Profit Target */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-bold uppercase text-gray-500">Profit Goal</span>
                                <div className="text-right">
                                    <span className={`text-base font-bold block leading-none ${metrics.cashflow < 0 ? 'text-red-500' : ''}`}>{formatAmount(metrics.cashflow)}</span>
                                    <span className="text-[10px] text-gray-400">Target: {formatAmount(targets.profit)}</span>
                                </div>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${profitProgress >= 100 ? 'bg-green-500' : metrics.cashflow < 0 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                                    style={{ width: `${Math.max(0, profitProgress)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold">
                                <span>0%</span>
                                <span className={profitProgress >= 100 ? 'text-green-500' : 'text-indigo-500'}>{profitProgress.toFixed(0)}% Achieved</span>
                            </div>
                        </div>
                   </div>
                   <p className="text-[10px] text-gray-400 mt-4 italic text-center">
                        * Targets automatically scale based on your selected time filter ({timeFilter}). Update goals in Settings.
                   </p>
                </Card>

                <Card 
                    title="Fund Allocations" 
                    action={distributionActions}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-tour="pocket-cards">
                         {getTopLevelBuckets(context.filteredData.allocations).map((alloc, idx) => (
                             <AllocationItem 
                                 key={alloc.id} 
                                 alloc={alloc} 
                                 allAllocations={context.filteredData.allocations} 
                                 idx={idx} 
                                 symbol={symbol} 
                             />
                         ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-3 italic">
                        * All incoming revenue lands in 'Main Revenue Bucket'. Use 'Allocate' to split it according to percentages.
                    </p>
                </Card>
               </>
          ) : (
             /* PERSONAL DASHBOARD CONTENT */
             <>
                <Card title="Freedom Progress">
                    <div className="relative pt-2 px-1" data-tour="freedom-bar">
                        <div className="flex mb-2 items-center justify-between">
                            <span className="text-[10px] sm:text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md" title="Income from assets > Expenses">
                                Target: 100% of Expenses
                            </span>
                            <span className="text-xs font-bold text-primary">
                                {freedomProgress}%
                            </span>
                        </div>
                        <div className="overflow-hidden h-4 sm:h-6 text-xs flex rounded-full bg-gray-100 dark:bg-gray-700 shadow-inner relative">
                             {/* Markers */}
                             <div className="absolute left-[25%] top-0 bottom-0 w-px bg-white/50 z-10"></div>
                             <div className="absolute left-[50%] top-0 bottom-0 w-px bg-white/50 z-10"></div>
                             <div className="absolute left-[75%] top-0 bottom-0 w-px bg-white/50 z-10"></div>
                             
                             <div style={{ width: `${freedomProgress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-primary to-purple-600 transition-all duration-1000 ease-out">
                             </div>
                        </div>
                        
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 flex items-center gap-1"><Info size={10}/> How it works:</p>
                            <p className="text-xs text-gray-700 dark:text-gray-300 mb-1 break-all">
                                Freedom Ratio = <strong>Recurring Passive Income ({formatAmount(metrics.recurringPassive)})</strong> / <strong>Est. Monthly Expenses ({formatAmount(metrics.estimatedMonthlyExpenses || 0)})</strong>
                            </p>
                            <p className="text-[10px] text-gray-500 italic">
                                * When this hits 100%, your assets pay for your life. You are free.
                            </p>
                        </div>
                    </div>
                </Card>

                <Card title="Fund Allocations" action={distributionActions}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-tour="pocket-cards">
                    {getTopLevelBuckets(context.filteredData.allocations).map((alloc, idx) => (
                        <AllocationItem 
                            key={alloc.id} 
                            alloc={alloc} 
                            allAllocations={context.filteredData.allocations} 
                            idx={idx} 
                            symbol={symbol} 
                        />
                    ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-3 italic">
                        * All incoming funds load to 'Main Income Bucket'. Use 'Allocate' to split into different allocations.
                    </p>
                </Card>
            </>
          )}
        </div>

        {/* Right Column (Score breakdown) */}
        {effectiveRole !== 'finance_staff' && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* Personal Wealth Aggregation Card */}
            {!isBusiness && (
               <Card title="Personal Wealth Engine" className="border-t-4 border-indigo-500 bg-gradient-to-b from-white to-gray-50/50 dark:from-slate-800 dark:to-slate-900/50">
                  <div className="space-y-4">
                      {/* Income Breakdown */}
                      <div className="space-y-2">
                           <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                               <span>True Income Breakdown</span>
                           </div>
                           <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                               <div className="flex items-center gap-2">
                                   <Briefcase size={16} className="text-blue-500" />
                                   <span className="text-sm font-semibold">Active Income</span>
                               </div>
                               <span className="font-bold text-blue-700 dark:text-blue-400"><MoneyDisplay amount={metrics.activeIncome} symbol={symbol} /></span>
                           </div>
                           <div className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                               <div className="flex items-center gap-2">
                                   <TrendingUp size={16} className="text-purple-500" />
                                   <span className="text-sm font-semibold">Passive Income</span>
                               </div>
                               <span className="font-bold text-purple-700 dark:text-purple-400"><MoneyDisplay amount={metrics.passiveIncome} symbol={symbol} /></span>
                           </div>
                           <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-white/5">
                               <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Total Valid Income</span>
                               <span className="text-base font-semibold"><MoneyDisplay amount={metrics.activeIncome + metrics.passiveIncome} symbol={symbol} /></span>
                           </div>
                      </div>

                      {/* Financial Freedom Metric */}
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                           <div className="flex justify-between items-end mb-2">
                               <div>
                                   <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Financial Freedom</span>
                                   <span className="text-[10px] text-gray-400">Recurring Passive Income vs Expenses</span>
                               </div>
                               <div className="text-right">
                                   <span className={`text-xl font-semibold ${metrics.financialFreedomRate >= 1 ? 'text-green-500' : 'text-amber-500'}`}>
                                       {metrics.financialFreedomRate >= 0 ? `${(metrics.financialFreedomRate * 100).toFixed(1)}%` : 'N/A'}
                                   </span>
                               </div>
                           </div>
                           <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                               <div className={`h-2.5 rounded-full ${metrics.financialFreedomRate >= 1 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, Math.max(0, (metrics.financialFreedomRate >= 0 ? metrics.financialFreedomRate : 0) * 100))}%` }}></div>
                           </div>
                      </div>

                      {/* Income Per Hour Tracker */}
                      {Object.keys(metrics.businessIncomePerHour).length > 0 && (
                          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3">Time Efficiency (Per Business)</span>
                              <div className="space-y-2">
                                  {Object.entries(metrics.businessIncomePerHour).map(([bizId, rate]) => {
                                      const biz = data.businesses.find(b => b.id === bizId);
                                      if (!biz) return null;
                                      return (
                                          <div key={bizId} className="flex justify-between items-center text-xs">
                                              <span className="break-words pr-2 font-medium text-gray-600 dark:text-gray-300">{biz.name}</span>
                                              <span className="shrink-0 font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 px-2 py-0.5 rounded">
                                                  {rate === Number.MAX_SAFE_INTEGER ? (
                                                      <span className="text-green-500">PASSIVE</span>
                                                  ) : rate > 0 ? (
                                                      <><MoneyDisplay amount={rate} symbol={symbol} /> / hr</>
                                                  ) : 'N/A'}
                                              </span>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      )}
                  </div>
               </Card>
            )}

            <Card title="System Money Flows" className="border-t-4 border-emerald-500">
               <div className="space-y-3">
                   <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-xs sm:text-sm text-gray-500"><Banknote size={14} className="inline mr-1"/>Real Revenue (External)</span>
                      <span className="font-bold text-green-600"><MoneyDisplay amount={metrics.trueIncome} symbol={symbol} /></span>
                   </div>
                   {(metrics.internalInflows > 0 || metrics.internalOutflows > 0) && (
                       <>
                           <div className="flex justify-between items-center text-[10px] sm:text-xs">
                              <span className="text-gray-400">Internal Transfers In/Out</span>
                              <span className="font-semibold text-gray-500"><MoneyDisplay amount={metrics.internalInflows} symbol={symbol}/> / <MoneyDisplay amount={metrics.internalOutflows} symbol={symbol}/></span>
                           </div>
                           <p className="text-[9px] text-gray-400 italic">
                               * Internal flow is ignored in profit calculation to prevent double counting.
                           </p>
                       </>
                   )}
                   <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-xs sm:text-sm font-bold">True Profit</span>
                      <span className={`font-semibold ${metrics.cashflow >= 0 ? 'text-indigo-600' : 'text-red-500'} bg-indigo-50 dark:bg-indigo-900/20 px-2 rounded-md`}><MoneyDisplay amount={metrics.cashflow} symbol={symbol} /></span>
                   </div>
               </div>
            </Card>

            <Card title={isBusiness ? "Strongest vs Weakest Link" : "Health Score"} className="flex flex-col">
               <div className="flex flex-col items-center justify-center my-4 min-h-[160px] sm:min-h-[200px]">
                 <div className="relative w-40 h-40 sm:w-48 sm:h-48">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={[{ name: 'Score', value: isBusiness ? (biScore*10) : healthScore }, { name: 'Remaining', value: 100 - (isBusiness ? (biScore*10) : healthScore) }]}
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              startAngle={90}
                              endAngle={-270}
                              stroke="none"
                          >
                              <Cell fill={isBusiness ? "#6366f1" : healthScore > 70 ? "#10b981" : healthScore > 40 ? "#f59e0b" : "#ef4444"} />
                              <Cell fill="#e2e8f0" fillOpacity={0.2} />
                          </Pie>
                          <Tooltip 
                               cursor={{fill: 'transparent'}}
                               contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                      </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                      <span className="text-2xl sm:text-3xl font-extrabold">{isBusiness ? (biScore * 10).toFixed(0) : healthScore}</span>
                      <span className="text-[10px] sm:text-xs uppercase font-bold text-gray-400 mt-1">{isBusiness ? 'Triangle Score' : 'Fin. IQ'}</span>
                   </div>
                 </div>
               </div>
               
               {isBusiness ? (
                  <div className="space-y-3 mt-auto">
                      {weakestLink && strongestLink && weakestLink.A === strongestLink.A ? (
                          <div className="flex flex-col gap-1 p-2.5 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-blue-600 border border-blue-100 dark:border-blue-900/20">
                               <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                                   <CheckCircle size={14}/> System is balanced.
                               </div>
                               <p className="text-[10px] sm:text-xs opacity-80">No weak points identified. Foundation is uniform.</p>
                          </div>
                      ) : (
                          <>
                              {weakestLink.A < 7 ? (
                                  <div className="flex flex-col gap-1 p-2.5 bg-red-50 dark:bg-red-900/10 rounded-lg text-red-600 border border-red-100 dark:border-red-900/20">
                                       <div className="flex justify-between items-center text-xs sm:text-sm">
                                           <span className="font-bold flex items-center gap-2"><ArrowDown size={14}/> Weakest: {weakestLink.subject}</span>
                                           <span className="font-bold bg-white dark:bg-black/20 px-2 rounded">{weakestLink.A}/10</span>
                                       </div>
                                       <p className="text-[10px] sm:text-xs opacity-80">{getLinkAdvice(weakestLink.subject, 'weak')}</p>
                                  </div>
                              ) : (
                                  <div className="flex flex-col gap-1 p-2.5 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-blue-600 border border-blue-100 dark:border-blue-900/20">
                                       <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                                           <CheckCircle size={14}/> Core is strong.
                                       </div>
                                       <p className="text-[10px] sm:text-xs opacity-80">All areas score 7 or above.</p>
                                  </div>
                              )}

                              {/* Strongest Link */}
                              <div className="flex flex-col gap-1 p-2.5 bg-green-50 dark:bg-green-900/10 rounded-lg text-green-600 border border-green-100 dark:border-green-900/20">
                                   <div className="flex justify-between items-center text-xs sm:text-sm">
                                       <span className="font-bold flex items-center gap-2"><ArrowUp size={14}/> Strongest: {strongestLink.subject}</span>
                                       <span className="font-bold bg-white dark:bg-black/20 px-2 rounded">{strongestLink.A}/10</span>
                                   </div>
                                   <p className="text-[10px] sm:text-xs opacity-80">{getLinkAdvice(strongestLink.subject, 'strong')}</p>
                              </div>
                          </>
                      )}
                  </div>
               ) : (
                  <div className="mt-auto space-y-3">
                      <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                          <div className="flex justify-between items-center text-xs sm:text-sm mb-1">
                              <span className="text-gray-500">Assets vs Liabilities</span> 
                              <span className="font-bold">{assetScore.toFixed(0)}/50 pts</span>
                          </div>
                          {effectiveRole !== 'finance_staff' && (
                              <p className="text-[10px] text-gray-400 break-all">Net Worth: {formatAmount(metrics.netWorth)} <br/> (Assets - Liabilities)</p>
                          )}
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                          <div className="flex justify-between items-center text-xs sm:text-sm mb-1">
                              <span className="text-gray-500">Freedom Ratio</span> 
                              <span className="font-bold">{freedomScore.toFixed(0)}/50 pts</span>
                          </div>
                          <p className="text-[10px] text-gray-400">Coverage: {(metrics.financialFreedomRate * 100).toFixed(1)}% of Expenses</p>
                      </div>
                  </div>
               )}
            </Card>

            {isBusiness && (
                <Card title="Entity Risk Analysis" className="border-t-4 border-indigo-500">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Structure</span>
                            <span className="text-sm font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 rounded">
                                {activeBusiness?.entityType}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Valuation Multiplier</span>
                            <span className={`text-sm font-bold ${entityFactor >= 1 ? 'text-green-500' : 'text-red-500'}`}>
                                x{entityFactor.toFixed(2)}
                            </span>
                        </div>
                        <p className={`text-xs p-2 rounded ${entityFactor >= 1 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {entityRiskMsg}
                        </p>
                    </div>
                </Card>
            )}
          </div>
        )}
      </div>

          </div>
        )}
      </div>

      <Modal isOpen={isPayOwnersOpen} onClose={() => setPayOwnersOpen(false)} title="Distribute Profit to Owners" maxWidth="max-w-4xl">
        <div className="space-y-6">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 text-xs rounded-xl border border-purple-100 dark:border-purple-800 leading-relaxed shadow-sm">
                <p className="font-bold mb-1 flex items-center gap-2"><Scale size={14}/> Profit Distribution Protocol</p>
                Extends extracted cash from the business to owners proportionally based on stake. This reduces retained earnings but is not an operational expense.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left side: Stats */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-purple-100 dark:border-purple-800 shadow-sm space-y-4">
                            <div className="flex justify-between items-center text-sm text-gray-500 uppercase font-semibold tracking-widest border-b border-purple-50 dark:border-purple-900/10 pb-4">
                                <span>Profit Metric</span>
                                <span>Amount</span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Gross Income:</span>
                                    <span className="font-bold text-green-500">{formatAmount(retainedEarningsStats.totalIncome)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Total Expenses:</span>
                                    <span className="font-bold text-red-500">-{formatAmount(retainedEarningsStats.totalExpenses)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Previous Distributions:</span>
                                    <span className="font-bold text-purple-500">-{formatAmount(retainedEarningsStats.totalDistributions)}</span>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-purple-50 dark:border-purple-900/10">
                                <div className="text-[10px] uppercase font-semibold text-purple-600 dark:text-purple-400 mb-1">Retained Earnings</div>
                                <div className="text-3xl font-semibold text-purple-700 dark:text-purple-400">
                                    <MoneyDisplay amount={Math.max(0, retainedEarningsStats.retainedEarnings)} symbol={symbol} />
                                </div>
                            </div>
                        </div>

                        {owners.length > 0 && payOwnersAmount > 0 && (
                            <div className="bg-purple-50/50 dark:bg-purple-900/10 p-6 rounded-[2rem] border border-purple-100 dark:border-purple-800 shadow-sm">
                                <h4 className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mb-6 uppercase tracking-widest flex justify-between items-center">
                                    <span>Payout Preview breakdown</span>
                                    <span>{formatAmount(payOwnersAmount)}</span>
                                </h4>
                                <div className="space-y-4">
                                    {owners.map(o => {
                                        const ownerEntity = context.engine.entities.get(o.parent_entity_id);
                                        const entityName = ownerEntity ? ownerEntity.name : (o.parent_entity_id === 'personal' ? 'Personal' : o.parent_entity_id);
                                        const share = (payOwnersAmount * o.percentage) / 100;
                                        return (
                                            <div key={o.parent_entity_id} className="flex justify-between items-center animate-in slide-in-from-left-2 duration-300">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs">
                                                        {o.parent_entity_id === 'personal' ? '👤' : '🏢'}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-none">{entityName}</span>
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mt-1">{o.percentage}% Stake</span>
                                                    </div>
                                                </div>
                                                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatAmount(share)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right side: Form */}
                    <div className="space-y-5 bg-gray-50/50 dark:bg-white/5 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5">
                        <div className="space-y-1 ml-2">
                             <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Execution Parameters</h4>
                             <p className="text-xs text-gray-500">Configure how and when profit is moved.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Input label="Date" type="date" value={payOwnersDate} onChange={e => setPayOwnersDate(e.target.value)} />
                            <Input label="Time (Bank Info)" type="time" value={payOwnersTime} onChange={e => setPayOwnersTime(e.target.value)} />
                            <Select label="Frequency" options={FREQUENCY_OPTIONS} value={payOwnersFrequency} onChange={(e: any) => setPayOwnersFrequency(e.target.value)} />
                        </div>

                        {payOwnersFrequency === 'custom' && (
                            <div className="flex gap-2 items-center p-3 rounded-xl border border-purple-100 bg-purple-50 shrink-0">
                                <div className="flex-1 shrink-0">
                                    <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Recur every</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        className="w-full px-3 py-2 text-sm rounded border border-gray-200 outline-none"
                                        value={payOwnersCustomVal} 
                                        onChange={(e) => setPayOwnersCustomVal(parseFloat(e.target.value) || 1)} 
                                    />
                                </div>
                                <div className="flex-1 shrink-0">
                                    <Select
                                        label="Unit"
                                        options={[
                                           { value: "days", label: "Days" },
                                           { value: "weeks", label: "Weeks" },
                                           { value: "months", label: "Months" },
                                           { value: "years", label: "Years" },
                                        ]}
                                        value={payOwnersCustomUnit}
                                        onChange={(e: any) => setPayOwnersCustomUnit(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                        
                        <div className="flex flex-col gap-2 mb-4">
                            <label className="text-sm font-bold flex items-center gap-2">
                                <Layers size={14} /> Deduction Method
                            </label>
                            <div className="flex gap-2">
                                <button
                                    className={`text-xs px-2 py-1 rounded ${!payOwnersIsDirect ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300"}`}
                                    onClick={() => { setPayOwnersIsDirect(false); setPayOwnersBucket("Uncategorized"); }}
                                >
                                    Proportional (All Buckets)
                                </button>
                                <button
                                    className={`text-xs px-2 py-1 rounded ${payOwnersIsDirect ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300"}`}
                                    onClick={() => { setPayOwnersIsDirect(true); setPayOwnersBucket(distBucketOptions[0]?.value || ""); }}
                                >
                                    Direct from Bucket
                                </button>
                            </div>
                        </div>

                        {payOwnersIsDirect && (
                            <Select label="Source Bucket" options={distBucketOptions} value={payOwnersBucket} onChange={e => setPayOwnersBucket(e.target.value)} />
                        )}
                        
                        <Input label="Description" value={payOwnersDesc} onChange={e => setPayOwnersDesc(e.target.value)} placeholder="e.g., Q1 Profit Distribution" />
                        
                        <Input 
                            label={`Amount to Pay Out (${symbol})`} 
                            type="number" 
                            value={payOwnersAmount || ''} 
                            onChange={e => setPayOwnersAmount(parseFloat(e.target.value))} 
                            placeholder="0.00" 
                            enableCalculator
                            enableCurrencyConvert
                            className="text-xl font-semibold text-purple-700 dark:text-purple-400" 
                        />
                        
                        {payOwnersFrequency !== 'one_time' && (
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-purple-100 dark:border-purple-800 shadow-sm">
                                <input type="checkbox" id="auto_dist_dash" checked={payOwnersAuto} onChange={e => setPayOwnersAuto(e.target.checked)} className="w-5 h-5 rounded-lg text-purple-600 focus:ring-purple-500 cursor-pointer" />
                                <div>
                                    <label htmlFor="auto_dist_dash" className="text-sm font-bold cursor-pointer block">Enable Smart Auto-Distribute</label>
                                    <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70">System will execute automatically as capital builds.</p>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex flex-col gap-3">
                            <Button 
                                onClick={handlePayOwnersSubmit} 
                                disabled={payOwnersAmount <= 0}
                                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white h-14 text-base font-semibold shadow-lg shadow-purple-500/20 rounded-2xl w-full"
                            >
                                Execute Distribution
                            </Button>
                            <Button variant="secondary" onClick={() => setPayOwnersOpen(false)} className="h-12 rounded-2xl border-none bg-gray-100 dark:bg-white/5 text-gray-400 font-bold">
                                Close Modal
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>

    </div>
  );
};

export default DashboardView;
