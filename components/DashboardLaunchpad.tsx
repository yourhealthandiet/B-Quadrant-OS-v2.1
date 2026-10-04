import React, { useContext, useState } from 'react';
import {
  ArrowDownLeft, ArrowRight, ArrowRightLeft, ArrowUpRight, Bell,
  BarChart3, ChevronRight, FileSpreadsheet, Landmark, Network,
  ShieldCheck, Target, Settings2, PieChart, BookOpen, Bot,
  Wallet, LayoutDashboard, CircleHelp, ChevronDown
} from 'lucide-react';
import { AppContext, MoneyDisplay } from '../App';

type Destination = { title: string; route: string; icon: React.ElementType; restricted?: boolean };

/** Compact, action-first overview; advanced calculations remain in the detailed dashboard. */
export default function DashboardLaunchpad({ onOpenDetails }: { onOpenDetails: (target?: 'approvals') => void }) {
  const ctx = useContext(AppContext)!;
  const { activeProfileId, data, effectiveRole, filteredData, metrics, symbol, timeFilter, setTimeFilter, navigate } = ctx;
  const [allFeaturesOpen, setAllFeaturesOpen] = useState(false);
  const name = activeProfileId === 'personal' ? 'Personal workspace' : data.businesses.find(b => b.id === activeProfileId)?.name || 'Business workspace';
  const financeStaff = effectiveRole === 'finance_staff';
  const viewer = effectiveRole === 'viewer';
  const pending = (effectiveRole === 'admin' || effectiveRole === 'partner') ? (filteredData.pendingEntries || []).length : 0;
  const alerts = filteredData.notifications.filter(n => !n.read && n.profileId === activeProfileId).length;
  const goals = filteredData.goals.length;
  const period = ({ month: 'This month', '1m': 'Past month', '1w': 'Past week', '7d': 'Past 7 days', '24h': 'Past day', year: 'This year', '1y': 'Past year', all: 'All time' } as Record<string, string>)[timeFilter] || 'Selected period';

  const quickActions: Destination[] = [
    { title: 'Add income', route: 'income_statement:income', icon: ArrowDownLeft },
    { title: 'Add expense', route: 'income_statement:expense', icon: ArrowUpRight },
    { title: 'Transfer', route: 'income_statement:transfer', icon: ArrowRightLeft },
  ];
  const primary: Destination[] = [
    { title: 'Goals', route: 'goals', icon: Target, restricted: financeStaff },
    { title: 'Assets', route: 'balance_sheet', icon: Landmark, restricted: financeStaff },
    { title: 'Analytics', route: 'analytics', icon: BarChart3, restricted: financeStaff },
  ];
  const secondary: Destination[] = [
    { title: 'Transactions', route: 'income_statement', icon: FileSpreadsheet },
    { title: 'Ownership', route: 'ownership', icon: Network },
    { title: 'ESBI quadrant', route: 'quadrant', icon: PieChart, restricted: financeStaff },
    { title: 'Learning', route: 'learning', icon: BookOpen, restricted: financeStaff },
    { title: 'AI advisor', route: 'ai', icon: Bot, restricted: financeStaff },
    { title: 'Notifications', route: 'notifications', icon: Bell },
    { title: 'Settings & backup', route: 'settings', icon: Settings2, restricted: !!ctx.simulatedUser },
  ];
  const tile = (item: Destination) => {
    const Icon = item.icon;
    return (
      <button key={item.route} type="button" onClick={() => navigate(item.route)}
        className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:bg-indigo-500/10">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><Icon size={17}/></span>
        <span className="min-w-0 flex-1 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{item.title}</span>
        <ChevronRight size={14} className="shrink-0 text-slate-400"/>
      </button>
    );
  };

  return (
    <section aria-label="Workspace overview" data-testid="dashboard-launchpad" className="space-y-4 sm:space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-800/65">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="max-w-full truncate text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400" title={name}>{name}</p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">Your money</h1>
          </div>
          <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 dark:bg-slate-900" role="group" aria-label="Overview period">
            <button type="button" onClick={() => setTimeFilter('month')} aria-pressed={timeFilter === 'month'} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${timeFilter === 'month' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>Month</button>
            <button type="button" onClick={() => setTimeFilter('all')} aria-pressed={timeFilter === 'all'} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${timeFilter === 'all' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>All time</button>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500" aria-live="polite">Showing: {period}</p>
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-500/10">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-300">Cash flow</p>
          <p className={`mt-1 min-w-0 break-all text-[clamp(22px,5.7vw,32px)] font-extrabold leading-tight tracking-tight ${metrics.cashflow < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-950 dark:text-white'}`}><MoneyDisplay amount={metrics.cashflow} symbol={symbol}/></p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Money in minus money out</p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => navigate('income_statement:income')} className="min-w-0 rounded-xl border border-slate-200 p-3 text-left hover:border-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700" aria-label="View income">
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><ArrowDownLeft className="text-emerald-500" size={14}/> Income</span>
            <span className="mt-1 block min-w-0 break-all text-[clamp(14px,3.5vw,19px)] font-bold leading-snug text-slate-900 dark:text-white"><MoneyDisplay amount={metrics.totalIncome} symbol={symbol}/></span>
          </button>
          <button type="button" onClick={() => navigate('income_statement:expense')} className="min-w-0 rounded-xl border border-slate-200 p-3 text-left hover:border-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700" aria-label="View expenses">
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><ArrowUpRight className="text-amber-500" size={14}/> Expenses</span>
            <span className="mt-1 block min-w-0 break-all text-[clamp(14px,3.5vw,19px)] font-bold leading-snug text-slate-900 dark:text-white"><MoneyDisplay amount={metrics.totalExpenses} symbol={symbol}/></span>
          </button>
        </div>
      </div>

      {(pending > 0 || alerts > 0) && (
        <div aria-live="polite" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/80 dark:bg-amber-900/20">
          <p className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200"><Bell size={16}/>{pending > 0 ? `${pending} pending approval${pending === 1 ? '' : 's'}` : `${alerts} unread notification${alerts === 1 ? '' : 's'}`}</p>
          <button type="button" onClick={() => pending > 0 ? onOpenDetails('approvals') : navigate('notifications')} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 underline underline-offset-2 dark:text-indigo-300">Review <ChevronRight size={14}/></button>
          {pending > 0 && alerts > 0 && <button type="button" onClick={() => navigate('notifications')} className="text-xs font-semibold text-slate-600 underline dark:text-slate-300">{alerts} notification{alerts === 1 ? '' : 's'}</button>}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">Quick actions</h2>
        {viewer && <p className="mb-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><ShieldCheck size={14}/> View-only access</p>}
        <div className="grid grid-cols-3 gap-2">
          {quickActions.map(action => {
            const Icon = action.icon;
            return <button key={action.route} type="button" disabled={viewer} onClick={() => navigate(action.route)} className="flex min-h-[88px] min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-1.5 py-2.5 text-center text-slate-900 transition-colors hover:border-indigo-400 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><Icon size={19}/></span>
              <span className="text-[11px] font-semibold leading-tight sm:text-xs">{action.title}</span>
            </button>;
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-sm font-bold text-slate-900 dark:text-white">Explore</h2><button type="button" onClick={() => setAllFeaturesOpen(o => !o)} aria-expanded={allFeaturesOpen} aria-controls="all-overview-features" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">{allFeaturesOpen ? 'Show less' : 'All features'} <ChevronDown size={15} className={`transition-transform ${allFeaturesOpen ? 'rotate-180' : ''}`}/></button></div>
        <div className="grid grid-cols-1 min-[370px]:grid-cols-2 gap-2">
          {primary.filter(x => !x.restricted).map(tile)}
          <button type="button" onClick={() => onOpenDetails()} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:bg-indigo-500/10">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><LayoutDashboard size={17}/></span><span className="min-w-0 flex-1 text-[13px] font-semibold text-slate-800 dark:text-slate-100">Full dashboard</span><ChevronRight size={14} className="shrink-0 text-slate-400"/>
          </button>
        </div>
        {allFeaturesOpen && <div id="all-overview-features" className="mt-2 grid grid-cols-1 min-[370px]:grid-cols-2 gap-2">{secondary.filter(x => !x.restricted).map(tile)}</div>}
        {!allFeaturesOpen && <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400"><CircleHelp size={12}/> Other features are in “All features” or the menu.</p>}
      </div>
      {!financeStaff && goals > 0 && <button type="button" onClick={() => navigate('goals')} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300"><span className="flex items-center gap-2"><Target size={15}/>{goals} saved goal{goals === 1 ? '' : 's'}</span><ChevronRight size={15}/></button>}
    </section>
  );
}
