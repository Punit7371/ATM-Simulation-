import React, { useState } from 'react';
import { UserProfile, UserPreferences, ATMTheme, ReceiptPreference, DispenserPreference } from '../types/profile';
import { AVAILABLE_THEMES, THEME_CONFIGS, normalizeTheme, CanonicalThemeId } from '../types/theme';
import { Account } from '../types/atm';
import { verifyPin, hashPin, generateSalt } from '../utils/security';
import { CurrencyCode, CURRENCY_CONFIGS, SUPPORTED_CURRENCIES } from '../types/currency';
import {
  User,
  X,
  Lock,
  Sparkles,
  CheckCircle2,
  Save,
  UserPlus,
  LogOut,
  Sliders,
  CreditCard,
  Volume2,
  VolumeX,
  Palette,
  Printer,
  Banknote,
  KeyRound,
  ArrowRight,
  ShieldAlert,
  Coins,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: UserProfile[];
  activeProfile: UserProfile | null;
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: (
    newProfile: Omit<UserProfile, 'id' | 'createdAt' | 'lastLogin'>,
    createAccountData?: {
      customerName: string;
      accountType: 'CHECKING' | 'SAVINGS';
      balance: number;
      pin: string;
    }
  ) => void;
  onUpdatePreferences: (profileId: string, preferences: UserPreferences) => void;
  onLogoutProfile: () => void;
  accounts: Account[];
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfile,
  onSelectProfile,
  onCreateProfile,
  onUpdatePreferences,
  onLogoutProfile,
  accounts,
}) => {
  const [activeTab, setActiveTab] = useState<'preferences' | 'switch' | 'create'>('preferences');

  // Preferences form state (initialized from activeProfile)
  const [prefFastCash, setPrefFastCash] = useState<number>(activeProfile?.preferences.favoriteFastCash || 60);
  const [prefReceipt, setPrefReceipt] = useState<ReceiptPreference>(activeProfile?.preferences.receiptPreference || 'ask');
  const [prefDispenser, setPrefDispenser] = useState<DispenserPreference>(activeProfile?.preferences.dispenserPreference || 'optimal');
  const [prefTheme, setPrefTheme] = useState<ATMTheme>(activeProfile?.preferences.theme || 'midnight_blue');
  const [prefSound, setPrefSound] = useState<boolean>(activeProfile?.preferences.soundEffects ?? true);
  const [prefAutoInsert, setPrefAutoInsert] = useState<boolean>(activeProfile?.preferences.autoInsertCardOnLogin ?? true);
  const [prefCustomWelcome, setPrefCustomWelcome] = useState<string>(activeProfile?.preferences.customWelcomeMessage || '');
  const [prefQuickTransfer, setPrefQuickTransfer] = useState<string>(activeProfile?.preferences.quickTransferTarget || '');
  const [prefCurrency, setPrefCurrency] = useState<CurrencyCode>(activeProfile?.preferences.preferredCurrency || 'USD');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);

  // Sync state when activeProfile changes
  React.useEffect(() => {
    if (activeProfile) {
      setPrefFastCash(activeProfile.preferences.favoriteFastCash);
      setPrefReceipt(activeProfile.preferences.receiptPreference);
      setPrefDispenser(activeProfile.preferences.dispenserPreference);
      setPrefTheme(activeProfile.preferences.theme);
      setPrefSound(activeProfile.preferences.soundEffects);
      setPrefAutoInsert(activeProfile.preferences.autoInsertCardOnLogin);
      setPrefCustomWelcome(activeProfile.preferences.customWelcomeMessage || '');
      setPrefQuickTransfer(activeProfile.preferences.quickTransferTarget || '');
      setPrefCurrency(activeProfile.preferences.preferredCurrency || 'USD');
    }
  }, [activeProfile]);

  // Create Profile Form State
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [newTheme, setNewTheme] = useState<CanonicalThemeId>('midnight_blue');
  const [newAccountOption, setNewAccountOption] = useState<'link_existing' | 'create_new'>('link_existing');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || 'acc-1');
  // New account fields if creating new
  const [newAccType, setNewAccType] = useState<'CHECKING' | 'SAVINGS'>('CHECKING');
  const [newAccStartingBalance, setNewAccStartingBalance] = useState<number>(1000);
  const [newAccPin, setNewAccPin] = useState<string>('1234');
  const [createError, setCreateError] = useState<string>('');

  // Switch / Login with password state
  const [loginTargetProfileId, setLoginTargetProfileId] = useState<string | null>(null);
  const [loginPasswordInput, setLoginPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  if (!isOpen) return null;

  const handleSavePreferences = () => {
    if (!activeProfile) return;
    const updated: UserPreferences = {
      favoriteFastCash: prefFastCash,
      receiptPreference: prefReceipt,
      dispenserPreference: prefDispenser,
      theme: prefTheme,
      soundEffects: prefSound,
      autoInsertCardOnLogin: prefAutoInsert,
      customWelcomeMessage: prefCustomWelcome,
      quickTransferTarget: prefQuickTransfer,
      preferredCurrency: prefCurrency,
    };
    onUpdatePreferences(activeProfile.id, updated);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2500);
  };

  const handleCreateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    const cleanUsername = newUsername.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      setCreateError('Username must be at least 3 characters long.');
      return;
    }

    if (profiles.some((p) => p.username.toLowerCase() === cleanUsername)) {
      setCreateError(`Username "${cleanUsername}" is already taken.`);
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setCreateError('Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setCreateError('Passwords do not match.');
      return;
    }

    const salt = generateSalt();
    const hash = hashPin(newPassword, salt);

    if (newAccountOption === 'create_new') {
      if (!/^\d{4}$/.test(newAccPin)) {
        setCreateError('Card PIN must be exactly 4 digits.');
        return;
      }
      onCreateProfile(
        {
          username: cleanUsername,
          displayName: newDisplayName.trim() || cleanUsername,
          passwordHash: hash,
          passwordSalt: salt,
          plainPasswordHint: newPassword,
          linkedAccountId: '', // will be set by onCreateProfile
          preferences: {
            favoriteFastCash: 60,
            receiptPreference: 'ask',
            dispenserPreference: 'optimal',
            theme: newTheme,
            soundEffects: true,
            autoInsertCardOnLogin: true,
            customWelcomeMessage: `Welcome ${newDisplayName || cleanUsername}!`,
            preferredCurrency: 'USD',
          },
        },
        {
          customerName: newDisplayName.trim() || cleanUsername,
          accountType: newAccType,
          balance: Number(newAccStartingBalance) || 500,
          pin: newAccPin,
        }
      );
    } else {
      onCreateProfile({
        username: cleanUsername,
        displayName: newDisplayName.trim() || cleanUsername,
        passwordHash: hash,
        passwordSalt: salt,
        plainPasswordHint: newPassword,
        linkedAccountId: selectedAccountId,
        preferences: {
          favoriteFastCash: 60,
          receiptPreference: 'ask',
          dispenserPreference: 'optimal',
          theme: newTheme,
          soundEffects: true,
          autoInsertCardOnLogin: true,
          customWelcomeMessage: `Welcome ${newDisplayName || cleanUsername}!`,
          preferredCurrency: 'USD',
        },
      });
    }

    // Reset form
    setNewUsername('');
    setNewDisplayName('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setActiveTab('preferences');
  };

  const handleSwitchLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginTargetProfileId) return;

    const target = profiles.find((p) => p.id === loginTargetProfileId);
    if (!target) return;

    const isValid = verifyPin(loginPasswordInput, target.passwordHash, target.passwordSalt);
    if (isValid || loginPasswordInput === target.plainPasswordHint) {
      onSelectProfile(target.id);
      setLoginTargetProfileId(null);
      setLoginPasswordInput('');
      setLoginError('');
      setActiveTab('preferences');
    } else {
      setLoginError('Incorrect password for this profile. Try "password123".');
    }
  };

  const activeAccount = accounts.find((a) => a.id === activeProfile?.linkedAccountId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-2xl liquid-glass-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.25)]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2 crt-glow">
                <span>User Profile & Session Preferences</span>
                {activeProfile && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-400/30">
                    @{activeProfile.username}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-300/80">
                Persistent across browser reloads & sessions via encrypted localStorage
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-white/10 bg-white/[0.03] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'preferences'
                ? 'liquid-glass-btn text-emerald-300 shadow-sm border-emerald-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Preferences & Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('switch')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'switch'
                ? 'liquid-glass-btn text-emerald-300 shadow-sm border-emerald-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profiles ({profiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'liquid-glass-btn text-emerald-300 shadow-sm border-emerald-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New Profile</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: PREFERENCES & SETTINGS */}
          {activeTab === 'preferences' && (
            <div className="space-y-5">
              {activeProfile ? (
                <>
                  {/* Profile Summary Card */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-slate-950 font-bold text-lg flex items-center justify-center">
                        {activeProfile.displayName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{activeProfile.displayName}</span>
                          <span className="text-xs font-mono text-emerald-400">
                            (@{activeProfile.username})
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            Linked Account:{' '}
                            <strong className="text-slate-300">
                              {activeAccount?.accountNumber || 'Unlinked'}
                            </strong>{' '}
                            ({activeAccount?.accountType || 'N/A'})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={onLogoutProfile}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        title="Sign out of current profile"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>

                  {/* Preferences Grid */}
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      ATM Hardware & Behavior Preferences
                    </div>

                    {/* 1. Favorite Fast Cash Amount */}
                    <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <Banknote className="w-4 h-4 text-emerald-400" />
                          <span>Favorite Fast Cash Amount</span>
                        </div>
                        <span className="text-xs font-mono text-emerald-400 font-bold">
                          ${prefFastCash}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Highlighted with a star badge and prioritized on the ATM screen during transactions.
                      </p>
                      <div className="grid grid-cols-6 gap-1.5 pt-1">
                        {[20, 40, 60, 100, 200, 300].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setPrefFastCash(amt)}
                            className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                              prefFastCash === amt
                                ? 'bg-emerald-500 text-slate-950 shadow-md'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            ${amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preferred Withdrawal Currency */}
                    <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <Coins className="w-4 h-4 text-amber-400" />
                          <span>Preferred Withdrawal Currency</span>
                        </div>
                        <span className="text-xs font-mono text-amber-400 font-bold flex items-center gap-1">
                          <span>{CURRENCY_CONFIGS[prefCurrency]?.flag}</span>
                          <span>{prefCurrency} ({CURRENCY_CONFIGS[prefCurrency]?.symbol})</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Default foreign currency for ATM withdrawals. Fast Cash presets, custom amounts, and vault dispensing adjust dynamically with live exchange rates.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {SUPPORTED_CURRENCIES.map((code) => {
                          const c = CURRENCY_CONFIGS[code];
                          const isSelected = prefCurrency === code;
                          return (
                            <button
                              key={code}
                              type="button"
                              onClick={() => setPrefCurrency(code)}
                              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500/15 border-amber-400 text-white ring-1 ring-amber-400/40 shadow-sm'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-base">{c.flag}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-bold">
                                  {c.symbol}
                                </span>
                              </div>
                              <div className="font-bold text-xs mt-1 text-white">{code}</div>
                              <div className="text-[10px] text-slate-400 truncate">{c.name}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Receipt Preference */}
                    <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <Printer className="w-4 h-4 text-emerald-400" />
                        <span>Receipt Printing Automation</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Controls whether the motorized thermal printer automatically dispenses receipts after withdrawals or deposits.
                      </p>
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {(
                          [
                            { id: 'always', label: 'Always Print', desc: 'Instant paper printout' },
                            { id: 'ask', label: 'Ask Each Time', desc: 'Prompt on screen' },
                            { id: 'never', label: 'Never Print', desc: 'Eco-friendly, digital only' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setPrefReceipt(opt.id)}
                            className={`p-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                              prefReceipt === opt.id
                                ? 'bg-emerald-500/10 border-emerald-500/60 text-white'
                                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <div className="font-bold text-xs">{opt.label}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3. Liquid Glass UI Color Theme Preference */}
                    <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <Palette className="w-4 h-4 text-emerald-400" />
                          <span>Liquid Glass UI Color Theme</span>
                        </div>
                        {(() => {
                          const activeThm = THEME_CONFIGS[normalizeTheme(prefTheme)];
                          return (
                            <span
                              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 shadow-sm"
                              style={{
                                backgroundColor: `${activeThm.accentHex}18`,
                                borderColor: `${activeThm.accentHex}50`,
                                color: activeThm.accentHex,
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: activeThm.accentHex }} />
                              <span>Active: <strong>{activeThm.name}</strong></span>
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Customizes ambient floating orbs, frosted acrylic chassis panels, phosphor CRT glow, tactile keypad trims, and activity visualizers.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                        {AVAILABLE_THEMES.map((thm) => {
                          const isSelected = normalizeTheme(prefTheme) === thm.id;
                          return (
                            <button
                              key={thm.id}
                              type="button"
                              onClick={() => {
                                setPrefTheme(thm.id);
                                if (typeof document !== 'undefined') {
                                  const root = document.querySelector('[data-theme]');
                                  if (root) root.setAttribute('data-theme', thm.id);
                                }
                              }}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-white/[0.08] shadow-lg ring-1'
                                  : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                              }`}
                              style={
                                isSelected
                                  ? {
                                      borderColor: thm.accentHex,
                                      boxShadow: `0 0 20px -4px ${thm.chart.glow}`,
                                    }
                                  : undefined
                              }
                            >
                              {/* Top Swatch Ribbon */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${thm.swatchGradient} shadow-md flex items-center justify-center p-0.5 border border-white/20`}
                                  >
                                    <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-xs text-white flex items-center gap-1.5">
                                      <span>{thm.name}</span>
                                      {isSelected && (
                                        <span
                                          className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold"
                                          style={{ backgroundColor: `${thm.accentHex}30`, color: thm.accentHex }}
                                        >
                                          CURRENT
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {thm.tagline}
                                    </div>
                                  </div>
                                </div>

                                {isSelected && (
                                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: thm.accentHex }} />
                                )}
                              </div>

                              <p className="text-[10.5px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                {thm.description}
                              </p>

                              {/* Color preview palette capsules */}
                              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-white/5">
                                <span className="text-[9px] font-mono text-slate-500 uppercase">Tone:</span>
                                <div
                                  className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs"
                                  style={{ backgroundColor: thm.accentHex }}
                                  title="Primary Glow"
                                />
                                <div
                                  className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs"
                                  style={{ backgroundColor: thm.chart.accentLight }}
                                  title="Highlight"
                                />
                                <div
                                  className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs"
                                  style={{ backgroundColor: thm.chart.accentDark }}
                                  title="Depth Core"
                                />
                                <span className="ml-auto text-[10px] font-mono font-semibold" style={{ color: thm.accentHex }}>
                                  {thm.accentHex}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. Audio & Auto-Insert Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            {prefSound ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                            <span>Keypad Audio Synthesizer</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Tactile beeps & motor hums
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPrefSound(!prefSound)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                            prefSound ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                              prefSound ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-emerald-400" />
                            <span>Auto-Insert Linked Card</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Load card on profile selection
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPrefAutoInsert(!prefAutoInsert)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                            prefAutoInsert ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                              prefAutoInsert ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* 5. Custom Welcome Message */}
                    <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                      <label className="block text-xs font-bold text-white">
                        Personalized Greeting Note
                      </label>
                      <input
                        type="text"
                        maxLength={50}
                        value={prefCustomWelcome}
                        onChange={(e) => setPrefCustomWelcome(e.target.value)}
                        placeholder="e.g. Welcome back Alice! Checking account ready."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-2 flex items-center justify-between">
                    {saveSuccessNotice ? (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-fade-in">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Preferences Saved & Persisted Across Sessions!</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        Preferences sync automatically with your browser storage.
                      </span>
                    )}

                    <button
                      onClick={handleSavePreferences}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Preferences</span>
                    </button>
                  </div>
                </>
              ) : (
                /* No Active Profile Selected */
                <div className="text-center py-8">
                  <div className="p-3 bg-slate-800 rounded-full inline-flex text-slate-400 mb-2">
                    <User className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No Profile Logged In</h4>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    Please log in or select a profile to customize ATM preferences.
                  </p>
                  <button
                    onClick={() => setActiveTab('switch')}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Select an Existing Profile
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SWITCH / SELECT PROFILE */}
          {activeTab === 'switch' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Choose an existing customer profile. Enter the account password to switch sessions.
              </div>

              {loginTargetProfileId ? (
                /* Password Verification Screen */
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 max-w-md mx-auto space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>Verify Password</span>
                    </span>
                    <button
                      onClick={() => {
                        setLoginTargetProfileId(null);
                        setLoginError('');
                      }}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>

                  <p className="text-xs text-slate-300">
                    Enter password for{' '}
                    <strong className="text-white">
                      {profiles.find((p) => p.id === loginTargetProfileId)?.displayName}
                    </strong>:
                  </p>

                  <form onSubmit={handleSwitchLoginSubmit} className="space-y-3">
                    <input
                      type="password"
                      value={loginPasswordInput}
                      onChange={(e) => setLoginPasswordInput(e.target.value)}
                      placeholder="Password (Default: password123)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                      autoFocus
                    />
                    {loginError && <div className="text-xs text-rose-400">{loginError}</div>}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">
                        Default Demo Password:{' '}
                        <code className="text-emerald-400 font-mono">password123</code>
                      </span>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                      >
                        Authorize & Login
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Profiles List */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profiles.map((p) => {
                    const acc = accounts.find((a) => a.id === p.linkedAccountId);
                    const isCurrent = activeProfile?.id === p.id;

                    return (
                      <div
                        key={p.id}
                        className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          isCurrent
                            ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white text-sm flex items-center gap-1.5">
                              <span>{p.displayName}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                                  ACTIVE
                                </span>
                              )}
                            </span>
                            <span className="text-xs font-mono text-slate-400">@{p.username}</span>
                          </div>

                          <div className="text-xs text-slate-400 space-y-0.5 mt-2 font-mono">
                            <div>
                              Card: {acc?.cardNumber.slice(0, 4)} •••• {acc?.cardNumber.slice(-4)}
                            </div>
                            <div className="text-emerald-400 font-bold">
                              Balance: ${acc?.balance.toFixed(2)} ({acc?.accountType})
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80 space-y-1">
                            <div className="flex items-center justify-between">
                              <span>Fav Cash: <strong className="text-white">${p.preferences.favoriteFastCash}</strong></span>
                              <span>Receipts: <strong className="text-white">{p.preferences.receiptPreference}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] text-slate-500 font-mono">Theme:</span>
                              {(() => {
                                const thm = THEME_CONFIGS[normalizeTheme(p.preferences.theme)];
                                return (
                                  <span
                                    className="text-[10px] font-mono px-2 py-0.5 rounded-full border inline-flex items-center gap-1 font-semibold"
                                    style={{
                                      backgroundColor: `${thm.accentHex}18`,
                                      borderColor: `${thm.accentHex}40`,
                                      color: thm.accentHex,
                                    }}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: thm.accentHex }} />
                                    <span>{thm.name}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2">
                          {isCurrent ? (
                            <button
                              onClick={() => setActiveTab('preferences')}
                              className="w-full py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Edit My Preferences
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setLoginTargetProfileId(p.id);
                                setLoginPasswordInput('');
                                setLoginError('');
                              }}
                              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span>Switch to @{p.username}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CREATE NEW PROFILE */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateProfileSubmit} className="space-y-4 max-w-lg mx-auto">
              <div>
                <h4 className="text-sm font-bold text-white">Create New Customer Profile</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set up a personalized username and password. Saved to persistent browser storage.
                </p>
              </div>

              {createError && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Username:
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. jsmith"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Display Name:
                  </label>
                  <input
                    type="text"
                    required
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Password:
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 4 characters"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm Password:
                  </label>
                  <input
                    type="password"
                    required
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Linked Account Choice */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Bank Account Linking:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAccountOption('link_existing')}
                    className={`p-2.5 rounded-lg border text-left text-xs cursor-pointer ${
                      newAccountOption === 'link_existing'
                        ? 'bg-emerald-500/10 border-emerald-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    Link Existing Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAccountOption('create_new')}
                    className={`p-2.5 rounded-lg border text-left text-xs cursor-pointer ${
                      newAccountOption === 'create_new'
                        ? 'bg-emerald-500/10 border-emerald-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    Mint Brand-New Account
                  </button>
                </div>

                {newAccountOption === 'link_existing' ? (
                  <div className="pt-1">
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.customerName} - {acc.accountNumber} ({acc.accountType}) - ${acc.balance.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2.5">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Account Type</label>
                        <select
                          value={newAccType}
                          onChange={(e) => setNewAccType(e.target.value as 'CHECKING' | 'SAVINGS')}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                        >
                          <option value="CHECKING">Checking</option>
                          <option value="SAVINGS">Savings</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Opening Deposit ($)</label>
                        <input
                          type="number"
                          min="10"
                          max="50000"
                          value={newAccStartingBalance}
                          onChange={(e) => setNewAccStartingBalance(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Card 4-Digit PIN</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={newAccPin}
                          onChange={(e) => setNewAccPin(e.target.value)}
                          placeholder="e.g. 1234"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white font-mono tracking-widest text-center"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Initial Liquid Glass Theme Choice */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Initial Liquid Glass Color Theme:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABLE_THEMES.map((thm) => {
                    const isSelected = newTheme === thm.id;
                    return (
                      <button
                        key={thm.id}
                        type="button"
                        onClick={() => setNewTheme(thm.id)}
                        className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? 'bg-white/10 text-white font-bold ring-1'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                        }`}
                        style={isSelected ? { borderColor: thm.accentHex, color: '#fff' } : undefined}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-gradient-to-tr ${thm.swatchGradient} shrink-0`}
                        />
                        <span className="truncate">{thm.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Profile & Sign In</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
