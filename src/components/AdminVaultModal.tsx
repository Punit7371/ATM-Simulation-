import React, { useState } from 'react';
import {
  Account,
  MultiCurrencyVault,
  BillCassetteInventory,
  AuditLogEntry,
} from '../types/atm';
import { CurrencyCode, CURRENCY_CONFIGS, ExchangeRateMap, SUPPORTED_CURRENCIES } from '../types/currency';
import { calculateDispense, calculateVaultTotal, calculateMultiCurrencyVaultTotal } from '../utils/dispenser';
import { simulateMarketTick, INITIAL_EXCHANGE_RATES, formatCurrencyAmount, convertToUSD } from '../utils/currency';
import {
  Vault,
  X,
  Lock,
  Unlock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Terminal,
  Activity,
  Layers,
  Coins,
  TrendingUp,
  ArrowUpDown,
  Globe,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface AdminVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  vault: MultiCurrencyVault;
  onUpdateVault: (newVault: MultiCurrencyVault) => void;
  onUnlockAccount: (accountId: string) => void;
  onResetLimits: (accountId: string) => void;
  auditLogs: AuditLogEntry[];
  exchangeRates: ExchangeRateMap;
  onUpdateExchangeRates: (newRates: ExchangeRateMap) => void;
}

export const AdminVaultModal: React.FC<AdminVaultModalProps> = ({
  isOpen,
  onClose,
  accounts,
  vault,
  onUpdateVault,
  onUnlockAccount,
  onResetLimits,
  auditLogs,
  exchangeRates,
  onUpdateExchangeRates,
}) => {
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'cassettes' | 'rates' | 'accounts' | 'sandbox' | 'logs'>('cassettes');
  const [errorMsg, setErrorMsg] = useState('');

  // Selected currency inside technician view
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');

  // Sandbox state
  const [sandboxCurrency, setSandboxCurrency] = useState<CurrencyCode>('USD');
  const [sandboxAmount, setSandboxAmount] = useState(60);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '0000' || passcode === '1234') {
      setIsAuthenticated(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Invalid Administrator Passcode. Default is 0000.');
    }
  };

  const currentCurrencyConfig = CURRENCY_CONFIGS[selectedCurrency] || CURRENCY_CONFIGS.USD;
  const currentCassettes = vault[selectedCurrency] || {};
  const currentCurrencyVaultTotal = calculateVaultTotal(currentCassettes);

  // Grand total across all currencies
  const grandVault = calculateMultiCurrencyVaultTotal(vault, exchangeRates);

  // Restock single cassette
  const handleRestockCassette = (denom: number, countToAdd: number) => {
    const updatedCurrencyVault: BillCassetteInventory = {
      ...currentCassettes,
      [denom]: Math.max(0, (currentCassettes[denom] || 0) + countToAdd),
    };
    onUpdateVault({
      ...vault,
      [selectedCurrency]: updatedCurrencyVault,
    });
  };

  // Direct set cassette
  const handleSetCassetteDirect = (denom: number, value: number) => {
    const updatedCurrencyVault: BillCassetteInventory = {
      ...currentCassettes,
      [denom]: Math.max(0, value),
    };
    onUpdateVault({
      ...vault,
      [selectedCurrency]: updatedCurrencyVault,
    });
  };

  // Restock all cassettes for current currency
  const handleRestockCurrentCurrencyAll = () => {
    const defaultCounts: Record<number, number> = {};
    for (const d of currentCurrencyConfig.denominations) {
      defaultCounts[d] = 100;
    }
    onUpdateVault({
      ...vault,
      [selectedCurrency]: defaultCounts,
    });
  };

  // Restock all currencies across the entire machine
  const handleRestockAllCurrencies = () => {
    const restockedVault = {} as MultiCurrencyVault;
    for (const code of SUPPORTED_CURRENCIES) {
      const cfg = CURRENCY_CONFIGS[code];
      const counts: Record<number, number> = {};
      for (const d of cfg.denominations) {
        counts[d] = 80;
      }
      restockedVault[code] = counts;
    }
    onUpdateVault(restockedVault);
  };

  // Dynamic exchange rate updates
  const handleSimulateTick = () => {
    const ticked = simulateMarketTick(exchangeRates);
    onUpdateExchangeRates(ticked);
  };

  const handleResetRates = () => {
    onUpdateExchangeRates(INITIAL_EXCHANGE_RATES);
  };

  const handleManualRateChange = (code: CurrencyCode, newRate: number) => {
    if (newRate <= 0) return;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const prev = exchangeRates[code] || INITIAL_EXCHANGE_RATES[code];
    const inverse = +(1 / newRate).toFixed(code === 'JPY' ? 6 : 4);
    const diffPct = +(((newRate - prev.rate) / prev.rate) * 100).toFixed(2);
    onUpdateExchangeRates({
      ...exchangeRates,
      [code]: {
        rate: +newRate.toFixed(code === 'JPY' ? 2 : 4),
        inverseRate: inverse,
        change24h: diffPct,
        lastUpdated: now,
      },
    });
  };

  // Sandbox simulation
  const sandboxCassettes = vault[sandboxCurrency] || {};
  const sandboxResult = calculateDispense(
    sandboxAmount,
    sandboxCassettes,
    'optimal',
    sandboxCurrency,
    exchangeRates
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-4xl liquid-glass-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)]">
              <Vault className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2 crt-glow">
                <span>Vault & Bank Maintenance Console</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-400/30">
                  TERMINAL-4092
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-400/30">
                  MULTI-CURRENCY FX
                </span>
              </div>
              <div className="text-xs text-slate-300/80">
                Multi-Currency Cassette Vault · Dynamic FX Rates · Backtracking Diagnostics
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl liquid-glass-btn transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Authentication Wall */}
        {!isAuthenticated ? (
          <div className="p-8 flex flex-col items-center justify-center my-auto text-center max-w-sm mx-auto">
            <div className="p-3 bg-amber-500/15 rounded-2xl text-amber-300 mb-3 border border-amber-400/40 shadow-[0_0_14px_rgba(251,191,36,0.3)]">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white crt-amber-glow">Technician Verification</h3>
            <p className="text-xs text-slate-300/80 mt-1 mb-4">
              Enter the 4-digit administrative passcode to open the multi-currency safe cassettes and FX controls.
            </p>

            <form onSubmit={handleLogin} className="w-full space-y-3">
              <input
                type="password"
                maxLength={6}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Passcode (Default: 0000)"
                className="w-full liquid-glass-inset rounded-xl px-4 py-2.5 text-center text-lg font-mono text-white tracking-widest focus:outline-none focus:border-amber-400/80"
                autoFocus
              />
              {errorMsg && <div className="text-xs text-rose-400 font-medium">{errorMsg}</div>}
              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(251,191,36,0.3)] border border-amber-300/60"
              >
                UNLOCK MAINTENANCE ACCESS
              </button>
              <div className="text-[11px] text-slate-400">
                Passcode hint: <code className="text-amber-400 font-mono">0000</code>
              </div>
            </form>
          </div>
        ) : (
          /* Authenticated Admin Workspace */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Nav Tabs */}
            <div className="flex items-center gap-1.5 px-5 py-2 border-b border-white/10 bg-white/[0.02] text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setActiveTab('cassettes')}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'cassettes'
                    ? 'liquid-glass-btn text-amber-200 shadow-sm border-amber-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>Cash Cassettes</span>
              </button>

              <button
                onClick={() => setActiveTab('rates')}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'rates'
                    ? 'liquid-glass-btn text-cyan-200 shadow-sm border-cyan-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Dynamic FX Rates</span>
              </button>

              <button
                onClick={() => setActiveTab('accounts')}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'accounts'
                    ? 'liquid-glass-btn text-emerald-200 shadow-sm border-emerald-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Customer Accounts ({accounts.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('sandbox')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'sandbox'
                    ? 'bg-slate-800 text-amber-300 border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>Dispenser Sandbox</span>
              </button>

              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'logs'
                    ? 'bg-slate-800 text-amber-300 border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Audit Log</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {/* TAB 1: CASSETTES */}
              {activeTab === 'cassettes' && (
                <div className="space-y-4">
                  {/* Currency Selection Bar */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {SUPPORTED_CURRENCIES.map((code) => {
                      const cfg = CURRENCY_CONFIGS[code];
                      const totalNominal = calculateVaultTotal(vault[code]);
                      const isSel = selectedCurrency === code;
                      return (
                        <button
                          key={code}
                          onClick={() => setSelectedCurrency(code)}
                          className={`px-3 py-2 rounded-xl text-left border transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                            isSel
                              ? 'bg-amber-500/15 border-amber-400 text-white shadow-md'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          <span className="text-base">{cfg.flag}</span>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1">
                              <span>{code}</span>
                              <span className="text-[10px] text-amber-400 font-mono">
                                ({cfg.symbol})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {formatCurrencyAmount(totalNominal, code)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Summary Banner for Selected Currency & Total Reserves */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-400 font-semibold uppercase flex items-center gap-1.5">
                          <span>{currentCurrencyConfig.flag}</span>
                          <span>{currentCurrencyConfig.name} Cassette Reserves</span>
                        </div>
                        <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                          {formatCurrencyAmount(currentCurrencyVaultTotal, selectedCurrency)}{' '}
                          <span className="text-xs text-slate-400 font-normal">
                            {selectedCurrency}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-mono">
                          USD Equivalent:{' '}
                          <span className="text-white font-semibold">
                            ${convertToUSD(currentCurrencyVaultTotal, selectedCurrency, exchangeRates).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                          </span>{' '}
                          (@ 1 USD = {exchangeRates[selectedCurrency]?.rate} {selectedCurrency})
                        </div>
                      </div>
                      <button
                        onClick={handleRestockCurrentCurrencyAll}
                        className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Restock {selectedCurrency}</span>
                      </button>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-400 font-semibold uppercase">
                          Combined Total Machine Assets (All Currencies)
                        </div>
                        <div className="text-2xl font-bold font-mono text-amber-300 mt-0.5">
                          ${grandVault.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                          <span className="text-xs text-slate-400 font-normal">USD Total</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          7 International Currencies Active in Physical Cassettes
                        </div>
                      </div>
                      <button
                        onClick={handleRestockAllCurrencies}
                        className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Restock All Currencies</span>
                      </button>
                    </div>
                  </div>

                  {/* Cassette Modules for Selected Currency */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {currentCurrencyConfig.denominations.map((denom) => {
                      const count = currentCassettes[denom] || 0;
                      const totalNominal = count * denom;
                      const isLow = count < 15;

                      return (
                        <div
                          key={denom}
                          className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold font-mono text-white px-2 py-0.5 rounded bg-slate-800">
                                Cassette {currentCurrencyConfig.symbol}{denom} {selectedCurrency}
                              </span>
                              {isLow ? (
                                <span className="text-[10px] text-amber-400 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>LOW</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>NOMINAL</span>
                                </span>
                              )}
                            </div>

                            <div className="text-2xl font-bold font-mono text-white mt-1">
                              {count}{' '}
                              <span className="text-xs font-normal text-slate-400">notes</span>
                            </div>
                            <div className="text-xs font-mono text-emerald-400 mt-0.5">
                              {currentCurrencyConfig.symbol}{totalNominal.toLocaleString()} {selectedCurrency}
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleRestockCassette(denom, 25)}
                                className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded font-medium cursor-pointer"
                              >
                                +25 Notes
                              </button>
                              <button
                                onClick={() => handleRestockCassette(denom, 50)}
                                className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded font-medium cursor-pointer"
                              >
                                +50 Notes
                              </button>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Set Count:</span>
                              <input
                                type="number"
                                min="0"
                                max="1000"
                                value={count}
                                onChange={(e) =>
                                  handleSetCassetteDirect(denom, parseInt(e.target.value, 10) || 0)
                                }
                                className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-white focus:outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: DYNAMIC EXCHANGE RATES */}
              {activeTab === 'rates' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div>
                      <div className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        <span>Real-Time Dynamic Foreign Exchange Board</span>
                      </div>
                      <div className="text-sm font-bold text-white mt-1">
                        Live Base Currency: <span className="text-emerald-400">USD ($)</span> · Mid-Market Benchmark
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Exchange rates update continuously to calculate exact account debits during foreign currency cash withdrawals.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSimulateTick}
                        className="px-3.5 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Simulate Market Movement</span>
                      </button>
                      <button
                        onClick={handleResetRates}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
                      >
                        Reset Baseline
                      </button>
                    </div>
                  </div>

                  {/* Rates Table / Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {SUPPORTED_CURRENCIES.map((code) => {
                      const cfg = CURRENCY_CONFIGS[code];
                      const rateData = exchangeRates[code] || INITIAL_EXCHANGE_RATES[code];
                      const isBase = code === 'USD';

                      return (
                        <div
                          key={code}
                          className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{cfg.flag}</span>
                                <div>
                                  <div className="text-xs font-bold text-white flex items-center gap-1">
                                    <span>{code}</span>
                                    <span className="text-slate-400 font-normal">· {cfg.country}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                    {cfg.name}
                                  </div>
                                </div>
                              </div>
                              {!isBase && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                    rateData.change24h >= 0
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {rateData.change24h >= 0 ? '+' : ''}
                                  {rateData.change24h}%
                                </span>
                              )}
                            </div>

                            <div className="mt-3 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 font-mono text-xs space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">1 USD =</span>
                                <span className="font-bold text-white text-sm">
                                  {cfg.symbol}
                                  {rateData.rate} {code}
                                </span>
                              </div>
                              {!isBase && (
                                <div className="flex justify-between items-center text-[10px] text-slate-400">
                                  <span>1 {code} =</span>
                                  <span className="text-cyan-300 font-semibold">
                                    ${rateData.inverseRate} USD
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {!isBase && (
                            <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                              <span>Override Rate:</span>
                              <input
                                type="number"
                                step={code === 'JPY' ? 0.5 : 0.01}
                                min={0.1}
                                value={rateData.rate}
                                onChange={(e) =>
                                  handleManualRateChange(code, parseFloat(e.target.value) || 1)
                                }
                                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-white text-xs focus:outline-none focus:border-cyan-400"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: CUSTOMER ACCOUNTS */}
              {activeTab === 'accounts' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Active Account Ledger ({accounts.length} enrolled customers)</span>
                    <span className="text-emerald-400 font-mono">Double-Entry Ledger Verified</span>
                  </div>

                  <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="p-3">Customer</th>
                          <th className="p-3">Account No</th>
                          <th className="p-3">Card Mask</th>
                          <th className="p-3">Balance (USD)</th>
                          <th className="p-3">Daily Limit</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {accounts.map((acc) => (
                          <tr key={acc.id} className="hover:bg-slate-900/40">
                            <td className="p-3 font-sans font-bold text-white">
                              {acc.customerName}
                            </td>
                            <td className="p-3 text-emerald-400">{acc.accountNumber}</td>
                            <td className="p-3 text-slate-400">
                              {acc.cardNumber.slice(0, 4)} •••• {acc.cardNumber.slice(-4)}
                            </td>
                            <td className="p-3 font-bold text-white">
                              ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-slate-300">
                              ${acc.withdrawnToday.toFixed(0)} / ${acc.dailyWithdrawalLimit.toFixed(0)}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  acc.status === 'ACTIVE'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {acc.status}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-2">
                              {acc.status === 'LOCKED' && (
                                <button
                                  onClick={() => onUnlockAccount(acc.id)}
                                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[11px] font-semibold cursor-pointer"
                                >
                                  Unlock Card
                                </button>
                              )}
                              <button
                                onClick={() => onResetLimits(acc.id)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] cursor-pointer"
                              >
                                Reset Limit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: DISPENSER ALGORITHM SANDBOX */}
              {activeTab === 'sandbox' && (
                <div className="space-y-4 max-w-3xl">
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Multi-Currency Backtracking Change-Maker Diagnostic Suite
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Verify that the dispenser does not fall into greedy algorithm traps across any international currency cassette.
                    </p>
                  </div>

                  {/* Currency Selector inside Sandbox */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {SUPPORTED_CURRENCIES.map((code) => {
                      const cfg = CURRENCY_CONFIGS[code];
                      const isSel = sandboxCurrency === code;
                      return (
                        <button
                          key={code}
                          onClick={() => {
                            setSandboxCurrency(code);
                            setSandboxAmount(cfg.fastCashPresets[2] || 60);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-amber-500/20 border-amber-400 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>{cfg.flag} {code}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-slate-400">
                        Target Withdrawal ({CURRENCY_CONFIGS[sandboxCurrency]?.symbol} {sandboxCurrency}):
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step={CURRENCY_CONFIGS[sandboxCurrency]?.step || 10}
                          min={CURRENCY_CONFIGS[sandboxCurrency]?.minWithdrawal || 10}
                          max={calculateVaultTotal(vault[sandboxCurrency])}
                          value={sandboxAmount}
                          onChange={(e) => setSandboxAmount(parseInt(e.target.value, 10) || 0)}
                          className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-white font-bold"
                        />
                        {(CURRENCY_CONFIGS[sandboxCurrency]?.fastCashPresets || [20, 60, 100, 200]).slice(0, 4).map((quick) => (
                          <button
                            key={quick}
                            onClick={() => setSandboxAmount(quick)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] cursor-pointer"
                          >
                            {CURRENCY_CONFIGS[sandboxCurrency]?.symbol}{quick}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <div className="text-slate-400 font-semibold mb-1">
                        EXECUTION RESULT:
                      </div>
                      {sandboxResult.success ? (
                        <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-lg text-emerald-200 space-y-1">
                          <div className="font-bold flex items-center justify-between text-emerald-300">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Optimal Solution Found ({sandboxResult.totalBills} notes dispensed)</span>
                            </div>
                            <span className="text-xs font-mono text-cyan-300">
                              USD Equivalent: ${sandboxResult.baseEquivalentUSD} USD
                            </span>
                          </div>
                          <div>
                            Notes Breakdown:{' '}
                            <strong>
                              {Object.entries(sandboxResult.breakdown)
                                .map(([d, c]) => `${c}x ${CURRENCY_CONFIGS[sandboxCurrency]?.symbol}${d}`)
                                .join(', ')}
                            </strong>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-rose-950/40 border border-rose-500/40 p-3 rounded-lg text-rose-300 flex items-start gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold">Cannot compose exact amount</div>
                            <div className="text-[11px] opacity-80">
                              {sandboxResult.errorMessage}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {sandboxResult.algorithmSteps && (
                      <div className="pt-2 border-t border-slate-800">
                        <div className="text-slate-400 font-semibold mb-1">
                          Algorithm Trace & Backtracking Decisions:
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-lg space-y-1 text-[11px] text-slate-300 max-h-36 overflow-y-auto">
                          {sandboxResult.algorithmSteps.map((step, idx) => (
                            <div key={idx} className="leading-relaxed">
                              › {step}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: AUDIT LOGS */}
              {activeTab === 'logs' && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Hardware & Security Audit Trail ({auditLogs.length} events)</span>
                    <span className="text-[10px]">Encrypted Persistent Audit Ledger</span>
                  </div>

                  <div className="bg-slate-950 rounded-xl border border-slate-800 divide-y divide-slate-800 max-h-80 overflow-y-auto">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-3 flex items-start gap-3 hover:bg-slate-900/40">
                        <span className="text-[10px] text-slate-500 whitespace-nowrap pt-0.5">
                          {log.timestamp}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${
                            log.level === 'SECURITY'
                              ? 'bg-rose-500/20 text-rose-300'
                              : log.level === 'HARDWARE'
                              ? 'bg-amber-500/20 text-amber-300'
                              : log.level === 'WARN'
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {log.level}
                        </span>
                        <div className="flex-1">
                          <span className="font-bold text-white">{log.event}: </span>
                          <span className="text-slate-300">{log.details}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
