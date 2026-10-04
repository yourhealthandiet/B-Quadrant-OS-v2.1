import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowRightLeft, Check, RefreshCw, Search, Globe, TrendingUp } from 'lucide-react';
import { 
  WORLD_CURRENCIES, 
  WORLD_CURRENCY_SYMBOLS, 
  getExchangeRate, 
  convertCurrency, 
  fetchLiveExchangeRates, 
  getRateStatus,
  CurrencyInfo
} from '../services/currencyService';

interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (convertedValue: number, fromCurrency: string, rate: number) => void;
  initialValue?: number;
  initialFromCurrency?: string;
  targetCurrency?: string;
  actionLabel?: string;
}

export const CurrencyModal: React.FC<CurrencyModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialValue = 0,
  initialFromCurrency = 'USD',
  targetCurrency = 'USD',
  actionLabel = 'Apply Converted Value'
}) => {
  const [fromCurrency, setFromCurrency] = useState<string>(initialFromCurrency);
  const [toCurrency, setToCurrency] = useState<string>(targetCurrency || 'USD');
  const [amount, setAmount] = useState<string>(initialValue > 0 ? initialValue.toString() : '100');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rateInfo, setRateInfo] = useState(getRateStatus());

  // Search states for currency pickers
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [isPickerFromOpen, setIsPickerFromOpen] = useState(false);
  const [isPickerToOpen, setIsPickerToOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFromCurrency(initialFromCurrency || 'USD');
      setToCurrency(targetCurrency || 'USD');
      setAmount(initialValue > 0 ? initialValue.toString() : '100');
      setRateInfo(getRateStatus());
    }
  }, [isOpen, initialValue, initialFromCurrency, targetCurrency]);

  const numAmount = parseFloat(amount) || 0;
  const currentRate = useMemo(() => getExchangeRate(fromCurrency, toCurrency), [fromCurrency, toCurrency, rateInfo]);
  const convertedValue = useMemo(() => convertCurrency(numAmount, fromCurrency, toCurrency), [numAmount, fromCurrency, toCurrency, currentRate]);

  const handleRefreshRates = async () => {
    setIsRefreshing(true);
    await fetchLiveExchangeRates(true);
    setRateInfo(getRateStatus());
    setIsRefreshing(false);
  };

  const handleSwap = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const handleApply = () => {
    onApply(convertedValue, fromCurrency, currentRate);
    onClose();
  };

  // Filtered currency lists for quick search
  const filteredFromCurrencies = useMemo(() => {
    if (!searchFrom.trim()) return WORLD_CURRENCIES;
    const q = searchFrom.toLowerCase().trim();
    return WORLD_CURRENCIES.filter(c => 
      c.code.toLowerCase().includes(q) || 
      c.name.toLowerCase().includes(q) || 
      c.symbol.toLowerCase().includes(q)
    );
  }, [searchFrom]);

  const filteredToCurrencies = useMemo(() => {
    if (!searchTo.trim()) return WORLD_CURRENCIES;
    const q = searchTo.toLowerCase().trim();
    return WORLD_CURRENCIES.filter(c => 
      c.code.toLowerCase().includes(q) || 
      c.name.toLowerCase().includes(q) || 
      c.symbol.toLowerCase().includes(q)
    );
  }, [searchTo]);

  if (!isOpen) return null;

  const fromSymbol = WORLD_CURRENCY_SYMBOLS[fromCurrency] || fromCurrency;
  const toSymbol = WORLD_CURRENCY_SYMBOLS[toCurrency] || toCurrency;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-[420px] overflow-hidden border border-gray-200 dark:border-white/10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gray-100 dark:bg-slate-900 p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-white">World Currency Converter</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">All 166 Currencies & Live Exchange Rates</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <X size={18}/>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">

          {/* Rates Status Badge */}
          <div className="flex items-center justify-between text-xs px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold">Live Market Rates</span>
              {rateInfo.lastRatesUpdated && (
                <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 hidden sm:inline">
                  (Synced)
                </span>
              )}
            </div>
            <button 
              type="button"
              onClick={handleRefreshRates}
              disabled={isRefreshing}
              className="flex items-center gap-1 font-medium hover:underline text-emerald-800 dark:text-emerald-200 disabled:opacity-50"
              title="Fetch latest rates from live exchange API"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Updating...' : 'Refresh'}
            </button>
          </div>

          {/* Conversion Controls Box */}
          <div className="space-y-3 bg-gray-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
            
            {/* From Row */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                From Currency & Amount
              </label>
              <div className="flex gap-2">
                {/* Currency Selector Button */}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => { setIsPickerFromOpen(!isPickerFromOpen); setIsPickerToOpen(false); }}
                    className="h-10 px-3 flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-bold text-gray-800 dark:text-white hover:border-primary shrink-0 transition-colors shadow-xs"
                  >
                    <span>{fromSymbol}</span>
                    <span className="text-primary">{fromCurrency}</span>
                    <span className="text-gray-400 text-[10px]">▼</span>
                  </button>

                  {/* Searchable dropdown */}
                  {isPickerFromOpen && (
                    <div className="absolute top-12 left-0 z-30 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 max-h-60 flex flex-col animate-in fade-in zoom-in-95 duration-150">
                      <div className="relative mb-2">
                        <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Search 166 currencies..." 
                          value={searchFrom}
                          onChange={(e) => setSearchFrom(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-primary dark:text-white"
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto flex-1 space-y-1">
                        {filteredFromCurrencies.slice(0, 50).map((curr) => (
                          <button
                            key={curr.code}
                            type="button"
                            onClick={() => { setFromCurrency(curr.code); setIsPickerFromOpen(false); setSearchFrom(''); }}
                            className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex justify-between items-center transition-colors ${curr.code === fromCurrency ? 'bg-primary text-white font-bold' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200'}`}
                          >
                            <span className="truncate max-w-[140px]">{curr.code} - {curr.name}</span>
                            <span className="font-mono text-gray-400 dark:text-gray-300 ml-1">{curr.symbol}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Amount input */}
                <input 
                  type="number" 
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 text-sm sm:text-base font-mono font-bold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Quick Amount presets */}
              <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 text-[11px]">
                {[50, 100, 500, 1000, 5000].map(val => (
                  <button 
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toString())}
                    className="px-2 py-0.5 rounded-md bg-gray-200/70 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-primary hover:text-white transition-colors"
                  >
                    +{val.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Swap Button Center Divider */}
            <div className="flex items-center justify-center my-1 relative">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              <button 
                type="button"
                onClick={handleSwap}
                className="absolute bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-primary shadow-xs transition-transform active:rotate-180"
                title="Swap Currencies"
              >
                <ArrowRightLeft size={14} />
              </button>
            </div>

            {/* To Row */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                To Target Currency
              </label>
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => { setIsPickerToOpen(!isPickerToOpen); setIsPickerFromOpen(false); }}
                  className="w-full h-10 px-3 flex items-center justify-between bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-bold text-gray-800 dark:text-white hover:border-primary transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{toSymbol}</span>
                    <span className="text-primary font-bold">{toCurrency}</span>
                    <span className="text-gray-500 font-normal">
                      - {WORLD_CURRENCIES.find(c => c.code === toCurrency)?.name || toCurrency}
                    </span>
                  </div>
                  <span className="text-gray-400 text-xs">▼ Change</span>
                </button>

                {/* Searchable dropdown */}
                {isPickerToOpen && (
                  <div className="absolute top-12 left-0 right-0 z-30 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 max-h-60 flex flex-col animate-in fade-in zoom-in-95 duration-150">
                    <div className="relative mb-2">
                      <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search 166 currencies..." 
                        value={searchTo}
                        onChange={(e) => setSearchTo(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-primary dark:text-white"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto flex-1 space-y-1">
                      {filteredToCurrencies.slice(0, 50).map((curr) => (
                        <button
                          key={curr.code}
                          type="button"
                          onClick={() => { setToCurrency(curr.code); setIsPickerToOpen(false); setSearchTo(''); }}
                          className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex justify-between items-center transition-colors ${curr.code === toCurrency ? 'bg-primary text-white font-bold' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200'}`}
                        >
                          <span className="truncate max-w-[200px]">{curr.code} - {curr.name}</span>
                          <span className="font-mono text-gray-400 dark:text-gray-300 ml-1">{curr.symbol}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Conversion Result Display */}
          <div className="p-4 bg-gradient-to-br from-indigo-50/70 to-emerald-50/70 dark:from-indigo-950/30 dark:to-emerald-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-800/40 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 mb-1">
              <TrendingUp size={13} className="text-emerald-600" />
              <span>Converted Result</span>
            </div>

            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white font-mono">
              {toSymbol}{convertedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs text-gray-500 font-sans ml-1.5 font-semibold">{toCurrency}</span>
            </div>

            {/* Exchange rate detail */}
            <div className="text-xs text-gray-600 dark:text-gray-300 mt-2 font-mono bg-white/70 dark:bg-slate-900/60 py-1 px-3 rounded-full inline-block border border-gray-200 dark:border-gray-700">
              1 {fromCurrency} = {currentRate < 0.01 ? currentRate.toFixed(6) : currentRate.toLocaleString(undefined, { maximumFractionDigits: 4 })} {toCurrency}
            </div>
          </div>

        </div>

        {/* Action Button */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-gray-700">
          <button 
            type="button"
            onClick={handleApply}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-98 transition-all text-sm"
          >
            <Check size={18} />
            {actionLabel} ({toSymbol}{convertedValue.toLocaleString()})
          </button>
        </div>

      </div>
    </div>
  );
};
