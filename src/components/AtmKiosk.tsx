import React, { useState } from 'react';
import {
  Account,
  ATMScreenState,
  MultiCurrencyVault,
  ReceiptData,
  Transaction,
  AuditLogEntry,
  BillCassetteInventory,
} from '../types/atm';
import { CurrencyCode, CURRENCY_CONFIGS, ExchangeRateMap } from '../types/currency';
import { convertToUSD, INITIAL_EXCHANGE_RATES, formatCurrencyAmount } from '../utils/currency';
import { AtmScreen } from './AtmScreen';
import { PhysicalKeypad } from './PhysicalKeypad';
import { CardReaderSlot } from './CardReaderSlot';
import { CashDispenserSlot } from './CashDispenserSlot';
import { ReceiptSlot } from './ReceiptSlot';
import { ReceiptModal } from './ReceiptModal';
import { BiometricReaderSlot } from './BiometricReaderSlot';
import { VirtualMobileDevice } from './VirtualMobileDevice';
import { QRSession, QRActionType } from '../types/qr';
import { calculateDispense } from '../utils/dispenser';
import { verifyPin, hashPin, generateSalt, maskCardNumber } from '../utils/security';
import {
  playCardInsertSound,
  playDispenserSound,
  playReceiptPrintSound,
  playErrorBuzz,
  playSuccessChime,
  playKeypadBeep,
} from '../utils/audio';
import { ShieldCheck, Info, User, Sliders, BarChart3, Globe, Palette, QrCode, Smartphone } from 'lucide-react';
import { UserProfile } from '../types/profile';
import { normalizeTheme, THEME_CONFIGS } from '../types/theme';
import { WithdrawalFrequencyChart } from './WithdrawalFrequencyChart';

interface AtmKioskProps {
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  vault: MultiCurrencyVault;
  setVault: React.Dispatch<React.SetStateAction<MultiCurrencyVault>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  auditLogs: AuditLogEntry[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
  exchangeRates: ExchangeRateMap;
  setExchangeRates: React.Dispatch<React.SetStateAction<ExchangeRateMap>>;
  onOpenAdmin: () => void;
  onOpenPython: () => void;
  activeProfile: UserProfile | null;
  onOpenProfile: () => void;
}

export const AtmKiosk: React.FC<AtmKioskProps> = ({
  accounts,
  setAccounts,
  vault,
  setVault,
  transactions,
  setTransactions,
  auditLogs,
  setAuditLogs,
  exchangeRates,
  setExchangeRates,
  onOpenAdmin,
  onOpenPython,
  activeProfile,
  onOpenProfile,
}) => {
  // Session & Screen States
  const [screenState, setScreenState] = useState<ATMScreenState>('WELCOME');
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [isDispensingActive, setIsDispensingActive] = useState<boolean>(false);
  const [isReceiptPrinting, setIsReceiptPrinting] = useState<boolean>(false);

  // Selected withdrawal currency (defaults to user preference or USD)
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(
    activeProfile?.preferences.preferredCurrency || 'USD'
  );

  // Dispensed cash state
  const [dispensedBills, setDispensedBills] = useState<{ [denom: number]: number } | null>(null);
  const [lastAmountDispensed, setLastAmountDispensed] = useState<number>(0);
  const [lastDispensedCurrency, setLastDispensedCurrency] = useState<CurrencyCode>('USD');

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Screen alert message
  const [screenMessage, setScreenMessage] = useState<{
    title: string;
    subtitle?: string;
    isError?: boolean;
  } | null>(null);

  // 30-Day Activity & Withdrawal Frequency Visualizer state
  const [showActivityChart, setShowActivityChart] = useState<boolean>(true);

  // QR Code Cardless Session & Virtual Mobile Device Simulator state
  const [showMobileSimulator, setShowMobileSimulator] = useState<boolean>(false);
  const [qrCountdown, setQrCountdown] = useState<number>(120);
  const [qrSession, setQrSession] = useState<QRSession>(() => {
    const initialId = `ATM-QR-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      sessionId: initialId,
      kioskId: 'ATM-4092-DT',
      terminalName: 'Liquid Glass 24H Kiosk',
      status: 'READY',
      expiresAt: Date.now() + 120000,
      totalDurationSec: 120,
      actionType: 'ANY',
      currency: 'USD',
      suggestedAmount: 100,
      payload: `apexbank://atm/qr-session?token=${initialId}&kiosk=ATM-4092-DT&ts=${Date.now()}`,
    };
  });

