import React, { useContext } from 'react';
import {
  ArrowDownLeft, ArrowRight, ArrowRightLeft, ArrowUpRight, Bell, BookOpen,
  Bot, BarChart3, ChevronRight, HelpCircle, FileSpreadsheet,
  Landmark, Network, ShieldCheck, Target, Settings2, PieChart, BellRing
} from 'lucide-react';
import { AppContext, MoneyDisplay } from '../App';

type Destination = { title: string; description: string; route: string; icon: React.ElementType; restricted?: boolean };

/** Overview is a navigation layer. Financial calculations remain with the existing engines. */
export default function DashboardLaunchpad({ onOpenDetails }: { onOpenDetails: (target?: 'approvals') => void }) {
  const ctx = useContext(AppContext)!;
  const { activeProfileId, data, effectiveRole, filteredData, metrics, symbol, timeFilter, navigate } = ctx;
  const business = activeProfileId !== 'personal';
  const name = business ? data.businesses.find(b => b.id === activeProfileId)?.name || 'Business' : 'Personal';
  const financeStaff = effectiveRole === 'finance_staff';
  const viewer = effectiveRole === 'viewer';
  const pending = (effectiveRole === 'admin' || effectiveRole === 'partner') ? (filteredData.pendingEntries || []).length : 0;
  const alerts = filteredData.notifications.filter(n => !n.read && n.profileId === activeProfileId).length;
  const goals = filteredData.goals.length;
  const mainActions: Destination[] = [
    { title: 'Record income', description: 'Add money received and classify it correctly.', route: 'income_statement:income', icon: ArrowDownLeft },
    { title: 'Record expense', description: 'Capture spending before you forget it.', route: 'income_statement:expense', icon: ArrowUpRight },
    { title: 'Move money', description: 'Record transfers between your accounts or entities.', route: 'income_statement:transfer', icon: ArrowRightLeft },
  ];
  const manage: Destination[] = [
    { title: 'Income & expenses', description: 'Review entries, recurring items and financial records.', route: 'income_statement', icon: FileSpreadsheet },
    { title: 'Assets & liabilities', description: 'Manage what you own and what you owe.', route: 'balance_sheet', icon: Landmark, restricted: financeStaff },
    { title: 'Goals', description: 'View milestones and track what you are working toward.', route: 'goals', icon: Target, restricted: financeStaff },
    { title: 'Ownership', description: 'Understand how entities and owners connect.', route: 'ownership', icon: Network },
    { title: 'Analytics', description: 'Examine trends and performance in more detail.', route: 'analytics', icon: BarChart3, restricted: financeStaff },
    { title: 'Financial guidance', description: 'Explore suggestions from your advisor.', route: 'ai', icon: Bot, restricted: financeStaff },
    { title: 'ESBI quadrant', description: 'Understand the roles behind your income.', route: 'quadrant', icon: PieChart, restricted: financeStaff },
    { title: 'Notifications', description: 'Review important system updates.', route: 'notifications', icon: BellRing },
    { title: 'Settings & backup', description: 'Manage your profile, data and exports.', route: 'settings', icon: Settings2, restricted: !!ctx.simulatedUser },
  ];
  const shortCut = (item: Destination, prominent = false) => {
    const Icon = item.icon;
    return (
      <button
        key={item.route}
        type="button"
        disabled={item.restricted || (viewer && prominent)}
        onClick={() => navigate(item.route)}
        className={`group w-full min-w-0 text-left rounded-2xl border p-4 sm:p-5 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-45 disabled:cursor-not-allowed ${prominent ? 'border-indigo-200 dark:border-indigo-700/70 bg-indigo-50/80 dark:bg-indigo-500/10 hover:-translate-y-0.5 hover:shadow-md' : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/70 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className={`inline-flex items-center justify-center rounded-xl w-10 h-10 ${prominent ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-indigo-700 dark:text-indigo-300'}`}><Icon size={19}/></span>
          <ArrowRight size={17} className="mt-1 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-transform" aria-hidden="true"/>
        </div>
        <h3 className="mt-4 text-sm sm:text-base font-bold text-slate-900 dark:text-white">{item.title}</h3>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>
      </button>
    );
  };
  return (
    <section aria-label="Workspace overview" className="space-y-5 sm:space-y-6" data-testid="dashboard-launchpad">
      <div className="rounded-3xl border border-indigo-100 dark:border-indigo-900/70 bg-gradient-to-br from-white via-indigo-50/70 to-slate-50 dark:from-slate-800 dark:via-indigo-950/30 dark:to-slate-900 px-5 py-6 sm:px-8 sm:py-7 overflow-hidden relative">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-indigo-700 dark:text-indigo-300"><span className="h-2 w-2 bg-emerald-500 rounded-full"/> Your workspace</div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">Make your next move clear.</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">Viewing <strong>{name}</strong>. Start with an action, check what needs attention, or open the deeper financial dashboard when you need it.</p>
          </div>
          <button type="button" onClick={onOpenDetails} className="shrink-0 self-start inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-indigo-500 text-white px-4 py-3 text-sm font-bold hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
            Detailed dashboard <ChevronRight size={17}/>
          </button>
        </div>
        <div className="relative z-10 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5" aria-label={`Financial snapshot for ${timeFilter}`}>
          {[
            { title: 'Income', value: metrics.totalIncome, note: `Selected period: ${timeFilter}` },
            { title: 'Expenses', value: metrics.totalExpenses, note: `Selected period: ${timeFilter}` },
            { title: 'Cash flow', value: metrics.cashflow, note: 'Income minus outgoing cash' }
          ].map(item => (
            <div key={item.title} className="min-w-0 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-white dark:border-slate-700/70 px-4 py-3 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.title}</div>
              <div className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white min-w-0 break-words"><MoneyDisplay amount={item.value} symbol={symbol}/></div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{item.note}</div>
            </div>
          ))}
        </div>
      </div>

      {(pending > 0 || alerts > 0) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/20 p-4" aria-live="polite">
          <Bell size={20} className="text-amber-600 shrink-0"/>
          <div className="flex-1 text-sm text-slate-700 dark:text-slate-200"><strong>Needs attention.</strong> {pending > 0 && `${pending} pending submission${pending === 1 ? '' : 's'}. `}{alerts > 0 && `${alerts} unread notification${alerts === 1 ? '' : 's'}.`}</div>
          <div className="flex flex-wrap gap-2">
            {pending > 0 && <button type="button" onClick={() => onOpenDetails('approvals')} className="rounded-lg bg-amber-600 text-white font-semibold text-xs px-3 py-2 hover:bg-amber-700">Review submissions</button>}
            {alerts > 0 && <button type="button" onClick={() => navigate('notifications')} className="rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 font-semibold text-xs px-3 py-2 hover:border-amber-500">Notifications</button>}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-baseline justify-between mb-3 gap-2"><div><h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">Quick actions</h2><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">The things you are most likely to do today.</p></div></div>
        {viewer ? <p className="p-3 mb-3 rounded-lg text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><ShieldCheck size={15} className="inline mr-1"/> This profile is view-only. Recording actions are unavailable.</p> : null}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{mainActions.map(item => shortCut(item, true))}</div>
      </div>
      <div>
        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">Explore your finances</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-3">Each destination takes you to the feature that does the work.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{manage.filter(item => !item.restricted).map(item => shortCut(item))}</div>
      </div>
      {!financeStaff && <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button type="button" disabled={financeStaff} onClick={() => navigate('goals')} className="flex items-center gap-4 text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-white dark:bg-slate-800/60 disabled:opacity-50">
          <span className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center"><Target size={21}/></span>
          <span className="flex-1"><strong className="text-sm block text-slate-900 dark:text-white">{goals} goal{goals === 1 ? '' : 's'} in this profile</strong><span className="text-xs text-slate-500 dark:text-slate-400">See progress and next milestones</span></span><ChevronRight size={17}/>
        </button>
        <button type="button" onClick={() => navigate('learning')} disabled={financeStaff} className="flex items-center gap-4 text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-white dark:bg-slate-800/60 disabled:opacity-50">
          <span className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center"><BookOpen size={21}/></span>
          <span className="flex-1"><strong className="text-sm block text-slate-900 dark:text-white">Learn the system</strong><span className="text-xs text-slate-500 dark:text-slate-400">Financial concepts explained simply</span></span><ChevronRight size={17}/>
        </button>
      </div>}
      <p className="text-xs text-center text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1"><HelpCircle size={13}/> Looking for the old charts and models? Use <button type="button" onClick={onOpenDetails} className="font-bold text-indigo-600 dark:text-indigo-300 underline underline-offset-2">Detailed dashboard</button>.</p>
    </section>
  );
}
