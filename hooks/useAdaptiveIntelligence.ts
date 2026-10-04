import { useMemo, useState, useEffect, useRef } from 'react';
import { AppData, AppMetrics, InsightContext, InsightResult, BusinessEntity, calculateBusinessQuality, StateSnapshot } from '../types';
import { generateInsight, generateESBIAdvice, generateLearning, generateAdvisorResponse } from '../services/insightEngine';

// Simplified multiplier calculation
const estimateBusinessValuation = (biz: BusinessEntity, entries: any[]) => {
    const bizEntries = entries.filter(e => e.profileId === biz.id);
    const rev = bizEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const exp = bizEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    const profit = Math.max(0, rev - exp);
    const multiplier = 2.5; // Default for shared intelligence
    return { enterpriseValue: profit * 12 * multiplier, multiplier, valuationConfidenceScore: 70, totalValuation: profit * multiplier };
};

// --- Snapshot Management ---
const SNAPSHOT_KEY = 'gap_intelligence_snapshots';

export function useAdaptiveIntelligence(
    data: AppData,
    activeProfileId: string,
    metrics: AppMetrics,
    timeFilter: string,
    context: any 
) {
  const isBusiness = activeProfileId !== 'personal';
  const activeBusiness = data.businesses.find(b => b.id === activeProfileId);
  
  const [snapshots, setSnapshots] = useState<StateSnapshot[]>([]);
  const prevSnapshot = snapshots.length > 0 ? snapshots[0] : undefined;
  
  const [sessionStartTimestamp] = useState<number>(Date.now());
  const [lastUserActionTimestamp, setLastUserActionTimestamp] = useState<number>(Date.now());

  useEffect(() => {
     setLastUserActionTimestamp(Date.now());
  }, [data]); // only data changes mean actual business logic action (transactions/buckets)

  // Derived state to force insight update when crossing threshold if no other changes
  const isIdle = (Date.now() - lastUserActionTimestamp) > 120000;

  // Track state changes and create snapshots
  useEffect(() => {
    const saved = localStorage.getItem(`${SNAPSHOT_KEY}_${activeProfileId}`);
    if (saved) {
        setSnapshots(JSON.parse(saved));
    }
  }, [activeProfileId]);

  useEffect(() => {
    const timer = setTimeout(() => {
        const currentSnapshot: StateSnapshot = {
            timestamp: new Date().toISOString(),
            income: metrics.totalIncome,
            expenses: metrics.totalExpenses,
            netCashflow: metrics.cashflow,
            recurringIncome: metrics.passiveIncome || 0,
            systemScore: activeBusiness ? Math.round(calculateBusinessQuality(activeBusiness.biTriangle || {}).bqs * 10) : 0,
            valuation: activeBusiness ? estimateBusinessValuation(activeBusiness, data.entries).totalValuation : 0,
            netWorth: metrics.netWorth,
            esbi: metrics.quadrantSplit || { e: 0, s: 0, b: 0, i: 0 },
            currency: activeBusiness?.currency || data.profile.currency,
            timeframe: timeFilter
        };

        // Prevent fake updates when changing timeframe or currency
        if (prevSnapshot && (prevSnapshot.currency !== currentSnapshot.currency || prevSnapshot.timeframe !== currentSnapshot.timeframe)) {
            // Just quietly replace the top snapshot to establish new baseline for this view without triggering 'Action'
            const currentSnapshotWithUpdateStr = JSON.stringify([currentSnapshot, ...snapshots.slice(1)].slice(0, 50));
            setSnapshots(JSON.parse(currentSnapshotWithUpdateStr));
            localStorage.setItem(`${SNAPSHOT_KEY}_${activeProfileId}`, currentSnapshotWithUpdateStr);
            return;
        }

        // Only save if significantly different from last snapshot
        if (!prevSnapshot || 
            Math.abs(currentSnapshot.income - prevSnapshot.income) > 10 || 
            Math.abs(currentSnapshot.expenses - prevSnapshot.expenses) > 10 ||
            currentSnapshot.systemScore !== prevSnapshot.systemScore) {
            
            const newSnapshots = [currentSnapshot, ...snapshots].slice(0, 50); // Keep last 50
            setSnapshots(newSnapshots);
            localStorage.setItem(`${SNAPSHOT_KEY}_${activeProfileId}`, JSON.stringify(newSnapshots));
        }
    }, 10000); // Check for snapshot every 10s of stability

    return () => clearTimeout(timer);
  }, [metrics.totalIncome, metrics.totalExpenses, metrics.cashflow, activeProfileId, snapshots, prevSnapshot, activeBusiness, data.entries, metrics.netWorth, metrics.quadrantSplit]);

  const insightCtx: InsightContext = useMemo(() => {
    const profileEntries = (data.entries || []).filter(e => e.profileId === activeProfileId);
    const incomeEntries = profileEntries.filter(e => e.type === 'income' && e.subtype !== 'INTERNAL_TRANSFER' && e.subtype !== 'DISTRIBUTION');
    
    const categories = incomeEntries.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {} as Record<string, number>);
    const streamValues = Object.values(categories);
    const maxStream = Math.max(0, ...streamValues);
    const dependencyRatio = metrics.totalIncome > 0 ? maxStream / metrics.totalIncome : 0;
    
    const recurringIncome = incomeEntries.filter(e => e.frequency && e.frequency !== 'one_time').reduce((sum, e) => sum + e.amount, 0);

    const bizAssets = (data.assets || []).filter(a => a.profileId === activeProfileId);
    const totalAssetsVal = bizAssets.filter(a => a.type === 'asset' || a.type === 'business_equity').reduce((sum, a) => sum + a.amount, 0);
    const totalLiabsVal = bizAssets.filter(a => a.type === 'liability').reduce((sum, a) => sum + a.amount, 0);

    const freedomProgress = data.profile.freedomTarget > 0 ? (metrics.passiveIncome / data.profile.freedomTarget) * 100 : 0;

    const ctx: InsightContext = {
        profileType: isBusiness ? "business" : "personal",
        timeframe: timeFilter as any,
        financials: {
            totalIncome: metrics.totalIncome,
            totalExpenses: metrics.totalExpenses,
            netCashflow: metrics.cashflow,
            recurringIncome: isBusiness ? recurringIncome : (metrics.passiveIncome || 0),
            assets: totalAssetsVal,
            liabilities: totalLiabsVal,
            netWorth: metrics.netWorth
        },
        previousFinancials: prevSnapshot,
        goals: {
            targetIncome: isBusiness ? (activeBusiness?.profitTarget || 0) : data.profile.freedomTarget,
            financialFreedomProgress: freedomProgress,
            dream: !isBusiness ? data.profile.dream : undefined
        },
        structure: {
            numberOfIncomeStreams: streamValues.length,
            dependencyRatio,
            incomeConsistency: 85
        },
        personalData: !isBusiness ? {
            age: data.profile.dob ? new Date().getFullYear() - new Date(data.profile.dob).getFullYear() : 30,
            financialKnowledge: data.profile.financialKnowledge || 'Intermediate'
        } : undefined,
        buckets: (data.allocations || []).filter(a => a.profileId === activeProfileId).map(b => ({
            name: b.name,
            balance: b.balance,
            percentage: b.percentage
        })),
        notifications: [],
        currency: activeBusiness?.currency || data.profile.currency,
        lastUserActionTimestamp,
        sessionStartTimestamp,
        quadrantSplit: metrics.quadrantSplit
    };

    if (isBusiness && activeBusiness) {
        const tr = activeBusiness.biTriangle || {};
        const bqs = calculateBusinessQuality(tr).bqs;
        const val = estimateBusinessValuation(activeBusiness, data.entries);

        ctx.businessMetrics = {
            systemScore: Math.round(bqs * 10),
            valuation: val.totalValuation,
            multiplier: val.multiplier,
            confidenceScore: val.valuationConfidenceScore,
            biTriangle: activeBusiness.biTriangle,
            industry: activeBusiness.industry
        };
    }

    return ctx;
  }, [data, activeProfileId, metrics, timeFilter, prevSnapshot, activeBusiness, isBusiness, lastUserActionTimestamp, sessionStartTimestamp, isIdle]);

  return {
      context: insightCtx,
      dashboardInsight: useMemo(() => generateInsight(insightCtx), [insightCtx]),
      esbiAdvice: useMemo(() => generateESBIAdvice(insightCtx), [insightCtx]),
      learningAdvice: useMemo(() => generateLearning(insightCtx), [insightCtx]),
      advisorResponse: (query: string) => generateAdvisorResponse(insightCtx, query)
  };
}
