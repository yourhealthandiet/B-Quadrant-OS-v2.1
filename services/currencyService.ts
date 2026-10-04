import currencyData from './currencyData.json';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  rate: number;
}

export const WORLD_CURRENCIES: CurrencyInfo[] = currencyData.allCurrencies;

// Symbols dictionary for all 166 currencies
export const WORLD_CURRENCY_SYMBOLS: Record<string, string> = { ...currencyData.symbolsMap };

// Fallback / Initial Rates relative to USD = 1.0
export const WORLD_CURRENCY_RATES: Record<string, number> = { ...currencyData.ratesMap };

// Track rate status
let isLiveRates = false;
let lastRatesUpdated: string | null = currencyData.fetchedAt || null;
const listeners: Array<() => void> = [];

const CACHE_KEY = 'global_world_currency_rates_cache_v2';
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Initialize from local cache if available
try {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed.rates && typeof parsed.rates === 'object') {
      Object.assign(WORLD_CURRENCY_RATES, parsed.rates);
      lastRatesUpdated = parsed.updatedAt || null;
      isLiveRates = true;
    }
  }
} catch {
  // Ignore localStorage errors (e.g. incognito/ssr)
}

/**
 * Fetch live exchange rates from real-time open exchange API
 */
export async function fetchLiveExchangeRates(force = false): Promise<Record<string, number>> {
  try {
    // If recently fetched, return current rates
    if (!force && isLiveRates && lastRatesUpdated) {
      const diff = Date.now() - new Date(lastRatesUpdated).getTime();
      if (diff < CACHE_EXPIRY_MS) {
        return WORLD_CURRENCY_RATES;
      }
    }

    // Free, real-time rate API covering all 166 ISO currencies
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) {
      throw new Error(`API responded with status ${res.status}`);
    }
    const data = await res.json();
    if (data && data.rates && typeof data.rates === 'object') {
      Object.assign(WORLD_CURRENCY_RATES, data.rates);
      isLiveRates = true;
      lastRatesUpdated = new Date().toISOString();

      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            rates: data.rates,
            updatedAt: lastRatesUpdated,
          })
        );
      } catch {
        // Ignore storage quotas
      }

      // Notify all subscribers
      listeners.forEach((cb) => {
        try {
          cb();
        } catch {}
      });
    }
  } catch (err) {
    console.warn('Live currency fetch error (using cached/fallback rates):', err);
  }
  return WORLD_CURRENCY_RATES;
}

// Trigger initial live fetch in background
if (typeof window !== 'undefined') {
  setTimeout(() => {
    fetchLiveExchangeRates();
  }, 100);
}

/**
 * Get accurate exchange rate between any two world currencies
 */
export function getExchangeRate(fromCurrency: string, toCurrency: string): number {
  const from = (fromCurrency || 'USD').toUpperCase();
  const to = (toCurrency || 'USD').toUpperCase();
  if (from === to) return 1;

  const fromRate = WORLD_CURRENCY_RATES[from] ?? 1;
  const toRate = WORLD_CURRENCY_RATES[to] ?? 1;

  if (fromRate <= 0) return 1;
  return toRate / fromRate;
}

/**
 * Convert any amount between any two world currencies
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (!amount || isNaN(amount) || amount === 0) return 0;
  const from = (fromCurrency || 'USD').toUpperCase();
  const to = (toCurrency || 'USD').toUpperCase();
  if (from === to) return amount;

  const rate = getExchangeRate(from, to);
  const converted = amount * rate;

  // For high precision small fractions or normal values
  if (Math.abs(converted) < 0.01 && converted !== 0) {
    return Math.round(converted * 10000) / 10000;
  }
  return Math.round(converted * 100) / 100;
}

/**
 * Format currency with symbol or code
 */
export function formatCurrencyWithSymbol(amount: number, currencyCode: string): string {
  const code = (currencyCode || 'USD').toUpperCase();
  const symbol = WORLD_CURRENCY_SYMBOLS[code] || code;
  const formattedNum = (amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formattedNum}`;
}

/**
 * Get currency details (name, symbol, rate)
 */
export function getCurrencyInfo(currencyCode: string): CurrencyInfo {
  const code = (currencyCode || 'USD').toUpperCase();
  const found = WORLD_CURRENCIES.find((c) => c.code === code);
  if (found) {
    return {
      ...found,
      rate: WORLD_CURRENCY_RATES[code] ?? found.rate,
    };
  }
  return {
    code,
    name: code,
    symbol: WORLD_CURRENCY_SYMBOLS[code] || code,
    rate: WORLD_CURRENCY_RATES[code] ?? 1,
  };
}

/**
 * Search/Filter world currencies
 */
export function searchCurrencies(query: string): CurrencyInfo[] {
  if (!query || !query.trim()) return WORLD_CURRENCIES;
  const q = query.toLowerCase().trim();
  return WORLD_CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
  );
}

/**
 * Subscribe to exchange rate updates
 */
export function subscribeToRates(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function getRateStatus() {
  return {
    isLiveRates,
    lastRatesUpdated,
  };
}
