import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Account,
  ATMScreenState,
  Transaction,
  MultiCurrencyVault,
  ReceiptData,
} from '../types/atm';
import { calculateDispense, calculateVaultTotal, calculateMultiCurrencyVaultTotal } from '../utils/dispenser';
import { maskCardNumber } from '../utils/security';
import { CurrencyCode, CURRENCY_CONFIGS, SUPPORTED_CURRENCIES, ExchangeRateMap } from '../types/currency';
import { convertFromUSD, convertToUSD, formatCurrencyAmount } from '../utils/currency';
import {
  CreditCard,
  Lock,
  ArrowRight,
  ArrowDown,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  Send,
  FileText,
  KeyRound,
  LogOut,
  ChevronRight,
  Clock,
  Sparkles,
  Star,
  User,
  Coins,
  Globe,
  Sliders,
  Fingerprint,
  ShieldCheck,
  QrCode,
  Smartphone,
  Zap,
} from 'lucide-react';
import { playBiometricScanSound, playBiometricSuccessSound } from '../utils/audio';
import { UserProfile } from '../types/profile';
import { normalizeTheme, THEME_CONFIGS } from '../types/theme';
import { WithdrawalFrequencyChart } from './WithdrawalFrequencyChart';
import { QRCodeDisplay } from './QRCodeDisplay';
import { QRSession } from '../types/qr';

interface AtmScreenProps {
  screenState: ATMScreenState;
  setScreenState: (state: ATMScreenState) => void;
  activeAccount: Account | null;
  accounts: Account[];
  vault: MultiCurrencyVault;
  pinInput: string;
  setPinInput: (pin: string) => void;
  onEnterPin: () => void;
  onSelectAccountCard: (account: Account) => void;
  onWithdraw: (amount: number, currency?: CurrencyCode) => void;
  onDeposit: (depositBreakdown: { [denom: number]: number }) => void;
  onTransfer: (targetAccNum: string, amount: number) => void;
  onChangePin: (oldPin: string, newPin: string) => void;
  onEjectCard: () => void;
  onPrintReceipt: (data?: Partial<ReceiptData>) => void;
  transactions: Transaction[];
  lastDispensed: { [denom: number]: number } | null;
  lastAmountDispensed: number;
  lastDispensedCurrency?: CurrencyCode;
  message: { title: string; subtitle?: string; isError?: boolean } | null;
  setMessage: (msg: { title: string; subtitle?: string; isError?: boolean } | null) => void;
  activeProfile?: UserProfile | null;
  onOpenProfile?: () => void;
  selectedCurrency: CurrencyCode;
  setSelectedCurrency: (currency: CurrencyCode) => void;
  exchangeRates: ExchangeRateMap;
  onBiometricSuccess?: () => void;
  qrSession?: QRSession | null;
  qrCountdown?: number;
  onRefreshQRSession?: () => void;
  onOpenMobileSimulator?: () => void;
}

