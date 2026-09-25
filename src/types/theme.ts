export type CanonicalThemeId =
  | 'midnight_blue'
  | 'cyberpunk_amber'
  | 'classic_slate'
  | 'emerald_matrix'
  | 'amethyst_violet';

export type ATMTheme =
  | CanonicalThemeId
  | 'matrix_green'
  | 'amber_gold'
  | 'cobalt_blue'
  | 'stealth_dark';

export interface ThemeConfig {
  id: CanonicalThemeId;
  name: string;
  tagline: string;
  description: string;
  swatchGradient: string;
  accentHex: string;
  accentClass: string;
  badgeClass: string;
  dotColor: string;
  orb1: string;
  orb2: string;
  orb3: string;
  meshBg: string;
  panelBorder: string;
  panelGlow: string;
  kioskBadgeBorder: string;
  kioskBadgeBg: string;
  kioskBadgeText: string;
  ledStripColor: string;
  crt: {
    screenBg: string;
    headerText: string;
    headerBorder: string;
    glow: string;
    bannerBg: string;
    btnPrimary: string;
  };
  chart: {
    accent: string;
    accentLight: string;
    accentDark: string;
    glow: string;
    border: string;
    text: string;
    bgSubtle: string;
    barActive: string;
    barPeak: string;
  };
}

export function normalizeTheme(theme?: ATMTheme | string | null): CanonicalThemeId {
  if (!theme) return 'midnight_blue';
  switch (theme) {
    case 'midnight_blue':
    case 'cobalt_blue':
      return 'midnight_blue';
    case 'cyberpunk_amber':
    case 'amber_gold':
      return 'cyberpunk_amber';
    case 'classic_slate':
    case 'stealth_dark':
      return 'classic_slate';
    case 'amethyst_violet':
      return 'amethyst_violet';
    case 'emerald_matrix':
    case 'matrix_green':
    default:
      return 'emerald_matrix';
  }
}

