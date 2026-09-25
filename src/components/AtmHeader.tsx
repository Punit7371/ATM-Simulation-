import React from 'react';
import { Volume2, VolumeX, RotateCcw, ShieldCheck, Terminal, Vault, User, Sliders, Palette } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled } from '../utils/audio';
import { UserProfile } from '../types/profile';
import { normalizeTheme, THEME_CONFIGS } from '../types/theme';

interface AtmHeaderProps {
  onOpenAdmin: () => void;
  onOpenPython: () => void;
  onOpenProfile: () => void;
  onResetAll: () => void;
  soundActive: boolean;
  setSoundActive: (active: boolean) => void;
  activeTab: 'kiosk' | 'admin' | 'python';
  setActiveTab: (tab: 'kiosk' | 'admin' | 'python') => void;
  activeProfile: UserProfile | null;
}

export const AtmHeader: React.FC<AtmHeaderProps> = ({
  onOpenAdmin,
  onOpenPython,
  onOpenProfile,
  onResetAll,
  soundActive,
  setSoundActive,
  activeTab,
  setActiveTab,
  activeProfile,
}) => {
  const currentTheme = THEME_CONFIGS[normalizeTheme(activeProfile?.preferences.theme)];

  const toggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
  };

  return (
    <header className="w-full border-b border-white/10 bg-slate-950/40 backdrop-blur-2xl px-3 sm:px-8 py-3 sticky top-0 z-30 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Zone 1: Brand Title */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div
            className="w-9 h-9 rounded-xl border backdrop-blur-md flex items-center justify-center font-bold text-lg transition-colors"
            style={{
              borderColor: currentTheme.panelBorder,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: currentTheme.accentHex,
              boxShadow: `0 0 16px ${currentTheme.chart.glow}`,
            }}
          >
            A
          </div>
          <div>
            <span className={`text-sm sm:text-base font-bold tracking-tight text-white block ${currentTheme.crt.glow}`}>
              Apex Trust & Banking
            </span>
            <div className="text-[10px] font-mono hidden sm:flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: currentTheme.accentHex }} />
              <span style={{ color: currentTheme.accentHex }} className="font-semibold">
                {currentTheme.name}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Liquid Glass Kiosk</span>
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-white/[0.04] backdrop-blur-xl p-1 rounded-2xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
          <button
            onClick={() => setActiveTab('kiosk')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'kiosk'
                ? 'liquid-glass-btn text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            style={activeTab === 'kiosk' ? { color: currentTheme.accentHex } : undefined}
          >
            ATM Terminal
          </button>
          <button
            onClick={() => {
              setActiveTab('admin');
              onOpenAdmin();
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'admin'
                ? 'liquid-glass-btn text-amber-300 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Vault className="w-3.5 h-3.5 text-amber-400" />
            Vault & Admin
          </button>
          <button
            onClick={() => {
              setActiveTab('python');
              onOpenPython();
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'python'
                ? 'liquid-glass-btn text-emerald-300 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            Python Architecture
          </button>
        </nav>

        {/* Zone 3: Primary Actions + User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* User Profile Trigger Button */}
          <button
            onClick={onOpenProfile}
            className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap backdrop-blur-xl ${
              activeProfile
                ? 'bg-white/[0.08] hover:bg-white/[0.12] text-white shadow-md'
                : 'liquid-glass-btn text-slate-300 hover:text-white'
            }`}
            style={activeProfile ? { borderColor: currentTheme.panelBorder } : undefined}
            title={`User Profile & Preferences (${currentTheme.name} Theme Active)`}
          >
            <div
              className="w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] shadow-sm"
              style={{
                backgroundColor: `${currentTheme.accentHex}25`,
                color: currentTheme.accentHex,
              }}
            >
              {activeProfile ? activeProfile.displayName.charAt(0) : <User className="w-3 h-3" />}
            </div>
            <div className="text-left hidden sm:block">
              <span className="block text-[11px] font-bold text-white leading-tight">
                {activeProfile ? activeProfile.displayName : 'Guest Profile'}
              </span>
              <span
                className="block text-[9px] font-mono leading-tight"
                style={{ color: currentTheme.accentHex }}
              >
                {activeProfile ? `@${activeProfile.username} · ${currentTheme.name}` : 'Click to customize'}
              </span>
            </div>
            <Palette className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          <button
            onClick={toggleSound}
            title={soundActive ? 'Mute audio' : 'Enable audio'}
            aria-label="Toggle Sound"
            className="p-2 text-slate-300 hover:text-white liquid-glass-btn rounded-xl transition-all cursor-pointer"
          >
            {soundActive ? (
              <Volume2 className="w-4 h-4" style={{ color: currentTheme.accentHex }} />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          <button
            onClick={onResetAll}
            title="Reset Simulation State to Factory Defaults"
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white liquid-glass-btn rounded-xl transition-all whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 rounded-xl transition-all shadow-[0_0_20px_rgba(251,191,36,0.35)] border border-amber-300/60 whitespace-nowrap cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-bold">Admin Vault</span>
          </button>
        </div>
      </div>
    </header>
  );
};