  const handleRefreshQRSession = () => {
    const newId = `ATM-QR-${Math.floor(1000 + Math.random() * 9000)}`;
    setQrSession({
      sessionId: newId,
      kioskId: 'ATM-4092-DT',
      terminalName: 'Liquid Glass 24H Kiosk',
      status: 'READY',
      expiresAt: Date.now() + 120000,
      totalDurationSec: 120,
      actionType: 'ANY',
      currency: selectedCurrency,
      suggestedAmount: 100,
      payload: `apexbank://atm/qr-session?token=${newId}&kiosk=ATM-4092-DT&ts=${Date.now()}`,
    });
    setQrCountdown(120);
    playKeypadBeep();
  };

  React.useEffect(() => {
    if (screenState !== 'QR_CODE_AUTH') return;
    const timer = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          setQrSession((s) => ({ ...s, status: 'EXPIRED' }));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [screenState]);

  // Log an audit event
  const addAuditLog = (
    event: string,
    level: 'INFO' | 'WARN' | 'SECURITY' | 'HARDWARE',
    details: string
  ) => {
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      event,
      level,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Synchronize preferred currency and auto-insert card when profile changes
  React.useEffect(() => {
    if (activeProfile) {
      if (activeProfile.preferences.preferredCurrency) {
        setSelectedCurrency(activeProfile.preferences.preferredCurrency);
      }
      if (
        activeProfile.preferences.autoInsertCardOnLogin &&
        activeProfile.linkedAccountId &&
        screenState === 'WELCOME'
      ) {
        const linked = accounts.find((a) => a.id === activeProfile.linkedAccountId);
        if (linked && linked.status !== 'LOCKED') {
          setActiveAccount(linked);
          setPinInput('');
          setScreenState('PIN_ENTRY');
          addAuditLog(
            'CARD_AUTO_INSERTED',
            'INFO',
            `Card ${maskCardNumber(linked.cardNumber)} auto-inserted for profile @${activeProfile.username}.`
          );
        }
      }
    }
  }, [activeProfile?.id]);

  // 1. Insert Card
  const handleInsertCard = (account: Account) => {
    playCardInsertSound();
    setDispensedBills(null);
    setScreenMessage(null);

    if (account.status === 'LOCKED') {
      setActiveAccount(account);
      setScreenState('ACCOUNT_LOCKED');
      playErrorBuzz();
      addAuditLog('CARD_INSERT_BLOCKED', 'SECURITY', `Locked card ${account.cardNumber} rejected.`);
      return;
    }

    setActiveAccount(account);
    setPinInput('');
    setScreenState('PIN_ENTRY');
    addAuditLog('CARD_INSERTED', 'INFO', `Card ${maskCardNumber(account.cardNumber)} inserted.`);
  };

  // 2. PIN Validation
  const handleEnterPin = () => {
    if (!activeAccount) return;

    const isValid = verifyPin(pinInput, activeAccount.pinHash, activeAccount.pinSalt);

    if (isValid) {
      playSuccessChime();
      const updatedAccounts = accounts.map((acc) =>
        acc.id === activeAccount.id ? { ...acc, failedPinAttempts: 0 } : acc
      );
      setAccounts(updatedAccounts);
      setActiveAccount((prev) => (prev ? { ...prev, failedPinAttempts: 0 } : null));

      setPinInput('');
      setScreenMessage(null);
      // Multi-factor step: prompt for biometric thumbprint confirmation
      setScreenState('BIOMETRIC_SCAN');
      addAuditLog('PIN_VERIFIED', 'INFO', `PIN verified for ${activeAccount.accountNumber}. Prompting biometric thumbprint scan.`);
    } else {
      playErrorBuzz();
      const newFailed = activeAccount.failedPinAttempts + 1;
      const isNowLocked = newFailed >= 3;

      const updatedAccounts = accounts.map((acc) =>
        acc.id === activeAccount.id
          ? {
              ...acc,
              failedPinAttempts: newFailed,
              status: isNowLocked ? ('LOCKED' as const) : acc.status,
            }
          : acc
      );
      setAccounts(updatedAccounts);

      if (isNowLocked) {
        setActiveAccount((prev) =>
          prev ? { ...prev, failedPinAttempts: newFailed, status: 'LOCKED' } : null
        );
        setScreenState('ACCOUNT_LOCKED');
        addAuditLog(
          'ACCOUNT_LOCKOUT',
          'SECURITY',
          `Card ${maskCardNumber(activeAccount.cardNumber)} locked after 3 incorrect PIN entries!`
        );
      } else {
        setActiveAccount((prev) => (prev ? { ...prev, failedPinAttempts: newFailed } : null));
        setPinInput('');
        setScreenMessage({
          title: `Incorrect PIN (${3 - newFailed} attempts remaining)`,
          subtitle: 'Please check your PIN and try again.',
          isError: true,
        });
        addAuditLog(
          'AUTH_FAILED',
          'WARN',
          `Incorrect PIN entered for ${maskCardNumber(activeAccount.cardNumber)}. Attempt ${newFailed}/3.`
        );
      }
    }
  };

  // 2b. Biometric Thumbprint Confirmation
  const handleBiometricSuccess = () => {
    if (!activeAccount) return;
    setScreenState('MAIN_MENU');
    setScreenMessage(null);
    addAuditLog(
      'BIOMETRIC_SUCCESS',
      'SECURITY',
      `Thumbprint verified (99.8% match) for ${activeAccount.accountNumber}. Account access granted.`
    );
  };

  // 2c. Mobile QR Handshake Authorization
  const handleMobileAuthorization = (payload: {
    action: QRActionType;
    amount: number;
    currency: CurrencyCode;
    account: Account;
  }) => {
    setQrSession((prev) => ({ ...prev, status: 'SUCCESS' }));
    setActiveAccount(payload.account);

    if (payload.action === 'WITHDRAWAL') {
      addAuditLog(
        'QR_CARDLESS_WITHDRAWAL',
        'SECURITY',
        `Cardless QR withdrawal authorized for ${payload.account.customerName} (${payload.account.accountNumber}): ${formatCurrencyAmount(payload.amount, payload.currency)} ${payload.currency} via session ${qrSession.sessionId}.`
      );
      handleWithdraw(payload.amount, payload.currency);
    } else if (payload.action === 'DEPOSIT') {
      addAuditLog(
        'QR_CARDLESS_DEPOSIT',
        'SECURITY',
        `Cardless QR deposit authorized for ${payload.account.customerName} (${payload.account.accountNumber}): ${formatCurrencyAmount(payload.amount, payload.currency)} ${payload.currency} via session ${qrSession.sessionId}.`
      );
      const depositBills: { [denom: number]: number } = {};
      let remaining = payload.amount;
      if (remaining >= 100) {
        depositBills[100] = Math.floor(remaining / 100);
        remaining %= 100;
      }
      if (remaining >= 50) {
        depositBills[50] = Math.floor(remaining / 50);
        remaining %= 50;
      }
      if (remaining >= 20) {
        depositBills[20] = Math.floor(remaining / 20);
        remaining %= 20;
      }
      if (remaining >= 10) {
        depositBills[10] = Math.floor(remaining / 10);
        remaining %= 10;
      }
      if (Object.keys(depositBills).length === 0) {
        depositBills[100] = 1;
      }
      handleDeposit(depositBills);
      setScreenState('TRANSACTION_SUCCESS');
    } else {
      // LOGIN
      addAuditLog(
        'QR_CARDLESS_LOGIN',
        'SECURITY',
        `Cardless session unlocked for ${payload.account.customerName} (${payload.account.accountNumber}) via Mobile QR token.`
      );
      setScreenState('MAIN_MENU');
      setScreenMessage({
        title: 'Cardless Mobile Session Authorized',
        subtitle: `Welcome ${payload.account.customerName}! Full account access granted.`,
      });
      playSuccessChime();
    }
  };

  // 3. Multi-Currency Cash Withdrawal (Fast cash or Custom) with Dynamic FX Rates
  const handleWithdraw = (amount: number, currency: CurrencyCode = selectedCurrency) => {
    if (!activeAccount) return;

    const cfg = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.USD;
    const baseAmountUSD = convertToUSD(amount, currency, exchangeRates);
    const rateData = exchangeRates[currency] || INITIAL_EXCHANGE_RATES[currency];

    // Check account balance in USD
    if (baseAmountUSD > activeAccount.balance) {
      playErrorBuzz();
      setScreenMessage({
        title: 'Insufficient Funds',
        subtitle: `Requires $${baseAmountUSD.toFixed(2)} USD (${cfg.symbol}${amount} ${currency}). Available: $${activeAccount.balance.toFixed(2)} USD.`,
        isError: true,
      });
      return;
    }

    // Check daily withdrawal limit
    if (activeAccount.withdrawnToday + baseAmountUSD > activeAccount.dailyWithdrawalLimit) {
      playErrorBuzz();
      const remainingLimit = activeAccount.dailyWithdrawalLimit - activeAccount.withdrawnToday;
      setScreenMessage({
        title: 'Daily Limit Exceeded',
        subtitle: `Requires $${baseAmountUSD.toFixed(2)} USD. Remaining allowance today is $${remainingLimit.toFixed(2)} USD.`,
        isError: true,
      });
      return;
    }

    // Algorithmic Backtracking Vault Dispense Check for target currency
    const currencyVault = vault[currency] || {};
    const result = calculateDispense(
      amount,
      currencyVault,
      activeProfile?.preferences.dispenserPreference || 'optimal',
      currency,
      exchangeRates
    );

    if (!result.success) {
      playErrorBuzz();
      setScreenMessage({
        title: `${currency} Vault Dispenser Error`,
        subtitle: result.errorMessage,
        isError: true,
      });
      return;
    }

    // Proceed to Dispensing
    setScreenState('DISPENSING');
    setIsDispensingActive(true);
    playDispenserSound(result.totalBills);

    // Decrement physical cassettes in that currency's vault
    const nextCurrencyVault = { ...currencyVault };
    for (const [denomStr, count] of Object.entries(result.breakdown)) {
      const denom = Number(denomStr);
      nextCurrencyVault[denom] = Math.max(0, (nextCurrencyVault[denom] || 0) - count);
    }
    const nextVault: MultiCurrencyVault = {
      ...vault,
      [currency]: nextCurrencyVault,
    };
    setVault(nextVault);

    // Update account balance (in base USD)
    const newBalance = +(activeAccount.balance - baseAmountUSD).toFixed(2);
    const newWithdrawnToday = +(activeAccount.withdrawnToday + baseAmountUSD).toFixed(2);
    const updatedAcc: Account = {
      ...activeAccount,
      balance: newBalance,
      withdrawnToday: newWithdrawnToday,
    };

    setAccounts((prev) => prev.map((a) => (a.id === activeAccount.id ? updatedAcc : a)));
    setActiveAccount(updatedAcc);

    // Record Transaction
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      type: 'WITHDRAWAL',
      amount: baseAmountUSD,
      balanceAfter: newBalance,
      description:
        currency === 'USD'
          ? `ATM Cash Withdrawal (${result.totalBills} notes)`
          : `ATM Cash Withdrawal (${formatCurrencyAmount(amount, currency)} ${currency} / $${baseAmountUSD.toFixed(2)} USD @ ${rateData.rate})`,
      denominationBreakdown: result.breakdown,
      accountNumber: activeAccount.accountNumber,
      currency,
      currencyAmount: amount,
      exchangeRate: rateData.rate,
      currencySymbol: cfg.symbol,
      baseAmountDebited: baseAmountUSD,
    };
    setTransactions((prev) => [newTx, ...prev]);

    // Record Audit
    addAuditLog(
      'CASH_DISPENSED',
      'HARDWARE',
      `Dispensed ${cfg.symbol}${amount} ${currency} (debit: $${baseAmountUSD.toFixed(2)} USD @ ${rateData.rate}) to ${activeAccount.accountNumber}: ${Object.entries(result.breakdown).map(([d, c]) => `${c}x ${cfg.symbol}${d}`).join(', ')}`
    );

    // Complete dispensing animation
    setTimeout(() => {
      setIsDispensingActive(false);
      setDispensedBills(result.breakdown);
      setLastAmountDispensed(amount);
      setLastDispensedCurrency(currency);
      setScreenState('TRANSACTION_SUCCESS');

      // Check user profile receipt preference
      const receiptPref = activeProfile?.preferences.receiptPreference || 'ask';
      if (receiptPref !== 'never') {
        generateReceiptData({
          transactionType: 'WITHDRAWAL',
          amount: baseAmountUSD,
          currency,
          currencyAmount: amount,
          exchangeRate: rateData.rate,
          currencySymbol: cfg.symbol,
          baseAmountDebited: baseAmountUSD,
          denominationBreakdown: result.breakdown,
        });
        if (receiptPref === 'always') {
          setShowReceiptModal(true);
        }
      }
    }, 1800);
  };

  // 4. Cash Deposit (USD)
  const handleDeposit = (depositBills: { [denom: number]: number }) => {
    if (!activeAccount) return;

    const totalDeposit =
      (depositBills[100] || 0) * 100 +
      (depositBills[50] || 0) * 50 +
      (depositBills[20] || 0) * 20 +
      (depositBills[10] || 0) * 10;

    if (totalDeposit <= 0) return;

    playCardInsertSound();

    // Restock USD vault cassettes with accepted cash
    const updatedUSDVault: BillCassetteInventory = {
      ...(vault.USD || {}),
      100: (vault.USD?.[100] || 0) + (depositBills[100] || 0),
      50: (vault.USD?.[50] || 0) + (depositBills[50] || 0),
      20: (vault.USD?.[20] || 0) + (depositBills[20] || 0),
      10: (vault.USD?.[10] || 0) + (depositBills[10] || 0),
    };
    setVault({
      ...vault,
      USD: updatedUSDVault,
    });

    // Credit account balance
    const newBalance = +(activeAccount.balance + totalDeposit).toFixed(2);
    const updatedAcc: Account = {
      ...activeAccount,
      balance: newBalance,
    };
    setAccounts((prev) => prev.map((a) => (a.id === activeAccount.id ? updatedAcc : a)));
    setActiveAccount(updatedAcc);

    // Record Transaction
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      type: 'DEPOSIT',
      amount: totalDeposit,
      balanceAfter: newBalance,
      description: `ATM Cash Deposit Slot`,
      denominationBreakdown: depositBills,
      accountNumber: activeAccount.accountNumber,
      currency: 'USD',
      currencyAmount: totalDeposit,
      currencySymbol: '$',
    };
    setTransactions((prev) => [newTx, ...prev]);

    addAuditLog(
      'CASH_DEPOSITED',
      'HARDWARE',
      `Deposited $${totalDeposit} into ${activeAccount.accountNumber}. Vault restocked.`
    );

    playSuccessChime();
    setScreenMessage({
      title: 'Deposit Successful',
      subtitle: `$${totalDeposit.toFixed(2)} USD has been credited to your balance.`,
    });
    setScreenState('MAIN_MENU');

    generateReceiptData({
      transactionType: 'DEPOSIT',
      amount: totalDeposit,
      currency: 'USD',
      currencyAmount: totalDeposit,
      currencySymbol: '$',
      denominationBreakdown: depositBills,
    });
  };

