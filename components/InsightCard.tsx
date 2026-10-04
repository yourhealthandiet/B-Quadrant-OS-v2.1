import React from 'react';
import { BrainCircuit, Sparkles } from 'lucide-react';
import { InsightResult } from '../types';

interface InsightCardProps {
  result: InsightResult;
}

export const InsightCard: React.FC<InsightCardProps> = ({ result }) => {
  const isWarning = result.tone === 'warning';
  const isPositive = result.tone === 'positive';

  const bgColor = isWarning 
    ? 'bg-amber-50/60 dark:bg-amber-950/20' 
    : isPositive 
      ? 'bg-emerald-50/60 dark:bg-emerald-950/20' 
      : 'bg-indigo-50/50 dark:bg-indigo-950/20';

  const borderColor = isWarning 
    ? 'border-amber-200/70 dark:border-amber-800/30' 
    : isPositive 
      ? 'border-emerald-200/70 dark:border-emerald-800/30' 
      : 'border-indigo-200/60 dark:border-indigo-800/30';

  const iconBg = isWarning 
    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' 
    : isPositive 
      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' 
      : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400';

  const titleColor = isWarning 
    ? 'text-amber-900 dark:text-amber-300' 
    : isPositive 
      ? 'text-emerald-900 dark:text-emerald-300' 
      : 'text-indigo-950 dark:text-indigo-300';

  return (
    <div 
      id="central-insight-card" 
      className={`${bgColor} ${borderColor} p-3 sm:p-3.5 rounded-xl border flex flex-col gap-2 shadow-xs transition-all animate-in fade-in duration-300`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg shrink-0 ${iconBg}`}>
            <BrainCircuit size={14} />
          </div>
          <h4 className={`text-xs sm:text-sm font-semibold tracking-tight break-words ${titleColor}`}>
            {result.title}
          </h4>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-[10px] font-medium text-gray-400 dark:text-gray-400">
          <Sparkles size={11} className="text-primary/70" />
          <span className="hidden sm:inline">Adaptive Intelligence</span>
        </div>
      </div>

      <p className="text-xs sm:text-[13px] text-gray-700 dark:text-gray-300 font-normal leading-relaxed pl-0.5">
        {result.insight}
      </p>

      <div className="flex flex-col gap-1.5 pt-1 border-t border-black/5 dark:border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider shrink-0">
            Action Step:
          </span>
          <span className="text-xs font-normal text-gray-800 dark:text-gray-200 leading-snug">
            {result.action}
          </span>
        </div>

        <div className="flex items-center justify-end gap-1.5 opacity-60 text-[9px] font-normal text-gray-400">
          <div className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-indigo-500'} animate-pulse`}></div>
          <span>Real-time Analysis</span>
        </div>
      </div>
    </div>
  );
};