export const THEME_CONFIGS: Record<CanonicalThemeId, ThemeConfig> = {
  midnight_blue: {
    id: 'midnight_blue',
    name: 'Midnight Blue',
    tagline: 'Deep Sapphire & Electric Cyan',
    description: 'Deep ocean liquid glass with vibrant neon cyan illumination and cool frosted azure acrylic edges.',
    swatchGradient: 'from-sky-400 via-blue-500 to-indigo-900',
    accentHex: '#38bdf8',
    accentClass: 'text-sky-400',
    badgeClass: 'border-sky-400/40 bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/30',
    dotColor: '#38bdf8',
    orb1: 'radial-gradient(circle, rgba(14, 165, 233, 0.22) 0%, rgba(3, 105, 161, 0.1) 45%, transparent 70%)',
    orb2: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(49, 46, 129, 0.08) 45%, transparent 70%)',
    orb3: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(12, 74, 110, 0.06) 50%, transparent 75%)',
    meshBg: 'radial-gradient(circle at 50% 0%, #061833 0%, #020b18 60%, #01050d 100%)',
    panelBorder: 'rgba(56, 189, 248, 0.22)',
    panelGlow: '0 0 35px -8px rgba(14, 165, 233, 0.25)',
    kioskBadgeBorder: 'border-sky-500/30',
    kioskBadgeBg: 'bg-sky-500/10',
    kioskBadgeText: 'text-sky-300',
    ledStripColor: 'rgba(56, 189, 248, 0.85)',
    crt: {
      screenBg: 'bg-gradient-to-b from-[#05172b] to-[#020b17] text-cyan-300',
      headerText: 'text-cyan-400',
      headerBorder: 'border-cyan-500/20',
      glow: 'crt-blue-glow',
      bannerBg: 'bg-cyan-950/80 border-cyan-500/60 text-cyan-200',
      btnPrimary: 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]',
    },
    chart: {
      accent: '#38bdf8',
      accentLight: '#7dd3fc',
      accentDark: '#0369a1',
      glow: 'rgba(56, 189, 248, 0.45)',
      border: 'border-cyan-500/30',
      text: 'text-cyan-400',
      bgSubtle: 'bg-cyan-950/40',
      barActive: 'from-sky-500 to-cyan-300',
      barPeak: 'from-cyan-400 to-sky-200',
    },
  },
  cyberpunk_amber: {
    id: 'cyberpunk_amber',
    name: 'Cyberpunk Amber',
    tagline: 'Incandescent Amber & Molten Gold',
    description: 'High-contrast neon amber with molten honeyed glass refraction and retro-futuristic CRT warmth.',
    swatchGradient: 'from-amber-300 via-amber-500 to-orange-800',
    accentHex: '#fbbf24',
    accentClass: 'text-amber-400',
    badgeClass: 'border-amber-400/40 bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30',
    dotColor: '#fbbf24',
    orb1: 'radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, rgba(180, 83, 9, 0.1) 45%, transparent 70%)',
    orb2: 'radial-gradient(circle, rgba(251, 191, 36, 0.16) 0%, rgba(217, 119, 6, 0.08) 45%, transparent 70%)',
    orb3: 'radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, rgba(153, 27, 27, 0.05) 50%, transparent 75%)',
    meshBg: 'radial-gradient(circle at 50% 0%, #291804 0%, #0d0802 60%, #050301 100%)',
    panelBorder: 'rgba(245, 158, 11, 0.24)',
    panelGlow: '0 0 35px -8px rgba(245, 158, 11, 0.25)',
    kioskBadgeBorder: 'border-amber-500/30',
    kioskBadgeBg: 'bg-amber-500/10',
    kioskBadgeText: 'text-amber-300',
    ledStripColor: 'rgba(251, 191, 36, 0.85)',
    crt: {
      screenBg: 'bg-gradient-to-b from-[#251705] to-[#120b02] text-amber-300',
      headerText: 'text-amber-400',
      headerBorder: 'border-amber-500/20',
      glow: 'crt-amber-glow',
      bannerBg: 'bg-amber-950/80 border-amber-500/60 text-amber-200',
      btnPrimary: 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.4)]',
    },
    chart: {
      accent: '#f59e0b',
      accentLight: '#fbbf24',
      accentDark: '#78350f',
      glow: 'rgba(245, 158, 11, 0.45)',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      bgSubtle: 'bg-amber-950/40',
      barActive: 'from-amber-500 to-yellow-300',
      barPeak: 'from-amber-400 to-yellow-200',
    },
  },
  classic_slate: {
    id: 'classic_slate',
    name: 'Classic Slate',
    tagline: 'Smoked Titanium & Platinum Frost',
    description: 'Sleek architectural monochrome liquid glass with brushed metal reflections and crystal-clear contrast.',
    swatchGradient: 'from-slate-200 via-slate-400 to-slate-800',
    accentHex: '#cbd5e1',
    accentClass: 'text-slate-300',
    badgeClass: 'border-slate-400/40 bg-slate-500/15 text-slate-200 ring-1 ring-slate-400/30',
    dotColor: '#cbd5e1',
    orb1: 'radial-gradient(circle, rgba(148, 163, 184, 0.18) 0%, rgba(71, 85, 105, 0.08) 45%, transparent 70%)',
    orb2: 'radial-gradient(circle, rgba(203, 213, 225, 0.12) 0%, rgba(51, 65, 85, 0.06) 45%, transparent 70%)',
    orb3: 'radial-gradient(circle, rgba(100, 116, 139, 0.12) 0%, rgba(30, 41, 59, 0.05) 50%, transparent 75%)',
    meshBg: 'radial-gradient(circle at 50% 0%, #151c27 0%, #080d14 60%, #030508 100%)',
    panelBorder: 'rgba(148, 163, 184, 0.22)',
    panelGlow: '0 0 35px -8px rgba(148, 163, 184, 0.15)',
    kioskBadgeBorder: 'border-slate-400/30',
    kioskBadgeBg: 'bg-slate-400/10',
    kioskBadgeText: 'text-slate-200',
    ledStripColor: 'rgba(203, 213, 225, 0.85)',
    crt: {
      screenBg: 'bg-gradient-to-b from-[#181a20] to-[#0d0e11] text-slate-200',
      headerText: 'text-slate-200',
      headerBorder: 'border-slate-700',
      glow: 'crt-slate-glow',
      bannerBg: 'bg-slate-900 border-slate-700 text-slate-200',
      btnPrimary: 'bg-slate-100 hover:bg-white text-slate-950 shadow-[0_0_15px_rgba(241,245,249,0.35)]',
    },
    chart: {
      accent: '#94a3b8',
      accentLight: '#cbd5e1',
      accentDark: '#334155',
      glow: 'rgba(148, 163, 184, 0.4)',
      border: 'border-slate-500/30',
      text: 'text-slate-300',
      bgSubtle: 'bg-slate-800/40',
      barActive: 'from-slate-400 to-slate-200',
      barPeak: 'from-slate-300 to-white',
    },
  },
  emerald_matrix: {
    id: 'emerald_matrix',
    name: 'Emerald Matrix',
    tagline: 'Bioluminescent Jade & Phosphor Glow',
    description: 'Classic banking terminal heritage infused with fluid frosted glass and glowing matrix phosphor.',
    swatchGradient: 'from-emerald-300 via-emerald-500 to-teal-900',
    accentHex: '#34d399',
    accentClass: 'text-emerald-400',
    badgeClass: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30',
    dotColor: '#34d399',
    orb1: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(6, 78, 59, 0.1) 45%, transparent 70%)',
    orb2: 'radial-gradient(circle, rgba(52, 211, 153, 0.15) 0%, rgba(13, 148, 136, 0.07) 45%, transparent 70%)',
    orb3: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(4, 120, 87, 0.05) 50%, transparent 75%)',
    meshBg: 'radial-gradient(circle at 50% 0%, #061c16 0%, #020c09 60%, #010403 100%)',
    panelBorder: 'rgba(16, 185, 129, 0.24)',
    panelGlow: '0 0 35px -8px rgba(16, 185, 129, 0.22)',
    kioskBadgeBorder: 'border-emerald-500/30',
    kioskBadgeBg: 'bg-emerald-500/10',
    kioskBadgeText: 'text-emerald-300',
    ledStripColor: 'rgba(52, 211, 153, 0.85)',
    crt: {
      screenBg: 'bg-gradient-to-b from-[#091e1d] to-[#041110] text-emerald-300',
      headerText: 'text-emerald-400',
      headerBorder: 'border-emerald-500/20',
      glow: 'crt-glow',
      bannerBg: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200',
      btnPrimary: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(52,211,153,0.4)]',
    },
    chart: {
      accent: '#10b981',
      accentLight: '#34d399',
      accentDark: '#064e3b',
      glow: 'rgba(16, 185, 129, 0.45)',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      bgSubtle: 'bg-emerald-950/40',
      barActive: 'from-emerald-500 to-teal-300',
      barPeak: 'from-emerald-400 to-teal-200',
    },
  },
  amethyst_violet: {
    id: 'amethyst_violet',
    name: 'Amethyst Violet',
    tagline: 'Holographic Violet & Neon Magenta',
    description: 'Opulent purple liquid glass with radiant magenta accents and crystalline refractive depth.',
    swatchGradient: 'from-fuchsia-400 via-purple-500 to-indigo-950',
    accentHex: '#c084fc',
    accentClass: 'text-purple-400',
    badgeClass: 'border-purple-400/40 bg-purple-500/15 text-purple-300 ring-1 ring-purple-400/30',
    dotColor: '#c084fc',
    orb1: 'radial-gradient(circle, rgba(168, 85, 247, 0.22) 0%, rgba(107, 33, 168, 0.1) 45%, transparent 70%)',
    orb2: 'radial-gradient(circle, rgba(217, 70, 239, 0.15) 0%, rgba(147, 51, 234, 0.07) 45%, transparent 70%)',
    orb3: 'radial-gradient(circle, rgba(139, 92, 246, 0.14) 0%, rgba(88, 28, 135, 0.05) 50%, transparent 75%)',
    meshBg: 'radial-gradient(circle at 50% 0%, #1f0b30 0%, #0d0416 60%, #05010a 100%)',
    panelBorder: 'rgba(168, 85, 247, 0.24)',
    panelGlow: '0 0 35px -8px rgba(168, 85, 247, 0.25)',
    kioskBadgeBorder: 'border-purple-500/30',
    kioskBadgeBg: 'bg-purple-500/10',
    kioskBadgeText: 'text-purple-300',
    ledStripColor: 'rgba(192, 132, 252, 0.85)',
    crt: {
      screenBg: 'bg-gradient-to-b from-[#1b0a2a] to-[#0d0317] text-purple-300',
      headerText: 'text-purple-400',
      headerBorder: 'border-purple-500/20',
      glow: 'crt-violet-glow',
      bannerBg: 'bg-purple-950/80 border-purple-500/60 text-purple-200',
      btnPrimary: 'bg-purple-400 hover:bg-purple-300 text-slate-950 shadow-[0_0_15px_rgba(192,132,252,0.4)]',
    },
    chart: {
      accent: '#a855f7',
      accentLight: '#c084fc',
      accentDark: '#581c87',
      glow: 'rgba(168, 85, 247, 0.45)',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      bgSubtle: 'bg-purple-950/40',
      barActive: 'from-purple-500 to-fuchsia-300',
      barPeak: 'from-fuchsia-400 to-pink-200',
    },
  },
};

export const AVAILABLE_THEMES = Object.values(THEME_CONFIGS);
