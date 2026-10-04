
import React, { useContext } from 'react';
import { Calculator, ArrowRightLeft, HelpCircle } from 'lucide-react';
import { AppContext } from '../App';

export const Card: React.FC<{ children?: React.ReactNode; className?: string; title?: string; action?: React.ReactNode; [key: string]: any }> = ({ children, className = '', title, action, ...props }) => {
  const tourId = props['data-tour'];
  return (
    <div className={`glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md border border-gray-200/60 dark:border-white/10 relative overflow-hidden bg-white/70 dark:bg-slate-900/70 ${className}`} {...props}>
      {(title || action) && (
        <div className="flex justify-between items-center mb-4 sm:mb-5 border-b border-gray-100 dark:border-white/5 pb-3 gap-2">
          {title && (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100 break-words">{title}</h3>
              {tourId && (
                <button
                  type="button"
                  data-tour-help={tourId}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('trigger-tour', { detail: tourId }));
                  }}
                  className="text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-indigo-400 p-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                  title="Show guide for this section"
                >
                  <HelpCircle size={15} />
                </button>
              )}
            </div>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="text-gray-700 dark:text-gray-300 relative z-10">
        {children}
      </div>
    </div>
  );
};

export const Button = ({ onClick, children, variant = 'primary', className = '', disabled = false, ...props }: { onClick?: () => void; children?: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; className?: string, disabled?: boolean, [key: string]: any }) => {
  const baseStyle = "px-3 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl font-medium text-sm sm:text-base transition-all duration-200 flex items-center gap-2 justify-center active:scale-95";
  const variants = {
    primary: "bg-primary text-white hover:bg-indigo-600 shadow-md hover:shadow-lg disabled:opacity-50",
    secondary: "bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed",
    ghost: "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
  };

  return (
    <button onClick={disabled ? undefined : onClick} className={`${baseStyle} ${variants[variant]} ${className} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`} disabled={disabled} {...props}>
      {children}
    </button>
  );
};

export const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg", noScroll = false, noPadding = false }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode, maxWidth?: string, noScroll?: boolean, noPadding?: boolean }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
      <div className={`glass-card bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full ${maxWidth} max-h-[90vh] ${noScroll ? 'overflow-hidden' : 'overflow-y-auto'} shadow-2xl flex flex-col`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-white/10 sticky top-0 bg-white dark:bg-slate-800 z-20 shrink-0">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className={`${noPadding ? '' : 'p-4 sm:p-6 pb-8 sm:pb-6'} ${noScroll ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export const Input = ({ 
  label, 
  enableCalculator, 
  enableCurrencyConvert,
  onCalc, 
  onConvert,
  ...props 
}: React.InputHTMLAttributes<HTMLInputElement> & { 
  label?: string; 
  enableCalculator?: boolean; 
  enableCurrencyConvert?: boolean;
  onCalc?: (val: number) => void;
  onConvert?: (val: number) => void;
}) => {
  const context = useContext(AppContext)!;
  
  const handleCalc = (e: React.MouseEvent) => {
      e.preventDefault();
      if (context?.openCalculator && props.onChange) {
          context.openCalculator((val) => {
              const syntheticEvent = {
                  target: { value: val.toString(), name: props.name }
              } as React.ChangeEvent<HTMLInputElement>;
              props.onChange!(syntheticEvent);
              if (onCalc) onCalc(val);
          }, Number(props.value) || 0);
      }
  };

  const handleConvert = (e: React.MouseEvent) => {
      e.preventDefault();
      if (context?.openCurrencyConverter && props.onChange) {
          context.openCurrencyConverter((val) => {
              const syntheticEvent = {
                  target: { value: val.toString(), name: props.name }
              } as React.ChangeEvent<HTMLInputElement>;
              props.onChange!(syntheticEvent);
              if (onConvert) onConvert(val);
          }, Number(props.value) || 0);
      }
  };

  const hasBoth = enableCalculator && enableCurrencyConvert;
  const hasEither = enableCalculator || enableCurrencyConvert;
  const paddingRightClass = hasBoth ? 'pr-16 sm:pr-18' : hasEither ? 'pr-10' : '';

  return (
  <div className="mb-3 sm:mb-4 relative">
    {label && <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
    <div className="relative">
        <input 
        {...props} 
        className={`w-full px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-900 disabled:cursor-not-allowed [&:disabled::-webkit-calendar-picker-indicator]:hidden [&:disabled::-webkit-inner-spin-button]:hidden [&:disabled::-webkit-outer-spin-button]:hidden [&:disabled]:-moz-appearance-textfield ${props.className || ''} ${paddingRightClass}`}
        />
        {hasEither && (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                {enableCurrencyConvert && (
                    <button 
                        type="button"
                        onClick={handleConvert} 
                        className="p-1.5 text-gray-400 hover:text-emerald-500 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-white/10"
                        title="Convert Currency (All World Currencies)"
                    >
                        <ArrowRightLeft size={15} />
                    </button>
                )}
                {enableCalculator && (
                    <button 
                        type="button"
                        onClick={handleCalc} 
                        className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-white/10"
                        title="Open Calculator (Add Multiple Figures)"
                    >
                        <Calculator size={15} />
                    </button>
                )}
            </div>
        )}
    </div>
  </div>
  );
};

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, options: { value: string; label: string; disabled?: boolean; depth?: number }[] }) => (
  <div className="mb-3 sm:mb-4">
    {props.label && <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{props.label}</label>}
    <select 
      {...props} 
      className={`w-full px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-900 disabled:cursor-not-allowed ${props.disabled ? 'appearance-none !bg-none' : ''} ${props.className || ''}`}
    >
      {props.options.map(opt => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.depth ? '\u00A0'.repeat(opt.depth * 4) : ''}{opt.label}
        </option>
      ))}
    </select>
  </div>
);