export const AtmScreen: React.FC<AtmScreenProps> = ({
  screenState,
  setScreenState,
  activeAccount,
  accounts,
  vault,
  pinInput,
  setPinInput,
  onEnterPin,
  onSelectAccountCard,
  onWithdraw,
  onDeposit,
  onTransfer,
  onChangePin,
  onEjectCard,
  onPrintReceipt,
  transactions,
  lastDispensed,
  lastAmountDispensed,
  lastDispensedCurrency = 'USD',
  message,
  setMessage,
  activeProfile,
  onOpenProfile,
  selectedCurrency,
  setSelectedCurrency,
  exchangeRates,
  onBiometricSuccess,
  qrSession,
  qrCountdown = 120,
  onRefreshQRSession,
  onOpenMobileSimulator,
}) => {
  const currencyConfig = CURRENCY_CONFIGS[selectedCurrency] || CURRENCY_CONFIGS.USD;

  // Biometric Scan interactive state
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);
  const [biometricProgress, setBiometricProgress] = useState(0);
  const [biometricMatched, setBiometricMatched] = useState(false);

  const handleTriggerScreenBiometric = () => {
    if (isBiometricScanning || biometricMatched) return;
    setIsBiometricScanning(true);
    setBiometricProgress(0);
    playBiometricScanSound();

    const interval = setInterval(() => {
      setBiometricProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBiometricScanning(false);
          setIsMatchedDirect(true);
          return 100;
        }
        return prev + 25;
      });
    }, 160);
  };

  const setIsMatchedDirect = (val: boolean) => {
    setBiometricMatched(val);
    playBiometricSuccessSound();
    setTimeout(() => {
      if (onBiometricSuccess) {
        onBiometricSuccess();
      } else {
        setScreenState('MAIN_MENU');
      }
      setBiometricMatched(false);
      setBiometricProgress(0);
    }, 850);
  };

  // Local state for interactive screens
  const [customAmount, setCustomAmount] = useState<number>(() => {
    return currencyConfig.fastCashPresets[2] || 60;
  });

  // When currency changes, adapt custom amount to that currency's step/preset
  useEffect(() => {
    const defaultAmt = currencyConfig.fastCashPresets[2] || 60;
    setCustomAmount(defaultAmt);
  }, [selectedCurrency]);

  const [depositBills, setDepositBills] = useState<{ [denom: number]: number }>({
    100: 0,
    50: 0,
    20: 0,
    10: 0,
  });
  const [transferTarget, setTransferTarget] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('50');
  const [oldPinField, setOldPinField] = useState('');
  const [newPinField, setNewPinField] = useState('');
  const [confirmPinField, setConfirmPinField] = useState('');

  // Clock
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) +
          ' ' +
          now.toLocaleTimeString('en-US', { hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Theme configuration based on user profile preferences
  const activeCanonicalTheme = normalizeTheme(activeProfile?.preferences.theme);
  const themeConfig = THEME_CONFIGS[activeCanonicalTheme];
  const themeClasses = themeConfig.crt;

  // Live multi-currency calculations
  const currentVaultCassettes = vault[selectedCurrency] || {};
  const customDispenseCalc = calculateDispense(
    customAmount,
    currentVaultCassettes,
    activeProfile?.preferences.dispenserPreference || 'optimal',
    selectedCurrency,
    exchangeRates
  );
  const customBaseUSD = convertToUSD(customAmount, selectedCurrency, exchangeRates);
  const grandVault = calculateMultiCurrencyVaultTotal(vault, exchangeRates);
  const rateData = exchangeRates[selectedCurrency] || { rate: 1, inverseRate: 1, change24h: 0, lastUpdated: '' };

  // Soft-key handler (mapped to left 1-4 and right 5-8 buttons)
  const handleSoftKey = (slot: 'L1' | 'L2' | 'L3' | 'L4' | 'R1' | 'R2' | 'R3' | 'R4') => {
    setMessage(null);

    if (screenState === 'MAIN_MENU') {
      if (slot === 'L1') setScreenState('FAST_CASH');
      if (slot === 'L2') setScreenState('CUSTOM_WITHDRAWAL');
      if (slot === 'L3') setScreenState('DEPOSIT');
      if (slot === 'L4') setScreenState('TRANSFER');
      if (slot === 'R1') setScreenState('BALANCE_INQUIRY');
      if (slot === 'R2') setScreenState('MINI_STATEMENT');
      if (slot === 'R3') setScreenState('CHANGE_PIN');
      if (slot === 'R4') onEjectCard();
    } else if (screenState === 'BALANCE_INQUIRY') {
      if (slot === 'L1' || slot === 'R1') onPrintReceipt();
      if (slot === 'L4') setScreenState('MAIN_MENU');
      if (slot === 'R4') onEjectCard();
    } else if (screenState === 'FAST_CASH') {
      const presets = currencyConfig.fastCashPresets;
      if (slot === 'L1' && presets[0]) onWithdraw(presets[0], selectedCurrency);
      if (slot === 'L2' && presets[1]) onWithdraw(presets[1], selectedCurrency);
      if (slot === 'L3' && presets[2]) onWithdraw(presets[2], selectedCurrency);
      if (slot === 'R1' && presets[3]) onWithdraw(presets[3], selectedCurrency);
      if (slot === 'R2' && presets[4]) onWithdraw(presets[4], selectedCurrency);
      if (slot === 'R3' && presets[5]) onWithdraw(presets[5], selectedCurrency);
      if (slot === 'L4') setScreenState('MAIN_MENU');
      if (slot === 'R4') onEjectCard();
    } else if (screenState === 'MINI_STATEMENT') {
      if (slot === 'L1') onPrintReceipt();
      if (slot === 'L4') setScreenState('MAIN_MENU');
      if (slot === 'R4') onEjectCard();
    } else if (screenState === 'RECEIPT_PROMPT') {
      if (slot === 'L1') {
        onPrintReceipt();
        setScreenState('MAIN_MENU');
      }
      if (slot === 'R1') setScreenState('MAIN_MENU');
    } else if (screenState === 'BIOMETRIC_SCAN') {
      if (slot === 'L4') setScreenState('PIN_ENTRY');
      if (slot === 'R3' || slot === 'R4') handleTriggerScreenBiometric();
    } else if (screenState === 'QR_CODE_AUTH') {
      if (slot === 'L4') setScreenState(activeAccount ? 'MAIN_MENU' : 'WELCOME');
      if (slot === 'R1' && onRefreshQRSession) onRefreshQRSession();
      if ((slot === 'R3' || slot === 'R4') && onOpenMobileSimulator) onOpenMobileSimulator();
    } else if (screenState === 'WELCOME') {
      if (slot === 'R4') setScreenState('QR_CODE_AUTH');
    }
  };

  const accountTransactions = activeAccount
    ? transactions.filter((t) => t.accountNumber === activeAccount.accountNumber)
    : [];

  return (
    <div className="relative w-full h-[540px] sm:h-[560px] liquid-glass-inset rounded-2xl border-2 border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.2)] flex overflow-hidden select-none crt-screen">
      {/* LEFT PHYSICAL SOFT-KEYS */}
      <div className="w-9 sm:w-11 bg-white/[0.02] backdrop-blur-xl border-r border-white/10 flex flex-col justify-around py-14 px-1 z-30 shrink-0">
        {(['L1', 'L2', 'L3', 'L4'] as const).map((key) => (
          <button
            key={key}
            onClick={() => handleSoftKey(key)}
            className="w-full h-11 liquid-glass-btn rounded-xl flex items-center justify-center text-[10px] font-mono text-slate-300 hover:text-emerald-300 transition-all cursor-pointer"
            title={`Physical Button ${key}`}
          >
            ▶
          </button>
        ))}
      </div>

      {/* CRT SCREEN INNER AREA */}
      <div
        className={`flex-1 flex flex-col justify-between p-3 sm:p-5 relative overflow-hidden font-mono z-10 transition-colors duration-500 ${themeClasses.screenBg} ${themeClasses.glow}`}
      >
        {/* Subtle Scanlines Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.4)_100%)] z-20" />

        {/* Top Screen Status Bar */}
        <div
          className={`flex items-center justify-between text-[11px] pb-1.5 border-b font-mono tracking-wider ${themeClasses.headerBorder} ${themeClasses.headerText} shrink-0`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold flex items-center gap-1">
              <span>● APEX-4092</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 font-normal">
                {selectedCurrency} {currencyConfig.symbol}
              </span>
            </span>
            <span className="opacity-50">|</span>
            <span className="hidden sm:inline">24H SECURE GATEWAY</span>
          </div>

          <div className="flex items-center gap-3">
            {activeProfile && (
              <span className="hidden sm:inline text-xs text-white flex items-center gap-1 font-sans">
                <User className="w-3 h-3 text-emerald-400" />
                <span>@{activeProfile.username}</span>
              </span>
            )}
            <span className="flex items-center gap-1 font-mono text-slate-300">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>{currentTime}</span>
            </span>
          </div>
        </div>

        {/* Dynamic Screen Message Banner */}
        {message && (
          <div
            className={`my-1 p-2 rounded-lg border text-xs flex items-center justify-between transition-all ${
              message.isError
                ? 'bg-rose-950/80 border-rose-500/60 text-rose-200'
                : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.isError ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <div>
                <span className="font-bold">{message.title}: </span>
                <span>{message.subtitle}</span>
              </div>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-[10px] underline ml-2 cursor-pointer hover:text-white"
            >
              DISMISS
            </button>
          </div>
        )}

        {/* SCREEN STATE: WELCOME / INSERT CARD */}
        {screenState === 'WELCOME' && (
          <div className="flex-1 flex flex-col justify-between py-2 text-center">
            <div className="my-auto space-y-2">
              <div className="inline-block p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-1 animate-pulse">
                <CreditCard className="w-8 h-8" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase crt-glow">
                WELCOME TO APEX TRUST
              </h1>
              <p className="text-xs text-emerald-300/90 max-w-md mx-auto">
                Please insert your chip & PIN card below, or select a demo card to begin your secure session.
              </p>

              {/* Active Profile Greeting */}
              {activeProfile && (
                <div className="inline-flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-full text-xs text-emerald-200 mt-1 max-w-sm mx-auto shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="truncate">
                    {activeProfile.preferences.customWelcomeMessage ||
                      `Welcome back, ${activeProfile.displayName}!`}
                  </span>
                  {activeProfile.linkedAccountId && (
                    <button
                      onClick={() => {
                        const acc = accounts.find((a) => a.id === activeProfile.linkedAccountId);
                        if (acc) onSelectAccountCard(acc);
                      }}
                      className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-sm flex items-center gap-1 shrink-0"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Insert My Card</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Demo Cards Drawer */}
            <div className="my-auto py-1">
              <div className="text-[11px] text-emerald-500 font-semibold tracking-wider uppercase mb-1.5">
                Quick-Select Test Cards (Pre-Seeded)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-lg mx-auto">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => onSelectAccountCard(acc)}
                    className="p-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 hover:border-emerald-400 transition-all text-left flex flex-col justify-between cursor-pointer group hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-white group-hover:text-emerald-300">
                        {acc.customerName.split(' ')[0]}
                      </span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded ${
                          acc.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {acc.status}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-emerald-400/80">
                      {acc.cardNumber.slice(0, 4)} •••• {acc.cardNumber.slice(-4)}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-200 mt-1 flex items-center justify-between">
                      <span>${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      <span className="text-[9px] text-emerald-500 font-normal">
                        PIN: {acc.plainPinHint}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cardless Mobile QR Service Banner */}
            <div className="my-1.5 p-2 rounded-xl bg-gradient-to-r from-emerald-950/80 via-teal-950/70 to-cyan-950/80 border border-emerald-500/40 hover:border-emerald-400 max-w-lg mx-auto w-full flex items-center justify-between gap-2 shadow-md transition-all group">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                  <QrCode className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <span>Cardless QR Mobile Banking</span>
                    <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-cyan-400/25 text-cyan-300 font-mono">
                      NO CARD NEEDED
                    </span>
                  </div>
                  <div className="text-[9.5px] text-emerald-300/80">
                    Fast cash withdrawal or deposit via virtual mobile device
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setScreenState('QR_CODE_AUTH')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md flex items-center gap-1 transition-all active:scale-95"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan QR</span>
                  <span className="text-[9px] bg-slate-950/20 px-1 rounded text-slate-950/80 font-mono">R4</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-emerald-500/80 border-t border-emerald-900/60 pt-2 flex items-center justify-center gap-3">
              <span>Vault Cash: ${grandVault.totalUSD.toLocaleString()} USD (7 Currencies)</span>
              <span>·</span>
              <span>Dynamic FX Dispenser: READY</span>
            </div>
          </div>
        )}

        {/* SCREEN STATE: PIN ENTRY */}
        {screenState === 'PIN_ENTRY' && activeAccount && (
          <div className="flex-1 flex flex-col justify-between py-2 text-center">
            <div className="max-w-md mx-auto w-full">
              <div className="text-xs text-emerald-400/80 uppercase tracking-wider mb-1">
                Security Authentication
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white crt-glow">
                ENTER YOUR 4-DIGIT PIN
              </h2>
              <div className="text-xs text-emerald-400 mt-1">
                Account: <span className="text-white font-semibold">{activeAccount.customerName}</span> (
                {maskCardNumber(activeAccount.cardNumber)})
              </div>

              {/* PIN Circles / Dots */}
              <div className="flex items-center justify-center gap-3 my-5">
                {[0, 1, 2, 3].map((idx) => {
                  const hasDigit = pinInput.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all ${
                        hasDigit
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                          : 'border-emerald-800 bg-emerald-950/40 text-emerald-800'
                      }`}
                    >
                      {hasDigit ? '●' : ''}
                    </div>
                  );
                })}
              </div>

              {/* Warning and Attempts indicator */}
              <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-lg p-2 max-w-xs mx-auto mb-2">
                <span>
                  Attempts left: <strong>{3 - activeAccount.failedPinAttempts}</strong> / 3
                </span>
                <span className="block text-[10px] text-amber-400/80 mt-0.5">
                  (Card locks automatically after 3 consecutive wrong attempts)
                </span>
              </div>

              {/* Demo Hint */}
              <div className="text-[11px] text-emerald-500/80">
                <span>Demo Account PIN: </span>
                <button
                  onClick={() => setPinInput(activeAccount.plainPinHint || '1234')}
                  className="underline text-emerald-300 hover:text-white font-mono cursor-pointer"
                >
                  {activeAccount.plainPinHint} (Click to auto-fill)
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between border-t border-emerald-900/60 pt-3 text-xs">
              <button
                onClick={onEjectCard}
                className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 rounded-lg text-rose-300 cursor-pointer"
              >
                CANCEL / EJECT CARD
              </button>
              <button
                onClick={() => setPinInput('')}
                className="px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900 border border-amber-700/60 rounded-lg text-amber-300 cursor-pointer"
              >
                CLEAR PIN
              </button>
              <button
                onClick={onEnterPin}
                disabled={pinInput.length < 4}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-md"
              >
                ENTER ↵
              </button>
            </div>
          </div>
        )}

        {/* SCREEN STATE: BIOMETRIC SCAN */}
        {screenState === 'BIOMETRIC_SCAN' && activeAccount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="flex-1 flex flex-col justify-between py-2 text-center max-w-lg mx-auto w-full"
          >
            <div>
              {/* Header security tag */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-cyan-400 font-bold tracking-widest uppercase mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Multi-Factor Authentication · Step 2 of 2</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white crt-glow">
                BIOMETRIC THUMBPRINT SCAN
              </h2>
              <div className="text-xs text-slate-300 mt-1 font-mono">
                Cardholder: <span className="text-white font-bold">{activeAccount.customerName}</span> (
                <span className="text-emerald-400 font-bold">{activeAccount.accountNumber}</span>)
              </div>
              <div className="text-[11px] text-cyan-300/80 mt-0.5">
                PIN verified ✓ · Please press and hold thumb on the scanner glass to grant account access.
              </div>

              {/* Central Interactive Biometric Scanner */}
              <div className="my-3.5 flex flex-col items-center justify-center">
                <motion.button
                  type="button"
                  onClick={handleTriggerScreenBiometric}
                  disabled={isBiometricScanning || biometricMatched}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className={`relative w-32 h-32 rounded-3xl border-2 transition-all flex flex-col items-center justify-center cursor-pointer shadow-2xl p-2.5 ${
                    biometricMatched
                      ? 'bg-emerald-950/90 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.6)]'
                      : isBiometricScanning
                      ? 'bg-cyan-950/90 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.7)]'
                      : 'bg-slate-950/80 border-cyan-500/60 hover:border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                  }`}
                  title="Click or touch to confirm thumbprint"
                >
                  {/* Concentric Reticle Rings */}
                  <div className="absolute inset-2 border border-dashed border-cyan-500/30 rounded-2xl pointer-events-none" />

                  {/* Corner Targeting Brackets */}
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />

                  {/* Central Fingerprint Icon with Glow */}
                  <div className="relative">
                    <Fingerprint
                      className={`w-16 h-16 transition-all ${
                        biometricMatched
                          ? 'text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.9)]'
                          : isBiometricScanning
                          ? 'text-cyan-300 drop-shadow-[0_0_14px_rgba(34,211,238,0.9)]'
                          : 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                      }`}
                    />

                    {/* Laser Scanning Beam */}
                    {!biometricMatched && (
                      <motion.div
                        animate={{
                          y: [-32, 32],
                        }}
                        transition={{
                          repeat: Infinity,
                          repeatType: 'reverse',
                          duration: isBiometricScanning ? 0.35 : 1.1,
                          ease: 'easeInOut',
                        }}
                        className={`absolute inset-x-0 h-1 rounded-full pointer-events-none ${
                          isBiometricScanning
                            ? 'bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,1)]'
                            : 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]'
                        }`}
                      />
                    )}

                    {/* Matched overlay */}
                    <AnimatePresence>
                      {biometricMatched && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 flex items-center justify-center bg-emerald-950/90 rounded-2xl"
                        >
                          <CheckCircle2 className="w-12 h-12 text-emerald-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.9)]" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Scanning Progress Bar underneath Fingerprint */}
                  {isBiometricScanning && (
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1.5 border border-cyan-400/40">
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: `${biometricProgress}%` }}
                        className="h-full bg-gradient-to-r from-cyan-400 to-emerald-300 shadow-[0_0_8px_rgba(34,211,238,0.9)]"
                      />
                    </div>
                  )}
                </motion.button>

                {/* Status Readout below button */}
                <div className="mt-2 font-mono text-xs">
                  {biometricMatched ? (
                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      className="text-emerald-300 font-bold flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>THUMBPRINT MATCH CONFIRMED (99.8%) · GRANTING ACCESS...</span>
                    </motion.div>
                  ) : isBiometricScanning ? (
                    <span className="text-cyan-300 font-bold animate-pulse">
                      EXTRACTING MINUTIAE TOPOGRAPHY... [{biometricProgress}%]
                    </span>
                  ) : (
                    <motion.div
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      className="text-cyan-300 font-semibold cursor-pointer flex items-center justify-center gap-1"
                      onClick={handleTriggerScreenBiometric}
                    >
                      <span>▶ PRESS SCANNER OR ENTER TO CONFIRM THUMBPRINT ◀</span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Hardware Biometric Specs Box */}
              <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto bg-black/40 border border-slate-700/60 rounded-xl p-2 font-mono text-[10px] text-slate-300">
                <div className="text-left">
                  <div className="text-slate-500">OPTICAL SENSOR:</div>
                  <div className="text-cyan-400 font-bold">500 DPI PRISM</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-500">LIVENESS:</div>
                  <div className="text-emerald-400 font-bold">PULSE DETECT OK</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500">FIDO2 TOKEN:</div>
                  <div className="text-amber-300 font-bold">HARDWARE BOUND</div>
                </div>
              </div>
            </div>

            {/* Bottom Screen Navigation Actions */}
            <div className="flex items-center justify-between border-t border-emerald-900/60 pt-2.5 text-xs mt-2">
              <button
                onClick={onEjectCard}
                className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 rounded-lg text-rose-300 cursor-pointer"
              >
                CANCEL & EJECT
              </button>
              <button
                onClick={() => setScreenState('PIN_ENTRY')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
              >
                ◀ RE-ENTER PIN
              </button>
              <button
                onClick={handleTriggerScreenBiometric}
                disabled={isBiometricScanning || biometricMatched}
                className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <Fingerprint className="w-4 h-4" />
                CONFIRM SCAN ↵
              </button>
            </div>
          </motion.div>
        )}

        {/* SCREEN STATE: QR_CODE_AUTH */}
        {screenState === 'QR_CODE_AUTH' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="flex-1 flex flex-col justify-between py-1 text-center max-w-lg mx-auto w-full"
          >
            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-bold tracking-widest uppercase mb-0.5">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cardless Mobile Banking · Cryptographic QR Handshake</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white crt-glow tracking-wider">
                SCAN QR CODE TO AUTHORIZE
              </h2>
              <p className="text-xs text-emerald-300/90 max-w-sm mx-auto mt-0.5">
                Scan with your virtual mobile device to authorize instant cash withdrawals, deposits, or cardless sign-in.
              </p>

              {/* Central QR Code Display */}
              <div className="my-2 flex justify-center">
                <QRCodeDisplay
                  payload={
                    qrSession?.payload ||
                    `apexbank://atm/qr-session?token=${qrSession?.sessionId || 'ATM-QR-4092'}&terminal=ATM-4092&ts=${Date.now()}`
                  }
                  sessionId={qrSession?.sessionId || 'ATM-QR-4092'}
                  status={qrSession?.status || 'READY'}
                  countdown={qrCountdown}
                  maxCountdown={120}
                  onRefresh={onRefreshQRSession}
                  onOpenMobile={onOpenMobileSimulator}
                />
              </div>

              {/* Security & Protocol Details */}
              <div className="grid grid-cols-3 gap-2 max-w-md mx-auto bg-black/40 border border-emerald-900/60 rounded-xl p-2 font-mono text-[10px] text-slate-300">
                <div className="text-left">
                  <div className="text-slate-500">TERMINAL:</div>
                  <div className="text-emerald-400 font-bold">ATM #4092-DT</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-500">ENCRYPTION:</div>
                  <div className="text-cyan-400 font-bold">AES-256 GCM</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500">FIDO2 TOKEN:</div>
                  <div className="text-amber-300 font-bold">PASSKEY SYNC</div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between border-t border-emerald-900/60 pt-2 text-xs mt-1">
              <button
                type="button"
                onClick={() => setScreenState(activeAccount ? 'MAIN_MENU' : 'WELCOME')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer flex items-center gap-1"
              >
                ◀ {activeAccount ? 'MAIN MENU (L4)' : 'BACK TO WELCOME (L4)'}
              </button>

              <button
                type="button"
                onClick={onRefreshQRSession}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-emerald-500/30 text-emerald-300 rounded-lg cursor-pointer flex items-center gap-1.5 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>NEW QR TOKEN (R1)</span>
              </button>

              {onOpenMobileSimulator && (
                <button
                  type="button"
                  onClick={onOpenMobileSimulator}
                  className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold rounded-lg cursor-pointer shadow-md flex items-center gap-1.5 text-xs active:scale-95"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>VIRTUAL PHONE 📱 (R4)</span>
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* SCREEN STATE: MAIN MENU */}
        {screenState === 'MAIN_MENU' && activeAccount && (
          <div className="flex-1 flex flex-col justify-between py-1">
            {/* Header info with Dual-Currency Balance */}
            <div className="flex items-center justify-between bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/20 text-xs">
              <div>
                <span className="text-emerald-400">Customer: </span>
                <strong className="text-white">{activeAccount.customerName}</strong>
                <span className="text-emerald-600 mx-1.5">|</span>
                <span className="text-emerald-400">Account: </span>
                <span className="text-emerald-200">{activeAccount.accountNumber}</span>
              </div>
              <div className="font-mono text-emerald-300 font-bold flex items-center gap-2">
                <span>Balance: ${activeAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
                {selectedCurrency !== 'USD' && (
                  <span className="text-[10px] text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                    ~{formatCurrencyAmount(convertFromUSD(activeAccount.balance, selectedCurrency, exchangeRates), selectedCurrency)}
                  </span>
                )}
              </div>
            </div>

            {/* Multi-Currency Selection Bar */}
            <div className="bg-emerald-950/60 p-1.5 rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-1.5 my-1">
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 shrink-0 mr-1 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span>Withdrawal Currency:</span>
                </span>
                {SUPPORTED_CURRENCIES.map((code) => {
                  const cfg = CURRENCY_CONFIGS[code];
                  const isSel = selectedCurrency === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setSelectedCurrency(code)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                        isSel
                          ? 'bg-amber-400 text-slate-950 shadow-sm ring-1 ring-amber-300'
                          : 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/60'
                      }`}
                      title={`${cfg.name} (${cfg.symbol})`}
                    >
                      <span>{cfg.flag}</span>
                      <span>{code}</span>
                    </button>
                  );
                })}
              </div>

              <div className="text-[10px] font-mono text-emerald-300/90 shrink-0 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {selectedCurrency === 'USD'
                    ? '1 USD = $1.00 USD (Base)'
                    : `1 USD = ${rateData.rate} ${selectedCurrency} (1 ${selectedCurrency} = $${rateData.inverseRate} USD)`}
                </span>
              </div>
            </div>

            <div className="text-center my-0.5 text-xs font-bold text-white tracking-wide crt-glow">
              PLEASE SELECT TRANSACTION
            </div>

            {/* 8-Option Grid aligned with side soft keys */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 my-auto">
              {/* Left Column (Mapped to L1-L4) */}
              <div className="space-y-2">
                <button
                  onClick={() => setScreenState('FAST_CASH')}
                  className="w-full text-left p-2.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-emerald-800/80 text-emerald-200 px-1.5 py-0.5 rounded">
                      L1
                    </span>
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                      Fast Cash in {selectedCurrency} ({currencyConfig.symbol})
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                </button>

                <button
                  onClick={() => setScreenState('CUSTOM_WITHDRAWAL')}
                  className="w-full text-left p-2.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-emerald-800/80 text-emerald-200 px-1.5 py-0.5 rounded">
                      L2
                    </span>
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                      Custom Withdrawal ({selectedCurrency})
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                </button>

                <button
                  onClick={() => setScreenState('DEPOSIT')}
                  className="w-full text-left p-2.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-emerald-800/80 text-emerald-200 px-1.5 py-0.5 rounded">
                      L3
                    </span>
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                      Cash Deposit Slot
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                </button>

                <button
                  onClick={() => setScreenState('TRANSFER')}
                  className="w-full text-left p-2.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-emerald-800/80 text-emerald-200 px-1.5 py-0.5 rounded">
                      L4
                    </span>
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                      Funds Transfer
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              </div>

              {/* Right Column (Mapped to R1-R4) */}
              <div className="space-y-2">
                <button
                  onClick={() => setScreenState('BALANCE_INQUIRY')}
                  className="w-full text-right p-2.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 flex items-center justify-between flex-row-reverse group cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <span className="text-[10px] font-mono bg-emerald-800/80 text-emerald-200 px-1.5 py-0.5 rounded">
                      R1
                    </span>
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                      Balance Inquiry
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-400 rotate-180" />
                </button>

                <button
                  onClick={() => setScreenState('MINI_STATEMENT')}
                  className="w-full text-right p-2.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 flex items-center justify-between flex-row-reverse group cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <span className="text-[10px] font-mono bg-emerald-800/80 text-emerald-200 px-1.5 py-0.5 rounded">
                      R2
                    </span>
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                      Mini Statement (6 Tx)
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-400 rotate-180" />
                </button>

                <button
                  onClick={() => setScreenState('CHANGE_PIN')}
                  className="w-full text-right p-2.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 flex items-center justify-between flex-row-reverse group cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <span className="text-[10px] font-mono bg-emerald-800/80 text-emerald-200 px-1.5 py-0.5 rounded">
                      R3
                    </span>
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                      Change PIN
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-400 rotate-180" />
                </button>

                <button
                  onClick={onEjectCard}
                  className="w-full text-right p-2.5 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/40 flex items-center justify-between flex-row-reverse group cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <span className="text-[10px] font-mono bg-rose-800 text-rose-200 px-1.5 py-0.5 rounded">
                      R4
                    </span>
                    <span className="text-xs font-bold text-rose-200 group-hover:text-rose-100">
                      Exit & Eject Card
                    </span>
                  </div>
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                </button>
              </div>
            </div>

            {/* Quick Cardless QR Code Bar on Main Menu */}
            <div className="flex items-center justify-between bg-emerald-950/50 border border-cyan-500/30 px-3 py-1.5 rounded-xl text-xs shadow-sm my-0.5">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] text-slate-200">
                  Switch to <strong className="text-white">Cardless QR Mobile Mode</strong> for fast phone-authorized withdrawals.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setScreenState('QR_CODE_AUTH')}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 text-[10.5px] font-bold cursor-pointer flex items-center gap-1 transition-all active:scale-95"
              >
                <span>Display QR Code</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="text-[10px] text-emerald-500/70 text-center border-t border-emerald-900/40 pt-1">
              Select transaction with touch screen or physical side keys (L1-L4, R1-R4).
            </div>
          </div>
        )}

        {/* SCREEN STATE: BALANCE INQUIRY */}
        {screenState === 'BALANCE_INQUIRY' && activeAccount && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div>
              <h2 className="text-lg font-bold text-white crt-glow text-center mb-1">
                ACCOUNT BALANCE INQUIRY
              </h2>
              <div className="text-center text-xs text-emerald-400 mb-3">
                Real-Time Ledger for {activeAccount.customerName}
              </div>

              <div className="max-w-md mx-auto bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-3.5 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-emerald-900">
                  <span className="text-emerald-400">Account Number:</span>
                  <span className="font-bold text-white">{activeAccount.accountNumber}</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-emerald-900">
                  <span className="text-emerald-400">Account Type:</span>
                  <span className="font-bold text-emerald-200">{activeAccount.accountType}</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-emerald-900">
                  <span className="text-emerald-400">Card Mask:</span>
                  <span className="font-bold text-emerald-200">{maskCardNumber(activeAccount.cardNumber)}</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-emerald-900">
                  <span className="text-emerald-400">Daily Withdrawal Limit:</span>
                  <span className="text-white">${activeAccount.dailyWithdrawalLimit.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-emerald-900">
                  <span className="text-emerald-400">Withdrawn Today:</span>
                  <span className="text-amber-300">${activeAccount.withdrawnToday.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-emerald-900">
                  <span className="text-emerald-400">Remaining Allowance:</span>
                  <span className="font-bold text-emerald-300">
                    ${(activeAccount.dailyWithdrawalLimit - activeAccount.withdrawnToday).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 text-sm">
                  <span className="text-emerald-300 font-bold">AVAILABLE BALANCE:</span>
                  <div className="text-right">
                    <span className="font-bold text-white text-base crt-glow block">
                      ${activeAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                    </span>
                    {selectedCurrency !== 'USD' && (
                      <span className="text-[11px] text-amber-300 block font-normal">
                        ≈ {formatCurrencyAmount(convertFromUSD(activeAccount.balance, selectedCurrency, exchangeRates), selectedCurrency)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-emerald-900/60 pt-3 text-xs">
              <button
                onClick={() => setScreenState('MAIN_MENU')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
              >
                ◀ MAIN MENU
              </button>
              <button
                onClick={() => onPrintReceipt()}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                PRINT RECEIPT
              </button>
              <button
                onClick={onEjectCard}
                className="px-3.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-rose-300 rounded-lg cursor-pointer"
              >
                EJECT CARD
              </button>
            </div>
          </div>
        )}

        {/* SCREEN STATE: FAST CASH */}
        {screenState === 'FAST_CASH' && activeAccount && (
          <div className="flex-1 flex flex-col justify-between py-1">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-white crt-glow">FAST CASH DISPENSING</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                  {currencyConfig.flag} {selectedCurrency}
                </span>
              </div>
              <p className="text-[11px] text-emerald-400">
                Instant one-touch withdrawal. Backtracking engine verifies {selectedCurrency} vault cassettes in real-time.
              </p>
            </div>

            {/* Currency Quick-Switcher Bar */}
            <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-1">
              {SUPPORTED_CURRENCIES.map((code) => {
                const cfg = CURRENCY_CONFIGS[code];
                const isSel = selectedCurrency === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedCurrency(code)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      isSel
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60'
                    }`}
                  >
                    <span>{cfg.flag}</span>
                    <span>{code}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto w-full my-auto">
              {currencyConfig.fastCashPresets.map((amt) => {
                const baseEquivalentUSD = convertToUSD(amt, selectedCurrency, exchangeRates);
                const preview = calculateDispense(
                  amt,
                  currentVaultCassettes,
                  activeProfile?.preferences.dispenserPreference || 'optimal',
                  selectedCurrency,
                  exchangeRates
                );
                const canAfford = activeAccount.balance >= baseEquivalentUSD;
                const canDispense = preview.success;
                const isDisabled = !canAfford || !canDispense;
                const isFavorite = activeProfile?.preferences.favoriteFastCash === amt;

                return (
                  <button
                    key={amt}
                    disabled={isDisabled}
                    onClick={() => onWithdraw(amt, selectedCurrency)}
                    className={`p-2.5 rounded-xl disabled:opacity-30 border transition-all flex flex-col items-center justify-center cursor-pointer disabled:cursor-not-allowed group shadow-sm relative ${
                      isFavorite
                        ? 'bg-amber-950/70 border-amber-400 ring-2 ring-amber-400/50 hover:bg-amber-900/80'
                        : 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-500/40 hover:border-emerald-300'
                    }`}
                  >
                    {isFavorite && (
                      <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>Profile Favorite</span>
                      </span>
                    )}
                    <span className="text-xl font-bold text-white group-hover:text-emerald-300 font-mono">
                      {formatCurrencyAmount(amt, selectedCurrency)}
                    </span>
                    {selectedCurrency !== 'USD' && (
                      <span className="text-[10px] text-amber-300/90 font-mono">
                        ≈ ${baseEquivalentUSD.toFixed(2)} USD
                      </span>
                    )}
                    <span className="text-[9px] text-emerald-400/80 mt-0.5">
                      {preview.success
                        ? Object.entries(preview.breakdown)
                            .map(([d, c]) => `${c}x ${currencyConfig.symbol}${d}`)
                            .join(' + ')
                        : 'Unavailable in vault'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-emerald-900/60 pt-2 text-xs">
              <button
                onClick={() => setScreenState('MAIN_MENU')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
              >
                ◀ MAIN MENU
              </button>
              <span className="text-[11px] text-emerald-400">
                Balance: ${activeAccount.balance.toFixed(2)} USD
              </span>
              <button
                onClick={() => setScreenState('CUSTOM_WITHDRAWAL')}
                className="px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg cursor-pointer"
              >
                CUSTOM AMOUNT ▶
              </button>
            </div>
          </div>
        )}

        {/* SCREEN STATE: CUSTOM WITHDRAWAL */}
        {screenState === 'CUSTOM_WITHDRAWAL' && activeAccount && (
          <div className="flex-1 flex flex-col justify-between py-1">
            <div>
              <div className="flex items-center justify-center gap-2 mb-0.5">
                <h2 className="text-lg font-bold text-white crt-glow text-center">
                  CUSTOM CASH WITHDRAWAL
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                  {currencyConfig.flag} {selectedCurrency}
                </span>
              </div>
              <p className="text-xs text-emerald-400 text-center">
                Enter amount in multiples of {currencyConfig.symbol}{currencyConfig.step} ({currencyConfig.symbol}{currencyConfig.minWithdrawal} – {currencyConfig.symbol}{currencyConfig.maxWithdrawal.toLocaleString()}).
              </p>
            </div>

            {/* Currency Quick-Switcher Bar */}
            <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-1">
              {SUPPORTED_CURRENCIES.map((code) => {
                const cfg = CURRENCY_CONFIGS[code];
                const isSel = selectedCurrency === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedCurrency(code)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      isSel
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60'
                    }`}
                  >
                    <span>{cfg.flag}</span>
                    <span>{code}</span>
                  </button>
                );
              })}
            </div>

            <div className="max-w-md mx-auto w-full my-auto space-y-2.5">
              {/* Amount Display & Controls */}
              <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 text-center">
                <div className="text-[11px] text-emerald-400 uppercase tracking-wider mb-0.5">
                  Requested Dispense Amount ({selectedCurrency})
                </div>
                <div className="text-3xl font-bold font-mono text-white crt-glow">
                  {formatCurrencyAmount(customAmount, selectedCurrency)} {selectedCurrency}
                </div>
                {selectedCurrency !== 'USD' && (
                  <div className="text-xs text-amber-300 font-mono mt-0.5">
                    Estimated Account Debit: <strong className="text-white">${customBaseUSD.toFixed(2)} USD</strong> (@ 1 USD = {rateData.rate} {selectedCurrency})
                  </div>
                )}

                {/* Quick Increment Buttons */}
                <div className="flex items-center justify-center gap-1.5 mt-2.5">
                  {(selectedCurrency === 'JPY'
                    ? [1000, 2000, 5000, 10000]
                    : selectedCurrency === 'INR'
                    ? [100, 200, 500, 1000]
                    : selectedCurrency === 'GBP'
                    ? [5, 10, 20, 50]
                    : [10, 20, 50, 100]
                  ).map((inc) => (
                    <button
                      key={inc}
                      onClick={() => setCustomAmount((prev) => Math.min(currencyConfig.maxWithdrawal, prev + inc))}
                      className="px-2.5 py-1 text-xs bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-500/30 rounded-lg text-emerald-200 cursor-pointer font-mono"
                    >
                      +{currencyConfig.symbol}{inc}
                    </button>
                  ))}
                  <button
                    onClick={() => setCustomAmount(currencyConfig.fastCashPresets[1] || 20)}
                    className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Algorithmic Breakdown Preview */}
              <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-xs font-mono">
                <div className="flex items-center justify-between text-emerald-400 font-bold mb-1">
                  <span>DISPENSER VAULT PREVIEW ({selectedCurrency}):</span>
                  <span
                    className={
                      customDispenseCalc.success ? 'text-emerald-400' : 'text-rose-400'
                    }
                  >
                    {customDispenseCalc.success ? 'OPTIMAL NOTE COUNT' : 'UNAVAILABLE'}
                  </span>
                </div>

                {customDispenseCalc.success ? (
                  <div>
                    <div className="text-white font-semibold flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <span>
                        Dispenses {customDispenseCalc.totalBills} {currencyConfig.name} note(s):{' '}
                        {Object.entries(customDispenseCalc.breakdown)
                          .map(([d, c]) => `${c}x ${currencyConfig.symbol}${d}`)
                          .join(', ')}
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-500/80 mt-1">
                      Live backtracking dynamic exchange: Debits ${customBaseUSD.toFixed(2)} USD from account.
                    </div>
                  </div>
                ) : (
                  <div className="text-rose-300 text-[11px]">
                    {customDispenseCalc.errorMessage}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-emerald-900/60 pt-2 text-xs">
              <button
                onClick={() => setScreenState('MAIN_MENU')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
              >
                ◀ CANCEL
              </button>
              <button
                disabled={!customDispenseCalc.success || customBaseUSD > activeAccount.balance}
                onClick={() => onWithdraw(customAmount, selectedCurrency)}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed shadow-md flex items-center gap-1.5"
              >
                <Banknote className="w-4 h-4" />
                DISPENSE {selectedCurrency} ↵
              </button>
            </div>
          </div>
        )}

        {/* SCREEN STATE: DISPENSING */}
        {screenState === 'DISPENSING' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-center items-center text-center py-5 px-3 max-w-md mx-auto"
          >
            {/* Animated Cassette & Motorized Dispenser Schematic */}
            <div className="relative mb-3.5">
              <div className="w-20 h-20 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center relative shadow-[0_0_25px_rgba(16,185,129,0.25)] overflow-hidden">
                {/* Rotating gear teeth */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.0, ease: 'linear' }}
                  className="absolute inset-2 border-2 border-dashed border-emerald-400/40 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  className="absolute inset-4 border border-dotted border-teal-300/30 rounded-full"
                />

                {/* Banknote sliding through optical rollers */}
                <motion.div
                  animate={{
                    y: [-18, 18],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.55,
                    ease: 'easeInOut',
                  }}
                  className="w-10 h-5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-xs border border-white/60 shadow-lg flex items-center justify-center font-mono text-[9px] text-slate-950 font-black z-10"
                >
                  {currencyConfig.symbol}
                </motion.div>

                {/* Optical Laser scan line */}
                <motion.div
                  animate={{ x: [-28, 28] }}
                  transition={{ repeat: Infinity, duration: 0.45, ease: 'linear' }}
                  className="absolute inset-y-0 w-0.5 bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.9)] opacity-70 z-20 pointer-events-none"
                />
              </div>

              {/* Roller cogs flanking the chamber */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                className="absolute -left-3 top-7 w-6 h-6 rounded-full border border-emerald-500/50 bg-slate-900 flex items-center justify-center shadow"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </motion.div>
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                className="absolute -right-3 top-7 w-6 h-6 rounded-full border border-emerald-500/50 bg-slate-900 flex items-center justify-center shadow"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </motion.div>
            </div>

            <motion.h2
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ repeat: Infinity, duration: 1.0 }}
              className="text-lg font-bold text-white crt-glow tracking-wider"
            >
              DISPENSING {selectedCurrency} NOTES...
            </motion.h2>

            {/* Live mechanical status telemetry */}
            <div className="my-2 space-y-1 font-mono text-[10px] text-left bg-black/40 border border-emerald-500/30 rounded-lg p-2.5 w-full text-emerald-300">
              <div className="flex justify-between">
                <span className="text-emerald-400/80">CASSETTE PICK:</span>
                <span className="font-bold text-white">MOTORIZED ESCROW ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400/80">OPTICAL SENSOR:</span>
                <span className="font-bold text-cyan-300">DOUBLE-DETECT VERIFIED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400/80">TRANSPORT BELT:</span>
                <span className="font-bold text-amber-300 animate-pulse">1200 RPM FEEDING</span>
              </div>
            </div>

            {/* Smooth framer-motion progress bar */}
            <div className="w-full h-2.5 bg-emerald-950/80 rounded-full border border-emerald-500/40 overflow-hidden relative shadow-inner">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.8, ease: 'easeInOut' }}
                className="h-full bg-gradient-to-r from-emerald-600 via-teal-400 to-cyan-300 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
              />
            </div>
            <span className="text-[10px] font-mono text-emerald-400/70 mt-1.5">
              Preparing cash delivery to motorized shutter tray...
            </span>
          </motion.div>
        )}

        {/* SCREEN STATE: TRANSACTION SUCCESS */}
        {screenState === 'TRANSACTION_SUCCESS' && activeAccount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="flex-1 flex flex-col justify-between py-2 text-center"
          >
            <div className="my-auto">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 mb-1 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                <CheckCircle2 className="w-9 h-9" />
              </motion.div>
              <h2 className="text-xl font-bold text-white crt-glow">TRANSACTION COMPLETE</h2>

              {/* Animated Prompt to collect cash below */}
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.0, ease: 'easeInOut' }}
                className="inline-flex items-center gap-1 px-3 py-0.5 my-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold shadow-sm"
              >
                <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                <span>PLEASE COLLECT CASH FROM TRAY BELOW</span>
                <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
              </motion.div>

              {lastDispensed && (
                <motion.div
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="max-w-xs mx-auto bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 my-2 font-mono text-xs text-left shadow-lg"
                >
                  <div className="text-emerald-400 font-bold mb-1 flex items-center justify-between">
                    <span>DISPENSED SUMMARY ({lastDispensedCurrency}):</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold">
                      {CURRENCY_CONFIGS[lastDispensedCurrency]?.flag} {lastDispensedCurrency}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {formatCurrencyAmount(lastAmountDispensed, lastDispensedCurrency)}
                  </div>
                  <div className="text-[11px] text-emerald-300 mt-1">
                    {Object.entries(lastDispensed)
                      .map(([denom, count]) => `${count}x ${CURRENCY_CONFIGS[lastDispensedCurrency]?.symbol}${denom}`)
                      .join(' + ')}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-1 pt-1 border-t border-emerald-900 flex justify-between">
                    <span>Account Balance:</span>
                    <span className="font-bold text-white">${activeAccount.balance.toFixed(2)} USD</span>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-emerald-900/60 pt-3 text-xs">
              <button
                onClick={() => setScreenState('MAIN_MENU')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                ◀ MAIN MENU
              </button>
              <button
                onClick={() => onPrintReceipt()}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                PRINT RECEIPT
              </button>
              <button
                onClick={onEjectCard}
                className="px-3.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-rose-300 rounded-lg cursor-pointer transition-colors"
              >
                FINISH & EJECT
              </button>
            </div>
          </motion.div>
        )}

        {/* SCREEN STATE: CASH DEPOSIT */}
        {screenState === 'DEPOSIT' && activeAccount && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div>
              <h2 className="text-lg font-bold text-white crt-glow text-center">
                CASH DEPOSIT FEEDER
              </h2>
              <p className="text-xs text-emerald-400 text-center mt-0.5">
                Insert currency bills into the deposit slot. Real-time validation and cassette restock.
              </p>
            </div>

            <div className="max-w-md mx-auto w-full my-auto space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {([100, 50, 20, 10] as const).map((denom) => (
                  <div
                    key={denom}
                    className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-center"
                  >
                    <div className="text-xs font-bold text-white font-mono">${denom}</div>
                    <div className="text-xl font-bold text-emerald-300 my-1 font-mono">
                      {depositBills[denom]}
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() =>
                          setDepositBills((prev) => ({
                            ...prev,
                            [denom]: Math.max(0, prev[denom] - 1),
                          }))
                        }
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        onClick={() =>
                          setDepositBills((prev) => ({
                            ...prev,
                            [denom]: prev[denom] + 1,
                          }))
                        }
                        className="w-6 h-6 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Calculation */}
              <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between font-mono text-xs">
                <span className="text-emerald-400">TOTAL DEPOSIT CALCULATED:</span>
                <span className="text-lg font-bold text-white crt-glow">
                  $
                  {(
                    depositBills[100] * 100 +
                    depositBills[50] * 50 +
                    depositBills[20] * 20 +
                    depositBills[10] * 10
                  ).toFixed(2)}{' '}
                  USD
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-emerald-900/60 pt-2 text-xs">
              <button
                onClick={() => setScreenState('MAIN_MENU')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
              >
                ◀ CANCEL
              </button>
              <button
                onClick={() => {
                  onDeposit(depositBills);
                  setDepositBills({ 100: 0, 50: 0, 20: 0, 10: 0 });
                }}
                disabled={
                  depositBills[100] === 0 &&
                  depositBills[50] === 0 &&
                  depositBills[20] === 0 &&
                  depositBills[10] === 0
                }
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed shadow-md"
              >
                CONFIRM DEPOSIT ↵
              </button>
            </div>
          </div>
        )}

        {/* SCREEN STATE: TRANSFER */}
        {screenState === 'TRANSFER' && activeAccount && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div>
              <h2 className="text-lg font-bold text-white crt-glow text-center">
                INTER-ACCOUNT FUNDS TRANSFER
              </h2>
              <p className="text-xs text-emerald-400 text-center mt-0.5">
                Atomic inter-bank ledger transfer with transaction logging.
              </p>
            </div>

            <div className="max-w-md mx-auto w-full my-auto space-y-3 text-xs">
              <div>
                <label className="block text-emerald-400 font-semibold mb-1">
                  Recipient Account:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {accounts
                    .filter((a) => a.accountNumber !== activeAccount.accountNumber)
                    .map((target) => (
                      <button
                        key={target.id}
                        type="button"
                        onClick={() => setTransferTarget(target.accountNumber)}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          transferTarget === target.accountNumber
                            ? 'bg-emerald-500/20 border-emerald-400 text-white'
                            : 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60'
                        }`}
                      >
                        <div className="font-bold">{target.customerName}</div>
                        <div className="font-mono text-[10px] text-emerald-400/80">
                          {target.accountNumber}
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-emerald-400 font-semibold mb-1">
                  Transfer Amount ($ USD):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={activeAccount.balance}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="flex-1 bg-slate-950 border border-emerald-500/40 rounded-lg px-3 py-1.5 font-mono text-white text-sm focus:outline-none focus:border-emerald-400"
                  />
                  {[25, 50, 100, 250].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTransferAmount(preset.toString())}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer"
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-emerald-900/60 pt-2 text-xs">
              <button
                onClick={() => setScreenState('MAIN_MENU')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
              >
                ◀ CANCEL
              </button>
              <button
                disabled={
                  !transferTarget ||
                  parseFloat(transferAmount) <= 0 ||
                  parseFloat(transferAmount) > activeAccount.balance
                }
                onClick={() => onTransfer(transferTarget, parseFloat(transferAmount) || 0)}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed shadow-md"
              >
                EXECUTE TRANSFER ↵
              </button>
            </div>
          </div>
        )}

        {/* SCREEN STATE: CHANGE PIN */}
        {screenState === 'CHANGE_PIN' && activeAccount && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div>
              <h2 className="text-lg font-bold text-white crt-glow text-center">
                CHANGE SECURITY PIN
              </h2>
              <p className="text-xs text-emerald-400 text-center mt-0.5">
                Update your card credentials. Enforces salted PBKDF2 hash encryption.
              </p>
            </div>

            <div className="max-w-sm mx-auto w-full my-auto space-y-3 text-xs font-mono">
              <div>
                <label className="block text-emerald-400 font-semibold mb-1">
                  Current PIN:
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={oldPinField}
                  onChange={(e) => setOldPinField(e.target.value)}
                  placeholder="Enter current 4-digit PIN"
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-lg px-3 py-2 text-center text-white tracking-widest text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-emerald-400 font-semibold mb-1">
                  New PIN (4–6 digits):
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPinField}
                  onChange={(e) => setNewPinField(e.target.value)}
                  placeholder="Enter new PIN"
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-lg px-3 py-2 text-center text-white tracking-widest text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-emerald-400 font-semibold mb-1">
                  Confirm New PIN:
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={confirmPinField}
                  onChange={(e) => setConfirmPinField(e.target.value)}
                  placeholder="Re-enter new PIN"
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-lg px-3 py-2 text-center text-white tracking-widest text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-emerald-900/60 pt-2 text-xs">
              <button
                onClick={() => setScreenState('MAIN_MENU')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
              >
                ◀ CANCEL
              </button>
              <button
                disabled={
                  oldPinField.length < 4 ||
                  newPinField.length < 4 ||
                  newPinField !== confirmPinField
                }
                onClick={() => onChangePin(oldPinField, newPinField)}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed shadow-md"
              >
                CONFIRM NEW PIN ↵
              </button>
            </div>
          </div>
        )}

        {/* SCREEN STATE: MINI STATEMENT */}
        {screenState === 'MINI_STATEMENT' && activeAccount && (
          <div className="flex-1 flex flex-col justify-between py-1">
            <div>
              <div className="flex items-center justify-between border-b border-emerald-900/60 pb-1.5 mb-1.5">
                <div>
                  <h2 className="text-base font-bold text-white crt-glow">
                    ACCOUNT MINI-STATEMENT
                  </h2>
                  <div className="text-[11px] text-emerald-400">
                    Account: {activeAccount.accountNumber} ({activeAccount.customerName})
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="text-slate-400">Available Balance:</div>
                  <div className="font-bold text-emerald-300 font-mono">
                    ${activeAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                  </div>
                </div>
              </div>

              {/* Compact Embedded 30-Day Activity Sparkline */}
              <div className="mb-2">
                <WithdrawalFrequencyChart
                  transactions={transactions}
                  activeAccount={activeAccount}
                  accounts={accounts}
                  theme={activeProfile?.preferences.theme}
                  isCompact={true}
                />
              </div>

              {/* 6 Recent Transactions */}
              <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-lg overflow-hidden font-mono text-[11px] max-h-40 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-emerald-950/90 text-emerald-400 uppercase text-[9px] border-b border-emerald-900/60 sticky top-0">
                    <tr>
                      <th className="p-1.5">Date</th>
                      <th className="p-1.5">Type</th>
                      <th className="p-1.5">Description</th>
                      <th className="p-1.5 text-right">Amount (USD)</th>
                      <th className="p-1.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/40">
                    {accountTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-emerald-600">
                          No transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      accountTransactions.slice(-6).map((tx) => (
                        <tr key={tx.id} className="hover:bg-emerald-900/20">
                          <td className="p-1.5 text-emerald-400/80 whitespace-nowrap text-[10px]">
                            {tx.timestamp.split(' ')[0]}
                          </td>
                          <td className="p-1.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_IN'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="p-1.5 text-slate-200 truncate max-w-[150px] text-[10px]">
                            {tx.description}
                          </td>
                          <td
                            className={`p-1.5 text-right font-bold tabular-nums text-[10px] ${
                              tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_IN'
                                ? 'text-emerald-300'
                                : 'text-amber-300'
                            }`}
                          >
                            {tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_IN' ? '+' : '-'}$
                            {tx.amount.toFixed(2)}
                            {tx.currency && tx.currency !== 'USD' && (
                              <span className="block text-[8px] text-amber-300 font-normal">
                                ({tx.currencySymbol || ''}{tx.currencyAmount} {tx.currency})
                              </span>
                            )}
                          </td>
                          <td className="p-1.5 text-right text-slate-300 tabular-nums text-[10px]">
                            ${tx.balanceAfter.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-emerald-900/60 pt-2 text-xs">
              <button
                onClick={() => setScreenState('MAIN_MENU')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
              >
                ◀ MAIN MENU
              </button>
              <button
                onClick={() => onPrintReceipt()}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                PRINT STATEMENT
              </button>
              <button
                onClick={onEjectCard}
                className="px-3.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-rose-300 rounded-lg cursor-pointer"
              >
                EJECT CARD
              </button>
            </div>
          </div>
        )}

        {/* SCREEN STATE: ACCOUNT LOCKED */}
        {screenState === 'ACCOUNT_LOCKED' && (
          <div className="flex-1 flex flex-col justify-center items-center text-center py-4">
            <div className="p-4 rounded-full bg-rose-500/20 text-rose-400 mb-3 animate-bounce">
              <Lock className="w-12 h-12" />
            </div>
            <h2 className="text-xl font-bold text-rose-200 tracking-wide">
              CARD RETAINED & LOCKED
            </h2>
            <p className="text-xs text-rose-300/90 mt-2 max-w-md">
              Security lockout triggered: 3 consecutive incorrect PIN attempts were detected.
              For your account protection, this card has been flagged and deactivated.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs max-w-sm">
              <span className="font-semibold text-white">Administrator Notice:</span> You can unlock
              this card instantly by opening the <strong>Vault Console</strong> (default code:
              0000).
            </div>
            <button
              onClick={onEjectCard}
              className="mt-5 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg cursor-pointer text-xs"
            >
              RETURN TO WELCOME SCREEN
            </button>
          </div>
        )}
      </div>

      {/* RIGHT PHYSICAL SOFT-KEYS */}
      <div className="w-9 sm:w-11 bg-slate-900 border-l border-slate-800 flex flex-col justify-around py-14 px-1 z-30 shrink-0">
        {(['R1', 'R2', 'R3', 'R4'] as const).map((key) => (
          <button
            key={key}
            onClick={() => handleSoftKey(key)}
            className="w-full h-11 bg-gradient-to-l from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 active:scale-95 rounded-md border border-slate-600 shadow-inner flex items-center justify-center text-[10px] font-mono text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
            title={`Physical Button ${key}`}
          >
            ◀
          </button>
        ))}
      </div>
    </div>
  );
};
