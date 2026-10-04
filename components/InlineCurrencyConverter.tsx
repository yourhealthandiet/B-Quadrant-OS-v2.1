import React, { useState, useMemo } from 'react';
import { ArrowRightLeft, Check, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  WORLD_CURRENCIES, 
  WORLD_CURRENCY_SYMBOLS, 
  getExchangeRate, 
  convertCurrency 
} from '../services/currencyService';

interface InlineCurrencyConverterProps {
  targetCurrency: string;
  onApply: (convertedAmount: number) => void;
  className?: string;
  defaultOpen?: boolean;
}

export const InlineCurrencyConverter: React.FC<InlineCurrencyConverterProps> = ({
  targetCurrency = 'USD',
  onApply,
  className = '',
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [fromAmount, setFromAmount] = useState<string>('');

  const numAmount = parseFloat(fromAmount) || 0;
  const rate = useMemo(() => getExchangeRate(fromCurrency, targetCurrency), [fromCurrency, targetCurrency]);
  const converted = useMemo(() => convertCurrency(numAmount, fromCurrency, targetCurrency), [numAmount, fromCurrency, targetCurrency]);

  const fromSymbol = WORLD_CURRENCY_SYMBOLS[fromCurrency] || fromCurrency;
  const targetSymbol = WORLD_CURRENCY_SYMBOLS[targetCurrency] || targetCurrency;

  const handleApply = () => {
    if (converted > 0) {
      onApply(converted);
    }
  };

  return (
    <div className={`border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-slate-800/60 rounded-xl overflow-hidden mb-3 text-xs ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-indigo-700 dark:text-indigo-300 font-semibold hover:bg-indigo-100/50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <ArrowRightLeft size={14} className="text-primary" />
          <span>Convert from another currency?</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 font-normal">
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-indigo-100 dark:border-indigo-900/50 space-y-2 bg-white/60 dark:bg-slate-900/40">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
            
            {/* From Currency Picker */}
            <div className="sm:col-span-5">
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Source Currency</label>
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 dark:text-white font-medium outline-none focus:ring-1 focus:ring-primary"
              >
                {WORLD_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol}) - {c.name.slice(0, 18)}
                  </option>
                ))}
              </select>
            </div>

            {/* From Amount Input */}
            <div className="sm:col-span-4">
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                Amount ({fromSymbol})
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="w-full px-2 py-1.5 text-xs font-mono font-bold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Apply Button */}
            <div className="sm:col-span-3 pt-3 sm:pt-4">
              <button
                type="button"
                onClick={handleApply}
                disabled={converted <= 0}
                className="w-full py-1.5 px-2 bg-primary hover:bg-indigo-600 disabled:opacity-40 text-white rounded-lg font-bold flex items-center justify-center gap-1 transition-all shadow-xs text-xs"
                title={`Apply ${targetSymbol}${converted.toLocaleString()} to field`}
              >
                <Check size={13} />
                Apply
              </button>
            </div>

          </div>

          {/* Live Preview */}
          {numAmount > 0 && (
            <div className="flex justify-between items-center bg-indigo-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-indigo-100 dark:border-gray-700 text-[11px] font-mono">
              <span className="text-gray-500">
                1 {fromCurrency} = {rate < 0.01 ? rate.toFixed(5) : rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} {targetCurrency}
              </span>
              <span className="font-bold text-primary">
                = {targetSymbol}{converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {targetCurrency}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
