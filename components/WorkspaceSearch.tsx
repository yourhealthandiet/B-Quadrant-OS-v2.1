import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';

const destinations = [
  { title: 'Overview', route: 'dashboard', hint: 'Your financial command centre', keywords: 'home dashboard' },
  { title: 'Record income', route: 'income_statement:income', hint: 'Log money coming in', keywords: 'revenue sale income' },
  { title: 'Record expense', route: 'income_statement:expense', hint: 'Log business or personal expenses', keywords: 'spending cost' },
  { title: 'Transfer funds', route: 'income_statement:transfer', hint: 'Move money between profiles', keywords: 'money transfer' },
  { title: 'Income statement', route: 'income_statement', hint: 'Revenue, expenses and history', keywords: 'transactions statements' },
  { title: 'Balance sheet', route: 'balance_sheet', hint: 'Assets, debts and liabilities', keywords: 'portfolio balance asset loan', limited: true },
  { title: 'ESBI quadrant', route: 'quadrant', hint: 'Where your income comes from', keywords: 'esbi', limited: true },
  { title: 'Ownership graph', route: 'ownership', hint: 'Your ownership relationships', keywords: 'graph business' },
  { title: 'Goals', route: 'goals', hint: 'Targets and milestones', keywords: 'planning', limited: true },
  { title: 'Analytics', route: 'analytics', hint: 'Explore your numbers', keywords: 'reports charts', limited: true },
  { title: 'Intelligent advisor', route: 'ai', hint: 'Financial guidance', keywords: 'help ai', limited: true },
  { title: 'Learning', route: 'learning', hint: 'Guides and financial concepts', keywords: 'learn', limited: true },
  { title: 'Notifications', route: 'notifications', hint: 'Updates needing your attention', keywords: 'alert bell' },
  { title: 'Settings and backup', route: 'settings', hint: 'Preferences, import and export', keywords: 'profile data backup', noSim: true },
];

export default function WorkspaceSearch({ open, onClose, navigate, effectiveRole, isSimulated }: {open: boolean; onClose: () => void; navigate: (route:string)=>void; effectiveRole:string; isSimulated: boolean}) {
  const [term, setTerm] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) { setTerm(''); requestAnimationFrame(() => input.current?.focus()); }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if(e.key === 'Escape') onClose(); };
    window.addEventListener('keydown',onKey);
    return () => window.removeEventListener('keydown',onKey);
  },[open,onClose]);
  if (!open) return null;
  const results = destinations.filter(x => !(effectiveRole === 'finance_staff' && x.limited) && !(isSimulated && x.noSim) && (`${x.title} ${x.hint} ${x.keywords}`).toLowerCase().includes(term.toLowerCase().trim()));
  const choose = (route: string) => { navigate(route); onClose(); };
  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm flex items-start justify-center px-3 pt-[9vh]" onMouseDown={e=>{ if(e.target===e.currentTarget)onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label="Go to a workspace section" className="w-full max-w-lg max-h-[75vh] flex flex-col overflow-hidden bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700"><Search size={20} className="text-indigo-500 shrink-0"/><input ref={input} value={term} onChange={e=>setTerm(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && results.length) choose(results[0].route); }} aria-label="Search destinations" placeholder="Where do you want to go?" className="flex-1 min-w-0 outline-none bg-transparent text-slate-900 dark:text-white text-sm"/><button onClick={onClose} type="button" aria-label="Close search" className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18}/></button></div>
        <div className="p-2 overflow-auto" role="list">
          {results.length === 0 ? <p className="p-5 text-center text-sm text-slate-500">No matching feature.</p> : results.map(x => <button type="button" key={x.route} onClick={()=>choose(x.route)} className="w-full flex items-center justify-between text-left p-3 gap-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"><span><span className="block text-sm font-semibold text-slate-900 dark:text-white">{x.title}</span><span className="block text-xs mt-1 text-slate-500 dark:text-slate-400">{x.hint}</span></span><ArrowRight size={16} className="text-slate-400 shrink-0"/></button>)}
        </div>
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">Tip: Ctrl/⌘ + K to open from anywhere. Enter opens the first result.</div>
      </section>
    </div>
  );
}
