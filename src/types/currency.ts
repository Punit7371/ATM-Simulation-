export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'INR';

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
  country: string;
  baseRateAgainstUSD: number; // e.g. 0.92 for EUR (1 USD = 0.92 EUR)
  denominations: number[]; // e.g. [100, 50, 20, 10]
  step: number; // e.g. 10 or 1000
  fastCashPresets: number[];
  minWithdrawal: number;
  maxWithdrawal: number;
  banknoteTitle: string;
  centralBank: string;
  billColor: {
    bg: string;
    border: string;
    text: string;
    accent: string;
    gradient: string;
  };
}

export interface ExchangeRateData {
  rate: number; // Units of currency per 1 USD
  inverseRate: number; // USD per 1 unit of currency
  change24h: number; // e.g. +0.24%
  lastUpdated: string;
}

export type ExchangeRateMap = Record<CurrencyCode, ExchangeRateData>;

export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
    country: 'United States',
    baseRateAgainstUSD: 1.0,
    denominations: [100, 50, 20, 10],
    step: 10,
    fastCashPresets: [20, 40, 60, 100, 200, 300],
    minWithdrawal: 10,
    maxWithdrawal: 1000,
    banknoteTitle: 'FEDERAL RESERVE NOTE',
    centralBank: 'US Federal Reserve',
    billColor: {
      bg: 'bg-emerald-800',
      border: 'border-emerald-400',
      text: 'text-emerald-100',
      accent: 'text-emerald-300',
      gradient: 'from-emerald-700 to-teal-800',
    },
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    country: 'Eurozone',
    baseRateAgainstUSD: 0.92,
    denominations: [100, 50, 20, 10],
    step: 10,
    fastCashPresets: [20, 40, 60, 100, 200, 300],
    minWithdrawal: 10,
    maxWithdrawal: 1000,
    banknoteTitle: 'EUROPEAN CENTRAL BANK',
    centralBank: 'European Central Bank',
    billColor: {
      bg: 'bg-blue-800',
      border: 'border-blue-400',
      text: 'text-blue-100',
      accent: 'text-amber-300',
      gradient: 'from-blue-700 to-indigo-900',
    },
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    flag: '🇬🇧',
    country: 'United Kingdom',
    baseRateAgainstUSD: 0.79,
    denominations: [50, 20, 10, 5],
    step: 5,
    fastCashPresets: [10, 20, 40, 50, 100, 200],
    minWithdrawal: 5,
    maxWithdrawal: 800,
    banknoteTitle: 'BANK OF ENGLAND',
    centralBank: 'Bank of England',
    billColor: {
      bg: 'bg-purple-900',
      border: 'border-purple-400',
      text: 'text-purple-100',
      accent: 'text-purple-300',
      gradient: 'from-purple-800 to-pink-950',
    },
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    flag: '🇯🇵',
    country: 'Japan',
    baseRateAgainstUSD: 145.5,
    denominations: [10000, 5000, 2000, 1000],
    step: 1000,
    fastCashPresets: [1000, 3000, 5000, 10000, 20000, 30000],
    minWithdrawal: 1000,
    maxWithdrawal: 150000,
    banknoteTitle: 'BANK OF JAPAN 日本銀行券',
    centralBank: 'Bank of Japan',
    billColor: {
      bg: 'bg-amber-900',
      border: 'border-amber-400',
      text: 'text-amber-100',
      accent: 'text-yellow-300',
      gradient: 'from-amber-800 to-yellow-950',
    },
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    flag: '🇨🇦',
    country: 'Canada',
    baseRateAgainstUSD: 1.36,
    denominations: [100, 50, 20, 10],
    step: 10,
    fastCashPresets: [20, 40, 60, 100, 200, 300],
    minWithdrawal: 10,
    maxWithdrawal: 1000,
    banknoteTitle: 'BANK OF CANADA / BANQUE DU CANADA',
    centralBank: 'Bank of Canada',
    billColor: {
      bg: 'bg-red-900',
      border: 'border-red-400',
      text: 'text-red-100',
      accent: 'text-red-300',
      gradient: 'from-red-800 to-rose-950',
    },
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    flag: '🇦🇺',
    country: 'Australia',
    baseRateAgainstUSD: 1.52,
    denominations: [100, 50, 20, 10],
    step: 10,
    fastCashPresets: [20, 40, 60, 100, 200, 300],
    minWithdrawal: 10,
    maxWithdrawal: 1000,
    banknoteTitle: 'RESERVE BANK OF AUSTRALIA',
    centralBank: 'Reserve Bank of Australia',
    billColor: {
      bg: 'bg-teal-900',
      border: 'border-teal-400',
      text: 'text-teal-100',
      accent: 'text-emerald-300',
      gradient: 'from-teal-800 to-cyan-950',
    },
  },
  CHF: {
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: 'CHF',
    flag: '🇨🇭',
    country: 'Switzerland',
    baseRateAgainstUSD: 0.88,
    denominations: [100, 50, 20, 10],
    step: 10,
    fastCashPresets: [20, 40, 60, 100, 200, 300],
    minWithdrawal: 10,
    maxWithdrawal: 1000,
    banknoteTitle: 'SCHWEIZERISCHE NATIONALBANK',
    centralBank: 'Swiss National Bank',
    billColor: {
      bg: 'bg-slate-800',
      border: 'border-rose-400',
      text: 'text-slate-100',
      accent: 'text-rose-300',
      gradient: 'from-slate-800 to-stone-900',
    },
  },
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    flag: '🇮🇳',
    country: 'India',
    baseRateAgainstUSD: 83.45,
    denominations: [500, 200, 100, 50],
    step: 50,
    fastCashPresets: [500, 1000, 2000, 3000, 5000, 10000],
    minWithdrawal: 100,
    maxWithdrawal: 50000,
    banknoteTitle: 'RESERVE BANK OF INDIA भारतीय रिज़र्व बैंक',
    centralBank: 'Reserve Bank of India',
    billColor: {
      bg: 'bg-amber-950',
      border: 'border-orange-500',
      text: 'text-amber-100',
      accent: 'text-amber-300',
      gradient: 'from-orange-700 via-amber-800 to-stone-900',
    },
  },
};

export const SUPPORTED_CURRENCIES: CurrencyCode[] = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'CHF',
  'INR',
];
