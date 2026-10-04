
import { AppData, AppMetrics, Entry, Asset, AllocationCategory, Goal } from '../types';

export interface AdvisorState {
  currentPath: string;
  previousPaths: string[];
  selectedOptions: string[];
  depthLevel: number;
  lastComputedState: any;
  lastStateSignature: string;
  recentQuestions?: string[];
  turnCount?: number;
}

export interface AdvisorAction {
  type: 'option_click' | 'text_input';
  value: string;
}

export interface AdvisorResponse {
  message: string;
  options: { label: string; path: string }[];
  predictedQuestions?: { label: string; query: string }[];
  updatedAdvisorState: AdvisorState;
}

const INTENT_MAP: Record<string, string[]> = {
  // Broad Ambiguous & High-Frequency Queries
  "savings": ["savings.optimize", "cashflow.fix", "assets.acquire"],
  "save": ["savings.optimize", "cashflow.fix", "expenses.reduce"],
  "how to save": ["savings.optimize", "cashflow.fix"],
  "save more": ["savings.optimize", "expenses.reduce"],
  "money": ["analysis.full", "cashflow.fix", "income.grow"],
  "growth": ["income.grow", "assets.acquire", "systems.scale"],
  "plan": ["freedom.plan", "analysis.full"],
  "help": ["analysis.smart", "analysis.full"],
  "advice": ["analysis.smart", "analysis.full"],
  "review": ["analysis.full", "runway.audit"],
  "financial review": ["analysis.full", "focus.weekly"],
  "audit": ["analysis.full", "expenses.audit"],
  "situation": ["analysis.full"],
  "overview": ["analysis.full"],
  "status": ["analysis.full"],
  "health check": ["analysis.full", "runway.audit"],
  "diagnose": ["analysis.full", "focus.weekly"],
  "what should i do": ["focus.weekly", "analysis.smart"],
  "what to focus on": ["focus.weekly", "analysis.smart"],
  "focus": ["focus.weekly"],
  "priorities": ["focus.weekly"],
  "next step": ["focus.weekly", "analysis.smart"],
  "weekly focus": ["focus.weekly"],

  // Spending, Expenses, Leaks, Affordability
  "where is my money going": ["expenses.audit", "cashflow.fix"],
  "spending": ["expenses.audit", "expenses.reduce"],
  "spend": ["expenses.audit", "affordability.check"],
  "biggest expense": ["expenses.audit"],
  "top expense": ["expenses.audit"],
  "expenses": ["expenses.audit", "expenses.reduce"],
  "cut expenses": ["expenses.reduce", "expenses.audit"],
  "cut costs": ["expenses.reduce", "expenses.audit"],
  "spend less": ["expenses.reduce"],
  "budget": ["expenses.reduce", "buckets.audit"],
  "burn rate": ["expenses.audit", "runway.audit"],
  "burn": ["runway.audit", "expenses.audit"],
  "leaks": ["expenses.audit", "cashflow.fix"],
  "subscriptions": ["expenses.audit"],
  "bills": ["expenses.audit", "expenses.reduce"],
  "can i buy": ["affordability.check"],
  "can i afford": ["affordability.check"],
  "should i purchase": ["affordability.check"],
  "purchase": ["affordability.check"],
  "afford": ["affordability.check"],
  "buy a car": ["affordability.check"],
  "buy a house": ["affordability.check"],
  "expensive": ["affordability.check", "expenses.reduce"],

  // Runway, Reserves, Emergency Buffer
  "runway": ["runway.audit"],
  "survival": ["runway.audit"],
  "emergency fund": ["runway.audit", "buckets.audit"],
  "buffer": ["runway.audit"],
  "cash reserve": ["runway.audit", "buckets.audit"],
  "am i broke": ["runway.audit", "cashflow.fix"],
  "broke": ["cashflow.fix", "runway.audit"],
  "how long will i last": ["runway.audit"],
  "liquid": ["runway.audit", "buckets.audit"],
  "liquidity": ["runway.audit", "buckets.audit"],

  // Cashflow & Deficit
  "fix cashflow": ["cashflow.fix"],
  "cashflow": ["cashflow.fix"],
  "deficit": ["cashflow.fix", "expenses.reduce"],
  "stop losing money": ["cashflow.fix"],
  "losing money": ["cashflow.fix"],
  "negative cashflow": ["cashflow.fix"],
  "surplus": ["assets.acquire", "savings.optimize"],
  "profit margin": ["cashflow.fix", "systems.scale"],

  // Buckets & Profit First
  "bucket": ["buckets.audit"],
  "buckets": ["buckets.audit"],
  "allocation": ["buckets.audit"],
  "allocations": ["buckets.audit"],
  "profit first": ["buckets.audit"],
  "reserve": ["buckets.audit", "runway.audit"],
  "unallocated": ["buckets.audit"],
  "pocket": ["buckets.audit"],
  "envelopes": ["buckets.audit"],

  // Debt & Liabilities
  "debt": ["debt.audit"],
  "pay off": ["debt.audit"],
  "liabilities": ["debt.audit", "networth.breakdown"],
  "liability": ["debt.audit"],
  "loan": ["debt.audit"],
  "loans": ["debt.audit"],
  "credit card": ["debt.audit"],
  "credit cards": ["debt.audit"],
  "snowball": ["debt.audit"],
  "avalanche": ["debt.audit"],
  "good debt": ["debt.audit"],
  "bad debt": ["debt.audit"],
  "interest": ["debt.audit"],

  // Net Worth & Balance Sheet
  "net worth": ["networth.breakdown"],
  "what am i worth": ["networth.breakdown"],
  "balance sheet": ["networth.breakdown"],
  "total assets": ["networth.breakdown", "assets.acquire"],

  // Income (Personal & General)
  "salary": ["income.salary"],
  "raise": ["income.salary"],
  "promotion": ["income.salary"],
  "side hustle": ["income.side_hustle"],
  "freelance": ["income.side_hustle"],
  "gig": ["income.side_hustle"],
  "make money": ["income.start", "income.side_hustle"],
  "earn more": ["income.grow", "income.salary"],
  "increase income": ["income.grow", "income.salary"],
  "grow income": ["income.grow", "income.salary"],
  "more money": ["income.grow", "assets.acquire"],
  "skill": ["income.start"],
  "skills": ["income.start"],
  "job": ["income.salary", "income.grow"],

  // Business Distributions & Dividends
  "distribution": ["business.distributions"],
  "distributions": ["business.distributions"],
  "dividend": ["business.distributions"],
  "dividends": ["business.distributions"],
  "draw": ["business.distributions"],
  "owner draw": ["business.distributions"],
  "owner pay": ["business.distributions"],
  "pay myself": ["business.distributions"],
  "take profit": ["business.distributions", "buckets.audit"],

  // ESBI Quadrant & Freedom
  "quadrant": ["quadrant.migration"],
  "quadrants": ["quadrant.migration"],
  "esbi": ["quadrant.migration"],
  "b and i": ["quadrant.migration"],
  "migrate cashflow": ["quadrant.migration"],
  "migrate": ["quadrant.migration"],
  "passive vs active": ["quadrant.migration"],
  "financial freedom": ["freedom.plan"],
  "retire": ["freedom.plan"],
  "retirement": ["freedom.plan"],
  "passive income": ["freedom.plan", "assets.acquire"],
  "freedom": ["freedom.plan"],
  "fire": ["freedom.plan"],

  // Assets & Investing
  "invest": ["assets.acquire"],
  "investing": ["assets.acquire"],
  "where to invest": ["assets.acquire"],
  "assets": ["assets.acquire", "networth.breakdown"],
  "wealth": ["assets.acquire", "freedom.plan"],
  "real estate": ["assets.real_estate"],
  "property": ["assets.real_estate"],
  "stocks": ["assets.stocks"],
  "index funds": ["assets.stocks"],
  "equities": ["assets.stocks"],
  "crypto": ["assets.acquire"],
  "compound": ["assets.acquire"],

  // Business Systems & Operations
  "scale": ["systems.scale"],
  "systems": ["systems.scale"],
  "efficiency": ["systems.scale"],
  "business": ["systems.scale"],
  "sales": ["business.sales"],
  "sell": ["business.sales"],
  "customers": ["business.sales"],
  "marketing": ["business.marketing"],
  "ads": ["business.marketing"],
  "content": ["business.marketing"],
  "team": ["business.team"],
  "hire": ["business.team"],
  "hiring": ["business.team"],
  "employees": ["business.team"],
  "automation": ["business.automation"],
  "automate": ["business.automation"],
  "software": ["business.automation"],
  "sop": ["systems.scale"],
  "bi triangle": ["systems.scale"],

  // Taxes & Legal
  "tax": ["tax.audit"],
  "taxes": ["tax.audit"],
  "cpa": ["tax.audit"],
  "irs": ["tax.audit"],
  "write off": ["tax.audit"],
  "deductions": ["tax.audit"]
};

const isPathAllowed = (path: string, isBusiness: boolean): boolean => {
  if (!isBusiness) {
    if (path.startsWith("business.") || path === "systems.scale") return false;
  } else {
    if (path === "income.salary" || path === "income.side_hustle") return false;
  }
  return true;
};

