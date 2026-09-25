import { CurrencyCode } from './currency';

export type AccountType = 'CHECKING' | 'SAVINGS';
export type AccountStatus = 'ACTIVE' | 'LOCKED' | 'SUSPENDED';

export type TransactionType =
  | 'WITHDRAWAL'
  | 'DEPOSIT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'BALANCE_INQUIRY'
  | 'PIN_CHANGE';

export interface Transaction {
  id: string;
  timestamp: string;
  type: TransactionType;
  amount: number; // Base amount in account currency (USD)
  balanceAfter: number;
  description: string;
  denominationBreakdown?: { [denomination: number]: number };
  relatedAccount?: string;
  accountNumber: string;
  // Multi-Currency extension fields
  currency?: CurrencyCode; // Currency dispensed or transacted (e.g. 'EUR', 'USD', 'JPY')
  currencyAmount?: number; // Amount in target currency (e.g. 50.00 EUR or 10000 JPY)
  exchangeRate?: number; // Rate applied (units of foreign currency per 1 USD)
  currencySymbol?: string; // e.g. '€', '$', '£', '¥'
  baseAmountDebited?: number; // Account debit in base USD
}

export interface Account {
  id: string;
  accountNumber: string;
  customerName: string;
  cardNumber: string; // e.g. "1111-2222-3333-4444"
  pinHash: string; // Salted PBKDF2 hash representation
  pinSalt: string;
  plainPinHint?: string; // for demo ease
  accountType: AccountType;
  balance: number; // Base currency: USD ($)
  dailyWithdrawalLimit: number;
  withdrawnToday: number;
  status: AccountStatus;
  failedPinAttempts: number;
}

export interface BillCassetteInventory {
  [denomination: number]: number;
}

export type MultiCurrencyVault = Record<CurrencyCode, BillCassetteInventory>;

export interface DispenseResult {
  success: boolean;
  amount: number;
  currency?: CurrencyCode;
  breakdown: { [denomination: number]: number };
  totalBills: number;
  errorMessage?: string;
  algorithmSteps?: string[];
  baseEquivalentUSD?: number;
  exchangeRateApplied?: number;
}

export interface ReceiptData {
  receiptId: string;
  terminalId: string;
  timestamp: string;
  customerName: string;
  maskedCardNumber: string;
  accountNumber: string;
  accountType: AccountType;
  transactionType: TransactionType;
  amount?: number;
  availableBalance: number;
  withdrawnToday: number;
  remainingDailyLimit: number;
  denominationBreakdown?: { [denomination: number]: number };
  targetAccount?: string;
  notes?: string;
  // Multi-Currency additions
  currency?: CurrencyCode;
  currencyAmount?: number;
  exchangeRate?: number;
  currencySymbol?: string;
  baseAmountDebited?: number;
}

export type ATMScreenState =
  | 'WELCOME'
  | 'PIN_ENTRY'
  | 'BIOMETRIC_SCAN'
  | 'QR_CODE_AUTH'
  | 'MAIN_MENU'
  | 'BALANCE_INQUIRY'
  | 'FAST_CASH'
  | 'CUSTOM_WITHDRAWAL'
  | 'DISPENSING'
  | 'DEPOSIT'
  | 'TRANSFER'
  | 'CHANGE_PIN'
  | 'MINI_STATEMENT'
  | 'ACCOUNT_LOCKED'
  | 'EJECTING_CARD'
  | 'RECEIPT_PROMPT'
  | 'TRANSACTION_SUCCESS';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  event: string;
  level: 'INFO' | 'WARN' | 'SECURITY' | 'HARDWARE';
  details: string;
}
