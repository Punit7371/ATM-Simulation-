import { CurrencyCode, CurrencyConfig, CURRENCY_CONFIGS, ExchangeRateMap, SUPPORTED_CURRENCIES } from '../types/currency';

export const INITIAL_EXCHANGE_RATES: ExchangeRateMap = {
  USD: {
    rate: 1.0,
    inverseRate: 1.0,
    change24h: 0.0,
    lastUpdated: '2026-09-24 20:30:00',
  },
  EUR: {
    rate: 0.92,
    inverseRate: +(1 / 0.92).toFixed(4), // ~1.0870
    change24h: +0.18,
    lastUpdated: '2026-09-24 20:30:00',
  },
  GBP: {
    rate: 0.79,
    inverseRate: +(1 / 0.79).toFixed(4), // ~1.2658
    change24h: -0.12,
    lastUpdated: '2026-09-24 20:30:00',
  },
  JPY: {
    rate: 145.5,
    inverseRate: +(1 / 145.5).toFixed(6), // ~0.006873
    change24h: +0.45,
    lastUpdated: '2026-09-24 20:30:00',
  },
  CAD: {
    rate: 1.36,
    inverseRate: +(1 / 1.36).toFixed(4), // ~0.7353
    change24h: -0.08,
    lastUpdated: '2026-09-24 20:30:00',
  },
  AUD: {
    rate: 1.52,
    inverseRate: +(1 / 1.52).toFixed(4), // ~0.6579
    change24h: +0.22,
    lastUpdated: '2026-09-24 20:30:00',
  },
  CHF: {
    rate: 0.88,
    inverseRate: +(1 / 0.88).toFixed(4), // ~1.1364
    change24h: -0.05,
    lastUpdated: '2026-09-24 20:30:00',
  },
  INR: {
    rate: 83.45,
    inverseRate: +(1 / 83.45).toFixed(6), // ~0.011983
    change24h: +0.15,
    lastUpdated: '2026-09-24 20:30:00',
  },
};

/**
 * Converts an amount in base USD to foreign currency amount.
 */
export function convertFromUSD(amountUSD: number, currency: CurrencyCode, rates: ExchangeRateMap): number {
  if (currency === 'USD') return amountUSD;
  const rateData = rates[currency] || INITIAL_EXCHANGE_RATES[currency];
  const converted = amountUSD * rateData.rate;
  return currency === 'JPY' || currency === 'INR' ? Math.round(converted) : +converted.toFixed(2);
}

/**
 * Converts a foreign currency amount to base USD amount needed to debit the account.
 */
export function convertToUSD(amountForeign: number, currency: CurrencyCode, rates: ExchangeRateMap): number {
  if (currency === 'USD') return amountForeign;
  const rateData = rates[currency] || INITIAL_EXCHANGE_RATES[currency];
  const usdAmount = amountForeign / rateData.rate;
  return +usdAmount.toFixed(2);
}

/**
 * Formats a currency amount with symbol and appropriate decimal places.
 */
export function formatCurrencyAmount(amount: number, currency: CurrencyCode = 'USD'): string {
  const config = CURRENCY_CONFIGS[currency];
  const symbol = config?.symbol || '$';
  if (currency === 'JPY' || currency === 'INR') {
    return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
  }
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Simulates a realistic real-time dynamic market tick for foreign exchange rates.
 */
export function simulateMarketTick(currentRates: ExchangeRateMap): ExchangeRateMap {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const updated: ExchangeRateMap = { ...currentRates };

  for (const code of SUPPORTED_CURRENCIES) {
    if (code === 'USD') continue; // USD is base currency
    const prev = currentRates[code] || INITIAL_EXCHANGE_RATES[code];
    // Random fluctuation between -0.3% and +0.3%
    const deltaPercent = (Math.random() - 0.49) * 0.006;
    const baseConfig = CURRENCY_CONFIGS[code];
    let newRate = prev.rate * (1 + deltaPercent);

    // Keep within sensible realistic boundaries (+/- 10% of base)
    const minBound = baseConfig.baseRateAgainstUSD * 0.9;
    const maxBound = baseConfig.baseRateAgainstUSD * 1.1;
    newRate = Math.max(minBound, Math.min(maxBound, newRate));

    const precision = code === 'JPY' || code === 'INR' ? 2 : 4;
    const roundedRate = +newRate.toFixed(precision);
    const inverse = +(1 / roundedRate).toFixed(code === 'JPY' || code === 'INR' ? 6 : 4);
    const change = +(prev.change24h + deltaPercent * 100).toFixed(2);

    updated[code] = {
      rate: roundedRate,
      inverseRate: inverse,
      change24h: Math.max(-2.5, Math.min(2.5, change)),
      lastUpdated: now,
    };
  }

  return updated;
}
