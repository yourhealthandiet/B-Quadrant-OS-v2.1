
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Wallet, 
  Landmark, 
  PieChart, 
  Bot, 
  Settings, 
  Settings2,
  Menu, 
  Moon, 
  Sun,
  TrendingUp,
  ArrowDownRight,
  Briefcase,
  Target,
  BookOpen,
  Bell,
  Check,
  Loader2,
  Users,
  Eye,
  EyeOff,
  FileText,
  Scale,
  HelpCircle,
  ChevronDown,
  Calculator as CalculatorIcon,
  Undo2, Redo2,
  Network,
  Search,
  X,
  Globe
} from 'lucide-react';
import { AppData, DEFAULT_DATA, CURRENCY_SYMBOLS, Entry, Asset, Notification, calculateBusinessValuation, Investment, AllocationCategory, convertCurrency, PendingEntry, TeamMember, DEMO_BUSINESS, UserProfile, calculateStructuralVariables, DistributionMeta, getSystemTimeString, buildEntryTimestamp, formatEntryTime, Goal, RecurringIncomeRecord, AccessLevel, BusinessEntity } from './types';
import * as AIService from './services/aiService';
import { distributeAmountRecursive, computeDistributionBreakdown } from './services/bucketEngine';
import { saveSnapshot } from './services/historyService';
import { OwnershipGraph } from './services/ownershipEngine';
import { TransactionEngine } from './services/transactionEngine';

import DashboardView from './views/Dashboard';
import TransactionsView from './views/Transactions';
import AssetsView from './views/Assets';
import InvestmentsView from './views/Investments';
import GoalsView from './views/Goals';
import QuadrantView from './views/Quadrant';
import AIAdvisorView from './views/AIAdvisor';
import SettingsView from './views/Settings';
import LearningView from './views/Learning';
import NotificationsView from './views/Notifications';
import AnalyticsView from './views/Analytics';
import ClaimView from './views/Claim';
import ImportView from './views/Import';
import { ONBOARDING_CONTENT, ManualModal, FloatingContextTip } from './components/Walkthrough';
import { Calculator } from './components/Calculator';
import { CurrencyModal } from './components/CurrencyModal';
import OwnershipGraphView from './views/OwnershipGraph';
import { LandingSplash } from './views/LandingSplash';
import { ProfileAvatar } from './components/ProfileAvatar';
import { StickyCurrencyDropdown } from './components/StickyCurrencyDropdown';
import WorkspaceSearch from './components/WorkspaceSearch';

class RouteErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl m-4 border border-red-200">
          <h2 className="text-xl font-bold mb-2">Wait! Something crashed 💥</h2>
          <pre className="text-xs text-left overflow-auto p-4 bg-white rounded border border-red-100 shadow-inner max-h-[300px]">{this.state.error?.stack || String(this.state.error)}</pre>
          <button onClick={() => this.setState({hasError: false})} className="mt-4 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-all active:scale-95">Retry Rendering</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Context Definition
export const AppContext = React.createContext<{
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  activeProfileId: string;
  setActiveProfileId: (id: string) => void;
  timeFilter: 'all' | 'year' | 'month' | '24h' | '7d' | '1w' | '1m' | '1y';
  setTimeFilter: (t: 'all' | 'year' | 'month' | '24h' | '7d' | '1w' | '1m' | '1y') => void;
  addEntry: (entry: Omit<Entry, 'id' | 'timestamp'> & { timestamp?: string; time?: string }) => void;
  addTransfer: (amount: number, fromEntityId: string, toEntityId: string, description: string, date: string, category: string, toCategory?: string, isLoan?: boolean, loanDetails?: Partial<Asset>, time?: string) => void;
  distributeBusinessProfit: (businessId: string, amount: number, description: string, date: string, category: string, meta?: DistributionMeta, existingDistId?: string, time?: string) => void;
  addPendingEntry: (entry: Omit<PendingEntry, 'id' | 'status' | 'submittedAt' | 'timestamp'> & { timestamp?: string; time?: string }) => void;
  approveEntry: (pendingId: string) => void;
  rejectEntry: (pendingId: string) => void;
  updateEntry: (entry: Entry) => void;
  deleteEntry: (id: string) => void; 
  addAsset: (asset: Omit<Asset, 'id' | 'timestamp'>, funding?: { method: 'bucket' | 'liability', sourceId?: string, liabilityDetails?: any }) => void;
  updateAsset: (asset: Asset) => void;
  deleteAsset: (id: string) => void; 
  repayLiability: (liabilityId: string, amount: number, sourceBucketId: string) => void;
  distributeFunds: () => void;
  undoDistribution: () => void;
  redoDistribution: () => void;
  canUndoDistribution: boolean;
  canRedoDistribution: boolean;
  undoCount: number;
  redoCount: number;
  addGoal: (goal: Omit<Goal, 'id' | 'profileId'>) => void;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (id: string) => void;
  completeGoal: (goalId: string) => void;
  uncompleteGoal: (goalId: string) => void;
  deleteNotification: (id: string) => void;
  switchCurrency: (profileId: string, newCurrency: string, profileOverrides?: Partial<UserProfile>) => void;
  navigate: (view: string) => void;
  currentView: string;
  requestedTab: string | null;
  setCurrentView: React.Dispatch<React.SetStateAction<string>>;
  setRequestedTab: React.Dispatch<React.SetStateAction<string | null>>;
  filteredData: AppData & { pendingEntries: PendingEntry[] };
  profileData: AppData & { pendingEntries: PendingEntry[] };
  metrics: {
    netWorth: number;
    passiveIncome: number;
    activeIncome: number;
    financialFreedomRate: number;
    estimatedMonthlyExpenses: number;
    businessIncomePerHour: Record<string, number>;
    cashflow: number;
    netProfit: number;
    quadrantSplit: { E: number; S: number; B: number; I: number };
    totalIncome: number;
    totalExpenses: number;
    calculatedWeeklyHours: number;
    trueProfit: number;
    trueIncome: number;
    trueExpenses: number;
    recurringPassive: number;
    internalInflows: number;
    internalOutflows: number;
  };
  activeCurrencyCode: string;
  symbol: string;
  fullCurrencyName: string;
  formatAmount: (amount: number) => string; 
  notifications: Notification[];
  simulatedUser: TeamMember | null;
  setSimulatedUser: (user: TeamMember | null) => void;
  effectiveRole: string;
  isTourOpen: boolean;
  setTourOpen: (val: boolean) => void;
  openCalculator: (callback: (val: number) => void, initialVal?: number, label?: string) => void;
  openCurrencyConverter: (callback: (val: number, fromCurrency?: string, rate?: number) => void, initialVal?: number, targetCurrency?: string, label?: string) => void;
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  engine: OwnershipGraph;
  transactionEngine: TransactionEngine;
  modifyAllocations: (currentAllocations: AllocationCategory[], entry: Entry, isUndo?: boolean) => AllocationCategory[];
  updateOwnershipEdges: (businessId: string, members: { id: string, name: string, percentage: number, type: 'PERSON' | 'BUSINESS' }[]) => void;
  updateDistributionSequence: (sequenceId: string, updates: Partial<DistributionMeta>) => void;
  deleteRecurringIncomeSequence?: (sequenceId: string) => void;
  updateRecurringIncomeSequence?: (sequenceId: string, updates: Partial<RecurringIncomeRecord>) => void;
  reLogRecurringIncome: (sequenceId: string) => void;
  syncStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  peerCount: number;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  pushSyncData: (overrideData?: AppData) => boolean;
  pullSyncData: () => boolean;
  connectSyncKey: (key: string) => void;
  redeemBusinessRoleKey: (keyOrPayload: string | any) => { success: boolean; message: string };
} | null>(null);

// --- VISUAL HELPER COMPONENT ---
export const MoneyDisplay = ({ amount, symbol, className = '' }: { amount: number, symbol: string, className?: string }) => {
    const context = React.useContext(AppContext);
    const isPrivacyMode = context?.isPrivacyMode ?? false;

    if (isPrivacyMode) {
        return <span className={`font-mono tracking-widest opacity-60 ${className}`}>****</span>;
    }

    const safeAmount = Number(amount) || 0;
    
    // Standard Accounting exact representation (e.g., 1,000,000,005,400.54)
    const formattedExact = safeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const [wholeExact, decimalExact] = formattedExact.split('.');

    return (
        <span className={`break-words max-w-full ${className}`} style={{ overflowWrap: 'anywhere' }} title={formattedExact}>
            <span className="font-bold tracking-tight">{symbol}{wholeExact}</span>
            {decimalExact && <span className="opacity-60 font-semibold text-[0.75em]">.{decimalExact}</span>}
        </span>
    );
};