const fuzzyMatch = (input: string, isBusiness: boolean): { bestPath: string, relatedPaths: string[] } => {
  const normalized = input.toLowerCase().trim();
  
  const matches: { key: string, path: string, index: number, priority: number }[] = [];
  
  // Exact phrase matching
  for (const [key, paths] of Object.entries(INTENT_MAP)) {
    const index = normalized.indexOf(key);
    if (index !== -1) {
      paths.forEach(path => {
        if (isPathAllowed(path, isBusiness)) {
          matches.push({ key, path, index, priority: 1 });
        }
      });
    }
  }
  
  // Broad word-level matching
  const words = normalized.split(/[\s,.;!?]+/);
  for (const word of words) {
    if (word.length < 4) continue;
    for (const [key, paths] of Object.entries(INTENT_MAP)) {
      if (key.includes(word)) {
        paths.forEach(path => {
          if (isPathAllowed(path, isBusiness)) {
            matches.push({ key, path, index: 999, priority: 2 });
          }
        });
      }
    }
  }

  if (matches.length === 0) {
    // Intelligent heuristic classification before falling back to analysis.smart:
    if (/afford|buy|purchase|expensive|house|car|item/.test(normalized)) {
      return { bestPath: "affordability.check", relatedPaths: ["expenses.audit", "cashflow.fix"] };
    }
    if (/spend|spent|expense|leak|bill|cost|subscription/.test(normalized)) {
      return { bestPath: "expenses.audit", relatedPaths: ["expenses.reduce", "cashflow.fix"] };
    }
    if (/broke|survive|runway|months|emergency|buffer|safety/.test(normalized)) {
      return { bestPath: "runway.audit", relatedPaths: ["buckets.audit", "cashflow.fix"] };
    }
    if (/debt|loan|card|credit|pay off|owe/.test(normalized)) {
      return { bestPath: "debt.audit", relatedPaths: ["networth.breakdown", "cashflow.fix"] };
    }
    if (/save|saving|reserve|stash/.test(normalized)) {
      return { bestPath: "savings.optimize", relatedPaths: ["buckets.audit", "assets.acquire"] };
    }
    if (/invest|asset|stock|crypto|property|wealth/.test(normalized)) {
      return { bestPath: "assets.acquire", relatedPaths: ["freedom.plan", "quadrant.migration"] };
    }
    if (/tax|irs|cpa|deduction/.test(normalized)) {
      return { bestPath: "tax.audit", relatedPaths: ["buckets.audit", "systems.scale"] };
    }
    if (/focus|do now|what to do|action|priorit|next/.test(normalized)) {
      return { bestPath: "focus.weekly", relatedPaths: ["analysis.full", "runway.audit"] };
    }
    if (/net worth|worth|balance sheet/.test(normalized)) {
      return { bestPath: "networth.breakdown", relatedPaths: ["debt.audit", "assets.acquire"] };
    }
    // Zero-Rejection Smart Diagnostic
    return { bestPath: "analysis.smart", relatedPaths: ["focus.weekly", "expenses.audit", "runway.audit", "analysis.full"] };
  }

  // Sort by priority first (exact phrase > word match), then by where it appeared first
  matches.sort((a, b) => a.priority - b.priority || a.index - b.index);

  // If the top match came from a key that produced multiple distinct paths, we should clarify
  const bestKey = matches[0].key;
  const topPaths = matches.filter(m => m.key === bestKey).map(m => m.path);
  const uniqueTopPaths = Array.from(new Set(topPaths));

  const relatedPaths = new Set<string>();
  for (const m of matches) {
    relatedPaths.add(m.path);
  }

  if (uniqueTopPaths.length > 1) {
    // Ambiguous top match - provide intelligent smart overview with paths as related
    uniqueTopPaths.forEach(p => relatedPaths.add(p));
    return { bestPath: "analysis.smart", relatedPaths: Array.from(relatedPaths) };
  }

  const bestPath = uniqueTopPaths[0];
  relatedPaths.delete(bestPath);
  
  return { bestPath, relatedPaths: Array.from(relatedPaths) };
};

