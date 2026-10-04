import { InsightContext, InsightResult, CURRENCY_SYMBOLS, StateSnapshot } from '../types';

/**
 * Adaptive Financial Intelligence System (Deterministic Core)
 */

const formatCurrency = (amount: number, currency: string) => {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${symbol}${Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

// --- DATA INTEGRITY LAYER ---
export const validateContext = (ctx: InsightContext): boolean => {
    if (!ctx) return false;
    if (!ctx.financials) return false;
    if (typeof ctx.financials.totalIncome !== 'number') return false;
    if (typeof ctx.financials.totalExpenses !== 'number') return false;
    return true;
};

// --- PHASE DETECTION ---
type Phase = 'SURVIVAL' | 'VALIDATION' | 'MOMENTUM' | 'SCALING' | 'FREEDOM';

const detectPhase = (ctx: InsightContext): Phase => {
    const { financials, profileType, goals, businessMetrics } = ctx;
    const isZeroRevenue = financials.totalIncome === 0;
    
    if (profileType === 'business') {
        const operatingExpenses = financials.totalExpenses || 1000; // Expected baseline opex if 0
        if (isZeroRevenue) return 'SURVIVAL';
        // Validation: Cannot cover operating expenses yet
        if (financials.totalIncome < operatingExpenses) return 'VALIDATION';
        
        // Freedom: System score is super high, meaning it operates without founder
        if (businessMetrics && businessMetrics.systemScore >= 85 && financials.netCashflow > 0) return 'FREEDOM';
        
        // Momentum: Generating positive cashflow but low systemization or thin margins
        const margin = financials.netCashflow / (financials.totalIncome || 1);
        if (margin < 0.2 || (businessMetrics && businessMetrics.systemScore < 50)) return 'MOMENTUM';
        
        // Scaling: Healthy margins and decent system score
        return 'SCALING';
    }

    // Personal Phase Logic
    const survivalRequirement = financials.totalExpenses || 2000;
    if (isZeroRevenue) return 'SURVIVAL';
    if (financials.totalIncome < survivalRequirement) return 'VALIDATION';
    
    const passiveCoverage = financials.recurringIncome / (survivalRequirement || 1);
    const freedomProgress = goals.financialFreedomProgress || 0;
    
    if (passiveCoverage >= 1 || freedomProgress >= 100) return 'FREEDOM';
    
    if (financials.totalIncome < survivalRequirement * 3) return 'MOMENTUM';
    return 'SCALING';
};

// --- ACTION DETECTION ---
export const detectUserAction = (prev: StateSnapshot | undefined, current: InsightContext) => {
    if (!prev) return null;
    
    // Prevent false actions due to context switching
    if (prev.currency && prev.currency !== current.currency) return null;
    if (prev.timeframe && prev.timeframe !== current.timeframe) return null;

    const incomeDelta = current.financials.totalIncome - prev.income;
    const expenseDelta = current.financials.totalExpenses - prev.expenses;
    const sysScoreDelta = (current.businessMetrics?.systemScore || 0) - (prev.systemScore || 0);

    if (incomeDelta > 100) return { type: 'INCOME_GROWTH', impact: incomeDelta, direction: 'positive' };
    if (expenseDelta < -100) return { type: 'EXPENSE_REDUCTION', impact: Math.abs(expenseDelta), direction: 'positive' };
    if (sysScoreDelta > 2) return { type: 'SYSTEM_UPGRADE', impact: sysScoreDelta, direction: 'positive' };
    
    return null;
};

// --- CORE: DASHBOARD INSIGHT ---
export const generateInsight = (ctx: InsightContext): InsightResult => {
    if (!validateContext(ctx)) {
        return { 
            title: "Calibrating Intelligence", 
            insight: "The financial brain is initializing. It needs transaction data to build your strategic roadmap.", 
            action: "Add at least one income and expense entry to unlock action steps.", 
            tone: "neutral" 
        };
    }

    const { financials, profileType, currency, previousFinancials, businessMetrics } = ctx;
    const phase = detectPhase(ctx);
    const action = detectUserAction(previousFinancials, ctx);
    const isLosingMoney = financials.netCashflow < 0;

    // Timeframe Awareness Label
    let timeframeLabel = "recently";
    let timeframeAdjective = "recent";
    if (ctx.timeframe === '24h') { timeframeLabel = "today"; timeframeAdjective = "daily"; }
    else if (ctx.timeframe === '1w' || ctx.timeframe === '7d' as any) { timeframeLabel = "this week"; timeframeAdjective = "weekly"; }
    else if (ctx.timeframe === '1m' || ctx.timeframe === 'month' as any) { timeframeLabel = "this month"; timeframeAdjective = "monthly"; }
    else if (ctx.timeframe === '1y' || ctx.timeframe === 'year' as any) { timeframeLabel = "this year"; timeframeAdjective = "yearly"; }
    else if (ctx.timeframe === 'all') { timeframeLabel = "in recorded history"; timeframeAdjective = "all-time"; }

    // 1. Zero-State Protection
    if (financials.totalIncome === 0 && financials.recurringIncome === 0) {
        const hasExpenses = financials.totalExpenses > 0;
        return {
            title: profileType === 'personal' ? "Foundation: Personal Survival" : "Foundation: Business Solvency",
            insight: hasExpenses 
                ? `Zero income detected ${timeframeLabel}, but expenses are draining capital.` 
                : `Zero momentum detected ${timeframeLabel}. At this stage, your priority is validation.`,
            action: profileType === 'personal' 
                ? "Keep your primary income source active to fund your base living expenses." 
                : "Focus entirely on generating initial revenue. Prove market demand before building systems.",
            tone: hasExpenses ? "warning" : "neutral"
        };
    }

    if (phase === 'VALIDATION' && profileType === 'business') {
        return {
            title: "Market Validation",
            insight: `Generating ${formatCurrency(financials.totalIncome, currency)} ${timeframeLabel} is a start, but operational runway requires higher volume.`,
            action: "Focus purely on sales and demand generation. Complex systems can wait.",
            tone: "neutral"
        };
    }

    if (phase === 'MOMENTUM' && profileType === 'personal') {
         const survivalRequirement = financials.totalExpenses || 2000;
         const multiplier = financials.totalIncome / survivalRequirement;
         if (multiplier < 3) {
             return {
                 title: `The 3x Safety Margin (${timeframeAdjective})`,
                 insight: `You are earning ${multiplier.toFixed(1)}x your survival cost ${timeframeLabel}. Wealth building requires highly leveraged surpluses.`,
                 action: "Aggressively route the surplus into assets, but maintain current active income until passive yield scales.",
                 tone: "positive"
             };
         }
    }

    // 2. Negative Value Handling (Top Priority if not zero-state)
    if (isLosingMoney) {
        return {
            title: "Capital Erosion Alert",
            insight: `System leak detected: You have a net loss of ${formatCurrency(Math.abs(financials.netCashflow), currency)} ${timeframeLabel}.`,
            action: profileType === 'personal'
                ? "Immediately review and cut non-vital expenses until cashflow returns to positive."
                : "Halt secondary reinvestment and stabilize core operating cashflow immediately.",
            tone: "warning"
        };
    }

    // 3. Action Reaction
    if (action) {
        if (action.type === 'INCOME_GROWTH') {
            return {
                title: "Velocity Shift",
                insight: `Performance Verified: ${timeframeAdjective} income improved by ${formatCurrency(action.impact, currency)}. This surplus is your leverage.`,
                action: profileType === 'personal' 
                    ? "Route 40% of this new cashflow into yield-bearing assets to accelerate financial freedom." 
                    : "Reinvest this new operational cashflow into scalable acquisition channels or capital reserves.",
                tone: "positive"
            };
        }
        if (action.type === 'SYSTEM_UPGRADE') {
            return {
                title: "Structural Maturity",
                insight: "Your organizational systems are hardening. Founder dependence is dropping, making the enterprise more of an asset.",
                action: "Document one more repeatable process to further detach your time from daily operations.",
                tone: "positive"
            };
        }
    }

    // 4. Stagnation Detection
    const isStagnant = previousFinancials && 
        Math.abs(financials.totalIncome - previousFinancials.income) < 1.0 &&
        Math.abs(financials.totalExpenses - previousFinancials.expenses) < 1.0;

    // Activity State
    const now = Date.now();
    const lastAction = ctx.lastUserActionTimestamp || now;
    const sessionStart = ctx.sessionStartTimestamp || now;
    
    const timeSinceLastAction = now - lastAction;
    const activeThreshold = 60000; // 60 seconds
    const idleThreshold = 180000; // 180 seconds - increased idle threshold so it doesn't pop up too fast

    let showInactivity = false;
    if (timeSinceLastAction < activeThreshold) {
        showInactivity = false; // OVERRIDE RULE: Active user -> No inactivity message
    } else if (timeSinceLastAction > idleThreshold) {
        showInactivity = true;
    }
        
    if (isStagnant && showInactivity) {
        return {
            title: "Idle State Detected",
            insight: `No new financial entries or structural changes have been recorded recently for ${timeframeLabel}.`,
            action: `Log recent transactions or update your metrics to refresh the intelligence engine for this ${timeframeAdjective} period.`,
            tone: "neutral"
        };
    }

    // 5. Phase-Specific & Metric Logic
    if (phase === 'FREEDOM') {
        return {
            title: profileType === 'personal' ? "Financial Exit Achieved" : "Self-Sustaining Enterprise",
            insight: profileType === 'personal'
                ? `Passive yield covers 100% of your expenses ${timeframeLabel}. You have decoupled your time from survival.`
                : `Operating cashflow and systems are robust. The business can sustain its ${timeframeAdjective} overhead without founder intervention.`,
            action: profileType === 'personal'
                ? "Focus on capital preservation, legacy scaling, or philanthropic allocation."
                : "Consider strategic expansion, passive holding (dividends), or a potential business exit.",
            tone: "positive"
        };
    }

    if (profileType === 'business' && businessMetrics && businessMetrics.systemScore < 50) {
        return {
            title: "The Operator Bottleneck",
            insight: `Strong ${timeframeAdjective} income but low systemization (${businessMetrics.systemScore}/100) means the business is highly vulnerable.`,
            action: "Codify your primary delivery process into formal SOPs to build a scalable entity.",
            tone: "warning"
        };
    }

    return {
        title: `${profileType === 'personal' ? 'Wealth' : 'Business'} Intelligence`,
        insight: `Phase detected: ${phase}. You have a ${timeframeAdjective} surplus of ${formatCurrency(financials.netCashflow, currency)}.`,
        action: "Maintain transaction discipline to allow the engine to detect subtler optimization trends.",
        tone: "neutral"
    };
};

// --- SPECIALIZED: ESBI ADVICE ---
export const generateESBIAdvice = (ctx: InsightContext): InsightResult => {
    const { financials, quadrantSplit, profileType } = ctx;

    if (quadrantSplit) {
        const dominant = Object.entries(quadrantSplit).reduce((a, b) => a[1] > b[1] ? a : b)[0];
        
        if (dominant === 'E') {
            return {
                title: profileType === 'business' ? "E (Founder/Operator)" : "E (Employee)",
                insight: profileType === 'business' ? "Business relies entirely on your manual labor. It's a job, not an asset." : "High reliance on salary/wages detected. You are trading time for a fixed return.",
                action: "Reallocate savings to buy back your time or invest in scale.",
                tone: "warning"
            };
        }
        if (dominant === 'S') {
            return {
                title: "S-Quadrant Dependency",
                insight: "High reliance on active income detected. You are trading time for survival.",
                action: "Shift 10% of active earnings into I-quadrant assets immediately.",
                tone: "warning"
            };
        }
        if (dominant === 'B') {
            return {
                title: "B-Quadrant Maturity",
                insight: "System-driven operations detected. You have successfully decoupled time from earning in this sector.",
                action: "Scale operations or begin heavy capital allocation to the I-Quadrant.",
                tone: "positive"
            };
        }
        if (dominant === 'I') {
            return {
                title: "I-Quadrant Momentum",
                insight: "Your capital mix is heavily weighted toward capital allocation and assets. Money works for you.",
                action: "Scale I-quadrant velocity by reinvesting passive yield and minimizing tax drag.",
                tone: "positive"
            };
        }
    }

    return {
        title: "Balanced Growth",
        insight: "Structural mix is improving. You are moving across the quadrants with stability.",
        action: "Continue building systems that decrease your founder dependency score.",
        tone: "neutral"
    };
};

// --- SPECIALIZED: LEARNING ENGINE ---
export const generateLearning = (ctx: InsightContext): InsightResult => {
    const { financials, profileType, currency } = ctx;
    const phase = detectPhase(ctx);

    if (phase === 'SURVIVAL') {
        return {
            title: "Lesson: First Principles",
            insight: "Wealth is not what you make; it's what you keep. Survival requires a positive net surplus.",
            action: "Master 'Unit Economics' for your personal or business life before scaling.",
            tone: "neutral"
        };
    }

    if (financials.liabilities > financials.assets) {
        return {
            title: "Lesson: Bad Debt vs Leverage",
            insight: "Your balance sheet shows debt that takes money out of your pocket. This is 'Bad Debt'.",
            action: "Study how to deleverage high-interest liabilities using your monthly surplus.",
            tone: "warning"
        };
    }

    return {
        title: "Lesson: Scaling Systems",
        insight: `Your surplus of ${formatCurrency(financials.netCashflow, currency)} should be viewed as 'Working Capital'.`,
        action: "Learn how to calculate your 'Cost to Acquire an Asset' (CAA).",
        tone: "neutral"
    };
};

// --- SPECIALIZED: ADVISOR RESPONSE ---
export const generateAdvisorResponse = (ctx: InsightContext, query: string): string => {
    const { financials, profileType, currency } = ctx;
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('what should i do') || lowerQuery.includes('advice') || lowerQuery.includes('help')) {
        const insight = generateInsight(ctx);
        return `Diagnostic Complete: With a net cashflow of ${formatCurrency(financials.netCashflow, currency)}, my strategic recommendation for your ${profileType} profile is: ${insight.action}`;
    }

    if (lowerQuery.includes('debt') || lowerQuery.includes('owe') || lowerQuery.includes('loan')) {
        return `Total liabilities are ${formatCurrency(financials.liabilities, currency)}. Rich Dad principles dictate eliminating consumer debt to free up cashflow for asset acquisition. Passive coverage should be your main goal.`;
    }

    return "I am your strategic intelligence engine. Ask me about your cashflow, quadrant distribution, or how to reach your financial freedom target using today's data.";
};