  // 5. Transfer Funds
  const handleTransfer = (targetAccNum: string, amount: number) => {
    if (!activeAccount || amount <= 0) return;

    const targetAccount = accounts.find((a) => a.accountNumber === targetAccNum);
    if (!targetAccount) {
      playErrorBuzz();
      setScreenMessage({
        title: 'Account Not Found',
        subtitle: `Destination account ${targetAccNum} does not exist.`,
        isError: true,
      });
      return;
    }

    if (amount > activeAccount.balance) {
      playErrorBuzz();
      setScreenMessage({
        title: 'Insufficient Balance',
        subtitle: `Cannot transfer $${amount.toFixed(2)}. Available: $${activeAccount.balance.toFixed(2)}.`,
        isError: true,
      });
      return;
    }

    // Atomic Balance Update
    const updatedSender: Account = {
      ...activeAccount,
      balance: +(activeAccount.balance - amount).toFixed(2),
    };

    const updatedReceiver: Account = {
      ...targetAccount,
      balance: +(targetAccount.balance + amount).toFixed(2),
    };

    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id === updatedSender.id) return updatedSender;
        if (a.id === updatedReceiver.id) return updatedReceiver;
        return a;
      })
    );
    setActiveAccount(updatedSender);

    const nowTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const senderTx: Transaction = {
      id: `tx-${Date.now()}-out`,
      timestamp: nowTime,
      type: 'TRANSFER_OUT',
      amount,
      balanceAfter: updatedSender.balance,
      description: `Transfer to ${targetAccount.customerName}`,
      relatedAccount: targetAccount.accountNumber,
      accountNumber: updatedSender.accountNumber,
      currency: 'USD',
      currencyAmount: amount,
      currencySymbol: '$',
    };

    const receiverTx: Transaction = {
      id: `tx-${Date.now()}-in`,
      timestamp: nowTime,
      type: 'TRANSFER_IN',
      amount,
      balanceAfter: updatedReceiver.balance,
      description: `Transfer received from ${updatedSender.customerName}`,
      relatedAccount: updatedSender.accountNumber,
      accountNumber: updatedReceiver.accountNumber,
      currency: 'USD',
      currencyAmount: amount,
      currencySymbol: '$',
    };

    setTransactions((prev) => [senderTx, receiverTx, ...prev]);

    addAuditLog(
      'TRANSFER_COMPLETE',
      'INFO',
      `Atomic transfer of $${amount} from ${updatedSender.accountNumber} to ${updatedReceiver.accountNumber}.`
    );

    playSuccessChime();
    setScreenMessage({
      title: 'Transfer Complete',
      subtitle: `$${amount.toFixed(2)} transferred to ${targetAccount.customerName}.`,
    });
    setScreenState('MAIN_MENU');

    generateReceiptData({
      transactionType: 'TRANSFER_OUT',
      amount,
      currency: 'USD',
      currencyAmount: amount,
      currencySymbol: '$',
      targetAccount: `${targetAccount.customerName} (${targetAccount.accountNumber})`,
    });
  };

  // 6. Change PIN
  const handleChangePin = (oldPin: string, newPin: string) => {
    if (!activeAccount) return;

    if (!verifyPin(oldPin, activeAccount.pinHash, activeAccount.pinSalt)) {
      playErrorBuzz();
      setScreenMessage({
        title: 'Incorrect Current PIN',
        subtitle: 'The current PIN entered is not valid.',
        isError: true,
      });
      return;
    }

    if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      playErrorBuzz();
      setScreenMessage({
        title: 'Invalid PIN Format',
        subtitle: 'PIN must consist of 4 to 6 numeric digits.',
        isError: true,
      });
      return;
    }

    if (oldPin === newPin) {
      playErrorBuzz();
      setScreenMessage({
        title: 'PIN Reuse Prohibited',
        subtitle: 'New PIN cannot be the same as your existing PIN.',
        isError: true,
      });
      return;
    }

    const newSalt = generateSalt();
    const newHash = hashPin(newPin, newSalt);

    const updatedAcc: Account = {
      ...activeAccount,
      pinHash: newHash,
      pinSalt: newSalt,
      plainPinHint: newPin,
    };

    setAccounts((prev) => prev.map((a) => (a.id === activeAccount.id ? updatedAcc : a)));
    setActiveAccount(updatedAcc);

    addAuditLog(
      'PIN_CHANGED',
      'SECURITY',
      `PIN updated for card ${maskCardNumber(activeAccount.cardNumber)}. Salt re-keyed.`
    );

    playSuccessChime();
    setScreenMessage({
      title: 'PIN Successfully Changed',
      subtitle: 'Your new PIN is now active and encrypted with PBKDF2.',
    });
    setScreenState('MAIN_MENU');
  };

  // 7. Eject Card
  const handleEjectCard = () => {
    playCardInsertSound();
    setActiveAccount(null);
    setPinInput('');
    setScreenMessage(null);
    setScreenState('WELCOME');
    addAuditLog('CARD_EJECTED', 'INFO', 'Session terminated. Card ejected.');
  };

  // 8. Generate Printable Thermal Receipt
  const generateReceiptData = (override?: Partial<ReceiptData>) => {
    if (!activeAccount) return;
    setIsReceiptPrinting(true);
    playReceiptPrintSound();

    const data: ReceiptData = {
      receiptId: `REC-${Date.now().toString().slice(-6)}`,
      terminalId: '4092',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      customerName: activeAccount.customerName,
      maskedCardNumber: maskCardNumber(activeAccount.cardNumber),
      accountNumber: activeAccount.accountNumber,
      accountType: activeAccount.accountType,
      transactionType: override?.transactionType || 'BALANCE_INQUIRY',
      amount: override?.amount,
      availableBalance: activeAccount.balance,
      withdrawnToday: activeAccount.withdrawnToday,
      remainingDailyLimit: activeAccount.dailyWithdrawalLimit - activeAccount.withdrawnToday,
      denominationBreakdown: override?.denominationBreakdown,
      targetAccount: override?.targetAccount,
      currency: override?.currency || 'USD',
      currencyAmount: override?.currencyAmount,
      exchangeRate: override?.exchangeRate,
      currencySymbol: override?.currencySymbol || '$',
      baseAmountDebited: override?.baseAmountDebited,
      ...override,
    };

    setActiveReceipt(data);
    setTimeout(() => {
      setIsReceiptPrinting(false);
    }, 1200);
  };

  // Physical keypad handlers
  const handleKeypadNumber = (digit: string) => {
    if (screenState === 'PIN_ENTRY') {
      if (pinInput.length < 6) {
        setPinInput((prev) => prev + digit);
      }
    }
  };

  const handleKeypadClear = () => {
    if (screenState === 'PIN_ENTRY') {
      setPinInput('');
    }
  };

  const handleKeypadCancel = () => {
    handleEjectCard();
  };

  const handleKeypadEnter = () => {
    if (screenState === 'PIN_ENTRY') {
      handleEnterPin();
    } else if (screenState === 'BIOMETRIC_SCAN') {
      handleBiometricSuccess();
    }
  };

  const currentTheme = THEME_CONFIGS[normalizeTheme(activeProfile?.preferences.theme)];

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
      {/* ATM Main Liquid Glass Chassis Shell */}
      <div className="w-full liquid-glass-panel rounded-3xl p-4 sm:p-7 relative overflow-hidden">
        {/* Subtle Ambient Liquid Glass Top Illumination & Specular Arc */}
        <div
          className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-80"
          style={{
            backgroundImage: `linear-gradient(to right, transparent, ${currentTheme.accentHex}, transparent)`,
          }}
        />
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-32 blur-3xl pointer-events-none rounded-full opacity-60"
          style={{ backgroundColor: currentTheme.accentHex }}
        />

        {/* ATM Top Facia Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-4 mb-5 gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl border p-0.5 flex items-center justify-center font-bold text-white text-xl shrink-0 backdrop-blur-md transition-colors"
              style={{
                borderColor: currentTheme.panelBorder,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: currentTheme.accentHex,
                boxShadow: `0 0 20px ${currentTheme.chart.glow}`,
              }}
            >
              A
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase flex items-center gap-2">
                <span className={currentTheme.crt.glow}>Apex Trust & Banking</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-slate-300 font-semibold normal-case shadow-sm">
                  Kiosk #4092
                </span>
                <span
                  className="text-[11px] font-mono px-2 py-0.5 rounded-full border font-semibold normal-case hidden md:inline-flex items-center gap-1.5 shadow-sm"
                  style={{
                    backgroundColor: `${currentTheme.accentHex}18`,
                    borderColor: `${currentTheme.accentHex}50`,
                    color: currentTheme.accentHex,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentTheme.accentHex }} />
                  <span>Liquid Glass · {currentTheme.name}</span>
                </span>
              </h1>
              <p className="text-xs text-slate-300/80">
                24H ATM Terminal · Multi-Currency Dispenser (USD, EUR, GBP, JPY, CAD, AUD, CHF, INR) · Dynamic FX
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setShowMobileSimulator(true);
                if (screenState === 'WELCOME') setScreenState('QR_CODE_AUTH');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500/25 to-emerald-500/25 hover:from-cyan-500/35 hover:to-emerald-500/35 border border-cyan-400/50 text-cyan-200 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] group"
              title="Open Virtual Mobile Phone Simulator & Cardless QR Auth"
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-300 group-hover:scale-110 transition-transform" />
              <span>Mobile QR Device</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 px-3 py-1.5 liquid-glass-btn rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-sm"
              style={{ color: currentTheme.accentHex }}
              title="Manage profile & preferences"
            >
              <User className="w-3.5 h-3.5" />
              <span>{activeProfile ? `@${activeProfile.username}` : 'Profile'}</span>
              <Sliders className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>
            <button
              onClick={() => setShowActivityChart((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
                showActivityChart
                  ? 'bg-white/15 text-white border border-white/30 shadow-md'
                  : 'liquid-glass-btn text-slate-300 hover:text-white'
              }`}
              style={showActivityChart ? { borderColor: currentTheme.accentHex, color: currentTheme.accentHex } : undefined}
              title="Toggle 30-Day Activity & Withdrawal Frequency Visualizer"
            >
              <BarChart3 className="w-3.5 h-3.5" style={{ color: currentTheme.accentHex }} />
              <span>30D Activity</span>
            </button>
            <button
              onClick={onOpenPython}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 liquid-glass-btn rounded-xl text-xs font-semibold cursor-pointer transition-all"
              style={{ color: currentTheme.accentHex }}
            >
              <span>Python Code</span>
            </button>
            <button
              onClick={onOpenAdmin}
              className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-400/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(251,191,36,0.2)]"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Vault & FX</span>
            </button>
          </div>
        </div>

        {/* ATM CRT SCREEN DISPLAY */}
        <div className="mb-6">
          <AtmScreen
            screenState={screenState}
            setScreenState={setScreenState}
            activeAccount={activeAccount}
            accounts={accounts}
            vault={vault}
            pinInput={pinInput}
            setPinInput={setPinInput}
            onEnterPin={handleEnterPin}
            onSelectAccountCard={handleInsertCard}
            onWithdraw={handleWithdraw}
            onDeposit={handleDeposit}
            onTransfer={handleTransfer}
            onChangePin={handleChangePin}
            onEjectCard={handleEjectCard}
            onPrintReceipt={(override) => {
              generateReceiptData(override);
              setShowReceiptModal(true);
            }}
            transactions={transactions}
            lastDispensed={dispensedBills}
            lastAmountDispensed={lastAmountDispensed}
            lastDispensedCurrency={lastDispensedCurrency}
            message={screenMessage}
            setMessage={setScreenMessage}
            activeProfile={activeProfile}
            onOpenProfile={onOpenProfile}
            selectedCurrency={selectedCurrency}
            setSelectedCurrency={setSelectedCurrency}
            exchangeRates={exchangeRates}
            onBiometricSuccess={handleBiometricSuccess}
            qrSession={qrSession}
            qrCountdown={qrCountdown}
            onRefreshQRSession={handleRefreshQRSession}
            onOpenMobileSimulator={() => setShowMobileSimulator(true)}
          />
        </div>

        {/* ATM 30-DAY WITHDRAWAL FREQUENCY & ACTIVITY CHART */}
        {showActivityChart && (
          <div className="mb-6">
            <WithdrawalFrequencyChart
              transactions={transactions}
              activeAccount={activeAccount}
              accounts={accounts}
              theme={activeProfile?.preferences.theme}
            />
          </div>
        )}

        {/* ATM LOWER HARDWARE WORKSTATION DECK */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-4 border-t border-white/10">
          {/* LEFT HARDWARE: Card Reader + Cash Dispenser Tray (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card Reader Slot */}
              <CardReaderSlot
                currentCard={activeAccount}
                accounts={accounts}
                onInsertCard={handleInsertCard}
                onEjectCard={handleEjectCard}
                isProcessing={isDispensingActive}
              />

              {/* Receipt Slot */}
              <ReceiptSlot
                currentReceipt={activeReceipt}
                onOpenReceiptModal={() => setShowReceiptModal(true)}
                isPrinting={isReceiptPrinting}
              />
            </div>

            {/* Motorized Cash Dispenser Slot */}
            <CashDispenserSlot
              dispensedBills={dispensedBills}
              totalAmount={lastAmountDispensed}
              isOpen={isDispensingActive}
              currency={lastDispensedCurrency}
              onTakeCash={() => {
                setDispensedBills(null);
                setScreenMessage({
                  title: 'Cash Collected',
                  subtitle: `${formatCurrencyAmount(lastAmountDispensed, lastDispensedCurrency)} ${lastDispensedCurrency} was safely retrieved from the tray.`,
                });
              }}
            />
          </div>

          {/* RIGHT HARDWARE: Biometric Optical Thumbprint Scanner + Tactile Keypad (5 cols) */}
          <div className="md:col-span-5 space-y-4 flex flex-col justify-between">
            <BiometricReaderSlot
              isScanningActive={screenState === 'BIOMETRIC_SCAN'}
              onScanComplete={handleBiometricSuccess}
              cardholderName={activeAccount?.customerName}
            />

            <PhysicalKeypad
              onNumberPress={handleKeypadNumber}
              onClear={handleKeypadClear}
              onCancel={handleKeypadCancel}
              onEnter={handleKeypadEnter}
              disabled={screenState === 'DISPENSING'}
            />
          </div>
        </div>
      </div>

      {/* Helpful Quick Guide - Liquid Glass Surface */}
      <div className="mt-4 p-4 rounded-2xl liquid-glass-card text-xs text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {activeProfile ? (
              <span>
                Logged in as <strong className="text-white">{activeProfile.displayName}</strong> (
                <code className="text-emerald-300 font-mono">@{activeProfile.username}</code>). Preferred currency:{' '}
                <strong className="text-amber-300">
                  {CURRENCY_CONFIGS[activeProfile.preferences.preferredCurrency || 'USD']?.flag} {activeProfile.preferences.preferredCurrency || 'USD'}
                </strong>.
              </span>
            ) : (
              <span>
                Guest demo session. Click <strong>Profile</strong> above to switch accounts, set preferred currencies, or register new users.
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] text-slate-400">
          <span>Active FX Currency: <strong className="text-emerald-300">{selectedCurrency}</strong></span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentTheme.accentHex }} />
            <span>Theme: <strong style={{ color: currentTheme.accentHex }}>{currentTheme.name}</strong></span>
          </span>
        </div>
      </div>

      {/* Receipt Modal Drawer */}
      <ReceiptModal
        receipt={activeReceipt}
        onClose={() => setShowReceiptModal(false)}
      />

      {/* Secondary Virtual Mobile Device Simulator Modal */}
      <VirtualMobileDevice
        isOpen={showMobileSimulator}
        onClose={() => setShowMobileSimulator(false)}
        accounts={accounts}
        activeAccount={activeAccount}
        qrSession={qrSession}
        onRefreshQRSession={handleRefreshQRSession}
        onAuthorizeTransaction={handleMobileAuthorization}
        exchangeRates={exchangeRates}
      />
    </div>
  );
};