// --- COMPUTATION LAYER ---
const computeFinancialState = (data: AppData, metrics: AppMetrics, activeProfileId: string, symbol: string) => {
  const isBusiness = activeProfileId !== 'personal';
  const bizData = isBusiness ? (data.businesses || []).find(b => b.id === activeProfileId) : null;
  const profileEntries = data.entries.filter(e => e.profileId === activeProfileId);
  
  // 100% Data-Bound Holistic Aggregation (ignores dashboard timeFilter)
  const externalIncomeEntries = profileEntries.filter(e => e.type === 'income' && e.subtype !== 'INTERNAL_TRANSFER' && e.subtype !== 'DISTRIBUTION');
  const externalExpenseEntries = profileEntries.filter(e => e.type === 'expense' && e.subtype !== 'INTERNAL_TRANSFER' && e.subtype !== 'DISTRIBUTION');
  const internalIncomeEntries = profileEntries.filter(e => e.type === 'income' && (e.subtype === 'INTERNAL_TRANSFER' || e.subtype === 'DISTRIBUTION'));
  
  const trueIncome = externalIncomeEntries.reduce((acc, curr) => acc + curr.amount, 0);
  const trueExpenses = externalExpenseEntries.reduce((acc, curr) => acc + curr.amount, 0);
  const internalInflows = internalIncomeEntries.reduce((acc, curr) => acc + curr.amount, 0);

  const totalIncome = activeProfileId === 'personal' ? trueIncome + internalInflows : trueIncome;
  const totalExpenses = trueExpenses;
  const cashflow = totalIncome - totalExpenses;

  const allValidIncomeForQuad = [...externalIncomeEntries, ...internalIncomeEntries.filter(e => e.subtype === 'DISTRIBUTION')];
  let recurringPassive = 0;
  
  const getNormalizedRecurring = (e: any) => {
      if (!e.frequency || e.frequency === 'one_time') return 0;
      let multiplier = 1;
      if (e.frequency === 'weekly') multiplier = 4.33;
      if (e.frequency === 'biweekly') multiplier = 2.16;
      if (e.frequency === 'monthly') multiplier = 1;
      if (e.frequency === 'quarterly') multiplier = 1 / 3;
      if (e.frequency === 'semiannual' || e.frequency === 'biannual') multiplier = 1 / 6;
      if (e.frequency === 'yearly') multiplier = 1 / 12;
      return e.amount * multiplier;
  };

  allValidIncomeForQuad.forEach(e => {
        const hours = e.hoursWorked || 0;
        const isPassiveLocal = hours === 0 && e.incomeSourceType !== 'SALARY';
        if (isPassiveLocal) {
            recurringPassive += getNormalizedRecurring(e);
        }
  });

  const incomeStreams = profileEntries.filter(e => e.type === 'income' && e.subtype !== 'INTERNAL_TRANSFER');
  const expenses = profileEntries.filter(e => e.type === 'expense' && e.subtype !== 'INTERNAL_TRANSFER');
  
  const recurringIncome = recurringPassive;
  const netWorth = metrics.netWorth; // net worth is intrinsically timeframe-independent

  // Rich Data Extraction
  const profileAssets = (data.assets || []).filter(a => a.profileId === activeProfileId);
  const tangibleAssets = profileAssets.filter(a => a.type === 'asset' || a.type === 'business_equity');
  const liabilities = profileAssets.filter(a => a.type === 'liability');
  
  const activeGoals = (data.goals || []).filter(g => g.profileId === activeProfileId);
  const activeAllocations = (data.allocations || []).filter(a => a.profileId === activeProfileId);

  // Liquid Cash Reserves and Runway
  const liquidCash = activeAllocations.reduce((sum, a) => sum + (a.balance || 0), 0);
  const runwayMonths = totalExpenses > 0 ? (liquidCash / totalExpenses) : (liquidCash > 0 ? 99 : 0);
  const burnRate = totalExpenses;
  const dailyBurn = totalExpenses / 30;
  const burnDaysRemaining = dailyBurn > 0 ? Math.floor(liquidCash / dailyBurn) : (liquidCash > 0 ? 999 : 0);
  const unallocatedCash = activeAllocations.find(a => a.name.toLowerCase().includes('unallocated') || a.name.toLowerCase().includes('pocket'))?.balance || 0;
  const deficitBuckets = activeAllocations.filter(a => a.balance < 0);
  const healthyBuckets = activeAllocations.filter(a => a.balance > 0);
  const taxBucket = activeAllocations.find(a => a.name.toLowerCase().includes('tax'));
  const safeOwnerDistribution = isBusiness ? Math.max(0, liquidCash - (totalExpenses * 2)) : 0;

  // Granular Top Expenses
  const sortedExpenses = [...expenses].sort((a, b) => b.amount - a.amount);
  const topExpenses = sortedExpenses.slice(0, 5).map(e => ({
    name: e.description || e.category || 'Direct Expense',
    amount: e.amount,
    category: e.category || 'General',
    pctOfTotal: totalExpenses > 0 ? ((e.amount / totalExpenses) * 100).toFixed(1) : '0'
  }));

  // Granular Top Income
  const sortedIncome = [...incomeStreams].sort((a, b) => b.amount - a.amount);
  const topIncomeStreams = sortedIncome.slice(0, 3).map(e => ({
    name: e.description || e.category || 'Revenue Stream',
    amount: e.amount,
    frequency: e.frequency || 'one_time'
  }));

  // Total Debt & Asset Metrics
  const totalDebt = liabilities.reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalAssetsValue = tangibleAssets.reduce((sum, a) => sum + (a.amount || 0), 0);
  const debtToIncomeRatio = totalIncome > 0 ? (totalDebt / (totalIncome * 12)) : 0;
  const savingsRate = totalIncome > 0 ? Math.max(0, (cashflow / totalIncome) * 100) : 0;
  const profitMarginPct = totalIncome > 0 ? (cashflow / totalIncome) * 100 : 0;

  // Freedom Target Calculations
  const freedomTarget = data.profile.freedomTarget || 0;
  const freedomProgress = freedomTarget > 0 ? (recurringIncome / freedomTarget) * 100 : 0;
  const freedomGap = Math.max(0, (freedomTarget || totalExpenses) - recurringIncome);
  const freedomVelocityMonths = (cashflow > 0 && freedomGap > 0) ? Math.ceil(freedomGap / Math.max(50, (cashflow * 0.08) / 12)) : 0;

  // Business specific computations if applicable
  const systemScore = bizData?.biTriangle?.systems || 0;
  const salesScore = bizData?.biTriangle?.sales || 0;
  const teamScore = bizData?.biTriangle?.team || 0;
  const productScore = bizData?.biTriangle?.product || 0;

  class CurrencyFormatter {
    constructor(private sym: string) {}
    format(val: number) {
      return `${this.sym}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  return {
    totalIncome,
    recurringIncome,
    totalExpenses,
    cashflow,
    netWorth,
    totalDebt,
    totalAssetsValue,
    liquidCash,
    runwayMonths,
    burnRate,
    dailyBurn,
    burnDaysRemaining,
    unallocatedCash,
    deficitBuckets,
    healthyBuckets,
    taxBucket,
    safeOwnerDistribution,
    activeAllocations,
    topExpenses,
    topIncomeStreams,
    debtToIncomeRatio,
    savingsRate,
    profitMarginPct,
    incomeStreamsCount: incomeStreams.length,
    expenseCount: expenses.length,
    assetCount: tangibleAssets.length,
    liabilityCount: liabilities.length,
    goalCount: activeGoals.length,
    isBusiness,
    systemScore,
    salesScore,
    teamScore,
    productScore,
    bizData,
    profileName: isBusiness ? bizData?.name : data.profile.name,
    freedomTarget,
    freedomProgress,
    freedomGap,
    freedomVelocityMonths,
    symbol,
    fmt: new CurrencyFormatter(symbol)
  };
};

const generateStateSignature = (state: any, path: string) => {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(state) + path))).substring(0, 32);
  } catch (e) {
    // Fallback if something still completely fails to stringify
    return Math.random().toString(36).substring(2, 15);
  }
};

// --- NARRATIVE ENGINE ---
const renderCurrentReality = (state: any, depth: number) => {
  const { totalIncome, cashflow, netWorth, totalAssetsValue, totalDebt, assetCount, liabilityCount, systemScore, salesScore, teamScore, isBusiness, profileName, fmt } = state;
  let text = "";
  if (isBusiness) {
    text = `### Business Reality Check for ${profileName}\n\n`;
    text += `Right now, your operation is generating **${fmt.format(totalIncome)}** in revenue with a net profit (cashflow) of **${fmt.format(cashflow)}**.\n\n`;
    text += `**Vital Metrics:**\n`;
    text += `- **Enterprise Hard Assets:** ${fmt.format(totalAssetsValue)}\n`;
    text += `- **Liabilities:** ${fmt.format(totalDebt)}\n`;
    text += `- **Scores:** Systems (${systemScore}/10) | Sales (${salesScore}/10) | Team (${teamScore}/10)\n\n`;
  } else {
    text = `### Personal Foundation Audit for ${profileName}\n\n`;
    text += `Your current financial reality shows **${fmt.format(totalIncome)}** in total monthly income and an estimated net worth of **${fmt.format(netWorth)}**.\n\n`;
    text += `**Portfolio Breakdown:**\n`;
    text += `- **Total Working Assets (${assetCount}):** ${fmt.format(totalAssetsValue)}\n`;
    text += `- **Total Debt/Liabilities (${liabilityCount}):** ${fmt.format(totalDebt)}\n\n`;
  }

  if (depth > 1) {
    text += "> 🔄 *We've looked at this overview before, but it's important to keep these baseline numbers front and center as we execute your strategy.*\n\n";
  }
  return text;
};

const renderInterpretation = (state: any) => {
  const { cashflow, recurringIncome, totalExpenses, freedomProgress } = state;
  let text = "#### What This Means For You\n\n";

  if (cashflow < 0) {
    text += "- **The Bad News:** The data points to a **structural leak**. You are consistently spending more than you earn. \n";
    text += "- **The Reality:** This isn't just a math problem—it's eroding your foundation and preventing any real wealth building because compounding works against you.\n\n";
  } else if (cashflow === 0) {
    text += "- **The Reality:** You are breaking exactly even. You have engineered a life where every dollar has a job.\n";
    text += "- **The Risk:** There's no surplus to buy your future freedom or protect you from emergencies.\n\n";
  } else if (recurringIncome > totalExpenses && totalExpenses > 0) {
    text += "- **The Achievement:** You have reached a critical milestone: **your recurring passive income fully covers your expenses**.\n";
    text += "- **The Next Phase:** You are effectively free. Now the game shifts from survival to scale, legacy, and true wealth optimization.\n\n";
  } else {
    text += `- **The Progress:** You are currently **${freedomProgress.toFixed(1)}%** of the way to complete financial freedom.\n`;
    text += "- **The Gap:** Your recurring passive cashflow covers a portion of your life, but you still rely heavily on active labor to bridge the gap.\n\n";
  }
  return text;
};

const renderProblem = (state: any) => {
  const { totalIncome, recurringIncome, cashflow, isBusiness, systemScore, salesScore, teamScore, totalDebt, fmt } = state;
  let blocks = [];

  if (totalIncome === 0) blocks.push("- **Zero Active Income**: You have no initial seed capital to systematically buy assets.");
  if (recurringIncome === 0 && !isBusiness) blocks.push("- **Zero Recurring Income**: You are 100% dependent on your daily active labor. If you stop working, you stop earning.");
  if (cashflow <= 0) blocks.push(`- **Cashflow Deficit**: You are operating at ${fmt.format(cashflow)}. Without surplus, mathematics guarantees you cannot build wealth.`);
  
  if (totalDebt > 0 && totalDebt > totalIncome * 12) {
    blocks.push(`- **Severe Leverage**: Your liabilities (${fmt.format(totalDebt)}) dangerously exceed your annual earning capacity. This is a structural emergency.`);
  } else if (totalDebt > 0) {
    blocks.push(`- **Debt Drag**: Outstanding liabilities of ${fmt.format(totalDebt)} are actively cannibalizing your future wealth via interest obligations.`);
  }

  if (isBusiness) {
    if (systemScore < 5) blocks.push("- **Weak Operations**: Your systems score is dangerously low. The business depends entirely on your daily labor.");
    if (salesScore < 5) blocks.push("- **Anemic Sales Volume**: Your revenue engine is stalling. Nothing else matters until you fix distribution.");
    if (teamScore < 5 && totalIncome > 100000) blocks.push("- **Founder Bottleneck**: You have outgrown your capacity. A weak team score means you are the primary constraint on growth.");
  }
  
  if (blocks.length > 0) {
    return `#### Critical Threats Detected\n\n${blocks.join("\n")}\n\n`;
  }
  return "#### System Health\n\n- **Stable**: No immediate structural threats detected. Your foundation is stable, which means we can aggressively focus on upside.\n\n";
};

const renderOpportunity = (state: any) => {
  const { cashflow, isBusiness, systemScore, goalCount, recurringIncome, fmt } = state;
  let text = "#### The Opportunity Ahead\n\n";

  if (cashflow > 0 && recurringIncome === 0) {
    text += `- **The Freedom Seed:** You have **${fmt.format(cashflow)} in monthly surplus** right now. \n`;
    text += `- **The Move:** This must be immediately redirected from your pocket into yield-bearing assets before lifestyle creep absorbs it.\n\n`;
  } else if (isBusiness && systemScore < 8) {
    text += `- **The Leverage:** By increasing your System Score from ${systemScore}/10 to 8/10, you could potentially **double your enterprise valuation** without increasing your own working hours.\n\n`;
  } else if (goalCount > 0) {
    text += `- **Target Tracking**: You have ${goalCount} active financial goals. Direct every surplus dollar (${fmt.format(cashflow)}/mo) toward aggressively knocking down the highest priority goal.\n\n`;
  } else {
    text += `- **The Scale:** Scaling your existing successful patterns is the fastest path to the next level. Look at what is working and double down aggressively.\n\n`;
  }
  return text;
};

const renderNextMove = (state: any, depth: number) => {
  const { cashflow, isBusiness, profileName } = state;
  let text = "#### What To Do Next\n\n";

  if (depth === 1) {
    text += `1. **Get Clarity, ${profileName}**: The absolute priority right now is understanding your data. We need to stabilize your financial operations before executing complex maneuvers.`;
  } else if (depth === 2) {
    if (cashflow < 0) {
      text += "1. **Perform an Audit**: Do a brutal expense audit this week.\n";
      text += "2. **Eliminate Waste**: Cancel all non-essential subscriptions immediately.\n";
      text += "3. **Target Liability**: Focus on eliminating high-interest 'Bad Debt'.";
    } else if (isBusiness) {
      text += "1. **Codify Operations**: Document your current delivery process into standard operating procedures (SOPs).\n";
      text += "2. **Delegate**: Begin delegating your lowest-leverage role immediately.";
    } else {
      text += "1. **Identify Assets**: Pick an asset class you understand (Real Estate, Index Funds, or a small Business).\n";
      text += "2. **Allocate**: Begin consistent, automated allocation of your surplus into it.";
    }
  } else {
    text += "1. **Stop Planning, Start Executing**: Track every single transaction for the next 7 days.\n";
    text += "2. **Classify & Act**: Find the hidden leaks and seal them. Execution is speed.";
  }
  return text + "\n\n";
};

const renderConsequence = (state: any) => {
  const { cashflow } = state;
  if (cashflow < 0) {
    return "> **Warning**: If this trajectory continues unmodified, your net worth will be fully depleted.\n";
  }
  return "> **Insight**: Maintaining your current discipline will lead to exponential growth via compound interest.\n";
};

// --- PATH ENGINE ---
const PATH_ENGINE: Record<string, (state: any, depth: number) => { message: string, options: { label: string; path: string }[] }> = {
  "analysis.full": (state, depth) => {
    const blocks = [
      renderCurrentReality(state),
      renderInterpretation(state),
      renderProblem(state),
      renderOpportunity(state),
      renderNextMove(state, depth)
    ];
    
    let options = [
      { label: "Fix Cashflow", path: "cashflow.fix" },
      { label: "Increase Income", path: "income.grow" },
      { label: "Plan Freedom", path: "freedom.plan" }
    ];

    if (state.isBusiness) {
      options.push({ label: "Scale Systems", path: "systems.scale" });
    }

    return { message: blocks.join(""), options };
  },

  "cashflow.fix": (state, depth) => {
    let message = "### Cashflow Stabilization Protocol\n\n";
    message += "Cashflow is the lifeblood of freedom. Without it, you cannot invest, you cannot scale, and you cannot build a safety net.\n\n";
    
    if (state.cashflow < 0) {
      message += `#### The Reality\nCurrently, you are losing **${state.fmt.format(Math.abs(state.cashflow))}** every single month. We must stop this bleed immediately before it permanently damages your foundation.\n\n`;
      message += "#### Why This Is Critical\n";
      message += "- **No Surplus**: Meaning zero ability to buy yield-bearing assets.\n";
      message += "- **Negative Compounding**: Debt will likely be required to bridge your monthly gap.\n\n";
      
      message += "#### What You Must Do Now\n";
      message += "1. **Cut the Fat**: Find 3 non-essential expenses and cancel them today.\n";
      message += "2. **Restructure**: Prevent any new debt acquisition.\n\n";

      if (depth > 1) {
        message += "> ⚠️ **Accountability Check:** We've revisited cashflow multiple times. If you are still in the red, you haven't made the hard sacrifices yet. Cut everything that doesn't feed you or protect you.\n\n";
      }
    } else {
      message += `#### The Reality\nYou have **${state.fmt.format(state.cashflow)}** available for acceleration. This is a solid starting position.\n\n`;
      message += "#### What This Means\n";
      message += "The goal now is to widen that margin. Every dollar you recover from expenses or add to income acts as a 'Freedom Seed' to buy back your time.\n\n";

      if (depth > 1) {
        message += "> 💡 **Pushing Further:** Since we've discussed this, have you automated the transfer of that surplus into an investment account? Do not let it sit idle in checking.\n\n";
      }
    }

    const options = [
      { label: "Audit Expenses", path: "expenses.reduce" },
      { label: "Audit Debt", path: "debt.audit" },
      { label: "Back to Dashboard", path: "analysis.full" }
    ];

    return { message, options };
  },

  "income.grow": (state, depth) => {
    let message = "### Income Expansion Strategy\n\n";
    message += `To grow your **${state.fmt.format(state.totalIncome)}** income, you have two primary levers. You can either increase your value per hour, or increase your total working hours. We are going to focus entirely on the first one, because trading more time is not a scalable strategy.\n\n`;
    
    message += "#### Core Patterns for Growth\n";
    message += "- **Skill Arbitrage**: Learn a high-income skill (e.g., Code, Copywriting, Sales) that divorces your earnings from your time.\n";
    message += "- **Asset Creation**: Build something once that pays you continuously.\n";
    message += "- **Business Equity**: Own a piece of a system that scales.\n\n";

    if (depth > 1) {
      message += "> 🔍 **Follow-up:** You've investigated income growth before. Have you taken action on monetizing a new skill yet? The analysis paralysis ends here. Write down one service you can offer and price it.\n\n";
    }

    const options = [
      { label: "Monetize Skills", path: "income.start" },
      { label: "Acquire Assets", path: "freedom.plan" },
      { label: "Back to Analysis", path: "analysis.full" }
    ];
    return { message, options };
  },

  "freedom.plan": (state, depth) => {
    let message = "### The Freedom Roadmap\n\n";
    message += `#### Checkpoint\nYour Freedom Target is tracked. You currently have **${state.fmt.format(state.recurringIncome)}** in recurring passive income against **${state.fmt.format(state.totalExpenses)}** in monthly expenses.\n\n`;
    message += `That puts your Freedom Progress at **${state.freedomProgress.toFixed(1)}%**.\n\n`;
    
    message += "#### The Math of Freedom\n";
    message += "Financial freedom is a brutal math equation. You cross the finish line when:\n\n";
    message += "`Recurring Passive Income >= Living Expenses`\n\n";
    
    message += "#### What You Must Do Next\n";
    message += "To accelerate this, you must attack both sides of the equation simultaneously:\n";
    message += "1. **Slash your burn rate** (lowers the finish line).\n";
    message += "2. **Relentlessly acquire cash-flowing assets** (pushes you toward the line).\n\n";

    if (depth > 1) {
      message += "> ⚡ **Urgency:** If your Freedom Progress isn't moving fast enough, you are likely failing to deploy your surplus efficiently. Let's fix that immediately.\n\n";
    }

    const options = [
      { label: "Acquire Assets", path: "assets.acquire" },
      { label: "Reduce Burn Rate", path: "expenses.reduce" },
      { label: "Full Status Check", path: "analysis.full" }
    ];
    return { message, options };
  },

  "expenses.reduce": (state, depth) => {
    let message = "### The Burn Rate Audit\n\n";
    message += `#### The Principle\nEvery dollar saved is a dollar that can work for you. Reducing your **${state.fmt.format(state.totalExpenses)}** monthly burn (across ${state.expenseCount} tracked expense streams) increases your Freedom Ratio instantly.\n\n`;
    
    message += "#### Where To Look\n";
    message += "We categorize expenses into two buckets:\n";
    message += "- **Structural Expenses**: Rent, food, utilities. Handled via major life changes (refinancing, moving).\n";
    message += "- **Behavioral Expenses**: Subscriptions, dining, conveniences. Easy to slash today.\n\n";
    
    if (depth > 1) {
      message += `> 🗣️ **Accountability:** We've discussed expenses before, ${state.profileName}. Have you actually cancelled any subscriptions or renegotiated your bills? If not, do that *right now* while reading this.\n\n`;
    }

    const options = [
      { label: "Cut Subscriptions", path: "expenses.audit" },
      { label: "Optimize Taxes", path: "tax.audit" },
      { label: "Back to Dashboard", path: "analysis.full" }
    ];
    return { message, options };
  },

  "debt.audit": (state, depth) => {
    let message = "### Debt & Liability Audit\n\n";
    if (state.totalDebt > 0) {
      message += `#### The Reality of Your Debt\n`;
      message += `You currently carry **${state.fmt.format(state.totalDebt)}** across ${state.liabilityCount} liabilities. Any debt that does not put money in your pocket is a liability that steals your future.\n\n`;
    } else {
      message += `#### The Reality of Debt\n`;
      message += `You currently have **no recorded liabilities**. Excellent work maintaining a clean balance sheet, this gives you massive optionality.\n\n`;
    }
    
    message += "#### Your Action Plan:\n";
    message += "1. **List Everything**: Write down every debt, interest rate, and minimum payment on a spreadsheet right now.\n";
    message += "2. **Rank by Interest**: Sort them from highest interest rate to lowest (The Avalanche Method).\n";
    message += "3. **Aggressive Elimination**: Pay minimums on everything, and throw every spare cent at the highest interest debt until it is destroyed.\n\n";
    
    if (depth > 1) {
      message += "> 🔥 **Reality Check:** You cannot out-invest bad debt. If you have credit card debt at 20%+, that is a guaranteed negative return. Focus all energy there before worrying about advanced investing.\n\n";
    }

    const options = [
      { label: "Fix Cashflow", path: "cashflow.fix" },
      { label: "Plan Freedom", path: "freedom.plan" },
      { label: "Back to Analysis", path: "analysis.full" }
    ];
    return { message, options };
  },

  "income.start": (state, depth) => {
    let message = "### Zero To One: Generating Income\n\n";
    message += "#### The Foundation\n";
    message += "To start generating income from scratch, you must perform a brutal inventory of your current viable skills and assets.\n\n";
    
    message += "#### Questions to Ask Yourself:\n";
    message += "- **What do people already ask me for help with?**\n";
    message += "- **What can I do easily that others find difficult?**\n";
    message += "- **Which of my skills directly solves a painful problem for a business?**\n\n";

    if (depth > 1) {
      message += `> 🚀 **Next Level:** Stop overthinking the perfect idea, ${state.profileName}. Pick one skill, build a cheap portfolio or offer, and pitch 10 people today. Feedback is worth more than theory.\n\n`;
    }

    const options = [
      { label: "Grow Income", path: "income.grow" },
      { label: "Scale Systems", path: "systems.scale" },
      { label: "Back to Analysis", path: "analysis.full" }
    ];
    return { message, options };
  },

  "systems.scale": (state, depth) => {
    let message = "### Business Systemization\n\n";
    message += `#### The Reality\nA business without systems is just a high-stress, high-paying job. You must remove yourself from daily operations to increase valuation. Your current system score is **${state.systemScore}/10**, and team score is **${state.teamScore}/10**.\n\n`;
    
    message += "#### The BI Triangle Focus:\n";
    message += "- **Lead Generation**: Do you have a documented, automated way to get clients? (Sales Score: " + state.salesScore + "/10)\n";
    message += "- **Fulfillment**: Can someone else legally and operationally deliver your service with a checklist? (Product/Legal Score: " + state.productScore + "/10)\n";
    message += "- **Cashflow Management**: Do you have predictable profit margins?\n\n";

    if (depth > 1) {
      message += `> ⚙️ **Action Required:** You've checked your systems before, ${state.profileName}. If your scores haven't improved, you are still acting as the bottleneck. Fire yourself from a low-leverage role today.\n\n`;
    }

    const options = [
      { label: "Full Audit", path: "analysis.full" },
      { label: "Grow Income", path: "income.grow" },
      { label: "Fix Cashflow", path: "cashflow.fix" }
    ];
    return { message, options };
  },

  "assets.acquire": (state, depth) => {
    let message = "### Asset Acquisition Strategy\n\n";
    message += `#### The Principle\nYou currently have ${state.assetCount} working assets totaling **${state.fmt.format(state.totalAssetsValue)}**. You must relentlessly acquire more assets that generate recurring passive income. This is the only mathematical path out of the rat race.\n\n`;
    
    message += "#### The Fundamental Asset Classes:\n";
    message += "- **Paper Assets**: Index funds, dividend stocks, bonds. *(Highly liquid, truly passive)*.\n";
    message += "- **Real Estate**: Rental properties, REITs. *(Cashflow, appreciation, leverage, tax advantages)*.\n";
    message += "- **Business**: Your own company or equity in others. *(Highest return, requires highest skill)*.\n\n";

    if (depth > 1) {
      message += "> 🛑 **Warning:** Stop hoarding cash. Once you have a 6-month safety net, inflation eats the rest. Deploy your capital into an asset class you've studied.\n\n";
    }

    const options = [
      { label: "Plan Freedom Roadmap", path: "freedom.plan" },
      { label: "Grow Income", path: "income.grow" },
      { label: "Back to Analysis", path: "analysis.full" }
    ];
    return { message, options };
  },

  "expenses.audit": (state, depth) => {
    let message = "### Deep Expense & Cash Leak Audit\n\n";
    message += `#### 💸 Monthly Burn Rate Analysis\n`;
    message += `- **Total Monthly Burn:** **${state.fmt.format(state.totalExpenses)}** across ${state.expenseCount} tracked expense line(s).\n`;
    message += `- **Daily Cash Drain:** **${state.fmt.format(state.dailyBurn)} / day**\n`;
    message += `- **Liquid Runway Remaining:** **${state.burnDaysRemaining} days** (${state.runwayMonths.toFixed(1)} months)\n\n`;

    if (state.topExpenses && state.topExpenses.length > 0) {
      message += `#### 📊 Top Spending Lines (Pareto Analysis)\n`;
      message += `Your largest cash drains account for the bulk of your burn rate:\n\n`;
      state.topExpenses.forEach((exp: any, idx: number) => {
        message += `${idx + 1}. **${exp.name}** — **${state.fmt.format(exp.amount)}/mo** (${exp.pctOfTotal}% of burn • ${exp.category})\n`;
      });
      message += `\n`;
      
      const topOne = state.topExpenses[0];
      if (topOne && Number(topOne.pctOfTotal) > 30) {
        message += `> 🚨 **Concentration Risk:** "${topOne.name}" accounts for **${topOne.pctOfTotal}%** of your entire burn rate. Renegotiating or downsizing this single item would immediately extend your survival runway.\n\n`;
      }
    } else {
      message += `> 💡 **Notice:** No granular expenses recorded yet. Adding your recurring bills and subscriptions will unlock exact leakage detection.\n\n`;
    }

    message += `#### The 3-Tier Expense Slashing Protocol\n`;
    message += `1. **Immediate Kill (Zombie Subscriptions):** Audit recurring digital tools, memberships, and unused services. Cancel anything unused in 14 days.\n`;
    message += `2. **Renegotiation (Structural Overhead):** Call internet, insurance, and service providers. A 15-minute call typically yields 10–25% reductions.\n`;
    message += `3. **Discretionary Cap:** Enforce a strict weekly cash allocation bucket for dining and entertainment so leakage cannot bleed into core reserves.\n\n`;

    if (depth > 1) {
      message += `> ✂️ **Discipline Check:** Every dollar cut from monthly expenses drops your Financial Freedom Target by $300 (using the 4% rule). Slashing $200/month reduces your required freedom capital by $60,000!\n\n`;
    }

    const options = [
      { label: "Check Affordability", path: "affordability.check" },
      { label: "Optimize Savings", path: "savings.optimize" },
      { label: "Audit Runway", path: "runway.audit" },
      { label: "Back to Analysis", path: "analysis.full" }
    ];
    return { message, options };
  },

  "tax.audit": (state, depth) => {
    let message = "### Tax Strategy Overview\n\n";
    message += "#### The Reality\n";
    message += "For high earners, taxes are often your single largest expense. But tax optimization is how the wealthy stay wealthy.\n\n";
    
    message += "#### Paradigm Shift:\n";
    message += "- The tax code is a set of incentives. The government rewards you for doing what they want (housing, jobs, energy).\n";
    message += "- Ask yourself: Are you operating as a W-2 employee (highest tax bracket) or a Business Owner/Investor (lowest tax bracket)?\n\n";

    if (depth > 1) {
      if (state.isBusiness) {
        message += "> 👔 **Business Action:** As a business owner, you have maximum flexibility. Ensure you are meeting with a proactive CPA, not just a historian who files returns in April.\n\n";
      } else {
        message += "> 💡 **Personal Action:** As a personal profile, your options are limited without a business or real estate entity. Consider starting a side business purely for the deductions and leverage.\n\n";
      }
    }

    const options = [
      { label: "Scale Systems", path: "systems.scale" },
      { label: "Plan Freedom", path: "freedom.plan" },
      { label: "Back to Analysis", path: "analysis.full" }
    ];
    return { message, options };
  },

  "income.salary": (state, depth) => {
    let message = `### Salary Negotiation & Growth\n\n`;
    message += `#### The Reality\n`;
    message += `Relying solely on a W-2 salary is the highest taxed, least leveraged form of income. However, it's a great place to build capital.\n\n`;
    message += `#### Promotion Protocol:\n`;
    message += `1. **Quantify Your Value**: Calculate exactly how much money you made or saved the company in the last 6 months.\n`;
    message += `2. **The Meeting**: Don't ask for a raise out of nowhere. Ask your manager: "What specific metrics do I need to hit in the next 3 months to justify a $X salary increase?"\n`;
    message += `3. **Market Tests**: Always be interviewing. You need leverage to negotiate.\n\n`;
    if (depth > 1) {
      message += `> 🔥 **Action Step:** Have you actually initiated the conversation yet, ${state.profileName || 'my friend'}? You don't get what you deserve, you get what you negotiate.\n\n`;
    }
    return { message, options: [{ label: "Grow Income", path: "income.grow" }, { label: "Acquire Assets", path: "assets.acquire" }] };
  },

  "income.side_hustle": (state, depth) => {
    let message = `### The Side Hustle Blueprint\n\n`;
    message += `#### The Goal\n`;
    message += `You need to divorce your time from your earnings. A side hustle is your sandbox for learning business skills safely.\n\n`;
    message += `#### Where To Start:\n`;
    message += `- **Service Flipping**: Can you perform a service (writing, designing, consulting) that currently earns you a salary, but offer it directly to clients?\n`;
    message += `- **Audience First**: Document your journey or expertise online. Attention is the new oil.\n\n`;
    if (depth > 1) {
      message += `> ⚡ **Launch It:** Stop researching, ${state.profileName || 'hustler'}. Get your first paying customer this week. Charge $1 just to prove someone will pay.\n\n`;
    }
    return { message, options: [{ label: "Grow Income", path: "income.grow" }, { label: "Fix Cashflow", path: "cashflow.fix" }] };
  },

  "assets.real_estate": (state, depth) => {
    let message = `### Real Estate Investment Strategy\n\n`;
    message += `#### The Power of Property\n`;
    message += `Real estate offers cash flow, appreciation, tax advantages, and leverage. It's how the majority of millionaires preserve wealth.\n\n`;
    message += `#### Your Next Steps:\n`;
    message += `- **House Hacking**: If you don't own a home, buy a multi-family property (2-4 units). Live in one, rent the others.\n`;
    message += `- **Analyze Deals**: Learn to run the numbers. A deal must cash-flow positively after all expenses, vacancy, and maintenance.\n\n`;
    if (depth > 1) {
      message += `> 🏠 **Commitment:** Have you analyzed 10 properties this week? The deal of the decade comes around once a week if you look hard enough.\n\n`;
    }
    return { message, options: [{ label: "Acquire Assets", path: "assets.acquire" }, { label: "Audit Taxes", path: "tax.audit" }] };
  },

  "assets.stocks": (state, depth) => {
    let message = `### Equities & Paper Assets\n\n`;
    message += `#### The Power of Compounding\n`;
    message += `The stock market is the greatest wealth-creation machine in history for passive investors.\n\n`;
    message += `#### The Strategy:\n`;
    message += `- **Broad Index Funds**: Stop stock picking. Buy low-cost index funds (like S&P 500) and hold them forever.\n`;
    message += `- **Automate**: Setup automatic transfers every payday so you never even see the money.\n\n`;
    if (depth > 1) {
      message += `> 📈 **Stay the Course:** Remember, the market goes down, but human progress averages up. Keep buying, ${state.profileName || 'investor'}.\n\n`;
    }
    return { message, options: [{ label: "Plan Freedom", path: "freedom.plan" }, { label: "Acquire Assets", path: "assets.acquire" }] };
  },

  "business.sales": (state, depth) => {
    let message = `### Sales & Revenue Generation\n\n`;
    message += `#### The Oxygen of Business\n`;
    message += `Nothing happens until a sale is made. If your cash flow is tight, you have a sales problem.\n\n`;
    message += `#### The Formula:\n`;
    message += `- **Volume x Skill**: You either need more daily outreach (volume) or better conversion rates (skill).\n`;
    message += `- **The Offer**: Make your offer so incredibly good that people feel stupid saying no.\n\n`;
    if (depth > 1) {
      message += `> 💰 **Get to Work:** Stop tweaking your logo and make 20 phone calls today.\n\n`;
    }
    return { message, options: [{ label: "Scale Systems", path: "systems.scale" }, { label: "Marketing", path: "business.marketing" }] };
  },

  "business.marketing": (state, depth) => {
    let message = `### Marketing & Lead Generation\n\n`;
    message += `#### Attention is Currency\n`;
    message += `The best product doesn't win. The best known product wins.\n\n`;
    message += `#### The Channels:\n`;
    message += `- **Earned Media**: Organic content, SEO, word of mouth. (Takes time, high trust).\n`;
    message += `- **Paid Media**: Ads, sponsorships. (Fast, requires capital and testing).\n\n`;
    if (depth > 1) {
      message += `> 📣 **Publish:** If nobody knows you exist, you can't help them. Start publishing your expertise daily.\n\n`;
    }
    return { message, options: [{ label: "Sales Strategy", path: "business.sales" }, { label: "Scale Systems", path: "systems.scale" }] };
  },

  "business.team": (state, depth) => {
    let message = `### Hiring & Team Building\n\n`;
    message += `#### Buying Back Time\n`;
    message += `You hire people to buy back your time. As the founder, your time should only be spent on the highest leverage activities.\n\n`;
    message += `#### The Protocol:\n`;
    message += `- **SOP First**: Never hire before you have a Standard Operating Procedure (SOP) written for the role.\n`;
    message += `- **Culture Fit vs Skill**: Skills can be taught. Character cannot. Hire slow, fire fast.\n\n`;
    if (depth > 1) {
      message += `> 🤝 **Leadership Check:** Are you still doing "$15/hour tasks"? Delegate them today.\n\n`;
    }
    return { message, options: [{ label: "Automation", path: "business.automation" }, { label: "Scale Systems", path: "systems.scale" }] };
  },

  "business.automation": (state, depth) => {
    let message = `### Automation & Technology\n\n`;
    message += `#### Digital Employees\n`;
    message += `Software is the ultimate leverage. It works 24/7, never complains, and scales infinitely.\n\n`;
    message += `#### Where to Automate:\n`;
    message += `- **Onboarding**: Automate client intake, contracts, and invoicing.\n`;
    message += `- **Follow-up**: Implement automated lead nurturing campaigns.\n\n`;
    if (depth > 1) {
      message += `> 🤖 **Tech Check:** Have you audited your repetitive tasks this week? Zapier can replace hours of manual labor.\n\n`;
    }
    return { message, options: [{ label: "Build Team", path: "business.team" }, { label: "Scale Systems", path: "systems.scale" }] };
  },

  "analysis.smart": (state, depth) => {
    let message = `### Intelligent Financial Diagnostic for ${state.profileName || 'Your Profile'}\n\n`;
    message += `#### 🧭 Financial Vitals Summary\n`;
    message += `- **Monthly Revenue/Income:** **${state.fmt.format(state.totalIncome)}** across ${state.incomeStreamsCount} stream(s)\n`;
    message += `- **Monthly Operating Burn:** **${state.fmt.format(state.totalExpenses)}** across ${state.expenseCount} expense line(s)\n`;
    
    if (state.cashflow >= 0) {
      message += `- **Monthly Cashflow Surplus:** **+${state.fmt.format(state.cashflow)}** (Savings Rate: **${state.savingsRate.toFixed(1)}%**)\n`;
    } else {
      message += `- **Monthly Cashflow Deficit:** **-${state.fmt.format(Math.abs(state.cashflow))}** (Daily Drain: **${state.fmt.format(state.dailyBurn)}/day**)\n`;
    }
    
    message += `- **Liquid Bucket Cash:** **${state.fmt.format(state.liquidCash)}** (${state.burnDaysRemaining} days • **${state.runwayMonths.toFixed(1)} months runway**)\n`;
    message += `- **Balance Sheet:** Assets **${state.fmt.format(state.totalAssetsValue)}** | Debt **${state.fmt.format(state.totalDebt)}** | Net Worth **${state.fmt.format(state.netWorth)}**\n\n`;

    message += `#### 🔍 Tactical Diagnosis & Weakest Link\n`;
    if (state.cashflow < 0) {
      message += `> 🚨 **CRITICAL BOTTLENECK: Cashflow Bleed.** You are burning capital at ${state.fmt.format(Math.abs(state.cashflow))}/month. Without plugging this leak, your liquid reserves will expire in **${state.burnDaysRemaining} days**. All investment and distribution plans must be frozen until monthly cashflow is positive.\n\n`;
    } else if (state.deficitBuckets && state.deficitBuckets.length > 0) {
      message += `> ⚠️ **RESERVE VULNERABILITY:** You have ${state.deficitBuckets.length} overdrawn allocation bucket(s). This creates an illusion of available cash while silently eating into operating buffers.\n\n`;
    } else if (state.runwayMonths < 3 && state.totalExpenses > 0) {
      message += `> ⏱️ **BUFFER RISK:** You have only **${state.runwayMonths.toFixed(1)} months** of operating reserves. Target a non-negotiable 6-month safety net (${state.fmt.format(state.totalExpenses * 6)}) before deploying capital into speculative assets.\n\n`;
    } else if (state.unallocatedCash > 0) {
      message += `> 💡 **CAPITAL DRAG:** You have **${state.fmt.format(state.unallocatedCash)}** in unallocated funds sitting idle. Every dollar needs a designated mission in Profit, Tax, or Freedom buckets.\n\n`;
    } else {
      message += `> 🛡️ **STRONG STABILITY:** Your foundation is fortified with ${state.runwayMonths.toFixed(1)} months runway and positive monthly cashflow (+${state.fmt.format(state.cashflow)}). Your focus should now be maximizing asset velocity and passive compounding.\n\n`;
    }

    if (state.topExpenses && state.topExpenses.length > 0) {
      const top = state.topExpenses[0];
      message += `#### 🎯 Highest Leverage Focus: "${top.name}"\n`;
      message += `Your largest individual expense represents **${top.pctOfTotal}%** of your entire burn rate (${state.fmt.format(top.amount)}/mo). Downsizing or optimizing this one line has a disproportionate impact on your freedom date.\n\n`;
    }

    const options = [
      { label: "Check Affordability", path: "affordability.check" },
      { label: "Weekly Focus", path: "focus.weekly" },
      { label: "Audit Top Expenses", path: "expenses.audit" },
      { label: "Audit Runway", path: "runway.audit" }
    ];

    if (state.isBusiness) {
      options.push({ label: "Safe Owner Draw", path: "business.distributions" });
    } else {
      options.push({ label: "Freedom Roadmap", path: "freedom.plan" });
    }

    return { message, options: options.slice(0, 4) };
  },

  "clarification.needed": (state, depth) => {
    // Zero rejection: redirect smoothly to analysis.smart with intelligent context
    return PATH_ENGINE["analysis.smart"](state, depth);
  },

  "affordability.check": (state, depth) => {
    let message = `### Affordability & Purchase Feasibility Model\n\n`;
    const safetyFloor = state.totalExpenses * 3;
    const maxSafeCashPurchase = Math.max(0, state.liquidCash - safetyFloor);
    
    message += `#### 🧮 Your Capital Liquidity Reality\n`;
    message += `- **Total Liquid Cash:** **${state.fmt.format(state.liquidCash)}**\n`;
    message += `- **Required 3-Month Emergency Floor:** **${state.fmt.format(safetyFloor)}**\n`;
    message += `- **Current Monthly Surplus:** **${state.cashflow >= 0 ? '+' : ''}${state.fmt.format(state.cashflow)}/mo**\n`;
    message += `- **Unallocated Cash Available:** **${state.fmt.format(state.unallocatedCash)}**\n\n`;

    message += `#### 💳 Maximum Safe Discretionary Purchase Limit\n`;
    if (maxSafeCashPurchase > 0) {
      message += `> 🟢 **MAX SAFE CASH PURCHASE TODAY:** **${state.fmt.format(maxSafeCashPurchase)}**\n`;
      message += `You can purchase an item up to this amount with cash without compromising your 3-month survival buffer (${state.fmt.format(safetyFloor)}).\n\n`;
    } else {
      message += `> 🔴 **DISCRETIONARY PURCHASE FREEZE:** **$0.00**\n`;
      message += `Your total liquid cash (${state.fmt.format(state.liquidCash)}) is currently below your mandatory 3-month survival floor (${state.fmt.format(safetyFloor)}). Any non-essential capital outlay today directly threatens solvency.\n\n`;
    }

    message += `#### The 3 Golden Rules Before Buying:\n`;
    message += `1. **The 3-Month Buffer Rule:** Never let an upfront cash purchase reduce your liquid reserves below 90 days of burn (${state.fmt.format(safetyFloor)}).\n`;
    message += `2. **The Cashflow Margin Rule:** If financing with monthly payments, the new payment must not exceed 20% of your net surplus (${state.cashflow > 0 ? state.fmt.format(state.cashflow * 0.2) : '$0'}/mo).\n`;
    message += `3. **The Rich Dad Rule:** The wealthy don't buy luxury or liabilities with active wages. They buy an **Asset** first, and let the asset's passive cashflow pay for the luxury!\n\n`;

    const options = [
      { label: "Audit Expenses", path: "expenses.audit" },
      { label: "Weekly Priorities", path: "focus.weekly" },
      { label: "Optimize Savings", path: "savings.optimize" },
      { label: "Back to Analysis", path: "analysis.full" }
    ];
    return { message, options };
  },

  "focus.weekly": (state, depth) => {
    let message = `### Weekly Focus & Tactical Priorities for ${state.profileName || 'You'}\n\n`;
    message += `Here are your 3 highest-ROI missions for the next 7 days, ranked by financial leverage:\n\n`;

    // Dynamic Mission 1: Defensive Solvency
    if (state.cashflow < 0) {
      message += `#### 1. 🛑 STOP THE BLEED (Priority: CRITICAL)\n`;
      message += `- **Objective:** Eliminate the **${state.fmt.format(Math.abs(state.cashflow))}/month** cashflow deficit.\n`;
      message += `- **Action Item:** Review your top expenses (${state.topExpenses.map((e: any) => e.name).slice(0, 3).join(', ')}). Slash or pause at least 2 non-essential lines before Sunday.\n\n`;
    } else if (state.deficitBuckets && state.deficitBuckets.length > 0) {
      message += `#### 1. ⚖️ REBALANCE OVERDRAWN BUCKETS (Priority: HIGH)\n`;
      message += `- **Objective:** Restore ${state.deficitBuckets.length} negative allocation bucket(s) to zero or positive.\n`;
      message += `- **Action Item:** Transfer funds from surplus buckets or unallocated cash (${state.fmt.format(state.unallocatedCash)}) into ${state.deficitBuckets.map((b: any) => b.name).join(', ')}.\n\n`;
    } else if (state.runwayMonths < 3) {
      message += `#### 1. ⏱️ FORTIFY SURVIVAL RUNWAY (Priority: HIGH)\n`;
      message += `- **Objective:** Grow runway from **${state.runwayMonths.toFixed(1)} months** to at least 3 months.\n`;
      message += `- **Action Item:** Channel all incoming payments into your Emergency Reserve bucket until liquid cash reaches **${state.fmt.format(state.totalExpenses * 3)}**.\n\n`;
    } else {
      message += `#### 1. 🛡️ MAINTAIN OPERATING DISCIPLINE (Priority: NORMAL)\n`;
      message += `- **Objective:** Protect existing **${state.runwayMonths.toFixed(1)} months** runway and preserve daily burn ceiling of ${state.fmt.format(state.dailyBurn)}/day.\n\n`;
    }

    // Dynamic Mission 2: Allocations & Optimization
    if (state.unallocatedCash > 0) {
      message += `#### 2. 💰 SWEEP IDLE CAPITAL (Priority: MEDIUM)\n`;
      message += `- **Objective:** Deploy **${state.fmt.format(state.unallocatedCash)}** in unallocated funds.\n`;
      message += `- **Action Item:** Allocate 50% to Emergency/Tax reserves and 50% to freedom/investment assets via your Allocations tab.\n\n`;
    } else if (state.totalDebt > 0) {
      message += `#### 2. ⚡ ACCELERATE DEBT DESTROYER (Priority: MEDIUM)\n`;
      message += `- **Objective:** Reduce **${state.fmt.format(state.totalDebt)}** in outstanding liabilities.\n`;
      message += `- **Action Item:** Make a lump-sum extra payment on your highest-interest liability using available surplus.\n\n`;
    } else {
      message += `#### 2. 📈 EXPAND RECURRING PASSIVE INCOME\n`;
      message += `- **Objective:** Close the gap to your Freedom Target (${state.freedomProgress.toFixed(1)}% current progress).\n`;
      message += `- **Action Item:** Research or deploy surplus into dividend index funds, rental real estate, or digital products.\n\n`;
    }

    // Dynamic Mission 3: Growth & Leverage
    if (state.isBusiness) {
      message += `#### 3. ⚙️ B-I TRIANGLE OPTIMIZATION\n`;
      if (state.systemScore < 7) {
        message += `- **Action Item:** Document one repetitive client delivery process into a Standard Operating Procedure (SOP) to buy back founder hours.\n\n`;
      } else {
        message += `- **Action Item:** Implement one new sales outreach cadence to lift monthly revenue from ${state.fmt.format(state.totalIncome)}.\n\n`;
      }
    } else {
      message += `#### 3. 🎓 HIGH-INCOME SKILL STACKING\n`;
      message += `- **Action Item:** Invest 5 hours this week learning a high-leverage skill (sales, copywriting, automation, or software) to expand active earning power.\n\n`;
    }

    const options = [
      { label: "Check Affordability", path: "affordability.check" },
      { label: "Deep Expense Audit", path: "expenses.audit" },
      { label: "Audit Allocations", path: "buckets.audit" },
      { label: "Back to Analysis", path: "analysis.full" }
    ];
    return { message, options };
  },

  "savings.optimize": (state, depth) => {
    let message = `### Savings & Capital Accumulation Engine\n\n`;
    message += `#### 📊 Current Savings Performance\n`;
    message += `- **Monthly Gross Income:** **${state.fmt.format(state.totalIncome)}**\n`;
    message += `- **Monthly Operating Burn:** **${state.fmt.format(state.totalExpenses)}**\n`;
    message += `- **Monthly Net Surplus:** **${state.cashflow >= 0 ? '+' : ''}${state.fmt.format(state.cashflow)}**\n`;
    message += `- **Active Savings Rate:** **${state.savingsRate.toFixed(1)}%**\n`;
    message += `- **Liquid Bucket Reserves:** **${state.fmt.format(state.liquidCash)}**\n\n`;

    message += `#### ⚙️ The Automated Siphon Formula\n`;
    message += `Don't save "what's left over" at the end of the month. Siphon capital the instant revenue enters your account:\n\n`;
    message += `- **10% Profit Bucket:** Locked in safe reserves immediately.\n`;
    message += `- **15% Tax Bucket:** Held untouchable for quarterly obligations.\n`;
    message += `- **25% Freedom Bucket:** Automated transfer to compounding assets.\n`;
    message += `- **50% Operating Ceiling:** The remaining 50% is your non-negotiable living or business operating cap.\n\n`;

    if (state.unallocatedCash > 0) {
      message += `> 💡 **Quick Win:** You currently have **${state.fmt.format(state.unallocatedCash)}** in unassigned cash. Immediately sweep this into your savings or emergency bucket to boost your safety buffer by **${(state.totalExpenses > 0 ? (state.unallocatedCash / state.totalExpenses).toFixed(1) : 0)} months**!\n\n`;
    }

    const options = [
      { label: "Audit Allocations", path: "buckets.audit" },
      { label: "Cut Burn Rate", path: "expenses.audit" },
      { label: "Check Affordability", path: "affordability.check" },
      { label: "Back to Analysis", path: "analysis.full" }
    ];
    return { message, options };
  },

  "networth.breakdown": (state, depth) => {
    let message = `### Balance Sheet & Net Worth Breakdown\n\n`;
    message += `#### 🏛️ Asset & Liability Summary\n`;
    message += `- **Total Assets Value:** **${state.fmt.format(state.totalAssetsValue)}** (${state.assetCount} asset item(s))\n`;
    message += `- **Total Liabilities (Debt):** **${state.fmt.format(state.totalDebt)}** (${state.liabilityCount} liability item(s))\n`;
    message += `- **True Net Worth:** **${state.fmt.format(state.netWorth)}**\n`;
    message += `- **Liquid Reserves:** **${state.fmt.format(state.liquidCash)}**\n\n`;

    message += `#### 📐 Solvency & Health Ratios\n`;
    const debtToAssets = state.totalAssetsValue > 0 ? ((state.totalDebt / state.totalAssetsValue) * 100).toFixed(1) : '0';
    message += `- **Debt-to-Asset Ratio:** **${debtToAssets}%** (Healthy baseline: Under 30%)\n`;
    message += `- **Annual Debt-to-Income:** **${(state.debtToIncomeRatio * 100).toFixed(1)}%**\n`;
    message += `- **Capital Liquidity:** **${(state.totalAssetsValue > 0 ? ((state.liquidCash / state.totalAssetsValue) * 100).toFixed(1) : 100)}%** of assets are immediately liquid.\n\n`;

    if (state.netWorth < 0) {
      message += `> 🚨 **NEGATIVE NET WORTH ALERT:** Your liabilities exceed your working assets by ${state.fmt.format(Math.abs(state.netWorth))}. Your singular priority must be aggressive debt reduction and avoiding all consumer credit.\n\n`;
    } else if (state.totalDebt === 0) {
      message += `> 🛡️ **DEBT-FREE SOVEREIGNTY:** You have zero recorded liabilities. Every dollar of asset growth directly accrues to your net worth without interest drag.\n\n`;
    }

    const options = [
      { label: "Audit Debt", path: "debt.audit" },
      { label: "Acquire Assets", path: "assets.acquire" },
      { label: "Freedom Roadmap", path: "freedom.plan" },
      { label: "Back to Analysis", path: "analysis.full" }
    ];
    return { message, options };
  },

  "runway.audit": (state, depth) => {
    let message = "### Cash Runway & Survival Buffer Audit\n\n";
    message += `#### ⏱️ Current Capital Velocity\n`;
    message += `- **Liquid Bucket Cash:** **${state.fmt.format(state.liquidCash)}**\n`;
    message += `- **Monthly Operational Burn:** **${state.fmt.format(state.totalExpenses)}**\n`;
    
    if (state.totalExpenses === 0) {
      message += `- **Survival Runway:** **Undetermined** (Zero monthly expenses recorded).\n\n`;
      message += `#### What This Means\nWithout recorded monthly expense streams, your true burn rate cannot be calibrated. Log your routine bills to unlock exact runway modeling.\n\n`;
    } else {
      const months = state.runwayMonths;
      const statusLabel = months < 1 ? "CRITICAL EMERGENCY" : months < 3 ? "HIGH VULNERABILITY" : months < 6 ? "MODERATE SAFETY" : "FORTIFIED WAR CHEST";
      message += `- **Calculated Survival Runway:** **${months.toFixed(1)} Months** (${statusLabel})\n\n`;
      
      message += `#### Critical Diagnosis\n`;
      if (months < 1) {
        message += `> 🚨 **IMMEDIATE ACTION REQUIRED:** You have less than 30 days of operating liquidity. Any interruption in revenue will trigger default or forced liquidation of personal assets.\n\n`;
      } else if (months < 3) {
        message += `> ⚠️ **CAUTION:** A runway under 90 days forces desperate decision making. Price discounting and panic selling often occur in this zone.\n\n`;
      } else if (months >= 6) {
        message += `> 🛡️ **FORTIFIED:** You possess more than 6 months of absolute operational runway. This grants you asymmetrical negotiating leverage and room to take calculated asymmetric risks.\n\n`;
      }

      message += `#### 3 Rules of Runway Expansion\n`;
      message += `1. **Shorten Cash Conversion Cycle:** Collect client invoices in 7 days or require upfront deposits rather than net-30 terms.\n`;
      message += `2. **Isolate 3-Month Emergency Bucket:** Lock 3 months of survival burn in an untouched reserve bucket before allocating to growth or distributions.\n`;
      message += `3. **Eliminate Zombie Recurring Drag:** Audit all subscription lines and kill any software or recurring expense unused in the last 14 days.\n\n`;
    }

    const options = [
      { label: "Audit Allocations", path: "buckets.audit" },
      { label: "Cut Burn Rate", path: "expenses.reduce" },
      { label: "Back to Analysis", path: "analysis.full" }
    ];
    return { message, options };
  },

  "buckets.audit": (state, depth) => {
    let message = "### Profit-First Allocation Buckets Audit\n\n";
    message += `#### 📊 Bucket Architecture & Reserve Health\n`;
    message += `- **Total Liquid Allocated:** **${state.fmt.format(state.liquidCash)}** across ${state.activeAllocations.length} buckets.\n`;
    
    if (state.unallocatedCash > 0) {
      message += `- **⚠️ Unallocated Leak:** **${state.fmt.format(state.unallocatedCash)}** is sitting unassigned! Every single dollar must have a targeted purpose.\n`;
    }
    
    if (state.deficitBuckets.length > 0) {
      message += `- **🚨 Deficit Alert:** ${state.deficitBuckets.length} bucket(s) are in overdraft (${state.deficitBuckets.map((b: any) => `${b.name}: ${state.fmt.format(b.balance)}`).join(', ')}). This cannibalizes your other reserves!\n\n`;
    } else {
      message += `- **Reserve Integrity:** No overdrafted buckets detected. Discipline is holding.\n\n`;
    }

    message += `#### The Profit-First Sequencing Rule\n`;
    message += `Traditional accounting formula is flawed: \`Revenue - Expenses = Profit\` (Profit is an afterthought).\n\n`;
    message += `**The B-Quadrant Formula:**\n`;
    message += `\`Revenue - Profit Reserve (10%) - Tax Reserve (15-20%) = Available Operating Expenses\`\n\n`;
    message += `You force expenses to fit inside whatever remains, rather than letting expenses dictate whether you take home profit.\n\n`;

    const options = [
      { label: "Audit Runway", path: "runway.audit" },
      { label: "Fix Cashflow", path: "cashflow.fix" },
      { label: "Back to Analysis", path: "analysis.full" }
    ];
    return { message, options };
  },

  "business.distributions": (state, depth) => {
    let message = `### Safe Owner Distribution & Dividend Analysis for ${state.profileName}\n\n`;
    const safeAmount = state.safeOwnerDistribution;
    
    message += `#### 💼 Executive Capital Allocation\n`;
    message += `- **Current Enterprise Revenue:** **${state.fmt.format(state.totalIncome)}**\n`;
    message += `- **Operating Expenses:** **${state.fmt.format(state.totalExpenses)}**\n`;
    message += `- **Operating Surplus:** **${state.fmt.format(state.cashflow)}**\n`;
    message += `- **Total Liquid Reserves:** **${state.fmt.format(state.liquidCash)}**\n\n`;

    message += `#### 🛡️ Safe Maximum Owner Draw Calculation\n`;
    message += `We mandate a non-negotiable **2-Month Operating Buffer** (${state.fmt.format(state.totalExpenses * 2)}) before equity distributions are permitted.\n\n`;
    
    if (safeAmount > 0) {
      message += `> ✅ **SAFE TO DISTRIBUTE:** You can safely withdraw up to **${state.fmt.format(safeAmount)}** this period without compromising business payroll, inventory, or emergency solvency.\n\n`;
      message += `**Recommended Deployment of Distribution:**\n`;
      message += `1. Transfer from Business to Personal profile via **Transfers**.\n`;
      message += `2. Immediately deploy 50% into personal I-Quadrant cash-flowing assets.\n`;
      message += `3. Keep 50% in personal liquid safety reserves.\n\n`;
    } else {
      message += `> 🛑 **DISTRIBUTION LOCK RECOMMENDED:** Current liquid reserves (${state.fmt.format(state.liquidCash)}) are below your 2-month operating floor (${state.fmt.format(state.totalExpenses * 2)}). Distributing profits today would jeopardize business solvency.\n\n`;
      message += `**Corrective Protocol:** Retain 100% of profits in business reserves until liquid cash reaches at least ${state.fmt.format(state.totalExpenses * 2)}.\n\n`;
    }

    const options = [
      { label: "Scale Systems", path: "systems.scale" },
      { label: "Audit Runway", path: "runway.audit" },
      { label: "Back to Analysis", path: "analysis.full" }
    ];
    return { message, options };
  },

  "quadrant.migration": (state, depth) => {
    let message = `### Cashflow Quadrant Migration Plan: E/S to B/I\n\n`;
    message += `#### 🧭 The Four Quadrants Defined\n`;
    message += `- **E (Employee):** You trade hours directly for a paycheck. Highest taxes, zero leverage.\n`;
    message += `- **S (Self-Employed / Specialist):** You own a job. If you step away, income drops to zero.\n`;
    message += `- **B (Business Owner):** You own a system with SOPs and a team. Cash generates whether you work or sleep.\n`;
    message += `- **I (Investor):** Your capital works for you. True passive compounding.\n\n`;

    message += `#### 📈 Your Current Quadrant Footprint\n`;
    message += `- **Passive Cashflow:** **${state.fmt.format(state.recurringIncome)}** / month\n`;
    message += `- **Freedom Ratio:** **${state.freedomProgress.toFixed(1)}%**\n\n`;

    message += `#### The 3-Step Migration Strategy\n`;
    message += `1. **S to B Shift:** Document every task you execute into a Standard Operating Procedure (SOP). Delegate or automate lowest-value operational tasks first.\n`;
    message += `2. **Profit Siphoning:** Never leave unallocated profits idle in checking. Move business dividends directly into I-quadrant assets.\n`;
    message += `3. **Freedom Cross-Over:** Maintain active labor discipline until your I-quadrant passive dividends equal 120% of your living burn rate.\n\n`;

    const options = [
      { label: "Acquire Assets", path: "assets.acquire" },
      { label: "Plan Freedom", path: "freedom.plan" },
      { label: "Back to Analysis", path: "analysis.full" }
    ];
    return { message, options };
  }
};

// --- PREDICTIVE QUESTION GENERATOR (Dynamic, Ledger-Grounded & Rotating) ---
const generatePredictedQuestions = (
  state: any, 
  currentPath: string = '', 
  advisorState?: AdvisorState
): { label: string; query: string }[] => {
  const pool: { label: string; query: string; weight: number }[] = [];
  const { 
    fmt, 
    liquidCash, 
    totalExpenses, 
    cashflow, 
    runwayMonths, 
    burnDaysRemaining, 
    dailyBurn, 
    unallocatedCash, 
    deficitBuckets, 
    topExpenses, 
    totalDebt, 
    totalAssetsValue, 
    netWorth,
    freedomProgress, 
    freedomTarget,
    savingsRate,
    isBusiness,
    systemScore
  } = state;

  // 1. Path-Specific Deep Inquiries
  if (currentPath.includes('runway') || currentPath.includes('burn')) {
    pool.push({
      label: `🛡️ Expand ${runwayMonths.toFixed(1)} mo runway to 6 months`,
      query: "How do I calculate and fund my exact 6-month emergency cash runway?",
      weight: 10
    });
    pool.push({
      label: "✂️ Freeze non-essential expenses during crunch",
      query: "Which non-essential expenses should I freeze first to preserve runway?",
      weight: 9
    });
    pool.push({
      label: `⏱️ Survival days: How to stretch ${burnDaysRemaining} days?`,
      query: "How can I extend my liquid burn days without taking on new debt?",
      weight: 8
    });
  } else if (currentPath.includes('bucket') || currentPath.includes('allocation')) {
    pool.push({
      label: "📊 Ideal percentage split for Operating, Tax & Profit",
      query: "What is the recommended percentage split for Operating, Tax, and Profit buckets?",
      weight: 10
    });
    if (deficitBuckets && deficitBuckets.length > 0) {
      pool.push({
        label: `⚖️ Fix ${deficitBuckets.length} overdrawn bucket(s)`,
        query: "How do I rebalance buckets with negative balances without hurting operations?",
        weight: 10
      });
    }
    if (unallocatedCash > 0) {
      pool.push({
        label: `💰 Sweep ${fmt.format(unallocatedCash)} unallocated cash`,
        query: "Where should my unallocated cash be transferred right now?",
        weight: 9
      });
    }
  } else if (currentPath.includes('afford')) {
    pool.push({
      label: `🛒 How much can I safely spend on a major purchase?`,
      query: "Can I afford to make a major purchase right now based on my reserves?",
      weight: 10
    });
    pool.push({
      label: "🏠 Buy cash vs finance with debt",
      query: "Is it better to pay cash from reserves or finance an asset with debt?",
      weight: 9
    });
  } else if (currentPath.includes('focus')) {
    pool.push({
      label: "🎯 What should be my single top goal this month?",
      query: "What is my highest leverage single financial priority for this month?",
      weight: 10
    });
    pool.push({
      label: "📈 30-day sprint to improve my cashflow margin",
      query: "Give me a 30-day actionable sprint to increase my net cashflow.",
      weight: 9
    });
  } else if (currentPath.includes('expense') || currentPath.includes('leak')) {
    if (topExpenses && topExpenses.length > 0) {
      pool.push({
        label: `💸 Audit top expense "${topExpenses[0].name}" (${fmt.format(topExpenses[0].amount)})`,
        query: `How can I renegotiate or optimize my largest expense (${topExpenses[0].name})?`,
        weight: 10
      });
    }
    pool.push({
      label: `🔍 Detect hidden subscription leaks and zombie fees`,
      query: "How do I run a forensic subscription audit to reclaim lost capital?",
      weight: 8
    });
  } else if (currentPath.includes('debt')) {
    pool.push({
      label: "⚡ Compare Debt Snowball vs Debt Avalanche math",
      query: "Show me the exact mathematical difference between Debt Snowball and Debt Avalanche.",
      weight: 10
    });
    pool.push({
      label: `⚖️ Invest surplus vs aggressively pay off ${fmt.format(totalDebt)} debt`,
      query: "Should I invest my monthly cashflow surplus or pay down my liabilities first?",
      weight: 9
    });
  }

  // 2. Data-Grounded Live Ledger Alerts
  if (topExpenses && topExpenses.length > 0) {
    pool.push({
      label: `📉 Reduce ${topExpenses.length} expense lines (${fmt.format(totalExpenses)}/mo)`,
      query: "What is the fastest way to trim my monthly expenses by 15%?",
      weight: 7
    });
  }

  if (cashflow < 0) {
    pool.push({
      label: `🛑 Eliminate my -${fmt.format(Math.abs(cashflow))} monthly deficit`,
      query: "How can I eliminate my negative cashflow deficit immediately?",
      weight: 10
    });
  } else if (cashflow > 0) {
    pool.push({
      label: `🌱 Deploy ${fmt.format(cashflow)} monthly surplus into assets`,
      query: "How should I deploy my monthly cashflow surplus into assets?",
      weight: 8
    });
  }

  if (liquidCash > 0) {
    pool.push({
      label: `🏦 Audit my ${fmt.format(liquidCash)} liquid bucket reserves`,
      query: "Audit my profit and tax allocation buckets",
      weight: 7
    });
  }

  if (totalDebt > 0) {
    pool.push({
      label: `⚖️ Payoff roadmap for ${fmt.format(totalDebt)} liabilities`,
      query: "Audit debt and liabilities and show payoff order",
      weight: 8
    });
  }

  if (unallocatedCash > 0) {
    pool.push({
      label: `📥 Assign ${fmt.format(unallocatedCash)} idle pocket cash`,
      query: "How should I allocate my unassigned pocket cash for maximum yield?",
      weight: 8
    });
  }

  // 3. Profile Strategic Questions
  if (isBusiness) {
    pool.push({
      label: "💼 Calculate my maximum safe owner distribution",
      query: "What is my maximum safe owner distribution dividend this month?",
      weight: 8
    });
    pool.push({
      label: `⚙️ Elevate BI Triangle Systems from ${systemScore}/10`,
      query: "How do I fix systems and team bottlenecks in my business?",
      weight: 7
    });
    pool.push({
      label: "🚀 3 strategies to increase enterprise profit margins",
      query: "How can I increase my gross and net business profit margins?",
      weight: 6
    });
  } else {
    pool.push({
      label: `🎯 Freedom math: Target ${fmt.format(freedomTarget || totalExpenses)} (${freedomProgress.toFixed(0)}%)`,
      query: "What is the exact math to reach 100% financial freedom faster?",
      weight: 8
    });
    pool.push({
      label: "🔄 Shift active salary to B and I cashflow",
      query: "How do I migrate my active labor into passive business and investor assets?",
      weight: 7
    });
    pool.push({
      label: `📈 Savings benchmark: current ${savingsRate.toFixed(0)}% vs 25% target`,
      query: "How can I increase my monthly savings and investment rate to 25%?",
      weight: 6
    });
  }

  // General Wealth Inquiries for Diversity
  pool.push({
    label: `🏛️ Net Worth check: Assets ${fmt.format(totalAssetsValue)} vs Debt ${fmt.format(totalDebt)}`,
    query: "Audit my balance sheet and net worth health ratio",
    weight: 5
  });
  pool.push({
    label: "🛡️ The 4% Safe Withdrawal Rule explained",
    query: "Explain the 4% safe withdrawal rule and how it applies to my freedom number.",
    weight: 5
  });
  pool.push({
    label: "💰 Rich Dad Cashflow Quadrant Explained",
    query: "Explain the four cashflow quadrants and how to transition safely.",
    weight: 5
  });

  // Deduplicate pool queries
  const uniquePoolMap = new Map<string, { label: string; query: string; weight: number }>();
  for (const item of pool) {
    if (!uniquePoolMap.has(item.query)) {
      uniquePoolMap.set(item.query, item);
    }
  }
  const uniquePool = Array.from(uniquePoolMap.values());

  // Non-repetition filtering via advisorState.recentQuestions
  const recent = new Set<string>(advisorState?.recentQuestions || []);
  const turn = advisorState?.turnCount || 0;

  // Filter out recent questions if possible
  let candidates = uniquePool.filter(q => !recent.has(q.query));
  if (candidates.length < 4) {
    // If running low, allow cycling back from the pool
    candidates = uniquePool;
  }

  // Sort candidates by weight descending, with turn offset for variation
  candidates.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return 0;
  });

  // Rotate starting offset using turn count to ensure fresh variety every interaction
  const offset = (turn * 2) % Math.max(1, candidates.length);
  const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)];

  const selected = rotated.slice(0, 4).map(item => ({
    label: item.label,
    query: item.query
  }));

  return selected;
};

