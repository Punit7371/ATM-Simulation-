import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Camera,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  X,
  Zap,
  Flashlight,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Fingerprint,
  RefreshCw,
  Wallet,
  Sparkles,
  Maximize2,
  Minimize2,
  Check,
  Layers,
  ChevronDown
} from 'lucide-react';
import { Account } from '../types/atm';
import { CurrencyCode, CURRENCY_CONFIGS, SUPPORTED_CURRENCIES } from '../types/currency';
import { QRActionType, QRSession } from '../types/qr';
import { formatCurrencyAmount, convertFromUSD } from '../utils/currency';
import { playQrScanSound, playPhoneHapticSound, playBiometricSuccessSound } from '../utils/audio';

interface VirtualMobileDeviceProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  activeAccount: Account | null;
  qrSession: QRSession | null;
  onRefreshQRSession: () => void;
  onAuthorizeTransaction: (payload: {
    action: QRActionType;
    amount: number;
    currency: CurrencyCode;
    account: Account;
  }) => void;
  exchangeRates: Record<string, { rate: number; inverseRate: number }>;
}

export const VirtualMobileDevice: React.FC<VirtualMobileDeviceProps> = ({
  isOpen,
  onClose,
  accounts,
  activeAccount,
  qrSession,
  onRefreshQRSession,
  onAuthorizeTransaction,
  exchangeRates,
}) => {
  // Navigation tabs within the virtual phone app
  const [activeTab, setActiveTab] = useState<'SCANNER' | 'TRANSACTION' | 'CONFIRMATION'>('SCANNER');
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [cameraZoom, setCameraZoom] = useState<'1x' | '2x'>('1x');
  const [isScanningSimulated, setIsScanningSimulated] = useState(false);
  const [hasScannedSuccessfully, setHasScannedSuccessfully] = useState(false);

  // Transaction configuration
  const [selectedAction, setSelectedAction] = useState<QRActionType>('WITHDRAWAL');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    activeAccount?.id || (accounts[0]?.id ?? '')
  );
  const [withdrawalAmount, setWithdrawalAmount] = useState<number>(100);
  const [depositAmount, setDepositAmount] = useState<number>(100);
  const [customAmountInput, setCustomAmountInput] = useState<string>('');

  // Biometric state on phone (Face ID / Touch ID)
  const [isBiometricAuthorizing, setIsBiometricAuthorizing] = useState(false);
  const [isBiometricApproved, setIsBiometricApproved] = useState(false);

  // Docking / Full view mode
  const [isDocked, setIsDocked] = useState(false);

  // Time display on phone status bar
  const [phoneTime, setPhoneTime] = useState('09:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setPhoneTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update selected account if activeAccount changes
  useEffect(() => {
    if (activeAccount) {
      setSelectedAccountId(activeAccount.id);
    } else if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [activeAccount, accounts]);

  const currentAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  const currencyConfig = CURRENCY_CONFIGS[selectedCurrency] || CURRENCY_CONFIGS.USD;

  // Handle Scan action in virtual camera
  const handleTriggerCameraScan = () => {
    setIsScanningSimulated(true);
    playPhoneHapticSound();

    setTimeout(() => {
      setIsScanningSimulated(false);
      setHasScannedSuccessfully(true);
      playQrScanSound();

      setTimeout(() => {
        setActiveTab('TRANSACTION');
      }, 700);
    }, 1200);
  };

  // Preset withdrawal amounts based on currency
  const presetWithdrawals = currencyConfig.fastCashPresets.slice(0, 4);

  // Handle Biometric Approval on phone
  const handleApproveWithBiometrics = () => {
    if (!currentAccount) return;
    setIsBiometricAuthorizing(true);
    playPhoneHapticSound();

    const finalAmount =
      selectedAction === 'WITHDRAWAL'
        ? (customAmountInput ? parseFloat(customAmountInput) : withdrawalAmount)
        : selectedAction === 'DEPOSIT'
        ? (customAmountInput ? parseFloat(customAmountInput) : depositAmount)
        : 0;

    setTimeout(() => {
      setIsBiometricAuthorizing(false);
      setIsBiometricApproved(true);
      playBiometricSuccessSound();

      // Handshake to ATM kiosk terminal
      setTimeout(() => {
        onAuthorizeTransaction({
          action: selectedAction,
          amount: finalAmount,
          currency: selectedCurrency,
          account: currentAccount,
        });
        setActiveTab('CONFIRMATION');
      }, 600);
    }, 1400);
  };

  const handleResetSimulator = () => {
    setActiveTab('SCANNER');
    setHasScannedSuccessfully(false);
    setIsBiometricApproved(false);
    setIsBiometricAuthorizing(false);
    setCustomAmountInput('');
    onRefreshQRSession();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className={`fixed z-50 transition-all ${
          isDocked
            ? 'bottom-4 right-4 sm:right-6'
            : 'inset-0 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md'
        }`}
      >
        {/* Phone Outer Chassis with Glass & Metallic Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className={`relative bg-slate-900 border-[6px] border-slate-700/80 rounded-[48px] shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_40px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col ${
            isDocked
              ? 'w-[320px] h-[640px]'
              : 'w-[350px] sm:w-[380px] h-[720px] max-h-[92vh]'
          }`}
          style={{
            boxShadow: '0 0 0 2px rgba(255,255,255,0.1), 0 25px 60px -15px rgba(0,0,0,0.9)',
          }}
        >
          {/* Side Hardware Buttons Silhouette (Visual detail) */}
          <div className="absolute -left-[9px] top-24 w-[3px] h-9 bg-slate-600 rounded-l-sm" />
          <div className="absolute -left-[9px] top-36 w-[3px] h-12 bg-slate-600 rounded-l-sm" />
          <div className="absolute -left-[9px] top-52 w-[3px] h-12 bg-slate-600 rounded-l-sm" />
          <div className="absolute -right-[9px] top-32 w-[3px] h-16 bg-slate-600 rounded-r-sm" />

          {/* Phone Top Bezel / Dynamic Island */}
          <div className="pt-2 px-6 bg-slate-950 flex items-center justify-between z-30 select-none">
            {/* Status Bar: Time */}
            <span className="text-[12px] font-semibold text-slate-200 tracking-tight pl-1">
              {phoneTime}
            </span>

            {/* Dynamic Island Pill */}
            <div className="w-24 h-5 bg-black rounded-full flex items-center justify-between px-2.5 shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-cyan-500/80" />
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[8px] font-mono text-emerald-400 font-bold">ATM SYNC</span>
              </div>
            </div>

            {/* Status Bar: 5G & Battery */}
            <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
              <span className="text-[9.5px] font-bold">5G</span>
              <div className="w-5 h-2.5 border border-slate-400 rounded-sm p-0.5 flex items-center">
                <div className="w-full h-full bg-emerald-400 rounded-[1px]" />
              </div>
            </div>
          </div>

          {/* ApexBank App Top Bar */}
          <div className="bg-slate-950/95 border-b border-white/10 px-4 py-2.5 flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-xs shadow-md">
                A
              </div>
              <div>
                <div className="text-[11px] font-bold text-white leading-tight flex items-center gap-1">
                  <span>ApexBank Mobile</span>
                  <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    PAY
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 font-mono">
                  {currentAccount ? `${currentAccount.customerName.split(' ')[0]} • Active` : 'Cardless Token'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsDocked(!isDocked)}
                title={isDocked ? 'Expand to center modal' : 'Dock to bottom corner'}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
              >
                {isDocked ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Close virtual phone"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* MAIN PHONE APP BODY */}
          <div className="flex-1 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 overflow-y-auto p-3 text-slate-100 flex flex-col justify-between select-none">
            {/* VIEW 1: LIVE QR SCANNER CAMERA */}
            {activeTab === 'SCANNER' && (
              <div className="flex-1 flex flex-col justify-between animate-fadeIn">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      ATM Terminal QR Scanner
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                      {qrSession?.kioskId || 'ATM-4092'}
                    </span>
                  </div>

                  {/* Simulated Camera Viewfinder */}
                  <div
                    className={`relative w-full aspect-square rounded-3xl overflow-hidden border-2 transition-all flex flex-col items-center justify-center p-3 shadow-2xl ${
                      isFlashlightOn ? 'bg-slate-800' : 'bg-black'
                    } ${
                      hasScannedSuccessfully
                        ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.5)]'
                        : isScanningSimulated
                        ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.5)]'
                        : 'border-slate-700'
                    }`}
                  >
                    {/* Viewfinder Background Camera Simulation */}
                    <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

                    {/* Viewfinder Corner Reticles */}
                    <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg pointer-events-none" />
                    <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg pointer-events-none" />
                    <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg pointer-events-none" />
                    <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-emerald-400 rounded-br-lg pointer-events-none" />

                    {/* Flashlight Beam Overlay */}
                    {isFlashlightOn && (
                      <div className="absolute inset-0 bg-amber-100/10 pointer-events-none backdrop-brightness-125" />
                    )}

                    {/* Center Targeting Box */}
                    <div className="relative w-44 h-44 border border-dashed border-white/40 rounded-2xl flex flex-col items-center justify-center p-2 text-center">
                      {hasScannedSuccessfully ? (
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex flex-col items-center justify-center text-emerald-400"
                        >
                          <CheckCircle2 className="w-12 h-12 mb-1 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            QR Code Recognized!
                          </span>
                          <span className="text-[10px] font-mono text-emerald-300">
                            {qrSession?.sessionId || 'ATM-QR-SEC'}
                          </span>
                        </motion.div>
                      ) : isScanningSimulated ? (
                        <div className="flex flex-col items-center justify-center text-cyan-300">
                          <RefreshCw className="w-10 h-10 animate-spin mb-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                          <span className="text-[11px] font-bold text-white uppercase tracking-wider animate-pulse">
                            Decoding Session Key...
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <QrCode className="w-12 h-12 mb-1.5 text-slate-500 opacity-60" />
                          <span className="text-[11px] font-medium text-slate-300">
                            Point camera at ATM Screen QR
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                            Auto-framing active
                          </span>
                        </div>
                      )}

                      {/* Scanning Laser Beam */}
                      {!hasScannedSuccessfully && (
                        <motion.div
                          animate={{ y: [-75, 75] }}
                          transition={{
                            repeat: Infinity,
                            repeatType: 'reverse',
                            duration: isScanningSimulated ? 0.35 : 1.4,
                            ease: 'easeInOut',
                          }}
                          className={`absolute inset-x-3 h-0.5 rounded-full pointer-events-none ${
                            isScanningSimulated
                              ? 'bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,1)]'
                              : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]'
                          }`}
                        />
                      )}
                    </div>

                    {/* Camera Control Overlays inside Viewfinder */}
                    <div className="absolute bottom-2 inset-x-3 flex items-center justify-between px-2">
                      <button
                        type="button"
                        onClick={() => setIsFlashlightOn(!isFlashlightOn)}
                        className={`p-1.5 rounded-full text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                          isFlashlightOn
                            ? 'bg-amber-400 text-slate-950 shadow-md'
                            : 'bg-black/60 text-slate-300 hover:text-white border border-white/20'
                        }`}
                      >
                        <Flashlight className="w-3.5 h-3.5" />
                        <span className="text-[9px]">{isFlashlightOn ? 'Torch On' : 'Torch'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCameraZoom(cameraZoom === '1x' ? '2x' : '1x')}
                        className="px-2 py-1 rounded-full bg-black/60 text-slate-200 border border-white/20 text-[10px] font-mono cursor-pointer"
                      >
                        {cameraZoom}
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-slate-400 mt-2 px-2">
                    Hold this virtual phone in front of the ATM monitor to capture the cryptographic handshake token.
                  </p>
                </div>

                {/* Primary Camera Action Button */}
                <div className="space-y-2 mt-3">
                  <button
                    type="button"
                    onClick={handleTriggerCameraScan}
                    disabled={isScanningSimulated || hasScannedSuccessfully}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50 transition-all active:scale-[0.98]"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{isScanningSimulated ? 'Reading QR Matrix...' : 'Scan ATM Screen QR Code'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHasScannedSuccessfully(true);
                      setActiveTab('TRANSACTION');
                    }}
                    className="w-full py-1.5 text-center text-[10px] text-cyan-300/80 hover:text-cyan-200 underline cursor-pointer"
                  >
                    Skip to Transaction Configurator →
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 2: CARDLESS TRANSACTION CONFIGURATOR */}
            {activeTab === 'TRANSACTION' && (
              <div className="flex-1 flex flex-col justify-between animate-fadeIn space-y-3">
                <div className="space-y-2.5">
                  {/* Connected Terminal Status Bar */}
                  <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-semibold text-white">ATM #4092 Connected</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-300">
                      TOKEN: {qrSession?.sessionId?.slice(-4) || '7921'}
                    </span>
                  </div>

                  {/* Transaction Mode Selector: Withdrawal vs Deposit vs Login */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                      Select Cardless Operation
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setSelectedAction('WITHDRAWAL')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          selectedAction === 'WITHDRAWAL'
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>Withdraw</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedAction('DEPOSIT')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          selectedAction === 'DEPOSIT'
                            ? 'bg-amber-400 text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Deposit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedAction('LOGIN')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          selectedAction === 'LOGIN'
                            ? 'bg-cyan-500 text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Sign In</span>
                      </button>
                    </div>
                  </div>

                  {/* Account Funding Selector */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                      {selectedAction === 'DEPOSIT' ? 'Deposit Into Account' : 'Debiting Account'}
                    </div>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-medium text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.customerName} ({acc.accountType}) • ${acc.balance.toFixed(2)} USD
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Currency Picker for Withdrawal / Deposit */}
                  {selectedAction !== 'LOGIN' && (
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1">
                        <span>Currency</span>
                        <span className="font-mono text-cyan-300">
                          {selectedCurrency !== 'USD' && exchangeRates[selectedCurrency]
                            ? `1 USD = ${exchangeRates[selectedCurrency].rate} ${selectedCurrency}`
                            : 'Base USD'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                        {SUPPORTED_CURRENCIES.map((c) => {
                          const isSel = selectedCurrency === c;
                          const cfg = CURRENCY_CONFIGS[c];
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setSelectedCurrency(c)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-all ${
                                isSel
                                  ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-300'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              <span>{cfg.flag}</span>
                              <span>{c}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Amount Presets for Withdrawal */}
                  {selectedAction === 'WITHDRAWAL' && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1 flex items-center justify-between">
                        <span>Withdrawal Amount ({currencyConfig.symbol})</span>
                        <span className="text-[9px] text-emerald-400">ATM Cassette Ready</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 mb-2">
                        {presetWithdrawals.map((amt) => {
                          const isSel = withdrawalAmount === amt && !customAmountInput;
                          return (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => {
                                setWithdrawalAmount(amt);
                                setCustomAmountInput('');
                              }}
                              className={`py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                                isSel
                                  ? 'bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-300'
                                  : 'bg-slate-800/80 text-white hover:bg-slate-700'
                              }`}
                            >
                              {currencyConfig.symbol}
                              {amt}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Amount Field */}
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs font-mono text-slate-400">
                          {currencyConfig.symbol}
                        </span>
                        <input
                          type="number"
                          placeholder="Or enter custom amount..."
                          value={customAmountInput}
                          onChange={(e) => setCustomAmountInput(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* Amount Presets for Deposit */}
                  {selectedAction === 'DEPOSIT' && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1 flex items-center justify-between">
                        <span>Deposit Amount ({currencyConfig.symbol})</span>
                        <span className="text-[9px] text-amber-400">Instant Credit</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 mb-2">
                        {[50, 100, 200, 500].map((amt) => {
                          const isSel = depositAmount === amt && !customAmountInput;
                          return (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => {
                                setDepositAmount(amt);
                                setCustomAmountInput('');
                              }}
                              className={`py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                                isSel
                                  ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300'
                                  : 'bg-slate-800/80 text-white hover:bg-slate-700'
                              }`}
                            >
                              {currencyConfig.symbol}
                              {amt}
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs font-mono text-slate-400">
                          {currencyConfig.symbol}
                        </span>
                        <input
                          type="number"
                          placeholder="Or enter custom cash deposit..."
                          value={customAmountInput}
                          onChange={(e) => setCustomAmountInput(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* Cardless Sign-in Info */}
                  {selectedAction === 'LOGIN' && (
                    <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200">
                      <div className="flex items-center gap-2 font-bold text-white mb-1">
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        <span>Cardless Full Session Unlock</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        Authorizing will log your account directly into the ATM terminal without inserting your physical chip card.
                      </p>
                    </div>
                  )}
                </div>

                {/* Biometric Confirmation on Phone */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <button
                    type="button"
                    onClick={handleApproveWithBiometrics}
                    disabled={isBiometricAuthorizing || isBiometricApproved}
                    className={`w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all active:scale-[0.98] ${
                      isBiometricApproved
                        ? 'bg-emerald-500 text-slate-950'
                        : isBiometricAuthorizing
                        ? 'bg-cyan-500 text-slate-950 animate-pulse'
                        : selectedAction === 'WITHDRAWAL'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                        : selectedAction === 'DEPOSIT'
                        ? 'bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 hover:brightness-110 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:brightness-110 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                    }`}
                  >
                    {isBiometricApproved ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Authorized & Sent!</span>
                      </>
                    ) : isBiometricAuthorizing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Face ID / Touch...</span>
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4" />
                        <span>
                          {selectedAction === 'WITHDRAWAL'
                            ? `Authorize Cash Dispense (${currencyConfig.symbol}${customAmountInput || withdrawalAmount})`
                            : selectedAction === 'DEPOSIT'
                            ? `Authorize Cash Deposit (${currencyConfig.symbol}${customAmountInput || depositAmount})`
                            : 'Confirm Cardless Sign In'}
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('SCANNER')}
                    className="w-full text-center text-[10px] text-slate-400 hover:text-white cursor-pointer py-1"
                  >
                    ← Re-scan ATM Terminal QR
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 3: LIVE HANDSHAKE CONFIRMATION */}
            {activeTab === 'CONFIRMATION' && (
              <div className="flex-1 flex flex-col justify-between text-center py-4 animate-fadeIn">
                <div className="space-y-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(52,211,153,0.5)]"
                  >
                    <CheckCircle2 className="w-10 h-10" />
                  </motion.div>

                  <h3 className="text-base font-bold text-white crt-glow">
                    {selectedAction === 'WITHDRAWAL'
                      ? 'CASH DISPENSING AT ATM'
                      : selectedAction === 'DEPOSIT'
                      ? 'DEPOSIT ACCEPTED'
                      : 'SESSION AUTHORIZED'}
                  </h3>

                  <p className="text-xs text-emerald-300 max-w-[260px] mx-auto">
                    {selectedAction === 'WITHDRAWAL'
                      ? `ATM terminal #4092 is now counting and dispensing ${currencyConfig.symbol}${customAmountInput || withdrawalAmount} ${selectedCurrency}.`
                      : selectedAction === 'DEPOSIT'
                      ? `Your deposit of ${currencyConfig.symbol}${customAmountInput || depositAmount} was credited to ${currentAccount?.customerName}.`
                      : `You are signed into ${currentAccount?.customerName} on the ATM monitor.`}
                  </p>

                  {/* Terminal Receipt Card */}
                  <div className="bg-slate-950/80 border border-slate-700 rounded-2xl p-3 text-left font-mono text-[10px] space-y-1 text-slate-300 max-w-[280px] mx-auto">
                    <div className="flex justify-between text-slate-500 border-b border-slate-800 pb-1">
                      <span>HANDSHAKE TOKEN</span>
                      <span className="text-emerald-400 font-bold">{qrSession?.sessionId || 'ATM-QR-9842'}</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span>TERMINAL:</span>
                      <span className="text-white">Apex Kiosk #4092</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ACCOUNT:</span>
                      <span className="text-white">{currentAccount?.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AUTH METHOD:</span>
                      <span className="text-cyan-400">Mobile FIDO2 / Biometric</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-1 text-white font-bold">
                      <span>AMOUNT:</span>
                      <span className="text-emerald-300">
                        {currencyConfig.symbol}
                        {selectedAction === 'WITHDRAWAL'
                          ? customAmountInput || withdrawalAmount
                          : selectedAction === 'DEPOSIT'
                          ? customAmountInput || depositAmount
                          : '0.00'}{' '}
                        {selectedCurrency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleResetSimulator}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Perform Another QR Operation
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    Close Simulator (View ATM Terminal)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Phone Bottom Home Bar / Indicator */}
          <div className="bg-slate-950 pb-2 pt-1 flex items-center justify-center">
            <div className="w-32 h-1 bg-slate-600 rounded-full" />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