const NavItem = ({ view, icon: Icon, label, disabled = false, tourId, currentView, setCurrentView, setSidebarOpen, filteredData }: any) => (
  <button
    disabled={disabled}
    aria-current={currentView === view ? 'page' : undefined}
    data-tour={tourId}
    onClick={() => { if(!disabled) { setCurrentView(view); setSidebarOpen(false); }}}
    className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 ${
      currentView === view 
        ? 'bg-primary text-white shadow-lg shadow-primary/30' 
        : disabled ? 'opacity-40 cursor-not-allowed' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
    {view === 'notifications' && filteredData.notifications.filter((n: any) => !n.read).length > 0 && (
        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {filteredData.notifications.filter((n: any) => !n.read).length}
        </span>
    )}
  </button>
);

function App() {
  const [hasEnteredApp, setHasEnteredApp] = useState(() => sessionStorage.getItem('bquad_entered') === 'true');

  // Load initial data
  const [data, setRawData] = useState<AppData>(() => {
    const saved = localStorage.getItem('gapFinancialData');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (!parsed.chatSessions) parsed.chatSessions = [];
            // Migration for old data structures
            if (parsed.businesses) {
                parsed.businesses = parsed.businesses.map((b: any) => ({
                    ...b,
                    ownershipStake: b.ownershipStake !== undefined ? b.ownershipStake : 100,
                    revenueTarget: b.revenueTarget || 0,
                    profitTarget: b.profitTarget || 0,
                    monthlyRevenueTarget: b.monthlyRevenueTarget || 0,
                    monthlyProfitTarget: b.monthlyProfitTarget || 0,
                    teamMembers: b.teamMembers || [],
                    pendingEntries: b.pendingEntries || []
                }));
            }
            if (!parsed.customCategories) parsed.customCategories = [];
            return parsed;
        } catch(e) {
            console.error("Failed to parse local data", e);
            return DEFAULT_DATA;
        }
    }
    return DEFAULT_DATA;
  });

  const [undoStack, setUndoStack] = useState<AppData[]>([]);
  const [redoStack, setRedoStack] = useState<AppData[]>([]);

  const setData = useCallback((action: React.SetStateAction<AppData>, skipHistory = false) => {
      setRawData((prev) => {
          let nextState: AppData;
          if (typeof action === 'function') {
              nextState = (action as (prevState: AppData) => AppData)(prev);
          } else {
              nextState = action;
          }
          if (!skipHistory) {
              setUndoStack(us => {
                  const newStack = [...us, prev];
                  return newStack.length > 50 ? newStack.slice(newStack.length - 50) : newStack;
              });
              setRedoStack([]);
          }
          return nextState;
      });
  }, []);

  // --- STATE PERSISTENCE INITIALIZATION ---
  const [currentView, setCurrentView] = useState(() => {
      const path = window.location.pathname;
      if (path.startsWith("/claim/")) return 'claim';
      if (path.startsWith("/import/")) return 'import';

      const saved = localStorage.getItem('gap_ui_view');
      if (saved === 'claim' || saved === 'import') return 'dashboard';

      if (saved === 'income' || saved === 'expenses' || saved === 'revenue') return 'income_statement';
      if (saved === 'assets' || saved === 'portfolio' || saved === 'securities') return 'balance_sheet';
      return saved || 'dashboard';
  });
  
  const [requestedTab, setRequestedTab] = useState<string | null>(null);
  const [previousViewId, setPreviousViewId] = useState('dashboard');

  const handleSetCurrentView = (view: string) => {
      if (currentView !== 'settings' && view === 'settings') {
          setPreviousViewId(currentView);
      }
      setCurrentView(view);
  };

  const toggleSettings = () => {
      if (currentView === 'settings') {
          setCurrentView(previousViewId);
      } else {
          setPreviousViewId(currentView);
          setCurrentView('settings');
      }
  };
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
      const savedTheme = localStorage.getItem('gap_ui_theme');
      return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
      return localStorage.getItem('gap_ui_profile') || 'personal';
  });

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isMobileToolsOpen, setMobileToolsOpen] = useState(false);
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setSearchOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);
  const [isProfileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | 'year' | 'month' | '24h' | '7d' | '1w' | '1m' | '1y'>('month');
  const [isTourOpen, setTourOpen] = useState(false);
  const [seenTips, setSeenTips] = useState<string[]>(() => {
     try { return JSON.parse(localStorage.getItem('bquadrant_seen_tips') || '[]'); } catch { return []; }
  });
  const [activeContextTip, setActiveContextTip] = useState<string | null>(null);

  // Synchronize tour preferences when toggled from Settings
  useEffect(() => {
     const syncTourPrefs = (e: Event) => {
         const custom = e as CustomEvent;
         if (custom.detail?.resetSeen) {
             setSeenTips([]);
         } else {
             try {
                 setSeenTips(JSON.parse(localStorage.getItem('bquadrant_seen_tips') || '[]'));
             } catch {}
         }
     };
     window.addEventListener('tour-preferences-changed', syncTourPrefs);
     return () => window.removeEventListener('tour-preferences-changed', syncTourPrefs);
  }, []);

  // Global actions for contextual tooltips
  const handleSkipAllTips = () => {
      // Pause tips, but preserve seenTips so the user's progress is remembered
      localStorage.setItem('bquadrant_disable_tips', 'true');
      setActiveContextTip(null);
      window.dispatchEvent(new CustomEvent('tour-preferences-changed', { detail: { disabled: true } }));
  };

  const handleResetTourTips = () => {
      setSeenTips([]);
      localStorage.removeItem('bquadrant_seen_tips');
      localStorage.removeItem('bquadrant_disable_tips');
      setActiveContextTip('welcome');
      window.dispatchEvent(new CustomEvent('tour-preferences-changed', { detail: { disabled: false, resetSeen: true } }));
  };

  useEffect(() => {
     const clickHandler = (e: MouseEvent) => {
         const target = e.target as HTMLElement;
         const helpEl = target.closest('[data-tour-help]');
         const tourEl = target.closest('[data-tour]');
         
         const tourId = helpEl ? helpEl.getAttribute('data-tour-help') : (tourEl ? tourEl.getAttribute('data-tour') : null);
         if (!tourId) return;

         const isTipsDisabled = localStorage.getItem('bquadrant_disable_tips') === 'true';

         // If the user clicked the explicit help button, ALWAYS show it!
         // If tips are enabled in settings:
         //   Show it immediately so the user can learn or re-read that concerned part!
         if (helpEl || !isTipsDisabled) {
             setActiveContextTip(tourId);
             setSeenTips(prev => {
                 if (prev.includes(tourId)) return prev;
                 const newSeen = [...prev, tourId];
                 localStorage.setItem('bquadrant_seen_tips', JSON.stringify(newSeen));
                 return newSeen;
             });
         }
     };

     const customTrigger = (e: Event) => {
         const isTipsDisabled = localStorage.getItem('bquadrant_disable_tips') === 'true';
         if (isTipsDisabled) return;
         const customEvent = e as CustomEvent;
         const tourId = customEvent.detail;
         if (tourId) {
             // Show only the concerned tip, never cascade into unrelated sections
             setActiveContextTip(tourId);
             setSeenTips(prev => {
                 if (prev.includes(tourId)) return prev;
                 const newSeen = [...prev, tourId];
                 localStorage.setItem('bquadrant_seen_tips', JSON.stringify(newSeen));
                 return newSeen;
             });
         }
     };

     document.addEventListener('click', clickHandler, true);
     window.addEventListener('trigger-tour', customTrigger);
     
     return () => {
         document.removeEventListener('click', clickHandler, true);
         window.removeEventListener('trigger-tour', customTrigger);
     };
  }, [seenTips]);
  
  // New State for "View As" feature
  const [simulatedUser, setSimulatedUser] = useState<TeamMember | null>(null);
  
  const [claimTokenUrl, setClaimTokenUrl] = useState<string | null>(() => {
      const path = window.location.pathname;
      return path.startsWith("/claim/") ? path.replace("/claim/", "") : null;
  });
  
  const [importTokenUrl, setImportTokenUrl] = useState<string | null>(() => {
      const path = window.location.pathname;
      return path.startsWith("/import/") ? path.replace("/import/", "") : null;
  });

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
     const path = window.location.pathname;
     if (path.startsWith("/claim/") || path.startsWith("/import/")) {
         window.history.replaceState({}, '', '/');
     }
  }, []);

  // Sync claim statuses from localStorage
  useEffect(() => {
      let changed = false;
      const updatedRecords = data.distributionRecords?.map((r: any) => {
          if (r.status === 'pending_claim' && localStorage.getItem(`claimed_${r.id}`) === 'true') {
              changed = true;
              return { ...r, status: 'claimed' };
          }
          return r;
      });
      if (changed && updatedRecords) {
          setRawData(prev => ({ ...prev, distributionRecords: updatedRecords }));
      }
  }, [data.distributionRecords]);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const togglePrivacyMode = () => setIsPrivacyMode(!isPrivacyMode);

  const activeCurrencyCode = activeProfileId === 'personal' 
    ? (data.profile.currency || 'USD') 
    : (data.businesses.find(b => b.id === activeProfileId)?.currency || 'USD');
  const symbol = CURRENCY_SYMBOLS[activeCurrencyCode] || '$';
  const fullCurrencyName = `${activeCurrencyCode} (${symbol})`;

  const formatAmount = (amount: number) => {
      if (isPrivacyMode) return '****';
      return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const updateDistributionSequence = (sequenceId: string, updates: Partial<DistributionMeta>) => {
      setRawData((prev: AppData) => {
          if (!prev.distributionRecords) return prev;
          
          // DO NOT modify historical `amount` in past entries. 
          // Only update the `meta` so future executions inherit the new settings.
          const updatedRecords = prev.distributionRecords.map(r => {
              if (r.meta?.sequenceId === sequenceId) {
                  return {
                      ...r,
                      meta: {
                          ...r.meta,
                          ...updates
                      }
                  };
              }
              return r;
          });
          
          // Optionally, if we DO want to update descriptions or categories for past entries, we can.
          // But do NOT modify `amount` or `baseAmount`.
          let updatedEntries = prev.entries;
          if (updates.sourceBucket !== undefined || updates.targetDescription !== undefined) {
              updatedEntries = prev.entries.map(e => {
                  if (e.type === 'expense' && e.subtype === 'DISTRIBUTION') {
                      const isLinked = prev.distributionRecords!.some(r => r.distributionId === e.transfer_id && r.meta?.sequenceId === sequenceId);
                      if (isLinked) {
                          const newCat = updates.sourceBucket !== undefined ? updates.sourceBucket as string : e.category;
                          const newDesc = updates.targetDescription !== undefined ? updates.targetDescription + ' (Distribution Outbound)' : e.description;
                          return { ...e, category: newCat, description: newDesc };
                      }
                  }
                  return e;
              });
          }

          return { ...prev, distributionRecords: updatedRecords, entries: updatedEntries };
      });
  };

  const deleteRecurringIncomeSequence = (sequenceId: string) => {
      setData((prev: AppData) => {
          if (!prev.recurringIncomeRecords) return prev;
          return {
              ...prev,
              recurringIncomeRecords: prev.recurringIncomeRecords.filter(r => r.id !== sequenceId)
          };
      });
  };

  const updateRecurringIncomeSequence = (sequenceId: string, updates: Partial<RecurringIncomeRecord>) => {
      setData((prev: AppData) => {
          if (!prev.recurringIncomeRecords) return prev;
          return {
              ...prev,
              recurringIncomeRecords: prev.recurringIncomeRecords.map((r: RecurringIncomeRecord) => {
                  if (r.id === sequenceId) {
                      return { ...r, ...updates };
                  }
                  return r;
              })
          };
      });
  };

  const reLogRecurringIncome = (sequenceId: string) => {
      setData((prev: AppData) => {
          if (!prev.recurringIncomeRecords) return prev;
          const rec = prev.recurringIncomeRecords.find(r => r.id === sequenceId);
          if (!rec) return prev;
          
          if (!rec.isActive) return prev;

          const existing = prev.entries.filter(e => e.transfer_id === rec.id && e.type === 'income');
          const latestDateStr = existing.length > 0 ? existing.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : rec.startDate;
          
          const nextDate = new Date(latestDateStr);
          if (rec.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
          else if (rec.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
          else if (rec.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          else if (rec.frequency === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
          else if (rec.frequency === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
          else if (rec.frequency === 'semiannual') nextDate.setMonth(nextDate.getMonth() + 6);
          else if (rec.frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
          
          const targetDateStr = nextDate.toISOString().split('T')[0];
          const todayStr = new Date().toISOString().split('T')[0];
          const logDateStr = targetDateStr > todayStr ? todayStr : targetDateStr;
          
          const newEntry: Entry = {
              id: Date.now().toString() + "_" + Math.random().toString(36).substr(2, 9),
              profileId: rec.profileId,
              date: logDateStr,
              time: getSystemTimeString(),
              timestamp: new Date().toISOString(),
              description: `Recurring: ${rec.name}`,
              amount: rec.amount,
              type: 'income',
              category: rec.category,
              frequency: rec.frequency,
              transfer_id: rec.id,
              isDirectAllocation: true,
              submittedBy: 'System'
          };
          
          const updatedAllocations = modifyAllocations(prev.allocations.filter(a => a.profileId === rec.profileId), newEntry, 'add');
          const otherAllocations = prev.allocations.filter(a => a.profileId !== rec.profileId);
          
          return {
              ...prev,
              entries: [...prev.entries, newEntry],
              allocations: [...otherAllocations, ...updatedAllocations]
          };
      });
  };

  // Calculator Global State
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorCallback, setCalculatorCallback] = useState<((val: number) => void) | null>(null);
  const [calculatorInitialValue, setCalculatorInitialValue] = useState(0);
  const [calculatorLabel, setCalculatorLabel] = useState("Apply Value");
  
  // Floating Calculator Visibility
  const [showFloatingCalculator, setShowFloatingCalculator] = useState(false);

  useEffect(() => {
      let scrollTimeout: any;
      const handleScroll = (e: Event) => {
          // If the calculator is open, don't hide the button immediately, or maybe we don't care.
          setShowFloatingCalculator(true);
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
              setShowFloatingCalculator(false);
          }, 2500); // Hide after 2.5s of no scroll
      };

      window.addEventListener('scroll', handleScroll, true); // true for capture phase to catch internal scrolls
      return () => {
          window.removeEventListener('scroll', handleScroll, true);
          clearTimeout(scrollTimeout);
      };
  }, []);

  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [currencyModalCallback, setCurrencyModalCallback] = useState<((val: number, fromCurrency?: string, rate?: number) => void) | null>(null);
  const [currencyModalInitialVal, setCurrencyModalInitialVal] = useState(0);
  const [currencyModalTargetCurrency, setCurrencyModalTargetCurrency] = useState('USD');
  const [currencyModalLabel, setCurrencyModalLabel] = useState('Apply Converted Value');

  const openCalculator = (callback: (val: number) => void, initialVal: number = 0, label: string = "Apply Value") => {
      setCalculatorCallback(() => callback);
      setCalculatorInitialValue(initialVal);
      setCalculatorLabel(label);
      setIsCalculatorOpen(true);
  };

  const handleCalculatorApply = (val: number) => {
      if (calculatorCallback) calculatorCallback(val);
      setIsCalculatorOpen(false);
  };

  const openCurrencyConverter = (
      callback: (val: number, fromCurrency?: string, rate?: number) => void,
      initialVal: number = 0,
      targetCurrency?: string,
      label: string = "Apply Converted Value"
  ) => {
      setCurrencyModalCallback(() => callback);
      setCurrencyModalInitialVal(initialVal);
      setCurrencyModalTargetCurrency(targetCurrency || activeCurrencyCode || 'USD');
      setCurrencyModalLabel(label);
      setIsCurrencyModalOpen(true);
  };

  const handleCurrencyModalApply = (convertedVal: number, fromCurrency: string, rate: number) => {
      if (currencyModalCallback) currencyModalCallback(convertedVal, fromCurrency, rate);
      setIsCurrencyModalOpen(false);
  };

  const openGeneralCalculator = () => {
      openCalculator((val) => {
          navigator.clipboard.writeText(val.toString());
          // Optional: Add simple toast here if you have a toast system
      }, 0, "Copy");
  };

  // --- PERSISTENCE & MULTI-DEVICE SYNC ENGINE ---
  const socketRef = useRef<Socket | null>(null);
  const isRemoteUpdate = useRef(false);
  const [syncStatus, setSyncStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [peerCount, setPeerCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const applyRemoteData = useCallback((remoteData: AppData) => {
      if (!remoteData || !remoteData.profile) return;
      isRemoteUpdate.current = true;
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setIsSyncing(false);

      setData(prev => {
          // Merge businesses: union by id
          const localBizMap = new Map(prev.businesses.map(b => [b.id, b]));
          const mergedBusinesses = [...prev.businesses];
          for (const rb of (remoteData.businesses || [])) {
              const existing = localBizMap.get(rb.id);
              if (!existing) {
                  mergedBusinesses.push(rb);
              } else {
                  const idx = mergedBusinesses.findIndex(b => b.id === rb.id);
                  if (idx >= 0) {
                      mergedBusinesses[idx] = { ...rb, ownershipStake: existing.ownershipStake };
                  }
              }
          }

          // Merge entries: UNION by entry.id so personal and business entries from remote are preserved!
          const localEntryIds = new Set(prev.entries.map(e => e.id));
          const incomingNewEntries = (remoteData.entries || []).filter(e => !localEntryIds.has(e.id));
          const mergedEntries = [...prev.entries, ...incomingNewEntries];

          // Merge assets: UNION by asset.id
          const localAssetIds = new Set((prev.assets || []).map(a => a.id));
          const incomingNewAssets = (remoteData.assets || []).filter(a => !localAssetIds.has(a.id));
          const mergedAssets = [...(prev.assets || []), ...incomingNewAssets];

          // Merge investments: UNION by investment.id
          const localInvIds = new Set((prev.investments || []).map(i => i.id));
          const incomingNewInvs = (remoteData.investments || []).filter(i => !localInvIds.has(i.id));
          const mergedInvestments = [...(prev.investments || []), ...incomingNewInvs];

          // Merge allocations: UNION by allocation.id
          const localAllocIds = new Set((prev.allocations || []).map(a => a.id));
          const incomingNewAllocs = (remoteData.allocations || []).filter(a => !localAllocIds.has(a.id));
          const mergedAllocations = [...(prev.allocations || []), ...incomingNewAllocs];

          // Merge goals: UNION by goal.id
          const localGoalIds = new Set((prev.goals || []).map(g => g.id));
          const incomingNewGoals = (remoteData.goals || []).filter(g => !localGoalIds.has(g.id));
          const mergedGoals = [...(prev.goals || []), ...incomingNewGoals];

          // Adopt remote profile if local is empty/fresh
          const isLocalDefault = prev.entries.length === 0 && (!prev.profile.name || prev.profile.name === 'Alex Mercer');
          const mergedProfile = isLocalDefault ? remoteData.profile : {
              ...prev.profile,
              currency: remoteData.profile.currency || prev.profile.currency
          };

          return {
              ...prev,
              profile: mergedProfile,
              businesses: mergedBusinesses,
              entries: mergedEntries,
              assets: mergedAssets,
              investments: mergedInvestments,
              allocations: mergedAllocations,
              goals: mergedGoals
          };
      });
  }, []);

  const pushSyncData = useCallback((overrideData?: AppData) => {
      const payload = overrideData || data;
      const key = payload.profile?.syncKey?.trim();
      if (!key) return false;
      
      setIsSyncing(true);
      
      // 1. Send via WebSocket if available
      if (!socketRef.current || !socketRef.current.connected) {
          const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
          socketRef.current = socket;
          socket.on('connect', () => {
              setSyncStatus('connected');
              socket.emit('join_room', key);
              socket.emit('update_data', { roomId: key, data: payload, sourceId: socket.id });
              setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
              setTimeout(() => setIsSyncing(false), 500);
          });
      } else {
          socketRef.current.emit('update_data', { roomId: key, data: payload, sourceId: socketRef.current.id });
          setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          setTimeout(() => setIsSyncing(false), 500);
      }

      // 2. HTTP REST backup (ensures instant persistence even if WebSockets are throttled or disconnected)
      fetch(`/api/sync/${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: payload })
      }).then(r => r.json()).then(res => {
          if (res?.success) {
              setSyncStatus('connected');
              setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          }
      }).catch(err => {
          console.warn('HTTP sync broadcast fallback note:', err);
      }).finally(() => {
          setIsSyncing(false);
      });

      return true;
  }, [data]);

  const pullSyncData = useCallback(() => {
      const key = data.profile?.syncKey?.trim();
      if (!key) return false;
      setIsSyncing(true);

      // 1. Try WebSocket
      if (!socketRef.current || !socketRef.current.connected) {
          const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
          socketRef.current = socket;
          socket.on('connect', () => {
              setSyncStatus('connected');
              socket.emit('join_room', key);
              socket.emit('request_room_data', key);
          });
      } else {
          socketRef.current.emit('request_room_data', key);
      }

      // 2. Query HTTP fallback endpoint directly
      fetch(`/api/sync/${encodeURIComponent(key)}`)
          .then(r => r.json())
          .then(res => {
              if (res?.success && res.found && res.data) {
                  applyRemoteData(res.data);
                  setSyncStatus('connected');
              }
          })
          .catch(e => console.warn('HTTP pull fallback notice:', e))
          .finally(() => setTimeout(() => setIsSyncing(false), 600));

      return true;
  }, [data.profile?.syncKey, applyRemoteData]);

  const connectSyncKey = useCallback((key: string) => {
      const trimmed = key.trim();
      setData(prev => {
          const next = { ...prev, profile: { ...prev.profile, syncKey: trimmed } };
          try { localStorage.setItem('gapFinancialData', JSON.stringify(next)); } catch {}
          return next;
      });
  }, []);

  const redeemBusinessRoleKey = useCallback((input: string | any) => {
      try {
          let payload: any = input;
          if (typeof input === 'string') {
              let clean = input.trim();
              if (clean.startsWith('BQ-ROLE-')) {
                  clean = clean.substring(8);
              }
              payload = JSON.parse(decodeURIComponent(escape(atob(clean))));
          }
          if (payload._type !== 'B_QUADRANT_TEAM_ACCESS_KEY' && !payload.businessId) {
              return { success: false, message: 'Invalid role key format. Please check the key and try again.' };
          }

          const bizId = payload.businessId;
          const bizName = payload.businessName || 'Team Business';
          const role = (payload.role || 'viewer') as AccessLevel;

          setData(prev => {
              const existingBiz = prev.businesses.find(b => b.id === bizId);
              let updatedBusinesses = [...prev.businesses];
              if (!existingBiz) {
                  updatedBusinesses.push({
                      id: bizId,
                      name: bizName,
                      industry: 'Corporate Entity',
                      currency: prev.profile.currency || 'USD',
                      ownershipStake: 0,
                      entityType: 'Corporation',
                      goalAmount: 100000,
                      goalTimeline: 12,
                      monthlyRunRate: 0,
                      monthlyBurnRate: 0,
                      cashReserve: 0,
                      isSetup: true
                  });
              }

              // Import entries for this business (no duplicates)
              const snapEntries: Entry[] = payload.snapshot?.entries || [];
              const localIds = new Set(prev.entries.map(e => e.id));
              const newEntries = snapEntries.filter(e => !localIds.has(e.id));

              // Import allocations for this business
              const snapAllocs: AllocationCategory[] = payload.snapshot?.allocations || [];
              const localAllocIds = new Set(prev.allocations.map(a => a.id));
              const newAllocs = snapAllocs.filter(a => !localAllocIds.has(a.id));

              return {
                  ...prev,
                  businesses: updatedBusinesses,
                  entries: [...prev.entries, ...newEntries],
                  allocations: [...prev.allocations, ...newAllocs]
              };
          });

          // Set simulated user / role
          setSimulatedUser({
              id: `member_${Date.now()}`,
              businessId: bizId,
              name: payload.memberName || 'Assigned Staff',
              roleTitle: `${bizName} (${role.toUpperCase()})`,
              accessLevel: role
          });

          setActiveProfileId(bizId);
          setCurrentView('dashboard');
          return { success: true, message: `Access granted as ${role} for ${bizName}!` };
      } catch (e: any) {
          return { success: false, message: e?.message || 'Failed to redeem role key' };
      }
  }, []);

  useEffect(() => {
      const syncKey = data.profile.syncKey?.trim();
      if (syncKey) {
          setSyncStatus('connecting');
          const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
          socketRef.current = socket;

          socket.on('connect', () => {
              setSyncStatus('connected');
              socket.emit('join_room', syncKey);
          });

          socket.on('room_status', ({ peerCount }: { peerCount: number }) => {
              setPeerCount(peerCount);
          });

          socket.on('sync_ack', ({ peerCount }: { peerCount: number }) => {
              setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
              setIsSyncing(false);
              if (peerCount !== undefined) setPeerCount(peerCount);
          });

          socket.on('request_peer_data', () => {
              // A peer just joined our room! Send them our data so they immediately see it on their device
              if (socketRef.current && socketRef.current.connected) {
                  socketRef.current.emit('update_data', {
                      roomId: syncKey,
                      data,
                      sourceId: socketRef.current.id
                  });
              }
          });

          socket.on('sync_data', (payload: any) => {
              const remoteData: AppData = payload?.data ? payload.data : payload;
              applyRemoteData(remoteData);
          });

          socket.on('disconnect', () => {
              setSyncStatus('disconnected');
          });

          socket.on('connect_error', () => {
              setSyncStatus('error');
          });

          // Also immediately query HTTP sync endpoint in case server holds cached room data
          fetch(`/api/sync/${encodeURIComponent(syncKey)}`)
              .then(r => r.json())
              .then(res => {
                  if (res?.success && res.found && res.data) {
                      applyRemoteData(res.data);
                      setSyncStatus('connected');
                  }
              })
              .catch(() => {});

          return () => {
              socket.disconnect();
              setSyncStatus('disconnected');
          };
      } else {
          setSyncStatus('disconnected');
          setPeerCount(0);
      }
  }, [data.profile.syncKey, applyRemoteData]);

  useEffect(() => {
      localStorage.setItem('gap_ui_view', currentView);
  }, [currentView]);

  useEffect(() => {
      localStorage.setItem('gap_ui_profile', activeProfileId);
  }, [activeProfileId]);

  useEffect(() => {
    localStorage.setItem('gap_ui_theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  // Data Autosave
  useEffect(() => {
    setIsSaving(true);
    const handler = setTimeout(() => {
        try {
            localStorage.setItem('gapFinancialData', JSON.stringify(data));
            if (!isRemoteUpdate.current && socketRef.current && data.profile.syncKey) {
                socketRef.current.emit('update_data', { roomId: data.profile.syncKey, data, sourceId: socketRef.current.id });
            }
            isRemoteUpdate.current = false;
            setTimeout(() => setIsSaving(false), 300);
        } catch (e) {
            console.error("Autosave failed", e);
            setIsSaving(false);
        }
    }, 500);
    return () => clearTimeout(handler);
  }, [data]);

  // Periodic History Snapshot (Every 50 mins)
  useEffect(() => {
      const interval = setInterval(() => {
          saveSnapshot(data, "Auto-Save (Periodic)");
      }, 50 * 60 * 1000);
      return () => clearInterval(interval);
  }, [data]);

  // First-time tour detection
  // Trigger welcome tip on first load
  useEffect(() => {
     if (hasEnteredApp && seenTips.length === 0) {
        window.dispatchEvent(new CustomEvent('trigger-tour', { detail: 'welcome' }));
     }
  }, [hasEnteredApp, seenTips.length]);
  
  // --- TOUR DEMO BUSINESS INJECTION ---
  const handleStartTour = () => {
      // If user has no businesses, inject the DEMO business so the tour flow works (especially Step 2)
      if (data.businesses.length === 0) {
          setData(prev => ({
              ...prev,
              businesses: [...prev.businesses, DEMO_BUSINESS]
          }));
      }
      setTourOpen(true);
  };

  const handleTourComplete = () => {
      setTourOpen(false);
      
      // Cleanup: Remove the demo business if it exists and wasn't manually created by user (ID match)
      setData(prev => {
          const hasDemo = prev.businesses.some(b => b.id === DEMO_BUSINESS.id);
          if (hasDemo) {
              // If current profile is the demo one, switch back to personal first to avoid crashing
              if (activeProfileId === DEMO_BUSINESS.id) {
                  setActiveProfileId('personal');
              }
              return {
                  ...prev,
                  businesses: prev.businesses.filter(b => b.id !== DEMO_BUSINESS.id)
              };
          }
          return prev;
      });
  };

  // --- LOGIC ---
  const calculateWeeklyHours = (profileId: string, allEntries: Entry[], allBusinesses: typeof data.businesses) => {
      const now = new Date();
      now.setFullYear(2026); // Simulate 2026
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const relevantEntries = allEntries.filter(e => {
          const entryDate = new Date(e.date);
          return entryDate >= thirtyDaysAgo && entryDate <= now;
      });

      if (profileId === 'personal') {
          const personalWorkHours = relevantEntries
              .filter(e => e.profileId === 'personal' && e.type === 'income')
              .reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
          
          let totalBusinessHours = 0;
          allBusinesses.forEach(biz => {
              const bizEntries = allEntries.filter(e => {
                  const d = new Date(e.date);
                  return e.profileId === biz.id && e.type === 'income' && d >= thirtyDaysAgo && d <= now && (!e.actorRole || e.actorRole === 'Founder');
              });
              const bizTotalHours = bizEntries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
              totalBusinessHours += bizTotalHours;
          });

          const totalMonthlyHours = personalWorkHours + totalBusinessHours;
          return totalMonthlyHours / 4; 
      } else {
          const bizHours = relevantEntries
              .filter(e => e.profileId === profileId && e.type === 'income' && (!e.actorRole || e.actorRole === 'Founder'))
              .reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
          
          return bizHours / 4; 
      }
  };

  const engine = useMemo(() => {
    // Ownership Graph Engine logic
    let entities = data.entities || [];
    if (!entities.find(x => x.id === 'personal')) {
        entities = [...entities, { id: 'personal', name: data.profile.name, type: 'PERSON' }];
    }
    data.businesses.forEach(b => {
         if (!entities.find(x => x.id === b.id)) {
             entities = [...entities, { id: b.id, name: b.name, type: 'BUSINESS' }];
         }
    });

    let edges = data.ownershipEdges || [];
    if (edges.length === 0 && data.businesses.length > 0) {
        edges = data.businesses.map(b => ({
            id: `edge_${b.id}`,
            parent_entity_id: 'personal',
            child_entity_id: b.id,
            percentage: b.ownershipStake || 100
        }));
    }

    return new OwnershipGraph(entities, edges);
  }, [data.entities, data.businesses, data.ownershipEdges, data.profile]);

    const modifyAllocations = (currentAllocations: AllocationCategory[], entry: Entry, direction: 'add' | 'remove') => {
      let newAllocations = [...currentAllocations];
      const sign = direction === 'add' ? 1 : -1;

      if (!newAllocations.some(a => a.name === 'Uncategorized')) {
          newAllocations.push({ id: Date.now().toString() + '_uncat', profileId: entry.profileId, name: 'Uncategorized', percentage: 0, balance: 0 });
      }

      if (entry.subtype === 'BAD_DEBT') {
          return newAllocations;
      }

      if (entry.bucketAdjustments && entry.bucketAdjustments.length > 0) {
          const multiplier = direction === 'add' ? 1 : -1;
          for (const adj of entry.bucketAdjustments) {
              newAllocations = newAllocations.map(a => a.name === adj.name ? { ...a, balance: a.balance + (adj.amount * multiplier) } : a);
          }
          return newAllocations;
      }

      const isIncome = entry.type === 'income' || entry.type === 'transfer_in';
      const amount = Math.abs(entry.amount);
      const targetExists = newAllocations.some(a => a.name === entry.category && a.profileId === entry.profileId);
      const effectiveBucket = entry.category === 'PROPORTIONAL_DEDUCTION' ? 'PROPORTIONAL_DEDUCTION' : (targetExists ? entry.category : 'Uncategorized');

      if (isIncome) {
          if (entry.isDirectAllocation && effectiveBucket !== 'Uncategorized' && effectiveBucket !== 'PROPORTIONAL_DEDUCTION') {
              newAllocations = newAllocations.map(a => (a.name === effectiveBucket && a.profileId === entry.profileId) ? { ...a, balance: a.balance + (amount * sign) } : a);
          } else {
              newAllocations = newAllocations.map(a => (a.name === 'Uncategorized' && a.profileId === entry.profileId) ? { ...a, balance: a.balance + (amount * sign) } : a);
          }
      } else {
          if (entry.subtype === 'DISTRIBUTION' && effectiveBucket === 'Uncategorized') {
              // Special dynamic proportional logic for distributions: Ignore "Uncategorized", only use profit buckets
              const profileAllocations = newAllocations.filter(a => a.profileId === entry.profileId && a.name !== 'Uncategorized');
              const totalCashPrior = profileAllocations.reduce((sum, a) => sum + Math.max(0, a.balance), 0);
              const reductionRatio = totalCashPrior > 0 ? (amount / totalCashPrior) : 0;
              
              newAllocations = newAllocations.map(a => {
                  if (a.profileId === entry.profileId && a.name !== 'Uncategorized' && a.balance > 0) {
                      const reductionAmt = a.balance * reductionRatio;
                      return { ...a, balance: a.balance - (reductionAmt * sign) };
                  }
                  return a;
              });
          } else if (effectiveBucket === 'PROPORTIONAL_DEDUCTION') {
              const profileAllocations = newAllocations.filter(a => a.profileId === entry.profileId && a.name !== 'Uncategorized');
              const totalBalances = profileAllocations.reduce((acc, curr) => acc + Math.max(0, curr.balance), 0);
              
              if (totalBalances > 0) {
                  newAllocations = newAllocations.map(a => {
                      if (a.profileId === entry.profileId && a.name !== 'Uncategorized' && a.balance > 0) {
                          let ratio = a.balance / totalBalances;
                          return { ...a, balance: a.balance - (amount * sign * ratio) };
                      }
                      return a;
                  });
              } else {
                  newAllocations = newAllocations.map(a => (a.name === 'Uncategorized' && a.profileId === entry.profileId) ? { ...a, balance: a.balance - (amount * sign) } : a);
              }
          } else if (effectiveBucket === 'Uncategorized') {
              newAllocations = newAllocations.map(a => (a.name === 'Uncategorized' && a.profileId === entry.profileId) ? { ...a, balance: a.balance - (amount * sign) } : a);
          } else {
              newAllocations = newAllocations.map(a => (a.name === effectiveBucket && a.profileId === entry.profileId) ? { ...a, balance: a.balance - (amount * sign) } : a);
          }
      }
      return newAllocations;
  };

  const distributeBusinessProfit = (businessId: string, amountToDistribute: number, description: string, date: string, category: string, meta?: DistributionMeta, existingDistId?: string, time?: string) => {
      // PRE-FLIGHT VALIDATION: Prevent deductive distributions that exceed available bucket funds.
      const allocs = data.allocations.filter(a => a.profileId === businessId);
      const currencySym = CURRENCY_SYMBOLS[data.profile.currency || 'USD'];
      
      if (category === "Uncategorized") { // Proportional
          const profitBucketsCash = allocs.filter(a => a.name !== "Uncategorized").reduce((sum, a) => sum + Math.max(0, a.balance), 0);
          if (amountToDistribute > profitBucketsCash) {
              alert(`Distribution Rejected: Insufficient funds in your profit buckets (${currencySym}${profitBucketsCash.toLocaleString()}).\n\nThe Proportional method only deducts from profit buckets. Please allocate funds to profit buckets first.`);
              return;
          }
      } else { // Direct
          const targetBucketCash = allocs.find(a => a.name === category)?.balance || 0;
          if (amountToDistribute > targetBucketCash) {
              alert(`Distribution Rejected: Insufficient funds in selected bucket (${category}). Required: ${currencySym}${amountToDistribute.toLocaleString()}, Available: ${currencySym}${targetBucketCash.toLocaleString()}`);
              return;
          }
      }

      setData(prev => {
          const directOwners = engine.edges.filter(e => e.child_entity_id === businessId);
          const distributionId = existingDistId || `dist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const { timestamp, time: effectiveTime } = buildEntryTimestamp(date, time || meta?.time);
          const entriesToAdd: Entry[] = [];

          // 1. Withdraw from the business
          const outgoingEntry: Entry = {
              id: `entry_${Date.now()}_out`,
              profileId: businessId,
              date,
              time: effectiveTime,
              timestamp,
              description: description + ' (Distribution Outbound)',
              amount: amountToDistribute,
              baseAmount: amountToDistribute, // Important for currency tracking across edges
              baseCurrency: prev.businesses.find(b => b.id === businessId)?.currency || 'USD',
              type: 'expense',
              subtype: 'DISTRIBUTION',
              transfer_id: distributionId,
              category: category, 
              isDirectAllocation: category !== 'Uncategorized',
              quadrant: 'B',
              effortLevel: 'None',
              hoursWorked: 0,
              actorRole: meta?.actorRole || 'Founder',
              frequency: meta?.frequency,
              affectsCashflow: true,
              affectsIncome: false // Distributions are not deductible business expenses
          };
          entriesToAdd.push(outgoingEntry);

          // 2. Distribute to known owners
          const senderBiz = prev.businesses.find(b => b.id === businessId);
          const senderCurrency = senderBiz ? senderBiz.currency : prev.profile.currency;
          
          const nextDistRecords = [...(prev.distributionRecords || [])];
          for (const ownerEdge of directOwners) {
              const ownerId = ownerEdge.parent_entity_id;
              const ownershipPct = ownerEdge.percentage;
              const payoutAmount = (amountToDistribute * ownershipPct) / 100;

              if (payoutAmount <= 0) continue;

              const recipientEntity = engine.entities.get(ownerId);
              const isLocalRecipient = ownerId === 'personal' || prev.businesses.some(b => b.id === ownerId);
              
              if (isLocalRecipient) {
                  const receiverCurrency = ownerId === 'personal' 
                        ? prev.profile.currency 
                        : prev.businesses.find(b => b.id === ownerId)?.currency || prev.profile.currency;
                  
                  const convertedPayoutAmount = senderCurrency !== receiverCurrency 
                        ? convertCurrency(payoutAmount, senderCurrency, receiverCurrency)
                        : payoutAmount;

                  const incomingEntry: Entry = {
                      id: `entry_${Date.now()}_in_${ownerId}`,
                      profileId: ownerId,
                      date,
                      time: effectiveTime,
                      timestamp,
                      description: description,
                      amount: convertedPayoutAmount,
                      baseAmount: payoutAmount,
                      baseCurrency: senderCurrency,
                      type: 'income',
                      subtype: 'DISTRIBUTION',
                      transfer_id: distributionId,
                      from_entity_id: businessId,
                      to_entity_id: ownerId,
                      ownership_snapshot: ownershipPct,
                      category: recipientEntity?.type === 'BUSINESS' ? 'Dividend Income' : 'Personal Income',
                      quadrant: 'I', // ALL dividend distributions received are 'I' quadrant (capital allocation based), regardless of entity type
                      effortLevel: 'None',
                      hoursWorked: 0,
                      actorRole: meta?.actorRole || 'Founder',
                      frequency: meta?.frequency,
                      affectsCashflow: true,
                      affectsIncome: true
                  };
                  entriesToAdd.push(incomingEntry);
                  
                  nextDistRecords.push({
                    id: `distrec_${Date.now()}_${ownerId}`,
                    distributionId,
                    businessId,
                    recipientId: ownerId,
                    amount: payoutAmount,
                    status: 'claimed',
                    timestamp,
                    meta
                  });
              } else {
                 const recordId = `distrec_${Date.now()}_${ownerId}`;
                 const tokenObj = {
                     distribution: {
                         id: distributionId,
                         amount: payoutAmount,
                         businessId,
                         businessName: prev.businesses.find((b: any) => b.id === businessId)?.name || 'Business',
                         recipientId: ownerId,
                         recordId
                     },
                     snapshot: {
                         business: prev.businesses.find((b: BusinessEntity) => b.id === businessId),
                         entities: Array.from(engine.entities.values()).filter((ent: any) => 
                             engine.edges.some((e: any) => e.child_entity_id === businessId && e.parent_entity_id === ent.id)
                         ),
                         ownershipEdges: engine.edges.filter((e: any) => e.child_entity_id === businessId),
                     }
                 };
                 const claimToken = btoa(unescape(encodeURIComponent(JSON.stringify(tokenObj))));
                 nextDistRecords.push({
                     id: recordId,
                     distributionId,
                     businessId,
                     recipientId: ownerId,
                     amount: payoutAmount,
                     status: 'pending_claim',
                     timestamp,
                     token: claimToken,
                     meta
                 });
              }
          }

          let nextAllocations = [...prev.allocations];
          const businessAllocations = nextAllocations.filter(a => a.profileId === businessId);
          
          const bAdjustments: {name: string, amount: number}[] = [];
          let updatedBusinessAllocations = businessAllocations;

          if (category !== 'Uncategorized') {
              // Deduct strictly from the selected bucket
              updatedBusinessAllocations = businessAllocations.map(a => {
                  if (a.name === category) {
                      bAdjustments.push({name: a.name, amount: -amountToDistribute});
                      return { ...a, balance: a.balance - amountToDistribute };
                  }
                  return a;
              });
          } else {
              // Dynamic proportional deduction across all non-main buckets
              const allocsForProp = businessAllocations.filter(a => a.name !== 'Uncategorized');
              const totalCashPrior = allocsForProp.reduce((sum, a) => sum + Math.max(0, a.balance), 0);
              const reductionRatio = totalCashPrior > 0 ? (amountToDistribute / totalCashPrior) : 0;
              
              updatedBusinessAllocations = businessAllocations.map(a => {
                  if (a.name !== 'Uncategorized' && a.balance > 0) {
                      const reductionAmt = a.balance * reductionRatio;
                      if (reductionAmt > 0) bAdjustments.push({name: a.name, amount: -reductionAmt});
                      return { ...a, balance: a.balance - reductionAmt };
                  }
                  return a;
              });
          }

          outgoingEntry.bucketAdjustments = bAdjustments;
          
          nextAllocations = [
              ...nextAllocations.filter(a => a.profileId !== businessId),
              ...updatedBusinessAllocations
          ];

          for (const entry of entriesToAdd) {
              if (entry.profileId === businessId) continue;
              const entityAllocations = nextAllocations.filter(a => a.profileId === entry.profileId);
              const updated = modifyAllocations(entityAllocations, entry, 'add');
              nextAllocations = [...nextAllocations.filter(a => a.profileId !== entry.profileId), ...updated];
          }

          return {
              ...prev,
              entries: [...prev.entries, ...entriesToAdd],
              allocations: nextAllocations,
              distributionRecords: nextDistRecords
          };
      });
  };

const transactionEngine = useMemo(() => {
      return new TransactionEngine(engine);
  }, [engine]);

  const profileData = useMemo(() => {
    let dynamicAssets = [...data.assets.filter(a => a.profileId === activeProfileId)];
    let dynamicInvestments = [...data.investments.filter(i => i.profileId === activeProfileId)];
    let pendingEntries: PendingEntry[] = [];

    if (activeProfileId === 'personal') {
        if (data.profile.pendingEntries) {
            pendingEntries = data.profile.pendingEntries;
        }
        
        data.businesses.forEach(b => {
            // Find total ownership of this business by the personal profile
            let totalOwnershipPct = (b.ownershipStake || 100) / 100; // fallback
            try {
                const ownershipResult = engine.calculateOwnership('personal', b.id);
                totalOwnershipPct = ownershipResult.totalOwnership / 100;
            } catch (e) {
                // fallback to old logic if error
            }

            // VALUATION LAYER: Pass all entries/assets (unfiltered) to maintain stable valuation
            const valuation = calculateBusinessValuation(b, data.entries, data.assets, totalOwnershipPct);
            const bizWeeklyHours = calculateWeeklyHours(b.id, data.entries, data.businesses);
            const isPassive = bizWeeklyHours < 10 && b.biTriangle.systems > 6;

            if (valuation.userValue > 0) {
                const convertedUserValue = convertCurrency(
                    valuation.userValue, 
                    b.currency, 
                    data.profile.currency
                );

                dynamicAssets.push({
                    id: `equity_asset_${b.id}`,
                    profileId: 'personal',
                    date: new Date().toISOString().split('T')[0],
                    timestamp: new Date().toISOString(),
                    description: `Equity: ${b.name}`,
                    amount: convertedUserValue, 
                    type: 'business_equity', 
                    assetClass: 'Business',
                    monthlyIncome: 0, 
                    isAutomated: true,
                    assetClassMetadata: isPassive ? 'Passive' : 'Active',
                    originalCurrency: b.currency,
                    originalAmount: valuation.userValue
                } as any);

                const existingIdx = dynamicInvestments.findIndex(i => i.id === `equity_inv_${b.id}`);
                const businessInvestment: Investment = {
                    id: `equity_inv_${b.id}`,
                    profileId: 'personal',
                    name: `${b.name}`,
                    type: 'Business',
                    initialValue: 0, 
                    currentValue: convertedUserValue,
                    monthlyPassiveIncome: 0, 
                    riskLevel: bizWeeklyHours < 10 && b.biTriangle.systems > 7 ? 'Low' : 'High',
                    dateAcquired: new Date().toISOString().split('T')[0],
                    timestamp: new Date().toISOString(),
                    isAutomated: true
                };

                if (existingIdx >= 0) dynamicInvestments[existingIdx] = businessInvestment;
                else dynamicInvestments.push(businessInvestment);
            }
        });
    } else {
        const biz = data.businesses.find(b => b.id === activeProfileId);
        if (biz && biz.pendingEntries) {
            pendingEntries = biz.pendingEntries;
        }
    }

    let allocations = data.allocations.filter(a => a.profileId === activeProfileId);
    
    return {
        ...data,
        entries: data.entries.filter(e => e.profileId === activeProfileId),
        assets: dynamicAssets,
        investments: dynamicInvestments,
        goals: data.goals.filter(g => g.profileId === activeProfileId),
        allocations: allocations,
        chatSessions: data.chatSessions.filter(s => s.profileId === activeProfileId),
        notifications: data.notifications.filter(n => n.profileId === activeProfileId),
        pendingEntries 
    };
  }, [data, activeProfileId]);

  const filteredData = useMemo(() => {
    const now = new Date();
    now.setFullYear(2026);
    
    const currentYear = now.getFullYear();
    const currentMonth = now.toISOString().slice(0, 7);

    const filterByTime = (dateStr: string) => {
        const entryDate = new Date(dateStr);
        const diffTime = Math.abs(now.getTime() - entryDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (timeFilter === 'all') return true;
        if (timeFilter === 'year' || timeFilter === '1y') return dateStr.startsWith(currentYear.toString());
        if (timeFilter === 'month' || timeFilter === '1m') return dateStr.startsWith(currentMonth);
        if (timeFilter === '24h') return diffDays <= 1;
        if (timeFilter === '7d' || timeFilter === '1w') return diffDays <= 7;
        return true;
    };

    return {
        ...profileData,
        entries: profileData.entries.filter(e => filterByTime(e.date))
    };
  }, [profileData, timeFilter]);

  const metrics = useMemo(() => {
    const calculatedWeeklyHours = calculateWeeklyHours(activeProfileId, data.entries, data.businesses);

    const _isPrincipalTx = (e: Entry) => {
        if (e.subtype === 'INTERNAL_TRANSFER') return false; 
        if (e.isLoanTransaction) {
            if (e.description.toLowerCase().includes('interest')) return false; 
            return true; 
        }
        return false;
    };
    
    // PERFORMANCE LAYER (Timeframe Dependent)
    // DOUBLE COUNTING PREVENTION ENGINE: True profit is External flows only.
    const externalIncomeEntries = filteredData.entries.filter(e => e.type === 'income' && e.subtype !== 'INTERNAL_TRANSFER' && e.subtype !== 'DISTRIBUTION' && !_isPrincipalTx(e));
    const externalExpenseEntries = filteredData.entries.filter(e => e.type === 'expense' && e.subtype !== 'INTERNAL_TRANSFER' && e.subtype !== 'DISTRIBUTION' && !_isPrincipalTx(e));

    // Include type === 'transfer_in' and type === 'transfer_out' for INTERNAL_TRANSFER, and type === 'income'/'expense' for DISTRIBUTION
    const internalIncomeEntries = filteredData.entries.filter(e => e.type === 'transfer_in' || (e.type === 'income' && (e.subtype === 'INTERNAL_TRANSFER' || e.subtype === 'DISTRIBUTION')));
    const internalExpenseEntries = filteredData.entries.filter(e => e.type === 'transfer_out' || (e.type === 'expense' && (e.subtype === 'INTERNAL_TRANSFER' || e.subtype === 'DISTRIBUTION')));
    
    // Total Real Revenue/Expenses (System-wide New Wealth)
    const trueIncome = externalIncomeEntries.reduce((acc, curr) => acc + curr.amount, 0);
    const trueExpenses = externalExpenseEntries.reduce((acc, curr) => acc + curr.amount, 0);
    
    // TRUE PROFIT: Excludes internal moves and payouts
    const trueProfit = trueIncome - trueExpenses;

    const internalInflows = internalIncomeEntries.reduce((acc, curr) => acc + curr.amount, 0);
    const internalOutflows = internalExpenseEntries.reduce((acc, curr) => acc + curr.amount, 0);

    // Context-sensitive totalIncome for visualization
    const distributionInflows = internalIncomeEntries.filter(e => e.subtype === 'DISTRIBUTION').reduce((sum, e) => sum + e.amount, 0);
    const distributionOutflows = internalExpenseEntries.filter(e => e.subtype === 'DISTRIBUTION').reduce((sum, e) => sum + e.amount, 0);
    // Use the actual isolated local currency 'amount' rather than baseAmount, preventing cross-profile bleeding
    const transferInflows = internalIncomeEntries.filter(e => e.subtype === 'INTERNAL_TRANSFER').reduce((sum, e) => sum + e.amount, 0);
    const transferOutflows = internalExpenseEntries.filter(e => e.subtype === 'INTERNAL_TRANSFER').reduce((sum, e) => sum + e.amount, 0);

    const totalIncome = activeProfileId === 'personal' ? trueIncome + distributionInflows : trueIncome + distributionInflows;
    const totalExpenses = activeProfileId === 'personal' ? trueExpenses : trueExpenses; // Business distribution is NOT an expense
    const badDebtExpenses = externalExpenseEntries.filter(e => e.subtype === 'BAD_DEBT').reduce((sum, e) => sum + e.amount, 0);
    // CRITICAL: Inter-entity transfers must NEVER leak into Net Profit or Retained Earnings.
    const netProfit = totalIncome - totalExpenses - distributionOutflows;
    
    // Principal Repayments hit Cashflow but bypass Net Profit.
    const loanPrincipalInflows = filteredData.entries.filter(e => e.type === 'income' && _isPrincipalTx(e)).reduce((sum, e) => sum + e.amount, 0);
    const loanPrincipalOutflows = filteredData.entries.filter(e => e.type === 'expense' && _isPrincipalTx(e)).reduce((sum, e) => sum + e.amount, 0);
    const cashflow = netProfit + badDebtExpenses + loanPrincipalInflows - loanPrincipalOutflows + transferInflows - transferOutflows; // Cashflow excludes impairments, includes Principal & Transfers

    let totalAssets = 0;
    let totalLiabilitiesAgg = 0;
    
    // Aggregation maps
    let businessIncomePerHour: Record<string, number> = {};
    let activeIncome = 0;
    let passiveCash = 0;
    let recurringPassive = 0;

    // Start with basic calculations
    const assetsOnly = filteredData.assets.filter(a => a.type === 'asset' || a.type === 'business_equity').reduce((acc, curr) => acc + curr.amount, 0);
    const investmentsOnly = filteredData.investments.filter(i => !filteredData.assets.some(a => a.description.includes(i.name))).reduce((acc, curr) => acc + curr.currentValue, 0);
    const localLiabilities = filteredData.assets.filter(a => a.type === 'liability').reduce((acc, curr) => acc + curr.amount, 0);
    const allocationCash = filteredData.allocations.filter(a => a.profileId === activeProfileId).reduce((acc, curr) => acc + curr.balance, 0);
    let netWorth = (assetsOnly + investmentsOnly) - localLiabilities;
    let trueNetWorth = netWorth;

    
    // For Income Attribution
    const allValidIncomeForQuad = [...externalIncomeEntries, ...internalIncomeEntries.filter(e => e.subtype === 'DISTRIBUTION')];
    allValidIncomeForQuad.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Helper to evaluate recurrence
    const getNormalizedRecurring = (e: Entry) => {
        let isLoanInt = !!(e.isLoanTransaction && (e.category === 'Loan Interest' || (e.description && e.description.toLowerCase().includes('interest'))));
        let isRepaid = !!(e.description && e.description.includes('(Repaid)'));
        
        if (isLoanInt && !isRepaid && e.type === 'income') {
            // Treat active loan interest as implied monthly recurring
            return e.amount;
        }

        if (!e.frequency || e.frequency === 'one_time') return 0;
        if (e.status === 'paused' || e.status === 'stopped') return 0; // Exclude inactive recurring sources
        
        let multiplier = 1;
        if (e.frequency === 'daily') multiplier = 30.44;
        else if (e.frequency === 'weekly') multiplier = 4.345;
        else if (e.frequency === 'biweekly') multiplier = 2.1675;
        else if (e.frequency === 'monthly') multiplier = 1;
        else if (e.frequency === 'quarterly') multiplier = 1 / 3;
        else if (e.frequency === 'semiannual' || e.frequency === 'biannual') multiplier = 1 / 6;
        else if (e.frequency === 'yearly') multiplier = 1 / 12;
        else if (e.frequency.startsWith('custom:')) {
            const parts = e.frequency.split(':');
            const val = parseFloat(parts[1]) || 1;
            const unit = parts[2];
            if (unit === 'days') multiplier = 30.44 / val;
            else if (unit === 'weeks') multiplier = 4.345 / val;
            else if (unit === 'months') multiplier = 1 / val;
            else if (unit === 'years') multiplier = 1 / (12 * val);
            else if (unit === 'times_per_month') multiplier = val;
            else if (unit === 'times_per_year') multiplier = val / 12;
        }
        return e.amount * multiplier;
    };

    const qAmounts = { E: 0, S: 0, B: 0, I: 0 };

    if (activeProfileId === 'personal') {
        const holdings = engine.getAllHoldingsForEntity('personal');
        
        let aggAssets = data.assets.filter(a => a.profileId === 'personal' && a.type === 'asset').reduce((acc, curr) => acc + curr.amount, 0);
        let aggLiabilities = data.assets.filter(a => a.profileId === 'personal' && a.type === 'liability').reduce((acc, curr) => acc + curr.amount, 0);
        let aggInvestments = data.investments.filter(i => i.profileId === 'personal').reduce((acc, curr) => acc + curr.currentValue, 0);
        
        let trueAssets = data.assets.filter(a => a.profileId === 'personal' && a.type === 'asset' && a.isIncomeProducing).reduce((acc, curr) => acc + curr.amount, 0);
        let trueInvestments = data.investments.filter(i => i.profileId === 'personal' && i.monthlyPassiveIncome > 0).reduce((acc, curr) => acc + curr.currentValue, 0);

        let totalBusinessEquity = 0;
        let trueBusinessEquity = 0;

        for (const [bizId, res] of Object.entries(holdings)) {
            const ownershipPct = res.totalOwnership / 100;
            const business = data.businesses.find(b => b.id === bizId);
            if (business) {
                // Calculate LIVE equity value for the business, then multiply by ownership %
                const val = calculateBusinessValuation(business, data.entries, data.assets, ownershipPct);
                const convertedStandardVal = convertCurrency(val.userValue, business.currency, data.profile.currency);
                const convertedTrueVal = convertCurrency(val.trueUserValue, business.currency, data.profile.currency);
                
                totalBusinessEquity += convertedStandardVal; // Standard view includes cash
                
                // Income-generating business -> goes to True Assets
                if (val.Annual_Net > 0) {
                    trueBusinessEquity += convertedTrueVal; // True view excludes cash
                }
            }

            // Time Efficiency per Business (New logic: Share of Monthly Profit / Hours Worked)
            let bizMonthlyHours = 0;
            // Let's use the dynamically calculated weekly hours and scale to monthly, as that represents the true current effort.
            const weeklyHours = calculateWeeklyHours(bizId, data.entries, data.businesses);
            bizMonthlyHours = weeklyHours * 4.33;

            const bizMonthlyProfit = business ? (calculateBusinessValuation(business, data.entries, data.assets, ownershipPct).Annual_Net / 12) : 0;
            const rawShareProfit = bizMonthlyProfit * ownershipPct;
            const myShareMonthlyProfit = business ? convertCurrency(rawShareProfit, business.currency, data.profile.currency || 'USD') : 0;

            if (bizMonthlyHours > 0) {
                businessIncomePerHour[bizId] = myShareMonthlyProfit / bizMonthlyHours;
            } else if (bizMonthlyHours === 0 && myShareMonthlyProfit > 0) {
                businessIncomePerHour[bizId] = Number.MAX_SAFE_INTEGER; // Indicates perfectly passive
            } else {
                businessIncomePerHour[bizId] = 0;
            }
        }

        totalAssets = aggAssets + aggInvestments + totalBusinessEquity;
        totalLiabilitiesAgg = aggLiabilities;
        netWorth = totalAssets - totalLiabilitiesAgg; // OVERRIDE net worth with actual aggregated values
        
        const totalTrueAssets = trueAssets + trueInvestments + trueBusinessEquity;
        trueNetWorth = totalTrueAssets - totalLiabilitiesAgg;


        
        // Income Attribution Engine (Time-Filtered)
        const qAmountsCalc = { E: 0, S: 0, B: 0, I: 0 };

        allValidIncomeForQuad.forEach(e => {
            const hours = e.hoursWorked || 0;
            const sourceBizId = e.from_entity_id !== 'personal' ? e.from_entity_id : null;
            const biz = sourceBizId ? data.businesses.find(b => b.id === sourceBizId) : null;
            
            let eAmt = 0, sAmt = 0, bAmt = 0, iAmt = 0;
            const isPassiveLocal = hours === 0 && e.incomeSourceType !== 'SALARY';

            if (e.incomeSourceType === 'SALARY') {
                eAmt = e.amount; // E (Employee) = salary
            } else if (hours > 0) {
                sAmt = e.amount; // S (Self-Employed) = active non-salary
            } else {
                // hours === 0
                if (e.incomeSourceType === 'BUSINESS_DISTRIBUTION' || biz) {
                    bAmt = e.amount; // B (Business Owner) = passive from business
                } else {
                    iAmt = e.amount; // I (Investor) = passive from assets
                }
            }

            qAmountsCalc.E += eAmt;
            qAmountsCalc.S += sAmt;
            qAmountsCalc.B += bAmt;
            qAmountsCalc.I += iAmt;

            if (isPassiveLocal) {
                passiveCash += e.amount;
            } else {
                activeIncome += e.amount;
            }
        });

        // 2. TRUE RUN-RATE CALCULATION (Independent of Time Filter)
        const activeStreamsAmountMap = new Map<string, number>();
        const latestEntryMap = new Map<string, Entry>();
        const allIncomeEntries = data.entries.filter(e => e.profileId === activeProfileId && e.type === 'income' && e.subtype !== 'INTERNAL_TRANSFER');
        
        const getEntryTime = (entry: Entry) => entry.timestamp ? new Date(entry.timestamp).getTime() : new Date(entry.date).getTime();

        allIncomeEntries.forEach(e => {
            const isRecurrenceTrackable = e.incomeSourceType === 'BUSINESS_DISTRIBUTION' || e.hoursWorked === 0 || (e.frequency && e.frequency !== 'one_time');
            if (!isRecurrenceTrackable) return;
            
            if (e.transfer_id) {
                const existing = latestEntryMap.get(e.transfer_id);
                if (!existing || getEntryTime(e) > getEntryTime(existing)) {
                    latestEntryMap.set(e.transfer_id, e);
                }
            } else if (e.frequency && e.frequency !== 'one_time') {
                const streamKey = e.description.replace(' (Repaid)', '').trim() + '_' + e.category;
                const existing = latestEntryMap.get(streamKey);
                if (!existing || getEntryTime(e) > getEntryTime(existing)) {
                    latestEntryMap.set(streamKey, e);
                }
            }
        });

        latestEntryMap.forEach((e, key) => {
            let recAmt = getNormalizedRecurring(e);
            let seqId = null;
            if (e.subtype === 'DISTRIBUTION' && e.transfer_id) {
                const dr = data.distributionRecords?.find((r: any) => r.distributionId === e.transfer_id);
                seqId = dr?.meta?.sequenceId;
                if (dr?.meta?.isActive === false) recAmt = 0;
            } else if (e.transfer_id?.startsWith('rin_')) {
                const rr = data.recurringIncomeRecords?.find(ri => ri.id === e.transfer_id);
                if (rr) {
                    seqId = rr.id;
                    if (!rr.isActive) recAmt = 0;
                } else {
                    recAmt = 0; // Deleted parent model
                }
            }
            if (recAmt > 0) {
                activeStreamsAmountMap.set(key, recAmt);
            }
        });

        recurringPassive = Array.from(activeStreamsAmountMap.values()).reduce((sum, val) => sum + val, 0);

        // Demote B & I to S if the cash came from thin air (no assets/businesses to justify B/I)
        if (recurringPassive === 0 && qAmountsCalc.I > 0) {
            if (aggInvestments === 0 && aggAssets === 0) {
                qAmountsCalc.S += qAmountsCalc.I;
                qAmountsCalc.I = 0;
            }
        }

        if (passiveCash === 0) {
            qAmountsCalc.S += qAmountsCalc.B + qAmountsCalc.I;
            qAmountsCalc.B = 0;
            qAmountsCalc.I = 0;
        }
        
        Object.assign(qAmounts, qAmountsCalc);
    } else {
        totalAssets = assetsOnly + investmentsOnly;
        totalLiabilitiesAgg = localLiabilities;
        netWorth = totalAssets - totalLiabilitiesAgg;
        
        const bTrueAssets = filteredData.assets.filter(a => a.type === 'asset' && a.isIncomeProducing).reduce((acc, curr) => acc + curr.amount, 0);
        const bTrueInvestments = filteredData.investments.filter(i => i.monthlyPassiveIncome > 0).reduce((acc, curr) => acc + curr.currentValue, 0);
        
        trueNetWorth = (bTrueAssets + bTrueInvestments) - totalLiabilitiesAgg;

        
        // For business: MUST NOT be classified as active or passive, MUST NOT affect personal ESBI
        activeIncome = 0;
        passiveCash = 0;
        recurringPassive = 0;

        const qAmountsCalc = { E: 0, S: 0, B: 0, I: 0 };
        allValidIncomeForQuad.forEach(e => {
            const amt = e.amount;
            const hours = e.hoursWorked || 0;

            if (e.incomeSourceType === 'SALARY') {
                qAmountsCalc.E += amt;
            } else if (hours > 0) {
                qAmountsCalc.S += amt;
            } else {
                if (e.incomeSourceType === 'ASSET_INCOME') {
                    qAmountsCalc.I += amt;
                } else {
                    qAmountsCalc.B += amt;
                }
            }
        });
        
        if ((qAmountsCalc.B + qAmountsCalc.I) === 0) {
            qAmountsCalc.S += qAmountsCalc.B + qAmountsCalc.I;
            qAmountsCalc.B = 0;
            qAmountsCalc.I = 0;
        }

        Object.assign(qAmounts, qAmountsCalc);
    }

    let estimatedMonthlyExpenses = totalExpenses;
    if (timeFilter === 'year' || timeFilter === '1y') {
        estimatedMonthlyExpenses = totalExpenses / 12;
    } else if (timeFilter === '7d' || timeFilter === '1w') {
        estimatedMonthlyExpenses = totalExpenses * 4.33;
    } else if (timeFilter === '24h') {
        estimatedMonthlyExpenses = totalExpenses * 30;
    } else if (timeFilter === 'all') {
        estimatedMonthlyExpenses = totalExpenses / 12; // Fallback estimate
    }
    
    let financialFreedomRate = 0;
    if (recurringPassive <= 0) {
        financialFreedomRate = 0;
    } else if (estimatedMonthlyExpenses > 0) {
        financialFreedomRate = recurringPassive / estimatedMonthlyExpenses;
    }
    
    const totalQIncome = qAmounts.E + qAmounts.S + qAmounts.B + qAmounts.I;
    const quadrantSplit = totalQIncome > 0 ? {
        E: Math.round((qAmounts.E / totalQIncome) * 100),
        S: Math.round((qAmounts.S / totalQIncome) * 100),
        B: Math.round((qAmounts.B / totalQIncome) * 100),
        I: Math.round((qAmounts.I / totalQIncome) * 100),
    } : { E: 100, S: 0, B: 0, I: 0 };

    return { 
        netWorth,
        trueNetWorth,
        passiveIncome: passiveCash, 
        recurringPassive,
        activeIncome, 
        financialFreedomRate, 
        estimatedMonthlyExpenses,
        businessIncomePerHour, 
        cashflow, 
        netProfit,
        quadrantSplit, 
        totalIncome, 
        totalExpenses, 
        calculatedWeeklyHours, 
        trueIncome,
        trueExpenses,
        trueProfit, 
        internalInflows, 
        internalOutflows 
    };
  }, [filteredData, activeProfileId, data.entries, timeFilter]);

const processedDistsRef = useRef<Set<string>>(new Set());

  // --- NOTIFICATIONS ---
  useEffect(() => {
      const newNotifications: Notification[] = [];
      const now = new Date().toISOString();
      const today = new Date();

      filteredData.goals.forEach(goal => {
          if (!goal.isAchieved) {
              let isFundable = false;
              let msg = '';
              
              if (goal.linkedAllocationId) {
                  const bucket = filteredData.allocations.find(a => a.id === goal.linkedAllocationId);
                  if (bucket && bucket.balance >= goal.targetAmount) {
                      isFundable = true;
                      const displayName = bucket.name === 'Uncategorized' ? (activeProfileId !== 'personal' ? 'Main Revenue Bucket' : 'Main Income Bucket') : bucket.name;
                      msg = `Your bucket '${displayName}' has enough funds to pay for "${goal.title}". You can now complete this goal!`;
                  }
              } else if (goal.currentAmount >= goal.targetAmount) {
                  isFundable = true;
                  msg = `You have reached your savings target for "${goal.title}". You can now mark it as achieved!`;
              }

              if (isFundable) {
                  const id = `goal_fundable_${goal.id}`;
                  if (!data.notifications.some(n => n.id === id)) {
                      newNotifications.push({
                          id, profileId: activeProfileId, date: now,
                          title: "Goal Ready! 🎯",
                          message: msg,
                          type: "info", read: false, actionLink: "goals"
                      });
                  }
              }
          }
      });

      const autoRepayTargets: Asset[] = [];

      filteredData.assets.forEach(asset => {
          if (asset.type === 'liability' && asset.nextDueDate) {
              const dueDate = new Date(asset.nextDueDate);
              const diffTime = dueDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

              if (diffDays <= 5 && diffDays >= 0) {
                  const id = `due_soon_${asset.id}_${dueDate.toISOString().split('T')[0]}`;
                  if (!data.notifications.some(n => n.id === id)) {
                      newNotifications.push({
                          id, profileId: activeProfileId, date: now,
                          title: "Payment Due Soon 🗓️",
                          message: `Payment for '${asset.description}' is due on ${dueDate.toLocaleDateString()}. Amount: ${formatAmount(asset.monthlyPayment || 0)}.`,
                          type: "info", read: false, actionLink: "balance_sheet"
                      });
                  }
              }
              if (diffDays < 0) {
                   if (asset.autoRepayBucketId) {
                        autoRepayTargets.push(asset);
                   } else {
                       const id = `overdue_${asset.id}_${dueDate.toISOString().split('T')[0]}`;
                       if (!data.notifications.some(n => n.id === id)) {
                          newNotifications.push({
                              id, profileId: activeProfileId, date: now,
                              title: "Payment Overdue ⚠️",
                              message: `You missed the due date for '${asset.description}'. Please pay immediately to avoid penalties.`,
                              type: "warning", read: false, actionLink: "balance_sheet"
                          });
                       }
                   }
              }
          }
      });

      if (metrics.calculatedWeeklyHours > 50) {
          const id = `high_effort_${activeProfileId}_${new Date().getMonth()}`;
          if (!data.notifications.some(n => n.id === id)) {
              newNotifications.push({
                  id, profileId: activeProfileId, date: now,
                  title: "High Burnout Risk ⚠️",
                  message: `You are averaging ${metrics.calculatedWeeklyHours.toFixed(1)} hours/week. Systematize immediately to reduce effort.`,
                  type: "warning", read: false, actionLink: "settings"
              });
          }
      }

      if (metrics.netWorth < 0) {
           const id = `insolvency_${activeProfileId}_${new Date().getMonth()}`;
           if (!data.notifications.some(n => n.id === id)) {
              newNotifications.push({
                  id, profileId: activeProfileId, date: now,
                  title: "Insolvency Warning 🚨",
                  message: `Your Liabilities exceed your Assets. You are technically insolvent. Prioritize debt reduction immediately.`,
                  type: "warning", read: false, actionLink: "balance_sheet"
              });
           }
      }

      // Check recurring distributions
      const distToExecute: {businessId: string, amount: number, meta: DistributionMeta, distributionId: string}[] = [];
      const recurringDists = new Map<string, { businessId: string, meta: DistributionMeta, totalAmount: number, lastTimestamp: string, lastDistId: string }>();
      
      data.distributionRecords?.forEach((r: any) => {
          if (r.meta?.isRecurring && r.businessId === activeProfileId) {
              const seqId = r.meta.sequenceId || r.distributionId;
              const existing = recurringDists.get(seqId);
              const rTime = new Date(r.timestamp || 0).getTime();
              const eTime = existing ? new Date(existing.lastTimestamp || 0).getTime() : 0;

              if (!existing || rTime > eTime) {
                  recurringDists.set(seqId, { 
                    businessId: r.businessId, 
                    meta: r.meta, 
                    totalAmount: r.meta.targetAmount || r.amount, 
                    lastTimestamp: r.timestamp || '',
                    lastDistId: r.distributionId
                  });
              } else if (r.timestamp === existing.lastTimestamp) {
                  existing.totalAmount += r.amount;
              }
          }
      });

      recurringDists.forEach(({businessId, meta, totalAmount, lastDistId}, seqId) => {
          if (!meta.lastExecutedAt || meta.isActive === false) return;
          const nextDate = new Date(meta.lastExecutedAt);
          const oldTime = nextDate.getTime();
          if (meta.frequency.startsWith('custom:')) {
              const [, val, unit] = meta.frequency.split(':');
              const amount = parseInt(val) || 1;
              if (unit === 'days') nextDate.setDate(nextDate.getDate() + amount);
              else if (unit === 'weeks') nextDate.setDate(nextDate.getDate() + (amount * 7));
              else if (unit === 'months') nextDate.setMonth(nextDate.getMonth() + amount);
              else if (unit === 'years') nextDate.setFullYear(nextDate.getFullYear() + amount);
          } else {
              switch(meta.frequency) {
                  case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
                  case 'biweekly': nextDate.setDate(nextDate.getDate() + 14); break;
                  case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
                  case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
                  case 'semiannual': nextDate.setMonth(nextDate.getMonth() + 6); break;
                  case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
              }
          }
          
          if (nextDate.getTime() === oldTime) {
             nextDate.setMonth(nextDate.getMonth() + 1); // failsafe
          }
          
          // Also generate early reminders (e.g. 3 days before)
          const reminderDate = new Date(nextDate);
          reminderDate.setDate(reminderDate.getDate() - 3);

          if (today >= reminderDate && today < nextDate && !meta.autoDistribute) {
              const id = `dist_soon_${seqId}_${nextDate.toISOString().split('T')[0]}`;
              if (!data.notifications.some(n => n.id === id)) {
                  newNotifications.push({
                      id, profileId: activeProfileId, date: now,
                      title: "Upcoming Distribution ⏳",
                      message: `A recurring distribution is due in a few days for ${data.businesses.find(b=>b.id===businessId)?.name || 'Business'}. Prepare cashflow. Target: ${CURRENCY_SYMBOLS[data.profile.currency || 'USD']}${totalAmount.toLocaleString()}`,
                      type: "info", read: false, actionLink: "income_statement:distribution"
                  });
              }
          }

          if (today >= nextDate) {
              const distKey = `${seqId}_${nextDate.toISOString().split('T')[0]}`;
              if (processedDistsRef.current.has(distKey)) return;

              if (meta.autoDistribute) {
                  const bEntries = data.entries.filter(e => e.profileId === businessId);
                  const income = bEntries.filter(e => e.type === 'income' && e.subtype !== 'INTERNAL_TRANSFER').reduce((s,e) => s+e.amount, 0);
                  const expenses = bEntries.filter(e => e.type === 'expense' && e.subtype !== 'INTERNAL_TRANSFER' && e.subtype !== 'DISTRIBUTION').reduce((s,e) => s+e.amount, 0);
                  const monthlyExpenses = Math.max(expenses / (bEntries.length ? 12 : 1), 0);
                  const safetyThreshold = monthlyExpenses * 1.5;
                  const availableCash = data.allocations.filter(a => a.profileId === businessId).reduce((s,a) => s+a.balance, 0);
                  const netProfit = income - expenses;

                  const skipId = `dist_skip_${seqId}_${nextDate.toISOString().split('T')[0]}`;
                  const execId = `dist_exec_${seqId}_${nextDate.toISOString().split('T')[0]}`;
                  
                  let canExecute = availableCash > safetyThreshold && netProfit > 0;
                  let skipReason = "Retained earnings prioritised as profit or cashflow is too low.";
                  
                  if (canExecute) {
                      if (!meta.sourceBucket || meta.sourceBucket === "Uncategorized") {
                          const profitBucketsCash = data.allocations.filter(a => a.profileId === businessId && a.name !== 'Uncategorized').reduce((s,a) => s+Math.max(0, a.balance), 0);
                          if (totalAmount > profitBucketsCash) {
                              canExecute = false;
                              skipReason = `Insufficient funds in profit buckets to fulfill proportional target. Need ${CURRENCY_SYMBOLS[data.profile.currency || 'USD']}${totalAmount.toLocaleString()} but only have ${CURRENCY_SYMBOLS[data.profile.currency || 'USD']}${profitBucketsCash.toLocaleString()}.`;
                          }
                      } else {
                          const targetBucketCash = data.allocations.find(a => a.profileId === businessId && a.name === meta.sourceBucket)?.balance || 0;
                          if (totalAmount > targetBucketCash) {
                              canExecute = false;
                              skipReason = `Insufficient funds in selected bucket (${meta.sourceBucket}).`;
                          }
                      }
                  }

                  if (canExecute) {
                      if (!data.notifications.some(n => n.id === execId)) {
                          distToExecute.push({ businessId, amount: totalAmount, meta, distributionId: lastDistId });
                          newNotifications.push({
                              id: execId, profileId: activeProfileId, date: now,
                              title: "Auto-Distribution Processed ✅",
                              message: `Safe thresholds met for ${data.businesses.find(b=>b.id===businessId)?.name || 'Business'}. Recurring target of ${CURRENCY_SYMBOLS[data.profile.currency || 'USD']}${totalAmount.toLocaleString()} executed.`,
                              type: "success", read: false, actionLink: "income_statement:distribution"
                          });
                      }
                  } else {
                      if (!data.notifications.some(n => n.id === skipId)) {
                          newNotifications.push({
                              id: skipId, profileId: activeProfileId, date: now,
                              title: "Auto-Distribution Skipped ⏭️",
                              message: `Skipped ${data.businesses.find(b=>b.id===businessId)?.name || 'Business'} distribution (Target: ${CURRENCY_SYMBOLS[data.profile.currency || 'USD']}${totalAmount.toLocaleString()}). ${skipReason}`,
                              type: "warning", read: false, actionLink: "income_statement:distribution"
                          });
                      }
                  }
              } else {
                  const id = `dist_due_${seqId}_${nextDate.toISOString().split('T')[0]}`;
                  if (!data.notifications.some(n => n.id === id)) {
                      newNotifications.push({
                          id, profileId: activeProfileId, date: now,
                          title: "Distribution Due 💰",
                          message: `Distribution due for ${data.businesses.find(b=>b.id===businessId)?.name || 'Business'} (Target: ${CURRENCY_SYMBOLS[data.profile.currency || 'USD']}${totalAmount.toLocaleString()}). Please review recent profit and available cashflow before executing this cycle.`,
                          type: "info", read: false, actionLink: "income_statement:distribution"
                      });
                  }
              }
          }
      });

      // Check recurring income models
      const recurringIncomeToExecute: { recId: string, profileId: string, amount: number, nextDateStr: string, name: string, category: string, frequency: string }[] = [];
      data.recurringIncomeRecords?.forEach(rec => {
          if (!rec.isActive) return;

          const existing = data.entries.filter(e => e.transfer_id === rec.id && e.type === 'income');
          const latestDateStr = existing.length > 0 ? existing.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : rec.startDate;
          
          const nextDate = new Date(latestDateStr);
          if (rec.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
          else if (rec.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
          else if (rec.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          else if (rec.frequency === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
          else if (rec.frequency === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
          else if (rec.frequency === 'semiannual') nextDate.setMonth(nextDate.getMonth() + 6);
          else if (rec.frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);

          const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const nextDateStr = nextDate.toISOString().split('T')[0];

          if (rec.autoLog && today >= nextDate) {
              const execId = `rin_auto_exec_${rec.id}_${nextDateStr}`;
              if (!data.notifications.some(n => n.id === execId)) {
                  recurringIncomeToExecute.push({ recId: rec.id, profileId: rec.profileId, amount: rec.amount, nextDateStr, name: rec.name, category: rec.category, frequency: rec.frequency });
                  newNotifications.push({
                      id: execId, profileId: rec.profileId, date: now.split('T')[0],
                      title: `Auto-Logged Income: ${rec.name} ✅`,
                      message: `Successfully generated ${CURRENCY_SYMBOLS[activeCurrencyCode] || '$'}${rec.amount.toLocaleString()} for the current cycle.`,
                      type: 'success', read: false, actionLink: "income_statement:income"
                  });
              }
          } else if (diffDays <= 3 && diffDays >= 0) {
              const id = `due_rin_${rec.id}_${nextDateStr}`;
              if (!data.notifications.some(n => n.id === id)) {
                  newNotifications.push({
                      id, profileId: rec.profileId, date: now.split('T')[0],
                      title: `Recurring Income Due 💵`,
                      message: `${rec.name} is scheduled to receive ${CURRENCY_SYMBOLS[activeCurrencyCode] || '$'}${rec.amount.toLocaleString()} in ${diffDays} day(s).`,
                      type: "info", read: false, actionLink: "income_statement:income"
                  });
              }
          }
      });

      if (newNotifications.length > 0 || autoRepayTargets.length > 0 || distToExecute.length > 0 || recurringIncomeToExecute.length > 0) {
          setData(prev => {
              let nextAssets = [...prev.assets];
              let nextAllocations = [...prev.allocations];
              let nextEntries = [...prev.entries];
              let nextNotifications = [...newNotifications];
              let nextDistRecords = [...(prev.distributionRecords || [])];
              let hasChanges = newNotifications.length > 0 || recurringIncomeToExecute.length > 0;

              for (const rin of recurringIncomeToExecute) {
                  const newEntry: Entry = {
                      id: `rin_auto_${Date.now()}_${rin.recId}_${rin.nextDateStr}`,
                      profileId: rin.profileId,
                      date: rin.nextDateStr,
                      timestamp: now,
                      description: `Recurring: ${rin.name}`,
                      amount: rin.amount,
                      type: 'income',
                      category: rin.category,
                      frequency: rin.frequency,
                      transfer_id: rin.recId,
                      submittedBy: 'System'
                  };
                  nextEntries.push(newEntry);
                  
                  // Add funds appropriately
                  const uncategorizedBucketIndex = nextAllocations.findIndex(a => a.name === 'Uncategorized' && a.profileId === rin.profileId);
                  if (uncategorizedBucketIndex > -1) {
                       nextAllocations[uncategorizedBucketIndex] = {
                           ...nextAllocations[uncategorizedBucketIndex],
                           balance: nextAllocations[uncategorizedBucketIndex].balance + rin.amount
                       };
                  } else {
                      nextAllocations.push({
                          id: `alloc_${Date.now()}_${rin.profileId}`,
                          profileId: rin.profileId,
                          name: 'Uncategorized',
                          balance: rin.amount,
                          targetPercentage: 0,
                          isProtected: true,
                          color: "gray"
                      });
                  }
              }

              for (const target of autoRepayTargets) {
                  const notifId = `autorepay_${target.id}_${target.nextDueDate}`;
                  if (prev.notifications.some(n => n.id === notifId) || prev.notifications.some(n => n.id === `fail_${notifId}`)) continue;

                  const bucketIndex = nextAllocations.findIndex(a => a.id === target.autoRepayBucketId);
                  const bucket = bucketIndex > -1 ? nextAllocations[bucketIndex] : null;
                  const amountDue = target.monthlyPayment || 0;

                  if (amountDue <= 0) continue;

                  if (bucket && bucket.balance >= amountDue) {
                      // Process Auto-Repayment
                      nextAllocations[bucketIndex] = { ...bucket, balance: bucket.balance - amountDue };
                      const newBalance = target.amount - amountDue;

                      let newNextDueDate = target.nextDueDate;
                      if (newBalance > 0 && target.termUnit !== 'One-Time' && target.nextDueDate) {
                          const currentDue = new Date(target.nextDueDate);
                          const unit = (target.termUnit || 'monthly').toLowerCase();
                          if (unit === 'monthly' || unit === 'months') currentDue.setMonth(currentDue.getMonth() + 1);
                          else if (unit === 'weekly') currentDue.setDate(currentDue.getDate() + 7);
                          else if (unit === 'biweekly') currentDue.setDate(currentDue.getDate() + 14);
                          else if (unit === 'quarterly') currentDue.setMonth(currentDue.getMonth() + 3);
                          else if (unit === 'biannual') currentDue.setMonth(currentDue.getMonth() + 6);
                          else if (unit === 'yearly' || unit === 'years') currentDue.setFullYear(currentDue.getFullYear() + 1);
                          else currentDue.setMonth(currentDue.getMonth() + 1); // fallback
                          newNextDueDate = currentDue.toISOString().split('T')[0];
                      }

                      nextAssets = nextAssets.map(a => a.id === target.id ? { ...a, amount: newBalance, nextDueDate: newNextDueDate } : a);

                      nextEntries.push({
                          id: `repay_auto_${Date.now()}_${target.id}`,
                          profileId: target.profileId,
                          date: now.split('T')[0],
                          timestamp: now,
                          description: `Auto-Repayment - ${target.description}`,
                          amount: amountDue,
                          type: 'expense',
                          category: bucket.name,
                          isDirectAllocation: true,
                          quadrant: 'B',
                          effortLevel: 'None',
                          hoursWorked: 0,
                          submittedBy: 'System'
                      });

                      const displayName = bucket.name === 'Uncategorized' ? (activeProfileId !== 'personal' ? 'Main Revenue Bucket' : 'Main Income Bucket') : bucket.name;
                      nextNotifications.push({
                          id: notifId, profileId: target.profileId, date: now,
                          title: "Auto-Repayment Processed ✅",
                          message: `Automatically paid ${formatAmount(amountDue)} for '${target.description}' from '${displayName}'.`,
                          type: "success", read: false, actionLink: "balance_sheet"
                      });

                      if (newBalance <= 0.01) {
                           nextAssets = nextAssets.filter(a => a.id !== target.id);
                           nextNotifications.push({
                               id: `debt_cleared_${target.id}`, profileId: target.profileId, date: now,
                               title: "Debt Cleared! 🎉", 
                               message: `Congratulations! You have fully repaid '${target.description}'.`, 
                               type: "success", read: false, actionLink: "balance_sheet"
                           });
                      }
                      hasChanges = true;
                  } else {
                      // Insufficient funds
                      nextNotifications.push({
                          id: `fail_${notifId}`, profileId: target.profileId, date: now,
                          title: "Auto-Repayment Failed ❌",
                          message: `Insufficient funds in your selected bucket to auto-repay '${target.description}'. Please add funds or pay manually.`,
                          type: "error", read: false, actionLink: "balance_sheet"
                      });
                      hasChanges = true;
                  }
              }

              if (hasChanges) {
                  return { 
                    ...prev, 
                    assets: nextAssets, 
                    allocations: nextAllocations, 
                    entries: nextEntries, 
                    distributionRecords: nextDistRecords,
                    notifications: [...nextNotifications, ...prev.notifications] 
                  };
              }
              return prev;
          });
          
          if (distToExecute.length > 0) {
              setTimeout(() => {
                  distToExecute.forEach(d => {
                      const nextDate = new Date(d.meta.lastExecutedAt || '');
                      const oldTime = nextDate.getTime();
                      if (d.meta.frequency.startsWith('custom:')) {
                           const [, val, unit] = d.meta.frequency.split(':');
                           const amount = parseInt(val) || 1;
                           if (unit === 'days') nextDate.setDate(nextDate.getDate() + amount);
                           else if (unit === 'weeks') nextDate.setDate(nextDate.getDate() + (amount * 7));
                           else if (unit === 'months') nextDate.setMonth(nextDate.getMonth() + amount);
                           else if (unit === 'years') nextDate.setFullYear(nextDate.getFullYear() + amount);
                      } else {
                          switch(d.meta.frequency) {
                              case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
                              case 'biweekly': nextDate.setDate(nextDate.getDate() + 14); break;
                              case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
                              case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
                              case 'semiannual': nextDate.setMonth(nextDate.getMonth() + 6); break;
                              case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
                          }
                      }
                      if (nextDate.getTime() === oldTime) {
                          nextDate.setMonth(nextDate.getMonth() + 1);
                      }
                      const distKey = `${d.meta.sequenceId || d.distributionId}_${nextDate.toISOString().split('T')[0]}`;
                      processedDistsRef.current.add(distKey);
                      distributeBusinessProfit(d.businessId, d.amount, d.meta.targetDescription || 'Auto-Distribution', now.split('T')[0], d.meta.sourceBucket || 'Uncategorized', { ...d.meta, lastExecutedAt: now });
                  });
              }, 0);
          }
      }
  }, [metrics, activeProfileId, filteredData.goals, filteredData.assets]);

  
  const navigate = (view: string) => {
      if (view.includes(':')) {
          const [mainView, tab] = view.split(':');
          setCurrentView(mainView);
          setRequestedTab(tab);
      } else {
          setCurrentView(view);
      }
  };

  // --- ACTIONS ---
  const addTransfer = (amount: number, fromEntityId: string, toEntityId: string, description: string, date: string, category: string, toCategory: string = 'Uncategorized', isLoan?: boolean, loanDetails?: Partial<Asset>, time?: string) => {
      // 1. Validate
      if (fromEntityId !== toEntityId) {
          transactionEngine.executeTransaction({
              type: 'INTERNAL_TRANSFER',
              from_entity_id: fromEntityId,
              to_entity_id: toEntityId,
              amount,
              timestamp: new Date().toISOString()
          });
      }

      const transferId = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const { timestamp, time: effectiveTime } = buildEntryTimestamp(date, time);

      const senderCurrency = fromEntityId === 'personal' ? data.profile.currency : (data.businesses.find(b => b.id === fromEntityId)?.currency || 'USD');
      const receiverCurrency = toEntityId === 'personal' ? data.profile.currency : (data.businesses.find(b => b.id === toEntityId)?.currency || 'USD');
      
      const convertedAmount = senderCurrency !== receiverCurrency ? convertCurrency(amount, senderCurrency, receiverCurrency) : amount;

      const internalLoanId = `loan_${Date.now()}`;

      const senderEntry: Entry = {
          id: `entry_${Date.now()}_1`,
          profileId: fromEntityId,
          date,
          time: effectiveTime,
          timestamp,
          description,
          amount: Math.abs(amount), // Outflows are positive amounts like regular expenses
          baseAmount: Math.abs(amount), // Outflows are positive amounts like regular expenses
          baseCurrency: senderCurrency,
          type: 'transfer_out',
          subtype: 'INTERNAL_TRANSFER',
          transfer_id: transferId,
          from_entity_id: fromEntityId,
          to_entity_id: toEntityId,
          isLoanTransaction: isLoan,
          internalLoanId: isLoan ? internalLoanId : undefined,
          category,
          isDirectAllocation: category !== 'Uncategorized',
          quadrant: 'B',
          effortLevel: 'None',
          hoursWorked: 0
      };

      const receiverEntry: Entry = {
          id: `entry_${Date.now()}_2`,
          profileId: toEntityId,
          date,
          time: effectiveTime,
          timestamp,
          description,
          amount: convertedAmount, // Converted to receiver currency
          baseAmount: amount, // Same absolute base value
          baseCurrency: senderCurrency,
          type: 'transfer_in',
          subtype: 'INTERNAL_TRANSFER',
          transfer_id: transferId,
          from_entity_id: fromEntityId,
          to_entity_id: toEntityId,
          isLoanTransaction: isLoan,
          internalLoanId: isLoan ? internalLoanId : undefined,
          category: toCategory || 'Uncategorized', // Using the provided destination bucket
          isDirectAllocation: true, // Internal transfers to specific buckets should always be direct
          quadrant: 'B',
          effortLevel: 'None',
          hoursWorked: 0
      };

      setData(prev => {
          let currentAllocations = [...prev.allocations];
          
          if (fromEntityId === toEntityId) {
              const entityAllocations = currentAllocations.filter(a => a.profileId === fromEntityId);
              let updatedAllocations = modifyAllocations(entityAllocations, senderEntry, 'add');
              updatedAllocations = modifyAllocations(updatedAllocations, receiverEntry, 'add');
              currentAllocations = [...currentAllocations.filter(a => a.profileId !== fromEntityId), ...updatedAllocations];
          } else {
              const senderAllocations = currentAllocations.filter(a => a.profileId === fromEntityId);
              const updatedSenderAllocations = modifyAllocations(senderAllocations, senderEntry, 'add');
              currentAllocations = [...currentAllocations.filter(a => a.profileId !== fromEntityId), ...updatedSenderAllocations];

              const receiverAllocations = currentAllocations.filter(a => a.profileId === toEntityId);
              const updatedReceiverAllocations = modifyAllocations(receiverAllocations, receiverEntry, 'add');
              currentAllocations = [...currentAllocations.filter(a => a.profileId !== toEntityId), ...updatedReceiverAllocations];
          }
          
          let newAssets = [...prev.assets];
          if (isLoan && fromEntityId !== toEntityId) {
              const toEntityName = toEntityId === 'personal' ? `${prev.profile.name} (Personal Account)` : (prev.businesses.find(b => b.id === toEntityId)?.name || 'Unknown');
              const fromEntityName = fromEntityId === 'personal' ? `${prev.profile.name} (Personal Account)` : (prev.businesses.find(b => b.id === fromEntityId)?.name || 'Unknown');
              
              const interestRate = loanDetails?.interestRate || 0;
              const rateIsAnnual = loanDetails?.rateIsAnnual !== false;
              
              const termVal = loanDetails?.termValue || 1;
              const isMonths = loanDetails?.termUnit === 'monthly' || loanDetails?.termUnit === 'Months';
              const isYears = loanDetails?.termUnit === 'yearly' || loanDetails?.termUnit === 'Years';
              const monthsCount = isYears ? termVal * 12 : (isMonths ? termVal : 1);
              
              let totalInterestAmount = 0;
              let receiverTotalInterestAmount = 0;
              if (rateIsAnnual) {
                  totalInterestAmount = amount * (interestRate / 100) * (monthsCount / 12);
                  receiverTotalInterestAmount = convertedAmount * (interestRate / 100) * (monthsCount / 12);
              } else {
                  totalInterestAmount = amount * (interestRate / 100);
                  receiverTotalInterestAmount = convertedAmount * (interestRate / 100);
              }

              const senderTotalOwed = amount + totalInterestAmount;
              const receiverTotalOwed = convertedAmount + receiverTotalInterestAmount;

              let loanNextDueDate = '';
              const startDate = new Date(date);
              if (loanDetails?.termUnit === 'monthly' || loanDetails?.termUnit === 'Months') {
                  startDate.setMonth(startDate.getMonth() + 1);
                  loanNextDueDate = startDate.toISOString().split('T')[0];
              } else if (loanDetails?.termUnit === 'yearly' || loanDetails?.termUnit === 'Years') {
                  startDate.setFullYear(startDate.getFullYear() + 1);
                  loanNextDueDate = startDate.toISOString().split('T')[0];
              } else if (loanDetails?.termUnit === 'one_time' || loanDetails?.termUnit === 'One-Time') {
                  loanNextDueDate = loanDetails?.repaymentDate || '';
              }

              const monthlyInterestOnly = monthsCount > 0 ? (totalInterestAmount / monthsCount) : totalInterestAmount;

              const senderAsset: Asset = {
                  id: `asset_${Date.now()}_1`,
                  profileId: fromEntityId,
                  date: date,
                  timestamp: timestamp,
                  description: `Loan to ${toEntityName}`,
                  initialAmount: amount, // The original principal
                  amount: senderTotalOwed, // The total value to recover (principal + interest)
                  type: 'asset',
                  assetClass: 'Inter-Entity Loan',
                  internalLoanId,
                  counterpartyId: toEntityId,
                  agreementStatus: 'pending',
                  agreementReason: loanDetails?.agreementReason || description,
                  monthlyIncome: monthlyInterestOnly,
                  nextDueDate: loanNextDueDate,
                  provider: toEntityName,
                  ...loanDetails
              };
              
              const receiverLiability: Asset = {
                  id: `liab_${Date.now()}_2`,
                  profileId: toEntityId,
                  date: date,
                  timestamp: timestamp,
                  description: `Loan from ${fromEntityName}`,
                  initialAmount: convertedAmount, // Original principal
                  amount: receiverTotalOwed, // Total explicitly owed (principal + interest)
                  type: 'liability',
                  assetClass: 'Internal Loan',
                  internalLoanId,
                  counterpartyId: fromEntityId,
                  agreementStatus: 'pending',
                  agreementReason: loanDetails?.agreementReason || description,
                  originalCurrency: senderCurrency, // Keep track of base currency
                  originalAmount: amount,
                  nextDueDate: loanNextDueDate,
                  provider: fromEntityName,
                  ...loanDetails
              };
              
              newAssets.push(senderAsset, receiverLiability);
          }

          return {
              ...prev,
              entries: [...prev.entries, senderEntry, receiverEntry],
              allocations: currentAllocations,
              assets: newAssets
          };
      });
  };

  const updateOwnershipEdges = (businessId: string, members: { id: string, name: string, percentage: number, type: 'PERSON' | 'BUSINESS' }[]) => {
      setData(prev => {
          let nextEntities = [...(prev.entities || [])];
          let nextEdges = (prev.ownershipEdges || []).filter(e => e.child_entity_id !== businessId);
          
          members.forEach(m => {
              // Resolve Entity
              let entity = nextEntities.find(ent => (ent.id === m.id) || (ent.name === m.name && ent.type === m.type));
              if (!entity) {
                  entity = { id: m.id || `ent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name: m.name, type: m.type };
                  nextEntities.push(entity);
              }
              
              nextEdges.push({
                  id: `edge_${businessId}_${entity.id}`,
                  parent_entity_id: entity.id,
                  child_entity_id: businessId,
                  percentage: m.percentage
              });
          });

          return {
              ...prev,
              entities: nextEntities,
              ownershipEdges: nextEdges
          };
      });
  };

  const addEntry = (entry: Omit<Entry, 'id' | 'timestamp'> & { timestamp?: string; time?: string }) => {
    const { timestamp: calculatedTimestamp, time: effectiveTime } = buildEntryTimestamp(entry.date, entry.time);
    const newEntry: Entry = { 
        ...entry, 
        id: Date.now().toString(), 
        profileId: activeProfileId, 
        time: effectiveTime,
        timestamp: entry.timestamp || calculatedTimestamp,
        originalAmount: entry.originalAmount ?? entry.amount,
        originalCurrency: entry.originalCurrency ?? activeCurrencyCode,
        submittedBy: entry.submittedBy || (simulatedUser ? simulatedUser.name : 'Owner')
    };

    let newRecurringRecord: RecurringIncomeRecord | null = null;
    if (newEntry.type === 'income' && newEntry.frequency && newEntry.frequency !== 'one_time') {
        const recId = `rin_${Date.now()}`;
        newEntry.transfer_id = recId;
        newRecurringRecord = {
            id: recId,
            profileId: activeProfileId,
            name: newEntry.description,
            amount: newEntry.amount,
            frequency: newEntry.frequency,
            startDate: newEntry.date,
            isActive: true,
            autoLog: false,
            category: newEntry.category
        };
    }

    const updatedAllocations = modifyAllocations(data.allocations.filter(a => a.profileId === activeProfileId), newEntry, 'add');
    const otherAllocations = data.allocations.filter(a => a.profileId !== activeProfileId);
    
    setData(prev => ({
        ...prev,
        entries: [...prev.entries, newEntry],
        allocations: [...otherAllocations, ...updatedAllocations],
        recurringIncomeRecords: newRecurringRecord ? [...(prev.recurringIncomeRecords || []), newRecurringRecord] : prev.recurringIncomeRecords
    }));
  };

  const addPendingEntry = (entry: Omit<PendingEntry, 'id' | 'status' | 'submittedAt' | 'timestamp'> & { timestamp?: string; time?: string }) => {
      const { timestamp: calculatedTimestamp, time: effectiveTime } = buildEntryTimestamp(entry.date, entry.time);
      const newPending: PendingEntry = { 
          ...entry, 
          id: `pending_${Date.now()}`, 
          status: 'pending', 
          time: effectiveTime,
          submittedAt: new Date().toISOString(), 
          timestamp: entry.timestamp || calculatedTimestamp 
      };
      setData(prev => {
          if (activeProfileId === 'personal') {
              return { ...prev, profile: { ...prev.profile, pendingEntries: [...(prev.profile.pendingEntries || []), newPending] } };
          }
          return {
              ...prev,
              businesses: prev.businesses.map(b => b.id === activeProfileId ? { ...b, pendingEntries: [...(b.pendingEntries || []), newPending] } : b)
          };
      });
  };

  const approveEntry = (pendingId: string) => {
      let pending: PendingEntry | undefined;
      if (activeProfileId === 'personal') {
          pending = data.profile.pendingEntries?.find(p => p.id === pendingId);
      } else {
          const business = data.businesses.find(b => b.id === activeProfileId);
          if (business) pending = business.pendingEntries?.find(p => p.id === pendingId);
      }
      
      if(!pending) return;

      const effectiveTime = pending.time || getSystemTimeString();
      const realEntry: Entry = {
          id: Date.now().toString(), profileId: pending.profileId, date: pending.date, 
          time: effectiveTime,
          description: pending.description, amount: pending.amount,
          type: pending.type, category: pending.category, isDirectAllocation: pending.isDirectAllocation, 
          frequency: pending.frequency, incomeSourceType: pending.incomeSourceType,
          hoursWorked: pending.hoursWorked, submittedBy: pending.submittedBy, 
          originalAmount: pending.amount,
          originalCurrency: activeCurrencyCode,
          timestamp: pending.timestamp || buildEntryTimestamp(pending.date, effectiveTime).timestamp 
      };

      const updatedAllocations = modifyAllocations(data.allocations.filter(a => a.profileId === activeProfileId), realEntry, 'add');
      const otherAllocations = data.allocations.filter(a => a.profileId !== activeProfileId);

      setData(prev => {
          const newState = {
              ...prev,
              entries: [...prev.entries, realEntry],
              allocations: [...otherAllocations, ...updatedAllocations],
          };
          if (activeProfileId === 'personal') {
              newState.profile = { ...newState.profile, pendingEntries: newState.profile.pendingEntries?.filter(p => p.id !== pendingId) };
          } else {
              newState.businesses = newState.businesses.map(b => b.id === activeProfileId ? { ...b, pendingEntries: b.pendingEntries?.filter(p => p.id !== pendingId) } : b);
          }
          return newState;
      });
  };

  const rejectEntry = (pendingId: string) => {
       setData(prev => {
           if (activeProfileId === 'personal') {
               return { ...prev, profile: { ...prev.profile, pendingEntries: prev.profile.pendingEntries?.filter(p => p.id !== pendingId) } };
           }
           return {
               ...prev,
               businesses: prev.businesses.map(b => b.id === activeProfileId ? { ...b, pendingEntries: b.pendingEntries?.filter(p => p.id !== pendingId) } : b)
           };
       });
  };

  const updateEntry = (updatedEntry: Entry) => {
      const oldEntry = data.entries.find(e => e.id === updatedEntry.id);
      if (!oldEntry) return;
      const effectiveTime = (updatedEntry.time && updatedEntry.time.trim().length >= 4)
          ? updatedEntry.time.trim()
          : (oldEntry.time || getSystemTimeString());
      const { timestamp: finalTimestamp } = buildEntryTimestamp(updatedEntry.date, effectiveTime);
      const entryToSave: Entry = {
          ...updatedEntry,
          time: effectiveTime,
          timestamp: finalTimestamp
      };
      let tempAllocations = modifyAllocations(data.allocations.filter(a => a.profileId === activeProfileId), oldEntry, 'remove');
      tempAllocations = modifyAllocations(tempAllocations, entryToSave, 'add');
      const otherAllocations = data.allocations.filter(a => a.profileId !== activeProfileId);
      setData(prev => ({ ...prev, entries: prev.entries.map(e => e.id === entryToSave.id ? entryToSave : e), allocations: [...otherAllocations, ...tempAllocations] }));
  };

  const deleteEntry = (id: string) => {
      const entryToDelete = data.entries.find(e => e.id === id);
      if (!entryToDelete) return;
      
      const entriesToRemove = entryToDelete.transfer_id 
          ? data.entries.filter(e => e.transfer_id === entryToDelete.transfer_id)
          : [entryToDelete];

      const distIdToRemove = entryToDelete.transfer_id;

      setData(prev => {
          let currentAllocations = [...prev.allocations];
          
          for (const entry of entriesToRemove) {
              const entryAllocations = currentAllocations.filter(a => a.profileId === entry.profileId);
              const updatedAllocations = modifyAllocations(entryAllocations, entry, 'remove');
              const otherAllocations = currentAllocations.filter(a => a.profileId !== entry.profileId);
              currentAllocations = [...otherAllocations, ...updatedAllocations];
          }

          // Also revert any Claimed status in distributionRecords if it's a claim being deleted
          const newDistRecords = distIdToRemove 
              ? prev.distributionRecords?.filter(r => r.distributionId !== distIdToRemove)
              : prev.distributionRecords;

          console.log(`[deleteEntry] Removing ${entriesToRemove.length} entries for transfer ${distIdToRemove || 'N/A'}`);

          return { 
              ...prev, 
              entries: prev.entries.filter(e => !entriesToRemove.some(rem => rem.id === e.id)), 
              allocations: currentAllocations,
              distributionRecords: newDistRecords
          };
      });

      if (entryToDelete.subtype === 'DISTRIBUTION') {
          console.log(`Reverted distribution: ${distIdToRemove}`);
      }
  };

  const undoAction = useCallback(() => {
      setUndoStack(us => {
          if (us.length === 0) return us;
          const nextUndo = us.slice(0, -1);
          const previousData = us[us.length - 1];
          
          setRawData(currentRawData => {
              setRedoStack(rs => [...rs, currentRawData]);
              return previousData;
          });
          
          return nextUndo;
      });
  }, []);

  const redoAction = useCallback(() => {
      setRedoStack(rs => {
          if (rs.length === 0) return rs;
          const nextRedo = rs.slice(0, -1);
          const nextData = rs[rs.length - 1];
          
          setRawData(currentRawData => {
              setUndoStack(us => [...us, currentRawData]);
              return nextData;
          });
          
          return nextRedo;
      });
  }, []);

  const distributeFunds = () => {
      let currentAllocations = data.allocations.filter(a => a.profileId === activeProfileId);
      const uncatIndex = currentAllocations.findIndex(a => a.name === 'Uncategorized');
      
      const availableProfit = uncatIndex !== -1 ? currentAllocations[uncatIndex].balance : 0;
      
      if (availableProfit <= 0) {
          alert(`No profit available to allocate. Main Revenue Bucket balance: ${formatAmount(availableProfit)}`);
          return;
      }

      const input = window.prompt(`Enter amount to allocate from Main Revenue Bucket.\nCurrent available: ${formatAmount(availableProfit)}\n\n(Enter 'ALL' or a number):`, availableProfit.toString());
      
      if (!input) return; // User cancelled
      
      let amountToAllocate = availableProfit;
      if (input.toUpperCase() !== 'ALL') {
          amountToAllocate = parseFloat(input);
          if (isNaN(amountToAllocate) || amountToAllocate <= 0) {
              alert("Invalid amount entered.");
              return;
          }
      }

      if (amountToAllocate > availableProfit) {
          alert(`Error: Amount (${formatAmount(amountToAllocate)}) exceeds available profit (${formatAmount(availableProfit)}).`);
          return;
      }

      const liabilities = data.assets.filter(a => a.profileId === activeProfileId && a.type === 'liability' && (a.monthlyPayment || 0) > 0);
      
      let prioritizePayments = false;
      if (liabilities.length > 0) {
          prioritizePayments = window.confirm(`Detected active debt obligations. Do you want to prioritize debt payments before distributing the remaining funds?`);
      }

      const now = new Date();
      now.setFullYear(2026);
      const dateStr = now.toISOString().split('T')[0];
      const timestamp = now.toISOString();
      const timeStr = getSystemTimeString();

      setData(prev => {
          let updatedAllocations = prev.allocations.filter(a => a.profileId === activeProfileId);
          const currentUncatIndex = updatedAllocations.findIndex(a => a.name === 'Uncategorized');
          
          if (currentUncatIndex === -1 || updatedAllocations[currentUncatIndex].balance < amountToAllocate) return prev;

          let currentDistributableAmount = amountToAllocate;


          let newAssets = [...prev.assets];
          let newEntries = [...prev.entries];
          let newNotifications = [...prev.notifications];

          if (prioritizePayments) {
              const activeLiabilities = newAssets.filter(a => a.profileId === activeProfileId && a.type === 'liability' && (a.monthlyPayment || 0) > 0 && !a.autoRepayBucketId);
              
              activeLiabilities.forEach((liability, idx) => {
                  const amountDue = liability.monthlyPayment || 0;
                  if (amountDue > 0 && currentDistributableAmount >= amountDue) {
                      currentDistributableAmount -= amountDue;
                      updatedAllocations[currentUncatIndex].balance -= amountDue;
                      
                      const principalAmount = liability.initialAmount || liability.amount;
                      const principalPaid = liability.principalPaid || 0;
                      const interestRate = (liability.interestRate || 0) / 100;
                      const termType = liability.termType || 'monthly';
                      const paymentFrequency = liability.paymentFrequency || 'monthly';

                      let principalReturn = amountDue;
                      let interestIncome = 0;

                      const rateIsAnnual = liability.rateIsAnnual !== false;
                      if (termType === 'one_time') {
                          principalReturn = Math.min(amountDue, principalAmount - principalPaid);
                          interestIncome = amountDue - principalReturn;
                      } else if (termType === 'monthly' || termType === 'yearly') {
                          let monthlyRate = 0;
                          if (rateIsAnnual) {
                              const periodsPerYear = paymentFrequency === 'monthly' ? 12 : 1;
                              monthlyRate = interestRate / periodsPerYear;
                          } else {
                              let totalPeriods = liability.termValue || 1;
                              if (liability.termUnit === 'Years' && paymentFrequency === 'monthly') totalPeriods *= 12;
                              else if (liability.termUnit === 'Months' && paymentFrequency === 'yearly') totalPeriods = Math.max(1, totalPeriods / 12);
                              monthlyRate = interestRate / totalPeriods;
                          }
                          const expectedInterest = Math.max(0, (principalAmount - principalPaid) * monthlyRate);
                          interestIncome = Math.min(expectedInterest, amountDue);
                          principalReturn = amountDue - interestIncome;
                      }

                      const newPrincipalPaid = principalPaid + principalReturn;
                      const newInterestPaid = (liability.interestPaid || 0) + interestIncome;
                      let newBalance = liability.amount - amountDue;

                      let newNextDueDate = liability.nextDueDate;
                      if (newBalance > 0 && liability.termUnit !== 'One-Time' && liability.nextDueDate) {
                          const currentDue = new Date(liability.nextDueDate);
                          if (liability.termUnit === 'Months') {
                              currentDue.setMonth(currentDue.getMonth() + 1);
                          } else if (liability.termUnit === 'Years') {
                              currentDue.setFullYear(currentDue.getFullYear() + 1);
                          }
                          newNextDueDate = currentDue.toISOString().split('T')[0];
                      }

                      let newStatus = liability.loanStatus || 'active';
                      if (newPrincipalPaid >= principalAmount || newBalance <= 0) {
                          newStatus = 'completed';
                          newBalance = 0;
                      }

                      newAssets = newAssets.map(a => a.id === liability.id ? { 
                          ...a, 
                          amount: newBalance, 
                          nextDueDate: newNextDueDate,
                          principalPaid: newPrincipalPaid,
                          interestPaid: newInterestPaid,
                          loanStatus: newStatus,
                          monthlyPayment: newStatus === 'completed' ? 0 : a.monthlyPayment
                      } : a);
                      
                      if (liability.internalLoanId) {
                          const counterpartyAsset = newAssets.find(a => a.internalLoanId === liability.internalLoanId && a.id !== liability.id);
                          if (counterpartyAsset) {
                              newAssets = newAssets.map(a => a.id === counterpartyAsset.id ? { 
                                  ...a, 
                                  amount: newBalance,
                                  principalPaid: newPrincipalPaid,
                                  interestPaid: newInterestPaid,
                                  loanStatus: newStatus,
                                  monthlyIncome: newStatus === 'completed' ? 0 : a.monthlyIncome
                              } : a);
                              
                              if (principalReturn > 0) {
                                  newEntries.push({
                                      id: `repay_inc_prin_${Date.now()}_${idx}`,
                                      profileId: counterpartyAsset.profileId,
                                      date: dateStr,
                                      time: timeStr,
                                      timestamp,
                                      description: `Auto-Repayment Principal received from ${liability.description}`, 
                                      amount: principalReturn,
                                      type: 'transfer_in',
                                      subtype: 'INTERNAL_TRANSFER',
                                      category: 'Uncategorized',
                                      isDirectAllocation: true,
                                      isLoanTransaction: true,
                                      quadrant: 'B',
                                      effortLevel: 'None',
                                      hoursWorked: 0,
                                      submittedBy: 'System'
                                  });
                              }

                              if (interestIncome > 0) {
                                  newEntries.push({
                                      id: `repay_inc_int_${Date.now()}_${idx}`,
                                      profileId: counterpartyAsset.profileId,
                                      date: dateStr,
                                      time: timeStr,
                                      timestamp,
                                      description: `Auto-Repayment Interest received from ${liability.description}${newStatus === 'completed' ? ' (Repaid)' : ''}`, 
                                      amount: interestIncome,
                                      type: 'income',
                                      category: 'Uncategorized',
                                      isDirectAllocation: true,
                                      isLoanTransaction: true,
                                      quadrant: 'B',
                                      effortLevel: 'None',
                                      hoursWorked: 0,
                                      submittedBy: 'System'
                                  });
                              }
                          }
                      }
                      
                      if (principalReturn > 0) {
                          newEntries.push({
                              id: `repay_prin_${Date.now()}_${idx}`, 
                              profileId: activeProfileId, 
                              date: dateStr, 
                              time: timeStr,
                              timestamp,
                              description: `Auto-Repayment Principal - ${liability.description}`, 
                              amount: principalReturn, 
                              type: 'transfer_out', 
                              subtype: 'INTERNAL_TRANSFER',
                              category: 'Uncategorized',
                              isDirectAllocation: true,
                              quadrant: 'B', 
                              effortLevel: 'None', 
                              hoursWorked: 0, 
                              submittedBy: 'System'
                          });
                      }

                      if (interestIncome > 0) {
                          newEntries.push({
                              id: `repay_int_${Date.now()}_${idx}`, 
                              profileId: activeProfileId, 
                              date: dateStr, 
                              time: timeStr,
                              timestamp,
                              description: `Auto-Repayment Interest - ${liability.description}`, 
                              amount: interestIncome, 
                              type: 'expense', 
                              category: 'Uncategorized',
                              isDirectAllocation: true,
                              quadrant: 'B', 
                              effortLevel: 'None', 
                              hoursWorked: 0, 
                              submittedBy: 'System'
                          });
                      }

                      if (newStatus === 'completed') {
                          // No delete, just notification 

                          newNotifications.push({
                              id: `debt_cleared_${liability.id}`, 
                              profileId: activeProfileId, 
                              date: timestamp, 
                              title: "Debt Cleared! 🎉", 
                              message: `Congratulations! You have fully repaid '${liability.description}'.`, 
                              type: 'success', 
                              read: false, 
                              actionLink: 'balance_sheet'
                          });
                      }
                  }
              });
          }

          const breakdown = computeDistributionBreakdown(currentDistributableAmount, updatedAllocations);
          
          updatedAllocations = distributeAmountRecursive(currentDistributableAmount, updatedAllocations);

          newEntries.push({
              id: `profit_allocation_${Date.now()}`,
              profileId: activeProfileId,
              date: dateStr,
              time: timeStr,
              timestamp,
              description: `Profit Allocation from Main Revenue Bucket`,
              amount: currentDistributableAmount,
              type: 'profit_allocation' as any, // Not hitting P&L
              category: 'transfer', // Allocation category rule
              isDirectAllocation: true,
              quadrant: 'B',
              effortLevel: 'None',
              hoursWorked: 0,
              submittedBy: 'System',
              distributionBreakdown: breakdown
          } as any);

          const otherAllocations = prev.allocations.filter(a => a.profileId !== activeProfileId);
          
          setTimeout(() => alert(`Distribution Complete. Distributed to buckets: ${symbol}${currentDistributableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`), 100);

          return {
              ...prev,
              assets: newAssets,
              entries: newEntries,
              allocations: [...otherAllocations, ...updatedAllocations],
              notifications: newNotifications
          };
      });
  };

  const addAsset = (asset: Omit<Asset, 'id' | 'timestamp'>, funding?: { method: 'bucket' | 'liability', sourceId?: string, liabilityDetails?: any }) => {
    const timestamp = new Date().toISOString();
    const timeStr = getSystemTimeString();
    const assetId = Date.now().toString();
    
    let initialNextDueDate = asset.nextDueDate;
    if (asset.type === 'liability' && !initialNextDueDate) {
        const startDate = new Date(asset.date);
        if (asset.termUnit === 'Months') {
            startDate.setMonth(startDate.getMonth() + 1);
            initialNextDueDate = startDate.toISOString().split('T')[0];
        } else if (asset.termUnit === 'Years') {
            startDate.setFullYear(startDate.getFullYear() + 1);
            initialNextDueDate = startDate.toISOString().split('T')[0];
        } else if (asset.termUnit === 'One-Time') {
            initialNextDueDate = asset.repaymentDate || '';
        }
    }

    const newAsset: Asset = { 
        ...asset, 
        id: assetId, 
        profileId: activeProfileId, 
        timestamp,
        originalAmount: asset.originalAmount ?? asset.amount,
        originalCurrency: asset.originalCurrency ?? activeCurrencyCode,
        nextDueDate: initialNextDueDate 
    };

    setData(prev => {
        // !!! FIX: Ensure we are only looking at CURRENT PROFILE allocations for finding source bucket
        let allAllocations = [...prev.allocations];
        let currentProfileAllocations = allAllocations.filter(a => a.profileId === activeProfileId);
        
        let newEntries = [...prev.entries];
        let newAssets = [...prev.assets, newAsset];

        if (funding?.method === 'bucket' && funding.sourceId) {
            // Find bucket in current profile scope
            const bucketIndex = currentProfileAllocations.findIndex(a => a.id === funding.sourceId);
            
            if (bucketIndex > -1) {
                // Update specific allocation in the filtered list
                currentProfileAllocations[bucketIndex] = { 
                    ...currentProfileAllocations[bucketIndex], 
                    balance: currentProfileAllocations[bucketIndex].balance - asset.initialAmount 
                };
                
                // Get the correct bucket name for the expense entry
                const sourceBucketName = currentProfileAllocations[bucketIndex].name;

                // Sync back to main list
                allAllocations = allAllocations.map(a => a.id === funding.sourceId ? currentProfileAllocations[bucketIndex] : a);
                
                const expenseEntry: Entry = {
                    id: `exp_${assetId}`, 
                    profileId: activeProfileId, 
                    date: asset.date, 
                    time: timeStr,
                    timestamp, 
                    description: `Purchase of ${asset.description}`, 
                    amount: asset.initialAmount,
                    type: 'expense', 
                    category: sourceBucketName, // Use resolved name
                    isDirectAllocation: true, 
                    quadrant: activeProfileId === 'personal' ? 'I' : 'B', 
                    effortLevel: 'None', 
                    hoursWorked: 0, 
                    submittedBy: 'System'
                };
                newEntries.push(expenseEntry);
            }
        } else if (funding?.method === 'liability') {
             // ... Liability creation logic (unchanged)
             const principal = asset.initialAmount || asset.amount || 0;
             const interestRate = parseFloat(funding.liabilityDetails?.interestRate || '0');
             const totalOwed = principal + (principal * (interestRate / 100));

             let liabilityNextDueDate = '';
             const startDate = new Date(asset.date);
             if (funding.liabilityDetails?.termUnit === 'Months') {
                 startDate.setMonth(startDate.getMonth() + 1);
                 liabilityNextDueDate = startDate.toISOString().split('T')[0];
             } else if (funding.liabilityDetails?.termUnit === 'Years') {
                 startDate.setFullYear(startDate.getFullYear() + 1);
                 liabilityNextDueDate = startDate.toISOString().split('T')[0];
             } else if (funding.liabilityDetails?.termUnit === 'One-Time') {
                 liabilityNextDueDate = funding.liabilityDetails?.repaymentDate || '';
             }

             const liabilityId = `liab_${assetId}`;
             const liability: Asset = {
                 id: liabilityId, 
                 profileId: activeProfileId, 
                 date: asset.date, 
                 timestamp,
                 description: funding.liabilityDetails?.provider ? `Loan for ${asset.description} (${funding.liabilityDetails.provider})` : `Loan for ${asset.description}`,
                 amount: totalOwed, // Total owed including interest
                 initialAmount: principal,
                 type: 'liability',
                 interestRate: interestRate, 
                 termValue: funding.liabilityDetails?.termValue, 
                 termUnit: funding.liabilityDetails?.termUnit,
                 termType: funding.liabilityDetails?.termUnit === 'monthly' || funding.liabilityDetails?.termUnit === 'Months' ? 'monthly' : funding.liabilityDetails?.termUnit === 'yearly' || funding.liabilityDetails?.termUnit === 'Years' ? 'yearly' : 'one_time',
                 paymentFrequency: funding.liabilityDetails?.termUnit === 'monthly' || funding.liabilityDetails?.termUnit === 'Months' ? 'monthly' : funding.liabilityDetails?.termUnit === 'yearly' || funding.liabilityDetails?.termUnit === 'Years' ? 'yearly' : 'one_time',
                 principalPaid: 0,
                 interestPaid: 0,
                 loanStatus: 'active',
                 monthlyPayment: funding.liabilityDetails?.monthlyPayment, 
                 repaymentDate: funding.liabilityDetails?.repaymentDate,
                 nextDueDate: liabilityNextDueDate, 
                 linkedAssetId: assetId,
                 autoRepayBucketId: funding.liabilityDetails?.autoRepayBucketId,
                 isAutomated: true
             };
             newAssets.push(liability);
        }

        return {
            ...prev,
            assets: newAssets,
            allocations: allAllocations,
            entries: newEntries
        };
    });
  };

  // ... (Rest of functions unchanged: updateAsset, deleteAsset, repayLiability, switchCurrency)
  const updateAsset = (updatedAsset: Asset) => {
      if (updatedAsset.type === 'liability' && updatedAsset.amount <= 0) {
          if(window.confirm(`${updatedAsset.description} balance is 0. Mark as fully repaid and archive?`)) { deleteAsset(updatedAsset.id); return; }
      }
      setData(prev => ({ ...prev, assets: prev.assets.map(a => a.id === updatedAsset.id ? updatedAsset : a) }));
  };

  const deleteAsset = (id: string) => {
      setData(prev => {
          const assetToDelete = prev.assets.find(a => a.id === id);
          
          let newEntries = prev.entries;
          // Note: we no longer modify past recurring entries so history is preserved.
          
          if (assetToDelete?.internalLoanId) {
              return { ...prev, assets: prev.assets.filter(a => a.internalLoanId !== assetToDelete.internalLoanId), entries: newEntries };
          }
          return { ...prev, assets: prev.assets.filter(a => a.id !== id), entries: newEntries };
      });
  };

  const repayLiability = (liabilityId: string, inputAmount: number, sourceBucketId: string) => {
      const liability = data.assets.find(a => a.id === liabilityId);
      const bucket = data.allocations.find(a => a.id === sourceBucketId);
      
      if (!liability || !bucket) return;
      
      let amount = Number(inputAmount);
      if (isNaN(amount) || amount <= 0) return;
      
      const principalAmount = liability.initialAmount || liability.amount;
      const principalPaid = liability.principalPaid || 0;
      const interestRate = (liability.interestRate || 0) / 100;
      const rateIsAnnual = liability.rateIsAnnual !== false;
      const termMonths = liability.termUnit === 'yearly' || liability.termUnit === 'Years' 
          ? (liability.termValue || 1) * 12 
          : (liability.termUnit === 'one_time' || liability.termUnit === 'One-Time' ? 1 : (liability.termValue || 1));

      let expectedInterestToCharge = 0;
      let totalInterest = 0;
      if (rateIsAnnual) {
          totalInterest = principalAmount * interestRate * (termMonths / 12);
      } else {
          totalInterest = principalAmount * interestRate;
      }

      if (liability.termUnit === 'one_time' || liability.termUnit === 'One-Time') {
          expectedInterestToCharge = totalInterest; // All at once
      } else {
          expectedInterestToCharge = termMonths > 0 ? totalInterest / termMonths : 0;
      }

      const remainingPrincipal = Math.max(0, principalAmount - principalPaid);
      if (amount > remainingPrincipal + expectedInterestToCharge) {
          amount = remainingPrincipal + expectedInterestToCharge;
      }

      const now = new Date();
      now.setFullYear(2026);
      const dateStr = now.toISOString().split('T')[0];
      const timestamp = now.toISOString();
      const timeStr = getSystemTimeString();

      let principalReturn = 0;
      let interestIncome = 0;

      if (liability.termUnit === 'one_time' || liability.termUnit === 'One-Time') {
          principalReturn = Math.min(amount, remainingPrincipal);
          interestIncome = amount - principalReturn;
      } else {
          interestIncome = Math.min(expectedInterestToCharge, amount);
          principalReturn = amount - interestIncome;
          if (principalReturn > remainingPrincipal) {
              principalReturn = remainingPrincipal;
          }
      }

      const newPrincipalPaid = principalPaid + principalReturn;
      const newInterestPaid = (liability.interestPaid || 0) + interestIncome;
      let newBalance = liability.amount - (principalReturn + interestIncome);

      let newNextDueDate = liability.nextDueDate;
      if (newBalance > 0 && liability.termUnit !== 'One-Time' && liability.nextDueDate) {
          const currentDue = new Date(liability.nextDueDate);
          const unit = (liability.termUnit || 'monthly').toLowerCase();
          if (unit === 'monthly' || unit === 'months') currentDue.setMonth(currentDue.getMonth() + 1);
          else if (unit === 'weekly') currentDue.setDate(currentDue.getDate() + 7);
          else if (unit === 'biweekly') currentDue.setDate(currentDue.getDate() + 14);
          else if (unit === 'quarterly') currentDue.setMonth(currentDue.getMonth() + 3);
          else if (unit === 'biannual') currentDue.setMonth(currentDue.getMonth() + 6);
          else if (unit === 'yearly' || unit === 'years') currentDue.setFullYear(currentDue.getFullYear() + 1);
          else currentDue.setMonth(currentDue.getMonth() + 1); // fallback
          newNextDueDate = currentDue.toISOString().split('T')[0];
      }

      let newStatus = liability.loanStatus || 'active';
      if (newPrincipalPaid >= principalAmount || newBalance <= 0) {
          newStatus = 'completed';
          newBalance = 0;
      }

      setData(prev => {
          const currentBucket = prev.allocations.find(a => a.id === sourceBucketId);
          if (!currentBucket || currentBucket.balance < amount) {
              const displayName = currentBucket?.name === 'Uncategorized' ? (activeProfileId !== 'personal' ? 'Main Revenue Bucket' : 'Main Income Bucket') : currentBucket?.name;
              setTimeout(() => {
                  window.alert(`Bucket '${displayName}' has insufficient funds. Cannot overdraw bucket.`);
              }, 10);
              return prev;
          }

          let updatedAssets = prev.assets.map(a => a.id === liabilityId ? { 
              ...a, 
              amount: newBalance, 
              nextDueDate: newNextDueDate,
              principalPaid: newPrincipalPaid,
              interestPaid: newInterestPaid,
              loanStatus: newStatus,
              monthlyPayment: newStatus === 'completed' ? 0 : a.monthlyPayment
          } : a);
          const updatedAllocations = prev.allocations.map(a => a.id === sourceBucketId ? { ...a, balance: a.balance - amount } : a);
          
          let newEntries = [...prev.entries];

          // Principal exit - Transfer (Internal)
          if (principalReturn > 0) {
              newEntries.push({
                  id: `repay_prin_${Date.now()}`, 
                  profileId: activeProfileId, 
                  date: dateStr, 
                  time: timeStr,
                  timestamp,
                  description: `Loan Principal Return - ${liability.description}`, 
                  amount: principalReturn, 
                  type: 'transfer_out', 
                  subtype: 'INTERNAL_TRANSFER',
                  category: bucket.name,
                  isDirectAllocation: true,
                  isLoanTransaction: true,
                  quadrant: 'B', 
                  effortLevel: 'None', 
                  hoursWorked: 0, 
                  submittedBy: 'System'
              });
          }

          // Interest exit - Expense
          if (interestIncome > 0) {
              newEntries.push({
                  id: `repay_int_${Date.now()}`, 
                  profileId: activeProfileId, 
                  date: dateStr, 
                  time: timeStr,
                  timestamp,
                  description: `Loan Interest Paid - ${liability.description}`, 
                  amount: interestIncome, 
                  type: 'expense', 
                  category: bucket.name,
                  isDirectAllocation: true,
                  isLoanTransaction: true,
                  quadrant: 'B', 
                  effortLevel: 'None', 
                  hoursWorked: 0, 
                  submittedBy: 'System'
              });
          }

          if (liability.internalLoanId) {
              const counterpartyAsset = updatedAssets.find(a => a.internalLoanId === liability.internalLoanId && a.id !== liabilityId);
              if (counterpartyAsset) {
                  updatedAssets = updatedAssets.map(a => a.id === counterpartyAsset.id ? { 
                      ...a, 
                      amount: newBalance,
                      principalPaid: newPrincipalPaid,
                      interestPaid: newInterestPaid,
                      loanStatus: newStatus,
                      monthlyIncome: newStatus === 'completed' ? 0 : a.monthlyIncome
                  } : a);
                  
                  if (principalReturn > 0) {
                      newEntries.push({
                          id: `repay_inc_prin_${Date.now()}`,
                          profileId: counterpartyAsset.profileId,
                          date: dateStr,
                          time: timeStr,
                          timestamp,
                          description: `Principal Received from ${liability.description}`, 
                          amount: principalReturn,
                          type: 'transfer_in',
                          subtype: 'INTERNAL_TRANSFER',
                          category: 'Uncategorized',
                          isDirectAllocation: true,
                          isLoanTransaction: true,
                          quadrant: 'B',
                          effortLevel: 'None',
                          hoursWorked: 0,
                          submittedBy: 'System'
                      });
                  }

                  if (interestIncome > 0) {
                      newEntries.push({
                          id: `repay_inc_int_${Date.now()}`,
                          profileId: counterpartyAsset.profileId,
                          date: dateStr,
                          time: timeStr,
                          timestamp,
                          description: `Interest Income Received from ${liability.description}${newStatus === 'completed' ? ' (Repaid)' : ''}`, 
                          amount: interestIncome,
                          type: 'income',
                          category: 'Uncategorized',
                          isDirectAllocation: true,
                          isLoanTransaction: true,
                          quadrant: 'B',
                          effortLevel: 'None',
                          hoursWorked: 0,
                          submittedBy: 'System'
                      });
                  }
                  
                  const counterpartyBucket = prev.allocations.find(a => a.profileId === counterpartyAsset.profileId && a.name === 'Uncategorized');
                  if (counterpartyBucket) {
                     const idx = updatedAllocations.findIndex(a => a.id === counterpartyBucket.id);
                     if (idx !== -1) {
                         updatedAllocations[idx] = { ...updatedAllocations[idx], balance: updatedAllocations[idx].balance + amount };
                     } else {
                         updatedAllocations.push({ ...counterpartyBucket, balance: counterpartyBucket.balance + amount });
                     }
                  } else {
                     updatedAllocations.push({
                         id: `uncat_${counterpartyAsset.profileId}`,
                         profileId: counterpartyAsset.profileId,
                         name: 'Uncategorized',
                         percentage: 0,
                         balance: amount
                     });
                  }
              }
          }

          let finalAssets = updatedAssets;
          let newNotifications = [...prev.notifications];
          
          if (newStatus === 'completed') {
              // Note: We don't delete the liability so that history and completed state remains.
              // Just mark as completed so the UI can filter it.
              
              newNotifications.push({
                  id: `debt_cleared_${liabilityId}`, 
                  profileId: activeProfileId, 
                  date: timestamp, 
                  title: "Debt Cleared! 🎉", 
                  message: `Congratulations! You have fully repaid '${liability.description}'.`, 
                  type: 'success', 
                  read: false, 
                  actionLink: 'balance_sheet'
              });
          }

          return {
              ...prev,
              assets: finalAssets,
              allocations: updatedAllocations,
              entries: newEntries,
              notifications: newNotifications
          };
      });
  };

  const completeGoal = (goalId: string) => {
      const targetGoal = data.goals.find(g => g.id === goalId);
      if (!targetGoal || targetGoal.isAchieved) return;

      const bucket = data.allocations.find(a => a.id === targetGoal.linkedAllocationId);
      
      const now = new Date();
      now.setFullYear(2026);
      const dateStr = now.toISOString().split('T')[0];
      const timestamp = now.toISOString();
      const timeStr = getSystemTimeString();

      setData(prev => {
          let updatedAllocations = prev.allocations;
          let newEntries = [...prev.entries];
          
          if (bucket) {
              if (bucket.balance < targetGoal.targetAmount) {
                  const displayName = bucket.name === 'Uncategorized' ? (activeProfileId !== 'personal' ? 'Main Revenue Bucket' : 'Main Income Bucket') : bucket.name;
                  if (!window.confirm(`Bucket '${displayName}' has insufficient funds (${formatAmount(bucket.balance)}). Proceed to purchase anyway?`)) {
                      return prev;
                  }
              }

              updatedAllocations = prev.allocations.map(a => 
                  a.id === bucket.id ? { ...a, balance: a.balance - targetGoal.targetAmount } : a
              );

              const purchaseEntry: Entry = {
                  id: `goal_achieve_${Date.now()}`,
                  profileId: targetGoal.profileId,
                  date: dateStr,
                  time: timeStr,
                  timestamp,
                  description: `Goal Achieved: ${targetGoal.title}`,
                  amount: targetGoal.targetAmount,
                  type: 'expense',
                  category: bucket.name,
                  isDirectAllocation: true,
                  quadrant: 'E',
                  effortLevel: 'None',
                  hoursWorked: 0,
                  submittedBy: 'System',
                  linkedGoalId: goalId
              };
              newEntries.push(purchaseEntry);
          }

          const updatedGoals = prev.goals.map(g => 
              g.id === goalId ? { ...g, isAchieved: true, currentAmount: bucket ? g.targetAmount : g.currentAmount } : g
          );

          const newNotifications = [...prev.notifications, {
              id: `goal_done_${goalId}`, 
              profileId: targetGoal.profileId, 
              date: timestamp, 
              title: "Goal Reached! 🌟", 
              message: `You successfully achieved and completed '${targetGoal.title}'.`, 
              type: 'success', 
              read: false, 
              actionLink: 'goals'
          }];

          return {
              ...prev,
              allocations: updatedAllocations,
              entries: newEntries,
              goals: updatedGoals,
              notifications: newNotifications
          };
      });
  };

  const uncompleteGoal = (goalId: string) => {
      const linkedEntry = data.entries.find(e => e.linkedGoalId === goalId);
      if (linkedEntry) {
          deleteEntry(linkedEntry.id); // Triggers refund naturally
      }

      setData(prev => ({
          ...prev,
          goals: prev.goals.map(g => g.id === goalId ? { ...g, isAchieved: false } : g)
      }));
  };

  const addGoal = (goal: Omit<Goal, 'id' | 'profileId'>) => {
      setData(prev => ({
          ...prev,
          goals: [...(prev.goals || []), { 
              ...goal, 
              id: Date.now().toString(), 
              profileId: activeProfileId,
              originalTargetAmount: goal.originalTargetAmount ?? goal.targetAmount,
              originalCurrentAmount: goal.originalCurrentAmount ?? goal.currentAmount,
              originalCurrency: goal.originalCurrency ?? activeCurrencyCode
          } as Goal]
      }));
  };

  const updateGoal = (updatedGoal: Goal) => {
      const oldGoal = data.goals.find(g => g.id === updatedGoal.id);
      if (!oldGoal) return;

      let requiresUncomplete = false;

      // Condition: It was achieved, but they changed the target amount or category/etc and we want to enforce reversing it.
      if (oldGoal.isAchieved && updatedGoal.targetAmount !== oldGoal.targetAmount) {
          requiresUncomplete = true;
          updatedGoal.isAchieved = false;
          alert(`Target amount changed. Goal '${updatedGoal.title}' has been automatically reversed and un-completed. Money returned to bucket.`);
      }

      setData(prev => ({ ...prev, goals: prev.goals.map(g => g.id === updatedGoal.id ? updatedGoal : g) }));

      if (requiresUncomplete) {
          setTimeout(() => uncompleteGoal(updatedGoal.id), 50);
      }
  };

  const deleteGoal = (goalId: string) => {
      const linkedEntry = data.entries.find(e => e.linkedGoalId === goalId);
      if (linkedEntry) deleteEntry(linkedEntry.id);

      setData(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== goalId) }));
  };

  const deleteNotification = (id: string) => {
      setData(prev => ({
          ...prev,
          notifications: prev.notifications.filter(n => n.id !== id)
      }));
  };

  const switchCurrency = (profileId: string, newCurrency: string, profileOverrides?: Partial<UserProfile>) => {
      let oldCurrency = profileId === 'personal' ? data.profile.currency : data.businesses.find(b => b.id === profileId)?.currency || 'USD';
      if (oldCurrency === newCurrency && !profileOverrides) return false;

      setData(prev => {
          const newData = { ...prev };
          const converter = (amount: number) => convertCurrency(amount, oldCurrency, newCurrency);

          if (profileId === 'personal') { 
              const origFreedom = newData.profile.originalFreedomTarget ?? newData.profile.freedomTarget;
              const origCurr = newData.profile.originalCurrency || oldCurrency;
              newData.profile = { 
                  ...newData.profile, 
                  ...profileOverrides, 
                  currency: newCurrency,
                  originalFreedomTarget: origFreedom,
                  originalCurrency: origCurr,
                  freedomTarget: newCurrency === origCurr ? origFreedom : (origFreedom ? convertCurrency(origFreedom, origCurr, newCurrency) : 0)
              }; 
          } else { 
              newData.businesses = newData.businesses.map(b => {
                  if (b.id !== profileId) return b;
                  const origCurr = b.originalCurrency || oldCurrency;
                  const origRev = b.originalRevenueTarget ?? b.revenueTarget;
                  const origProf = b.originalProfitTarget ?? b.profitTarget;
                  const origMonthRev = b.originalMonthlyRevenueTarget ?? b.monthlyRevenueTarget;
                  const origMonthProf = b.originalMonthlyProfitTarget ?? b.monthlyProfitTarget;
                  return {
                      ...b,
                      currency: newCurrency,
                      originalCurrency: origCurr,
                      originalRevenueTarget: origRev,
                      originalProfitTarget: origProf,
                      originalMonthlyRevenueTarget: origMonthRev,
                      originalMonthlyProfitTarget: origMonthProf,
                      revenueTarget: newCurrency === origCurr ? origRev : (origRev ? convertCurrency(origRev, origCurr, newCurrency) : 0),
                      profitTarget: newCurrency === origCurr ? origProf : (origProf ? convertCurrency(origProf, origCurr, newCurrency) : 0),
                      monthlyRevenueTarget: newCurrency === origCurr ? origMonthRev : (origMonthRev ? convertCurrency(origMonthRev, origCurr, newCurrency) : 0),
                      monthlyProfitTarget: newCurrency === origCurr ? origMonthProf : (origMonthProf ? convertCurrency(origMonthProf, origCurr, newCurrency) : 0)
                  };
              }); 
          }

          if (oldCurrency !== newCurrency) {
              const oldSymbol = CURRENCY_SYMBOLS[oldCurrency] || '$';
              const newSymbol = CURRENCY_SYMBOLS[newCurrency] || '$';
              const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const symbolRegex = new RegExp(escapeRegExp(oldSymbol) + '([0-9,]+(\\.[0-9]+)?)', 'g');

              newData.entries = newData.entries.map(e => {
                  if (e.profileId !== profileId) return e;
                  
                  let newEntry = { ...e };
                  const origCurr = e.originalCurrency || oldCurrency;
                  const origAmt = e.originalAmount ?? e.amount;
                  newEntry.originalAmount = origAmt;
                  newEntry.originalCurrency = origCurr;
                  
                  if (e.baseCurrency && e.baseAmount != null) {
                      if (e.type === 'transfer_out' || (e.subtype === 'DISTRIBUTION' && e.type === 'expense')) {
                          // Sender profile
                          const senderOrigCurr = e.originalCurrency || e.baseCurrency || oldCurrency;
                          const senderOrigAmt = e.originalAmount ?? e.baseAmount;
                          newEntry.originalAmount = senderOrigAmt;
                          newEntry.originalCurrency = senderOrigCurr;
                          newEntry.baseAmount = newCurrency === senderOrigCurr ? senderOrigAmt : convertCurrency(senderOrigAmt, senderOrigCurr, newCurrency);
                          newEntry.baseCurrency = newCurrency;
                          newEntry.amount = newEntry.baseAmount;
                      } else if (e.type === 'transfer_in' || (e.subtype === 'DISTRIBUTION' && e.type === 'income')) {
                          // Receiver profile
                          newEntry.amount = newCurrency === e.baseCurrency ? e.baseAmount : convertCurrency(e.baseAmount, e.baseCurrency, newCurrency);
                      } else {
                          newEntry.amount = newCurrency === origCurr ? origAmt : convertCurrency(origAmt, origCurr, newCurrency);
                      }
                  } else {
                     newEntry.amount = newCurrency === origCurr ? origAmt : convertCurrency(origAmt, origCurr, newCurrency);
                  }
                  
                  return newEntry;
              });

              // Apply the same logic globally to any linked entries whose sender just changed currency
              newData.entries = newData.entries.map(e => {
                  if (e.profileId === profileId) return e;
                  if ((e.type === 'transfer_in' || (e.subtype === 'DISTRIBUTION' && e.type === 'income')) && e.from_entity_id === profileId && e.baseCurrency === oldCurrency && e.baseAmount != null) {
                      const newBaseAmount = converter(e.baseAmount);
                      return { ...e, baseAmount: newBaseAmount, baseCurrency: newCurrency };
                  }
                  return e;
              });

              newData.assets = newData.assets.map(a => {
                  if (a.profileId !== profileId) return a;
                  if (a.type === 'business_equity') return a;
                  const origCurr = a.originalCurrency || oldCurrency;
                  const origAmt = a.originalAmount ?? a.amount;
                  const origInit = a.originalInitialAmount ?? (a.initialAmount || 0);
                  const origIncome = a.originalMonthlyIncome ?? (a.monthlyIncome || 0);
                  const origPayment = a.originalMonthlyPayment ?? (a.monthlyPayment || 0);
                  return { 
                      ...a, 
                      originalAmount: origAmt,
                      originalCurrency: origCurr,
                      originalInitialAmount: origInit,
                      originalMonthlyIncome: origIncome,
                      originalMonthlyPayment: origPayment,
                      amount: newCurrency === origCurr ? origAmt : convertCurrency(origAmt, origCurr, newCurrency), 
                      initialAmount: newCurrency === origCurr ? origInit : (origInit ? convertCurrency(origInit, origCurr, newCurrency) : 0), 
                      monthlyIncome: newCurrency === origCurr ? origIncome : (origIncome ? convertCurrency(origIncome, origCurr, newCurrency) : 0), 
                      monthlyPayment: newCurrency === origCurr ? origPayment : (origPayment ? convertCurrency(origPayment, origCurr, newCurrency) : 0) 
                  };
              });

              newData.investments = newData.investments.map(i => {
                  if (i.profileId !== profileId) return i;
                  const origCurr = i.originalCurrency || oldCurrency;
                  const origInit = i.originalInitialValue ?? i.initialValue;
                  const origCurrVal = i.originalCurrentValue ?? i.currentValue;
                  const origPassive = i.originalPassiveIncome ?? (i.monthlyPassiveIncome || 0);
                  return { 
                      ...i, 
                      originalInitialValue: origInit,
                      originalCurrentValue: origCurrVal,
                      originalPassiveIncome: origPassive,
                      originalCurrency: origCurr,
                      initialValue: newCurrency === origCurr ? origInit : convertCurrency(origInit, origCurr, newCurrency), 
                      currentValue: newCurrency === origCurr ? origCurrVal : convertCurrency(origCurrVal, origCurr, newCurrency), 
                      monthlyPassiveIncome: newCurrency === origCurr ? origPassive : (origPassive ? convertCurrency(origPassive, origCurr, newCurrency) : 0) 
                  };
              });

              newData.goals = newData.goals.map(g => {
                  if (g.profileId !== profileId) return g;
                  const origCurr = g.originalCurrency || oldCurrency;
                  const origTarget = g.originalTargetAmount ?? g.targetAmount;
                  const origCurrent = g.originalCurrentAmount ?? g.currentAmount;
                  return { 
                      ...g, 
                      originalTargetAmount: origTarget,
                      originalCurrentAmount: origCurrent,
                      originalCurrency: origCurr,
                      targetAmount: newCurrency === origCurr ? origTarget : convertCurrency(origTarget, origCurr, newCurrency), 
                      currentAmount: newCurrency === origCurr ? origCurrent : convertCurrency(origCurrent, origCurr, newCurrency) 
                  };
              });

              newData.allocations = newData.allocations.map(a => {
                  if (a.profileId !== profileId) return a;
                  const origCurr = a.originalCurrency || oldCurrency;
                  const origBal = a.originalBalance ?? a.balance;
                  return { 
                      ...a, 
                      originalBalance: origBal,
                      originalCurrency: origCurr,
                      balance: newCurrency === origCurr ? origBal : convertCurrency(origBal, origCurr, newCurrency) 
                  };
              });

              if (newData.distributionRecords) {
                  newData.distributionRecords = newData.distributionRecords.map(dr => dr.businessId === profileId ? { ...dr, amount: converter(dr.amount) } : dr);
              }
              newData.notifications = newData.notifications.map(n => n.profileId === profileId ? { ...n, message: n.message.replace(symbolRegex, (match, numberStr) => {
                  const num = parseFloat(numberStr.replace(/,/g, ''));
                  if (isNaN(num)) return match;
                  return newSymbol + converter(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              }) } : n);
          }
          
          return newData;
      });
      return true;
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <RouteErrorBoundary key={refreshKey}><div className="h-full"><DashboardView /></div></RouteErrorBoundary>;
      case 'ownership': return <RouteErrorBoundary key={refreshKey}><div className="h-full"><OwnershipGraphView /></div></RouteErrorBoundary>;
      case 'income_statement': return <RouteErrorBoundary key={refreshKey}><TransactionsView /></RouteErrorBoundary>;
      case 'balance_sheet': return <RouteErrorBoundary key={refreshKey}><AssetsView /></RouteErrorBoundary>;
      case 'quadrant': return <RouteErrorBoundary key={refreshKey}><div className="h-full"><QuadrantView /></div></RouteErrorBoundary>;
      case 'goals': return <RouteErrorBoundary key={refreshKey}><GoalsView /></RouteErrorBoundary>;
      case 'analytics': return <RouteErrorBoundary key={refreshKey}><AnalyticsView /></RouteErrorBoundary>;
      case 'ai': return <RouteErrorBoundary key={refreshKey}><AIAdvisorView /></RouteErrorBoundary>;
      case 'learning': return <RouteErrorBoundary key={refreshKey}><LearningView /></RouteErrorBoundary>;
      case 'settings': return <RouteErrorBoundary key={refreshKey}><SettingsView /></RouteErrorBoundary>;
      case 'notifications': return <RouteErrorBoundary key={refreshKey}><NotificationsView /></RouteErrorBoundary>;
      case 'claim': return <RouteErrorBoundary key={refreshKey}><ClaimView /></RouteErrorBoundary>;
      case 'import': return <RouteErrorBoundary key={refreshKey}><ImportView /></RouteErrorBoundary>;
      default: return <RouteErrorBoundary key={refreshKey}><div className="h-full"><DashboardView /></div></RouteErrorBoundary>;
    }
  };

  const getPageTitle = () => {
      if (currentView === 'income_statement') return 'Income Statement';
      if (currentView === 'balance_sheet') return 'Balance Sheet';
      if (currentView === 'quadrant') return 'ESBI Quadrant';
      if (currentView === 'ai') return 'Intelligent Advisor';
      return currentView.charAt(0).toUpperCase() + currentView.slice(1);
  }

  const effectiveRole = simulatedUser?.accessLevel || data.profile.role || 'admin';

  useEffect(() => {
      if (effectiveRole === 'finance_staff') {
          const restrictedViews = ['balance_sheet', 'quadrant', 'goals', 'analytics', 'ai', 'learning'];
          if (restrictedViews.includes(currentView)) {
              setCurrentView('dashboard');
          }
      }
  }, [effectiveRole, currentView]);

  // --- CLOCK STATE ---
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const updateTime = () => {
        const realDate = new Date();
        realDate.setFullYear(2026); // Sim Year
        setNow(realDate);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

  const unreadNotifications = filteredData.notifications.filter(n => !n.read && n.profileId === activeProfileId);
  const dangerCount = unreadNotifications.filter(n => n.type === 'danger').length;
  const warningCount = unreadNotifications.filter(n => n.type === 'warning').length;
  const successCount = unreadNotifications.filter(n => n.type === 'success').length;
  let bellColorClass = 'text-gray-400 dark:text-gray-500';
  let pulseClass = '';
  
  if (unreadNotifications.length > 0) {
      if (dangerCount > 0) {
          bellColorClass = 'text-red-500';
          pulseClass = 'animate-pulse';
      } else if (warningCount > 0) {
          bellColorClass = 'text-yellow-500';
          pulseClass = 'animate-pulse';
      } else if (successCount > 0) {
          bellColorClass = 'text-green-500';
      } else {
          bellColorClass = 'text-blue-500';
      }
  }

    return (
      <>
        <AnimatePresence>
          {!hasEnteredApp && (
            <LandingSplash onEnter={() => {
                setHasEnteredApp(true);
                sessionStorage.setItem('bquad_entered', 'true');
            }} />
          )}
        </AnimatePresence>
        {hasEnteredApp && (
          <AppContext.Provider value={{ 
        data, setData, activeProfileId, setActiveProfileId, timeFilter, setTimeFilter,
        addEntry, addTransfer, distributeBusinessProfit, addPendingEntry, approveEntry, rejectEntry, updateEntry, deleteEntry,
        addAsset, updateAsset, deleteAsset, repayLiability, distributeFunds, 
        undoDistribution: undoAction, redoDistribution: redoAction, canUndoDistribution: undoStack.length > 0, canRedoDistribution: redoStack.length > 0,
        undoCount: undoStack.length, redoCount: redoStack.length,
        addGoal, updateGoal, deleteGoal, completeGoal, uncompleteGoal, deleteNotification, switchCurrency, navigate,
        currentView, setCurrentView, requestedTab, setRequestedTab, claimTokenUrl, importTokenUrl, filteredData, profileData, metrics, activeCurrencyCode, symbol, fullCurrencyName, formatAmount, notifications: filteredData.notifications,
        simulatedUser, setSimulatedUser, effectiveRole,
        isTourOpen, setTourOpen,
        openCalculator,
        openCurrencyConverter,
        isPrivacyMode, togglePrivacyMode, engine, transactionEngine, modifyAllocations,
        updateOwnershipEdges,
        updateDistributionSequence,
        updateRecurringIncomeSequence,
        deleteRecurringIncomeSequence,
        reLogRecurringIncome,
        setRefreshKey,
        syncStatus,
        peerCount,
        lastSyncedAt,
        isSyncing,
        pushSyncData,
        pullSyncData,
        connectSyncKey,
        redeemBusinessRoleKey
    }}>
      <div className="h-screen flex overflow-hidden text-gray-800 dark:text-gray-200 font-sans">
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 mb-6" data-tour="app-logo">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold"><TrendingUp size={20} /></div>
              <h1 className="text-xl flex-1 font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">B-Quadrant OS</h1>
              <button type="button" aria-label="Close menu" onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19}/></button>
            </div>
            
            <nav aria-label="Main navigation" className="space-y-1">
              <NavItem view="dashboard" icon={LayoutDashboard} label="Overview" tourId="nav-dashboard" currentView={currentView} setCurrentView={setCurrentView} setSidebarOpen={setSidebarOpen} filteredData={filteredData} />
              <div className="pt-5 pb-1.5 text-[10px] font-extrabold tracking-[.15em] text-slate-400 dark:text-slate-500 px-3 uppercase">Money</div>
              <NavItem view="income_statement" icon={FileText} label="Income & expenses" tourId="nav-income" currentView={currentView} setCurrentView={setCurrentView} setSidebarOpen={setSidebarOpen} filteredData={filteredData} />
              <NavItem view="balance_sheet" icon={Landmark} label="Assets & liabilities" disabled={effectiveRole === 'finance_staff'} tourId="nav-balance" currentView={currentView} setCurrentView={setCurrentView} setSidebarOpen={setSidebarOpen} filteredData={filteredData} />
              <div className="pt-5 pb-1.5 text-[10px] font-extrabold tracking-[.15em] text-slate-400 dark:text-slate-500 px-3 uppercase">Plan & understand</div>
              <NavItem view="goals" icon={Target} label="Goals" disabled={effectiveRole === 'finance_staff'} tourId="nav-goals" currentView={currentView} setCurrentView={setCurrentView} setSidebarOpen={setSidebarOpen} filteredData={filteredData} />
              <NavItem view="analytics" icon={TrendingUp} label="Analytics" disabled={effectiveRole === 'finance_staff'} tourId="nav-analytics" currentView={currentView} setCurrentView={setCurrentView} setSidebarOpen={setSidebarOpen} filteredData={filteredData} />
              <NavItem view="ownership" icon={Network} label="Ownership" tourId="nav-ownership-graph" currentView={currentView} setCurrentView={setCurrentView} setSidebarOpen={setSidebarOpen} filteredData={filteredData} />
              <NavItem view="quadrant" icon={PieChart} label="ESBI Quadrant" disabled={effectiveRole === 'finance_staff'} tourId="nav-quadrant" currentView={currentView} setCurrentView={setCurrentView} setSidebarOpen={setSidebarOpen} filteredData={filteredData} />
              {effectiveRole !== 'finance_staff' && <>
                <div className="pt-5 pb-1.5 text-[10px] font-extrabold tracking-[.15em] text-slate-400 dark:text-slate-500 px-3 uppercase">Guidance</div>
                <NavItem view="ai" icon={Bot} label="Intelligent Advisor" tourId="nav-ai" currentView={currentView} setCurrentView={setCurrentView} setSidebarOpen={setSidebarOpen} filteredData={filteredData} />
                <NavItem view="learning" icon={BookOpen} label="Learning" tourId="nav-learning" currentView={currentView} setCurrentView={setCurrentView} setSidebarOpen={setSidebarOpen} filteredData={filteredData} />
              </>}
              <div className="pt-5 pb-1.5 text-[10px] font-extrabold tracking-[.15em] text-slate-400 dark:text-slate-500 px-3 uppercase">Your workspace</div>
              <NavItem view="notifications" icon={Bell} label="Notifications" tourId="nav-notifications" currentView={currentView} setCurrentView={setCurrentView} setSidebarOpen={setSidebarOpen} filteredData={filteredData} />
              <NavItem view="settings" icon={Settings} label="Settings & backup" disabled={!!simulatedUser} tourId="nav-settings" currentView={currentView} setCurrentView={setCurrentView} setSidebarOpen={setSidebarOpen} filteredData={filteredData} />
              <button type="button" onClick={() => { setTourOpen(true); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"><HelpCircle size={20}/><span className="font-medium">Help & manual</span></button>
            </nav>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
             <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 font-medium">{isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}<span>{isSaving ? 'Saving...' : 'Auto-saved'}</span></div>
          </div>
        </aside>
        <main className="flex-1 flex flex-col lg:ml-64 relative h-screen overflow-y-auto overflow-x-hidden">
          {simulatedUser && (
              <div className="bg-orange-500 text-white px-4 py-2 flex justify-between items-center z-50 sticky top-0 shrink-0">
                  <span className="font-bold text-sm">Simulating Role: {simulatedUser.roleTitle} ({simulatedUser.accessLevel})</span>
                  <button onClick={() => { setSimulatedUser(null); setCurrentView('settings'); }} className="bg-white text-orange-500 px-3 py-1 rounded-full text-xs font-bold hover:bg-orange-100 transition-colors">
                      Exit Simulation
                  </button>
              </div>
          )}
          <header className="sticky top-0 z-30 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
            <div className="max-w-7xl mx-auto w-full px-3 py-3 sm:px-6 sm:py-4 flex flex-col gap-3">
             {/* Top Stack: Naming + Profile Switch + Settings */}
             <div className="flex justify-between items-center w-full gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 -ml-1 sm:p-2 sm:-ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 shrink-0"><Menu size={18} className="sm:w-5 sm:h-5" /></button>
                <div className="min-w-0 flex items-center gap-1.5">
                  {currentView !== 'dashboard' && currentView !== 'claim' && currentView !== 'import' && <span className="hidden lg:inline-flex items-center gap-1.5"><button type="button" onClick={() => navigate('dashboard')} className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">Home</button><ChevronDown size={12} className="-rotate-90 text-slate-400"/></span>}
                  <h2 className="text-sm sm:text-lg lg:text-xl font-semibold whitespace-nowrap truncate text-gray-900 dark:text-gray-100 tracking-tight">{currentView === 'dashboard' ? 'B-Quadrant' : getPageTitle()}</h2>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <button type="button" onClick={() => setSearchOpen(true)} aria-label="Find a section" title="Go to a feature (Ctrl + K)" className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:border-indigo-400 text-slate-500 dark:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"><Search size={17}/><span className="hidden xl:inline text-xs font-semibold">Search</span></button>
                {/* Notification Bell */}
                <button 
                  onClick={() => setCurrentView('notifications')}
                  className={`relative p-1.5 sm:p-2 rounded-lg transition-colors shrink-0 hover:bg-gray-100 dark:hover:bg-slate-800 ${pulseClass}`}
                  title="Notifications"
                >
                  <Bell size={18} className={bellColorClass} />
                  {unreadNotifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-1 ring-white dark:ring-slate-900 border-none">
                          {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                      </span>
                  )}
                </button>

                {/* Profile Switcher */}
                {(() => {
                  const activeBiz = activeProfileId === 'personal' ? null : data.businesses.find(b => b.id === activeProfileId);
                  const activeName = activeProfileId === 'personal' ? (data.profile.name || 'Personal') : (activeBiz?.name || 'Business');
                  const activeImg = activeProfileId === 'personal' ? (data.profile.avatar || data.profile.photoUrl) : (activeBiz?.logo || activeBiz?.avatar);
                  const isBiz = activeProfileId !== 'personal';

                  return (
                    <div className="relative shrink-0 max-w-[125px] sm:max-w-xs">
                      <button 
                        onClick={() => setProfileDropdownOpen(!isProfileDropdownOpen)}
                        className="w-full flex items-center justify-between px-2 py-1.5 sm:px-3 sm:py-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors gap-1.5" 
                        data-tour="profile-switcher"
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden min-w-0">
                          <ProfileAvatar 
                            name={activeName} 
                            imageUrl={activeImg} 
                            isBusiness={isBiz} 
                            size="xs" 
                          />
                          <div className="flex flex-col items-start truncate leading-tight hidden xs:flex min-w-0">
                            <span className="text-[10px] sm:text-xs font-semibold truncate max-w-[70px] sm:max-w-[160px] text-left">{activeName}</span>
                            <span className="text-[8px] sm:text-[9px] text-gray-500 uppercase tracking-wider">{isBiz ? 'Business' : 'Personal'}</span>
                          </div>
                        </div>
                        <ChevronDown size={14} className="text-gray-400 shrink-0" />
                      </button>

                      {isProfileDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)}></div>
                          <div className="absolute right-0 top-full mt-1 w-60 sm:w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                              <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Profiles</div>
                              <button 
                                onClick={() => { setActiveProfileId('personal'); setProfileDropdownOpen(false); }} 
                                className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-primary/10 hover:text-primary font-medium flex items-center justify-between gap-2 text-xs sm:text-sm transition-colors ${activeProfileId === 'personal' ? 'bg-primary/5 text-primary' : 'text-gray-700 dark:text-gray-200'}`}
                              >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                      <ProfileAvatar 
                                        name={data.profile.name || 'Personal'} 
                                        imageUrl={data.profile.avatar || data.profile.photoUrl} 
                                        isBusiness={false} 
                                        size="sm" 
                                      />
                                      <div className="flex flex-col truncate">
                                        <span className="font-semibold text-xs sm:text-sm truncate">{data.profile.name || 'Personal Profile'}</span>
                                        <span className="text-[9px] text-gray-400">Personal Account</span>
                                      </div>
                                  </div>
                                  {activeProfileId === 'personal' && <span className="text-[9px] font-semibold text-primary shrink-0 bg-primary/10 px-1.5 py-0.5 rounded">Active</span>}
                              </button>
                              
                              <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                              <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Businesses ({data.businesses.length})</div>
                              
                              <div className="max-h-60 overflow-y-auto space-y-0.5">
                                {data.businesses.map(b => (
                                    <button 
                                      key={b.id} 
                                      onClick={() => { setActiveProfileId(b.id); setProfileDropdownOpen(false); }} 
                                      className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-primary/10 hover:text-primary font-medium flex items-center justify-between gap-2 text-xs sm:text-sm transition-colors ${activeProfileId === b.id ? 'bg-primary/5 text-primary' : 'text-gray-700 dark:text-gray-200'}`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <ProfileAvatar 
                                              name={b.name} 
                                              imageUrl={b.logo || b.avatar} 
                                              isBusiness={true} 
                                              size="sm" 
                                            />
                                            <div className="flex flex-col truncate">
                                                <span className="font-semibold text-xs sm:text-sm truncate">{b.name}</span>
                                                <span className="text-[9px] text-gray-400">{b.entityType || 'Business'} • {(b.teamMembers?.length || 0) + 1} Members</span>
                                            </div>
                                        </div>
                                        {activeProfileId === b.id && <span className="text-[9px] font-semibold text-primary shrink-0 bg-primary/10 px-1.5 py-0.5 rounded">Active</span>}
                                    </button>
                                ))}
                              </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 shrink-0 hidden sm:block"></div>

                <button 
                  onClick={toggleSettings}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors shrink-0 ${currentView === 'settings' ? 'bg-primary text-white shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400'}`}
                  title="Settings"
                >
                  <Settings size={18} />
                </button>
              </div>
            </div>

            {/* On phones, keep essential controls visible and put occasional tools behind one button. */}
            <div className="lg:hidden flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-2">
              <StickyCurrencyDropdown
                activeCurrencyCode={activeCurrencyCode}
                activeProfileId={activeProfileId}
                onSwitchCurrency={switchCurrency}
                onOpenConverter={() => openCurrencyConverter((val) => {}, 100, activeCurrencyCode, "Done")}
              />
              <button type="button" aria-expanded={isMobileToolsOpen} aria-controls="mobile-utility-tools" onClick={() => setMobileToolsOpen(o => !o)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300" aria-label="Show workspace tools"><Settings2 size={15}/> Tools <ChevronDown size={14} className={`transition-transform ${isMobileToolsOpen ? 'rotate-180' : ''}`}/></button>
            </div>
            {isMobileToolsOpen && <div id="mobile-utility-tools" className="lg:hidden flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-2" aria-label="Workspace tools">
              <button type="button" onClick={undoAction} disabled={undoStack.length===0} aria-label="Undo last action" className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 disabled:opacity-30"><Undo2 size={16}/></button>
              <button type="button" onClick={redoAction} disabled={redoStack.length===0} aria-label="Redo last action" className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 disabled:opacity-30"><Redo2 size={16}/></button>
              <button type="button" onClick={togglePrivacyMode} aria-label={isPrivacyMode ? 'Show balances' : 'Hide balances'} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">{isPrivacyMode ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
              <button type="button" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} aria-label="Change theme" className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">{theme === 'light' ? <Moon size={16}/> : <Sun size={16}/>}</button>
              <span className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400">{timeStr}</span>
            </div>}
            {/* Bottom Stack: Actions & Settings Utilities + Date/Time */}
            <div className="hidden lg:flex justify-between items-center w-full pt-2 border-t border-gray-100 dark:border-gray-800 gap-1.5 sm:gap-2">
               {/* Left: Tools - Fits perfectly on mobile without hiding theme/privacy toggles */}
               <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <StickyCurrencyDropdown
                    activeCurrencyCode={activeCurrencyCode}
                    activeProfileId={activeProfileId}
                    onSwitchCurrency={switchCurrency}
                    onOpenConverter={() => openCurrencyConverter((val) => {}, 100, activeCurrencyCode, "Done")}
                  />

                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 shrink-0"></div>

                  <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 shrink-0">
                    <button 
                      onClick={undoAction} 
                      disabled={undoStack.length === 0}
                      data-tour="action-undo"
                      className={`p-1.5 rounded-md transition-colors ${undoStack.length > 0 ? 'hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
                      title="Undo Last Action"
                    >
                      <Undo2 size={14} />
                    </button>
                    <div className="h-3 w-px bg-gray-300 dark:bg-gray-600"></div>
                    <button 
                      onClick={redoAction} 
                      disabled={redoStack.length === 0}
                      data-tour="action-redo"
                      className={`p-1.5 rounded-md transition-colors ${redoStack.length > 0 ? 'hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
                      title="Redo Last Action"
                    >
                      <Redo2 size={14} />
                    </button>
                  </div>

                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 shrink-0"></div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={togglePrivacyMode} 
                      data-tour="privacy-toggle"
                      className="p-1.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-500 dark:text-gray-400 shrink-0"
                      title={isPrivacyMode ? "Show Balances" : "Hide Balances"}
                    >
                      {isPrivacyMode ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button 
                      onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
                      data-tour="theme-selection"
                      className="p-1.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-500 dark:text-gray-400 shrink-0"
                      title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    >
                      {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                    </button>
                  </div>
               </div>

               {/* Right: Date/Time */}
               <div className="flex flex-col items-end shrink-0 pointer-events-none pl-1">
                  <span className="text-[9px] sm:text-[10px] text-gray-500 font-medium tracking-wide uppercase leading-none hidden xs:inline">{dateStr}</span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-gray-800 dark:text-gray-200 font-mono mt-0.5 leading-none">{timeStr}</span>
               </div>
            </div>
            </div>
          </header>
          <div className="p-3 sm:p-6 max-w-7xl mx-auto w-full flex-1 pb-24 lg:pb-6">{renderView()}</div>
        </main>
        {isSidebarOpen && (<div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />)}
        <nav aria-label="Mobile quick navigation" className={`fixed bottom-0 left-0 right-0 z-30 ${isSidebarOpen ? 'hidden' : 'grid'} lg:hidden grid-cols-5 items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(0,0,0,0.07)]`}>
          {[
            {id:'dashboard',title:'Overview',icon:LayoutDashboard},
            {id:'income_statement:income',title:'Income',icon:ArrowDownRight},
            {id:'income_statement:expense',title:'Expense',icon:Wallet},
            {id:'balance_sheet',title:'Assets',icon:Landmark},
            {id:'more',title:'More',icon:Menu}
          ].map(item => {
            const active = item.id === 'dashboard' ? currentView === 'dashboard' : item.id === 'balance_sheet' ? currentView === 'balance_sheet' : item.id.startsWith('income_statement') ? currentView === 'income_statement' : isSidebarOpen;
            const disabled = item.id === 'balance_sheet' && effectiveRole === 'finance_staff';
            const Icon = item.icon;
            return <button key={item.id} type="button" aria-label={item.title} aria-current={active ? 'page' : undefined} disabled={disabled} onClick={() => {if(item.id === 'more') setSidebarOpen(true); else navigate(item.id);}} className={`flex flex-col items-center justify-center gap-1 min-w-0 py-2 px-1 text-[10px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-40 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}><Icon size={20}/>{item.title}</button>;
          })}
        </nav>
      </div>

      <button
          onClick={openGeneralCalculator}
          data-tour="calculator"
          className={`fixed bottom-24 lg:bottom-6 right-5 z-40 p-4 bg-primary text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center ${showFloatingCalculator ? 'translate-y-0 opacity-80 hover:opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}
          title="Open Calculator"
      >
          <CalculatorIcon size={24} />
      </button>

      <WorkspaceSearch open={isSearchOpen} onClose={() => setSearchOpen(false)} navigate={navigate} effectiveRole={effectiveRole} isSimulated={!!simulatedUser} />
      <ManualModal 
          isOpen={isTourOpen} 
          activeProfileId={activeProfileId}
          businessName={data.businesses?.find(b => b.id === activeProfileId)?.name}
          onClose={() => setTourOpen(false)} 
          onSkipAll={handleSkipAllTips}
          onResetTour={handleResetTourTips}
      />
      {activeContextTip && ONBOARDING_CONTENT.find(t => t.id === activeContextTip) && (
          <FloatingContextTip 
              tip={ONBOARDING_CONTENT.find(t => t.id === activeContextTip)!} 
              activeProfileId={activeProfileId}
              businessName={data.businesses?.find(b => b.id === activeProfileId)?.name}
              onDismiss={() => setActiveContextTip(null)} 
              onSkipAll={handleSkipAllTips}
          />
      )}
      
      <Calculator 
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onApply={handleCalculatorApply}
        initialValue={calculatorInitialValue}
        actionLabel={calculatorLabel}
      />

      <CurrencyModal 
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
        onApply={handleCurrencyModalApply}
        initialValue={currencyModalInitialVal}
        targetCurrency={currencyModalTargetCurrency}
        actionLabel={currencyModalLabel}
      />
    </AppContext.Provider>
        )}
      </>
  );
}

export default App;
