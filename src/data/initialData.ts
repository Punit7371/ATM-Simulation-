import { Account, MultiCurrencyVault, Transaction, AuditLogEntry } from '../types/atm';
import { hashPin } from '../utils/security';

const salt1 = 'a1f9e80234bd81cc';
const salt2 = 'bb82d34e90ff4561';
const salt3 = 'cc120938ff49e012';

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc-1',
    accountNumber: 'ACC-1001',
    customerName: 'Alice Johnson',
    cardNumber: '1111-2222-3333-4444',
    pinHash: hashPin('1234', salt1),
    pinSalt: salt1,
    plainPinHint: '1234',
    accountType: 'CHECKING',
    balance: 3500.0,
    dailyWithdrawalLimit: 1000.0,
    withdrawnToday: 0.0,
    status: 'ACTIVE',
    failedPinAttempts: 0,
  },
  {
    id: 'acc-2',
    accountNumber: 'ACC-1002',
    customerName: 'Bob Smith',
    cardNumber: '5555-6666-7777-8888',
    pinHash: hashPin('4321', salt2),
    pinSalt: salt2,
    plainPinHint: '4321',
    accountType: 'SAVINGS',
    balance: 8750.5,
    dailyWithdrawalLimit: 1500.0,
    withdrawnToday: 0.0,
    status: 'ACTIVE',
    failedPinAttempts: 0,
  },
  {
    id: 'acc-3',
    accountNumber: 'ACC-1003',
    customerName: 'Charlie Davis',
    cardNumber: '9999-8888-7777-6666',
    pinHash: hashPin('9999', salt3),
    pinSalt: salt3,
    plainPinHint: '9999',
    accountType: 'CHECKING',
    balance: 45.0,
    dailyWithdrawalLimit: 500.0,
    withdrawnToday: 0.0,
    status: 'ACTIVE',
    failedPinAttempts: 0,
  },
];

