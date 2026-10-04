import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Globe, X, ArrowRight } from 'lucide-react';
import { WORLD_CURRENCIES, WORLD_CURRENCY_SYMBOLS, CurrencyInfo } from '../services/currencyService';

interface StickyCurrencyDropdownProps {
  activeCurrencyCode: string;
  activeProfileId: string;
  onSwitchCurrency: (profileId: string, newCurrencyCode: string) => void;
  onOpenConverter: () => void;
}

export const StickyCurrencyDropdown: React.FC<StickyCurrencyDropdownProps> = ({
  activeCurrencyCode,
  activeProfileId,
  onSwitchCurrency,
  onOpenConverter
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active currency info
  const activeCurrency = useMemo(() => {
    return WORLD_CURRENCIES.find(c => c.code === activeCurrencyCode) || {
      code: activeCurrencyCode,
      name: activeCurrencyCode,
      symbol: WORLD_CURRENCY_SYMBOLS[activeCurrencyCode] || '$',
      rate: 1
    };
  }, [activeCurrencyCode]);

  // Filter currencies based on search
  const filteredCurrencies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      // Put active currency first, then remaining sorted alphabetically by code
      const list = [...WORLD_CURRENCIES];
      return list.sort((a, b) => {
        if (a.code === activeCurrencyCode) return -1;
        if (b.code === activeCurrencyCode) return 1;
        return a.code.localeCompare(b.code);
      });
    }

    return WORLD_CURRENCIES.filter(c => {
      const matchCode = c.code.toLowerCase().includes(q);
      const matchName = c.name.toLowerCase().includes(q);
      const matchSymbol = (c.symbol || '').toLowerCase().includes(q);
      return matchCode || matchName || matchSymbol;
    }).sort((a, b) => {
      if (a.code === activeCurrencyCode) return -1;
      if (b.code === activeCurrencyCode) return 1;
      // Exact prefix match prioritization
      const aStarts = a.code.toLowerCase().startsWith(q) || a.name.toLowerCase().startsWith(q);
      const bStarts = b.code.toLowerCase().startsWith(q) || b.name.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.code.localeCompare(b.code);
    });
  }, [searchQuery, activeCurrencyCode]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      // Auto-focus search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (code: string) => {
    if (code !== activeCurrencyCode) {
      onSwitchCurrency(activeProfileId, code);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleOpenConverterClick = () => {
    setIsOpen(false);
    onOpenConverter();
  };

  return (
    <div className="relative inline-block text-left shrink-0" ref={dropdownRef}>
      {/* Trigger Button in Sticky Bar */}
      <button
        type="button"
        data-tour="currency-switch"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800 border rounded-lg px-2.5 py-1 text-xs font-bold transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-95 ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 text-primary dark:text-indigo-400 bg-primary/5 dark:bg-primary/10'
            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
        title={`Current Currency: [${activeCurrency.symbol}] ${activeCurrency.code} - ${activeCurrency.name}. Click to switch or convert.`}
      >
        <span className="font-bold text-primary dark:text-indigo-400 bg-primary/10 dark:bg-primary/20 px-1 py-0.5 rounded text-[11px] leading-none">
          {activeCurrency.symbol}
        </span>
        <span className="font-bold tracking-tight">{activeCurrency.code}</span>
        <ChevronDown
          size={13}
          className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary dark:text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div 
          className="absolute left-0 top-full mt-2 w-76 sm:w-84 max-w-[calc(100vw-20px)] bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700/80 rounded-2xl shadow-2xl z-50 p-2.5 flex flex-col space-y-2 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
          role="dialog"
          aria-label="Currency Selector and Converter"
        >
          {/* Quick Currency Converter Action Banner */}
          <button
            type="button"
            onClick={handleOpenConverterClick}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/20 border border-emerald-200/90 dark:border-emerald-800/60 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-xs text-emerald-900 dark:text-emerald-200 transition-all text-left group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Globe size={15} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-tight flex items-center gap-1.5 flex-wrap">
                  <span>Currency Converter</span>
                  <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                    166 Currencies
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700/90 dark:text-emerald-400 mt-0.5 leading-tight">
                  Convert amounts with live market rates
                </p>
              </div>
            </div>
            <ArrowRight size={14} className="text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-1" />
          </button>

          {/* Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search currency (e.g. Naira, USD, NGN)..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-gray-50 dark:bg-slate-800/90 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Currencies Count & Header */}
          <div className="flex items-center justify-between px-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            <span>
              {searchQuery ? `Found ${filteredCurrencies.length} results` : 'Switch Active Currency (166 Available)'}
            </span>
            <span>[Symbol] Code — Name</span>
          </div>

          {/* Currencies List */}
          <div className="overflow-y-auto max-h-56 sm:max-h-64 space-y-1 pr-0.5 scrollbar-thin divide-y divide-gray-100 dark:divide-slate-800/50">
            {filteredCurrencies.length > 0 ? (
              filteredCurrencies.map((curr: CurrencyInfo) => {
                const isSelected = curr.code === activeCurrencyCode;
                return (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => handleSelect(curr.code)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-indigo-300 font-bold border border-primary/20'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Symbol in brackets / tag */}
                      <span className={`inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded font-mono text-[11px] font-bold shrink-0 ${
                        isSelected 
                          ? 'bg-primary text-white shadow-2xs' 
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                      }`}>
                        [{curr.symbol || curr.code}]
                      </span>
                      {/* Code and Name in FULL - No Truncation */}
                      <div className="min-w-0 flex-1 flex items-baseline gap-1.5 flex-wrap">
                        <span className="font-bold text-gray-900 dark:text-gray-100">{curr.code}</span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-normal">
                          {curr.name}
                        </span>
                      </div>
                    </div>

                    {/* Status / Selected Checkmark */}
                    <div className="shrink-0 ml-1">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                          <Check size={11} strokeWidth={3} />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono hidden xs:inline">
                          {curr.rate < 1 ? curr.rate.toFixed(3) : curr.rate.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-gray-400 dark:text-gray-500">
                <p>No currencies match &ldquo;{searchQuery}&rdquo;</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-1.5 text-primary dark:text-indigo-400 hover:underline font-semibold text-xs"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