// --- CORE HANDLER ---
export const handleAdvisorAction = (
  data: AppData,
  metrics: AppMetrics,
  activeProfileId: string,
  advisorState: AdvisorState,
  action: AdvisorAction,
  symbol: string
): AdvisorResponse => {
  
  const computedState = computeFinancialState(data, metrics, activeProfileId, symbol);
  const updatedState: AdvisorState = { 
    ...advisorState,
    turnCount: (advisorState.turnCount || 0) + 1,
    recentQuestions: advisorState.recentQuestions ? [...advisorState.recentQuestions] : []
  };

  let targetPath = updatedState.currentPath;
  let dynamicOptions: { label: string; path: string }[] = [];

  if (action.type === 'text_input') {
    const matchResult = fuzzyMatch(action.value, computedState.isBusiness);
    targetPath = matchResult.bestPath;
    
    // Convert related paths to options if present
    if (matchResult.relatedPaths.length > 0) {
      dynamicOptions = matchResult.relatedPaths.map(p => {
        const parts = p.split('.');
        const labelText = parts.length > 1 ? 
          parts[1].charAt(0).toUpperCase() + parts[1].slice(1) + ' ' + parts[0].charAt(0).toUpperCase() + parts[0].slice(1) :
          p;
        return { label: `Explore ${labelText}`, path: p };
      });
    }

    updatedState.selectedOptions = [...updatedState.selectedOptions, action.value];
  } else if (action.type === 'option_click') {
    targetPath = action.value;
    updatedState.selectedOptions = [...updatedState.selectedOptions, action.value];
  }

  // Update depth logic
  if (targetPath === updatedState.currentPath) {
    updatedState.depthLevel++;
  } else {
    updatedState.previousPaths = [...updatedState.previousPaths, updatedState.currentPath];
    updatedState.currentPath = targetPath;
    updatedState.depthLevel = 1;
  }

  // Check state signature to avoid repetition
  const currentSignature = generateStateSignature(computedState, targetPath);
  if (currentSignature === updatedState.lastStateSignature && updatedState.depthLevel === 1) {
    updatedState.depthLevel++;
  }
  updatedState.lastStateSignature = currentSignature;
  updatedState.lastComputedState = computedState;

  // Execute Path
  const pathExecutor = PATH_ENGINE[targetPath] || PATH_ENGINE["analysis.smart"] || PATH_ENGINE["analysis.full"];
  const result = pathExecutor(computedState, updatedState.depthLevel);

  // Diverse Options Fallback Engine: Never run out of options!
  const complementaryPaths = computedState.isBusiness ? [
    { label: "Check Affordability", path: "affordability.check" },
    { label: "Safe Owner Draw", path: "business.distributions" },
    { label: "Weekly Priorities", path: "focus.weekly" },
    { label: "Top Spending Lines", path: "expenses.audit" },
    { label: "Audit Runway", path: "runway.audit" },
    { label: "Profit Buckets", path: "buckets.audit" },
    { label: "Scale Systems", path: "systems.scale" },
    { label: "Balance Sheet", path: "networth.breakdown" }
  ] : [
    { label: "Check Affordability", path: "affordability.check" },
    { label: "Weekly Priorities", path: "focus.weekly" },
    { label: "Top Spending Lines", path: "expenses.audit" },
    { label: "Audit Runway", path: "runway.audit" },
    { label: "Optimize Savings", path: "savings.optimize" },
    { label: "Freedom Roadmap", path: "freedom.plan" },
    { label: "ESBI Quadrants", path: "quadrant.migration" },
    { label: "Balance Sheet", path: "networth.breakdown" }
  ];

  let rawOptions = [...(result.options || []), ...dynamicOptions];
  // If fewer than 4 options, enrich from complementary paths that aren't currentPath
  if (rawOptions.length < 4) {
    for (const comp of complementaryPaths) {
      if (comp.path !== targetPath && !rawOptions.some(o => o.path === comp.path)) {
        rawOptions.push(comp);
        if (rawOptions.length >= 4) break;
      }
    }
  }

  // Filter allowed paths and deduplicate
  const seenPaths = new Set<string>();
  const finalOptions: { label: string; path: string }[] = [];
  for (const opt of rawOptions) {
    if (!seenPaths.has(opt.path) && isPathAllowed(opt.path, computedState.isBusiness)) {
      seenPaths.add(opt.path);
      finalOptions.push(opt);
      if (finalOptions.length === 4) break;
    }
  }

  // Generate Rotating, Non-Repeating Predicted Questions
  const predictedQuestions = generatePredictedQuestions(computedState, targetPath, updatedState);

  // Update recent questions memory (keep last 12 to ensure rotation)
  const newlyAsked = predictedQuestions.map(p => p.query);
  updatedState.recentQuestions = [
    ...newlyAsked,
    ...(updatedState.recentQuestions || []).filter(q => !newlyAsked.includes(q))
  ].slice(0, 16);

  return {
    message: result.message,
    options: finalOptions,
    predictedQuestions,
    updatedAdvisorState: updatedState
  };
};
