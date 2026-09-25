import { UserProfile, DEFAULT_PREFERENCES } from '../types/profile';
import { normalizeTheme } from '../types/theme';
import { Account, MultiCurrencyVault, Transaction, AuditLogEntry } from '../types/atm';
import { INITIAL_ACCOUNTS, INITIAL_VAULT, INITIAL_TRANSACTIONS, INITIAL_AUDIT_LOGS } from '../data/initialData';
import { hashPin } from './security';
import { ExchangeRateMap } from '../types/currency';
import { INITIAL_EXCHANGE_RATES } from './currency';

const STORAGE_KEYS = {
  PROFILES: 'apex_atm_profiles_v1',
  ACTIVE_PROFILE_ID: 'apex_atm_active_profile_id_v1',
  ACCOUNTS: 'apex_atm_accounts_v1',
  VAULT: 'apex_atm_vault_v2',
  TRANSACTIONS: 'apex_atm_transactions_v1',
  AUDIT_LOGS: 'apex_atm_audit_logs_v1',
  RATES: 'apex_atm_exchange_rates_v1',
};

// Pre-seeded initial user profiles
const saltAlice = 'salt_u_alice_890';
const saltBob = 'salt_u_bob_123';
const saltCharlie = 'salt_u_charlie_456';

export const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'user-alice',
    username: 'alice',
    displayName: 'Alice Johnson',
    passwordHash: hashPin('password123', saltAlice),
    passwordSalt: saltAlice,
    plainPasswordHint: 'password123',
    linkedAccountId: 'acc-1',
    createdAt: '2026-09-01 10:00:00',
    lastLogin: '2026-09-24 19:30:00',
    preferences: {
      favoriteFastCash: 100,
      receiptPreference: 'always',
      dispenserPreference: 'optimal',
      theme: 'midnight_blue',
      soundEffects: true,
      autoInsertCardOnLogin: true,
      quickTransferTarget: 'ACC-1002',
      customWelcomeMessage: 'Welcome back Alice! Checking account ready.',
      preferredCurrency: 'USD',
    },
  },
  {
    id: 'user-bob',
    username: 'bob',
    displayName: 'Bob Smith',
    passwordHash: hashPin('password123', saltBob),
    passwordSalt: saltBob,
    plainPasswordHint: 'password123',
    linkedAccountId: 'acc-2',
    createdAt: '2026-09-05 14:20:00',
    lastLogin: '2026-09-23 11:15:00',
    preferences: {
      favoriteFastCash: 200,
      receiptPreference: 'ask',
      dispenserPreference: 'prefer_large',
      theme: 'cyberpunk_amber',
      soundEffects: true,
      autoInsertCardOnLogin: true,
      quickTransferTarget: 'ACC-1001',
      customWelcomeMessage: 'Good day Bob! European travel currency ready.',
      preferredCurrency: 'EUR',
    },
  },
  {
    id: 'user-charlie',
    username: 'charlie',
    displayName: 'Charlie Davis',
    passwordHash: hashPin('password123', saltCharlie),
    passwordSalt: saltCharlie,
    plainPasswordHint: 'password123',
    linkedAccountId: 'acc-3',
    createdAt: '2026-09-12 09:45:00',
    lastLogin: '2026-09-24 08:30:00',
    preferences: {
      favoriteFastCash: 5000,
      receiptPreference: 'never',
      dispenserPreference: 'prefer_small',
      theme: 'classic_slate',
      soundEffects: false,
      autoInsertCardOnLogin: true,
      customWelcomeMessage: 'Hey Charlie! Ready for Japanese Yen cash.',
      preferredCurrency: 'JPY',
    },
  },
];

function safeGetItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[ApexStorage] Error reading ${key} from localStorage:`, err);
    return fallback;
  }
}

function safeSetItem<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.warn(`[ApexStorage] Error writing ${key} to localStorage:`, err);
  }
}

export const PersistentStorage = {
  // Profiles
  loadProfiles(): UserProfile[] {
    const loaded = safeGetItem<UserProfile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    // Ensure all profiles have all default preference fields if upgraded
    return loaded.map((p) => ({
      ...p,
      preferences: {
        ...DEFAULT_PREFERENCES,
        ...p.preferences,
        theme: normalizeTheme(p.preferences?.theme),
        preferredCurrency: p.preferences?.preferredCurrency || 'USD',
      },
    }));
  },

  saveProfiles(profiles: UserProfile[]): void {
    safeSetItem(STORAGE_KEYS.PROFILES, profiles);
  },

  // Active Profile Session
  loadActiveProfileId(): string | null {
    return safeGetItem<string | null>(STORAGE_KEYS.ACTIVE_PROFILE_ID, 'user-alice');
  },

  saveActiveProfileId(profileId: string | null): void {
    safeSetItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, profileId);
  },

  // Accounts
  loadAccounts(): Account[] {
    return safeGetItem<Account[]>(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
  },

  saveAccounts(accounts: Account[]): void {
    safeSetItem(STORAGE_KEYS.ACCOUNTS, accounts);
  },

  // Vault (Multi-Currency Vault)
  loadVault(): MultiCurrencyVault {
    const loaded = safeGetItem<any>(STORAGE_KEYS.VAULT, null);
    if (!loaded) {
      // Check legacy key
      const legacy = safeGetItem<any>('apex_atm_vault_v1', null);
      if (legacy && !legacy.USD) {
        return {
          ...INITIAL_VAULT,
          USD: legacy,
        };
      }
      return INITIAL_VAULT;
    }

    // If loaded has currency keys
    if (loaded && loaded.USD) {
      return {
        ...INITIAL_VAULT,
        ...loaded,
        INR: loaded.INR || INITIAL_VAULT.INR,
      };
    }

    return INITIAL_VAULT;
  },

  saveVault(vault: MultiCurrencyVault): void {
    safeSetItem(STORAGE_KEYS.VAULT, vault);
  },

  // Exchange Rates
  loadExchangeRates(): ExchangeRateMap {
    const loaded = safeGetItem<ExchangeRateMap>(STORAGE_KEYS.RATES, INITIAL_EXCHANGE_RATES);
    return {
      ...INITIAL_EXCHANGE_RATES,
      ...loaded,
      INR: loaded?.INR || INITIAL_EXCHANGE_RATES.INR,
    };
  },

  saveExchangeRates(rates: ExchangeRateMap): void {
    safeSetItem(STORAGE_KEYS.RATES, rates);
  },

  // Transactions
  loadTransactions(): Transaction[] {
    const loaded = safeGetItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    // If user's stored transactions is the older minimal seed (<= 4 items), populate rich 30-day history
    if (!loaded || loaded.length <= 4) {
      safeSetItem(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
      return INITIAL_TRANSACTIONS;
    }
    return loaded;
  },

  saveTransactions(transactions: Transaction[]): void {
    safeSetItem(STORAGE_KEYS.TRANSACTIONS, transactions);
  },

  // Audit Logs
  loadAuditLogs(): AuditLogEntry[] {
    return safeGetItem<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  },

  saveAuditLogs(logs: AuditLogEntry[]): void {
    safeSetItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  },

  // Full Reset to Factory Demo Defaults
  resetAll(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.PROFILES);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
      localStorage.removeItem(STORAGE_KEYS.ACCOUNTS);
      localStorage.removeItem(STORAGE_KEYS.VAULT);
      localStorage.removeItem('apex_atm_vault_v1');
      localStorage.removeItem(STORAGE_KEYS.RATES);
      localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
      localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    }
  },
};