export const INITIAL_VAULT: MultiCurrencyVault = {
  USD: {
    100: 40, // $4,000
    50: 60,  // $3,000
    20: 150, // $3,000
    10: 100, // $1,000
  },
  EUR: {
    100: 30, // €3,000
    50: 60,  // €3,000
    20: 100, // €2,000
    10: 80,  // €800
  },
  GBP: {
    50: 40,  // £2,000
    20: 100, // £2,000
    10: 80,  // £800
    5: 80,   // £400
  },
  JPY: {
    10000: 50, // ¥500,000
    5000: 40,  // ¥200,000
    2000: 50,  // ¥100,000
    1000: 100, // ¥100,000
  },
  CAD: {
    100: 25, // C$2,500
    50: 40,  // C$2,000
    20: 80,  // C$1,600
    10: 60,  // C$600
  },
  AUD: {
    100: 25, // A$2,500
    50: 40,  // A$2,000
    20: 80,  // A$1,600
    10: 60,  // A$600
  },
  CHF: {
    100: 20, // CHF 2,000
    50: 30,  // CHF 1,500
    20: 50,  // CHF 1,000
    10: 40,  // CHF 400
  },
  INR: {
    500: 50,  // ₹25,000
    200: 60,  // ₹12,000
    100: 100, // ₹10,000
    50: 80,   // ₹4,000
  },
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // Sep 24 (Today)
  {
    id: 'tx-init-1',
    timestamp: '2026-09-24 09:15:22',
    type: 'DEPOSIT',
    amount: 500.0,
    balanceAfter: 3500.0,
    description: 'Direct Payroll Deposit',
    accountNumber: 'ACC-1001',
  },
  {
    id: 'tx-init-4',
    timestamp: '2026-09-24 08:30:15',
    type: 'WITHDRAWAL',
    amount: 20.0,
    balanceAfter: 45.0,
    description: 'ATM Fast Cash (1x $20)',
    denominationBreakdown: { 20: 1 },
    accountNumber: 'ACC-1003',
  },
  // Sep 23 (-1d)
  {
    id: 'tx-init-2',
    timestamp: '2026-09-23 18:42:10',
    type: 'WITHDRAWAL',
    amount: 100.0,
    balanceAfter: 3000.0,
    description: 'ATM Cash Withdrawal (2x $50)',
    denominationBreakdown: { 50: 2 },
    accountNumber: 'ACC-1001',
  },
  {
    id: 'tx-init-2b',
    timestamp: '2026-09-23 12:10:00',
    type: 'WITHDRAWAL',
    amount: 40.0,
    balanceAfter: 65.0,
    description: 'ATM Fast Cash (2x $20)',
    denominationBreakdown: { 20: 2 },
    accountNumber: 'ACC-1003',
  },
  // Sep 22 (-2d)
  {
    id: 'tx-init-3',
    timestamp: '2026-09-22 14:05:00',
    type: 'DEPOSIT',
    amount: 2000.0,
    balanceAfter: 8750.5,
    description: 'Branch Teller Deposit',
    accountNumber: 'ACC-1002',
  },
  {
    id: 'tx-init-5',
    timestamp: '2026-09-22 11:20:00',
    type: 'WITHDRAWAL',
    amount: 150.0,
    balanceAfter: 6750.5,
    description: 'ATM Cash Withdrawal (1x $100, 1x $50)',
    denominationBreakdown: { 100: 1, 50: 1 },
    accountNumber: 'ACC-1002',
  },
  // Sep 21 (-3d)
  {
    id: 'tx-init-6',
    timestamp: '2026-09-21 16:45:00',
    type: 'WITHDRAWAL',
    amount: 60.0,
    balanceAfter: 3100.0,
    description: 'ATM Fast Cash (3x $20)',
    denominationBreakdown: { 20: 3 },
    accountNumber: 'ACC-1001',
  },
  // Sep 20 (-4d)
  {
    id: 'tx-init-7',
    timestamp: '2026-09-20 19:15:30',
    type: 'WITHDRAWAL',
    amount: 200.0,
    balanceAfter: 6900.5,
    description: 'Weekend ATM Withdrawal (2x $100)',
    denominationBreakdown: { 100: 2 },
    accountNumber: 'ACC-1002',
  },
  {
    id: 'tx-init-8',
    timestamp: '2026-09-20 14:10:00',
    type: 'WITHDRAWAL',
    amount: 40.0,
    balanceAfter: 3160.0,
    description: 'ATM Cash Withdrawal (2x $20)',
    denominationBreakdown: { 20: 2 },
    accountNumber: 'ACC-1001',
  },
  // Sep 18 (-6d) - Peak Day with multiple withdrawals
  {
    id: 'tx-init-9',
    timestamp: '2026-09-18 10:15:00',
    type: 'WITHDRAWAL',
    amount: 100.0,
    balanceAfter: 3200.0,
    description: 'Morning Cash Withdrawal (1x $100)',
    denominationBreakdown: { 100: 1 },
    accountNumber: 'ACC-1001',
  },
  {
    id: 'tx-init-10',
    timestamp: '2026-09-18 15:30:00',
    type: 'WITHDRAWAL',
    amount: 60.0,
    balanceAfter: 3140.0,
    description: 'Fast Cash Dispense (3x $20)',
    denominationBreakdown: { 20: 3 },
    accountNumber: 'ACC-1001',
  },
  {
    id: 'tx-init-11',
    timestamp: '2026-09-18 20:45:00',
    type: 'WITHDRAWAL',
    amount: 100.0,
    balanceAfter: 7100.5,
    description: 'Evening ATM Cash (1x $100)',
    denominationBreakdown: { 100: 1 },
    accountNumber: 'ACC-1002',
  },
  // Sep 16 (-8d)
  {
    id: 'tx-init-12',
    timestamp: '2026-09-16 13:20:00',
    type: 'WITHDRAWAL',
    amount: 80.0,
    balanceAfter: 3300.0,
    description: 'ATM Cash Withdrawal (4x $20)',
    denominationBreakdown: { 20: 4 },
    accountNumber: 'ACC-1001',
  },
  // Sep 15 (-9d)
  {
    id: 'tx-init-13',
    timestamp: '2026-09-15 09:30:00',
    type: 'WITHDRAWAL',
    amount: 250.0,
    balanceAfter: 7200.5,
    description: 'Mid-Month Withdrawal (2x $100, 1x $50)',
    denominationBreakdown: { 100: 2, 50: 1 },
    accountNumber: 'ACC-1002',
  },
  {
    id: 'tx-init-14',
    timestamp: '2026-09-15 17:40:00',
    type: 'WITHDRAWAL',
    amount: 20.0,
    balanceAfter: 105.0,
    description: 'ATM Fast Cash (1x $20)',
    denominationBreakdown: { 20: 1 },
    accountNumber: 'ACC-1003',
  },
  // Sep 12 (-12d)
  {
    id: 'tx-init-15',
    timestamp: '2026-09-12 11:50:00',
    type: 'WITHDRAWAL',
    amount: 120.0,
    balanceAfter: 3380.0,
    description: 'ATM Cash Withdrawal (1x $100, 1x $20)',
    denominationBreakdown: { 100: 1, 20: 1 },
    accountNumber: 'ACC-1001',
  },
  // Sep 10 (-14d)
  {
    id: 'tx-init-16',
    timestamp: '2026-09-10 14:15:00',
    type: 'WITHDRAWAL',
    amount: 200.0,
    balanceAfter: 7450.5,
    description: 'ATM Cash Dispense (2x $100)',
    denominationBreakdown: { 100: 2 },
    accountNumber: 'ACC-1002',
  },
  // Sep 07 (-17d)
  {
    id: 'tx-init-17',
    timestamp: '2026-09-07 18:25:00',
    type: 'WITHDRAWAL',
    amount: 60.0,
    balanceAfter: 3500.0,
    description: 'ATM Cash Withdrawal (3x $20)',
    denominationBreakdown: { 20: 3 },
    accountNumber: 'ACC-1001',
  },
  // Sep 05 (-19d)
  {
    id: 'tx-init-18',
    timestamp: '2026-09-05 16:10:00',
    type: 'WITHDRAWAL',
    amount: 100.0,
    balanceAfter: 7650.5,
    description: 'ATM Cash Withdrawal (2x $50)',
    denominationBreakdown: { 50: 2 },
    accountNumber: 'ACC-1002',
  },
  {
    id: 'tx-init-19',
    timestamp: '2026-09-05 12:00:00',
    type: 'WITHDRAWAL',
    amount: 40.0,
    balanceAfter: 125.0,
    description: 'ATM Fast Cash (2x $20)',
    denominationBreakdown: { 20: 2 },
    accountNumber: 'ACC-1003',
  },
  // Sep 02 (-22d)
  {
    id: 'tx-init-20',
    timestamp: '2026-09-02 10:40:00',
    type: 'WITHDRAWAL',
    amount: 100.0,
    balanceAfter: 3560.0,
    description: 'Beginning of Month Withdrawal (1x $100)',
    denominationBreakdown: { 100: 1 },
    accountNumber: 'ACC-1001',
  },
  // Aug 30 (-25d)
  {
    id: 'tx-init-21',
    timestamp: '2026-08-30 15:35:00',
    type: 'WITHDRAWAL',
    amount: 200.0,
    balanceAfter: 7750.5,
    description: 'Weekend ATM Dispense (2x $100)',
    denominationBreakdown: { 100: 2 },
    accountNumber: 'ACC-1002',
  },
  // Aug 28 (-27d)
  {
    id: 'tx-init-22',
    timestamp: '2026-08-28 17:15:00',
    type: 'WITHDRAWAL',
    amount: 40.0,
    balanceAfter: 3660.0,
    description: 'ATM Fast Cash (2x $20)',
    denominationBreakdown: { 20: 2 },
    accountNumber: 'ACC-1001',
  },
  // Aug 26 (-29d)
  {
    id: 'tx-init-23',
    timestamp: '2026-08-26 11:20:00',
    type: 'WITHDRAWAL',
    amount: 60.0,
    balanceAfter: 3700.0,
    description: 'ATM Cash Withdrawal (3x $20)',
    denominationBreakdown: { 20: 3 },
    accountNumber: 'ACC-1001',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '2026-09-24 06:00:00',
    event: 'ATM_BOOT',
    level: 'INFO',
    details: 'Terminal ATM-4092 initialized. Vault integrity verified: $11,000.00 across 4 cassettes.',
  },
  {
    id: 'log-2',
    timestamp: '2026-09-24 06:00:02',
    event: 'DISPENSER_SELF_TEST',
    level: 'HARDWARE',
    details: 'Bill pick sensors and optical path calibrated. Cassettes A, B, C, D latched.',
  },
  {
    id: 'log-3',
    timestamp: '2026-09-24 08:30:15',
    event: 'WITHDRAWAL_SUCCESS',
    level: 'INFO',
    details: 'Card ACC-1003 withdrew $20.00. 1x $20 bill dispensed.',
  },
];
