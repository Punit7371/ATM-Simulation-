import React, { useState, useMemo } from 'react';
import { Transaction, Account } from '../types/atm';
import { ATMTheme } from '../types/profile';
import { normalizeTheme, THEME_CONFIGS } from '../types/theme';
import {
  TrendingUp,
  BarChart3,
  Activity,
  Layers,
  Calendar,
  DollarSign,
  Hash,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

interface WithdrawalFrequencyChartProps {
  transactions: Transaction[];
  activeAccount: Account | null;
  accounts: Account[];
  theme?: ATMTheme;
  isCompact?: boolean; // For inside ATM CRT monitor
}

export interface DayActivity {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Sep 18"
  weekday: string; // "Fri"
  isToday: boolean;
  withdrawals: Transaction[];
  frequency: number; // count of withdrawals
  totalAmount: number; // total $ withdrawn
  allDayTransactions: Transaction[];
}

interface StatsResult {
  totalWithdrawals: number;
  totalWithdrawnAmount: number;
  activeDaysCount: number;
  maxFrequency: number;
  maxAmount: number;
  peakDay: DayActivity | null;
  avgPerWithdrawal: number;
  dailyFrequencyRate: number;
}

export const WithdrawalFrequencyChart: React.FC<WithdrawalFrequencyChartProps> = ({
  transactions,
  activeAccount,
  accounts,
  theme = 'matrix_green',
  isCompact = false,
}) => {
  const [viewMode, setViewMode] = useState<'bars' | 'sparkline' | 'combined'>('combined');
  const [metricMode, setMetricMode] = useState<'frequency' | 'amount'>('frequency');
  const [filterMode, setFilterMode] = useState<'active_account' | 'all_accounts'>(
    activeAccount ? 'active_account' : 'all_accounts'
  );
  const [hoveredDay, setHoveredDay] = useState<DayActivity | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Sync filter when activeAccount changes
  React.useEffect(() => {
    if (activeAccount) {
      setFilterMode('active_account');
    }
  }, [activeAccount?.id]);

  // Determine theme styles
  const themeColors = useMemo(() => {
    const canonicalTheme = normalizeTheme(theme);
    return THEME_CONFIGS[canonicalTheme].chart;
  }, [theme]);

  // Filter transactions based on selection
  const relevantTransactions = useMemo(() => {
    if (filterMode === 'active_account' && activeAccount) {
      return transactions.filter((t) => t.accountNumber === activeAccount.accountNumber);
    }
    return transactions;
  }, [transactions, filterMode, activeAccount]);

  // Compute the 30-day timeline
  const thirtyDayData: DayActivity[] = useMemo(() => {
    // Find reference end date: either today or latest transaction timestamp, whichever is later
    let refDate = new Date();
    if (transactions.length > 0) {
      // Find max timestamp
      const timestamps = transactions.map((t) => new Date(t.timestamp.replace(' ', 'T')).getTime()).filter((t) => !isNaN(t));
      if (timestamps.length > 0) {
        const maxTime = Math.max(...timestamps);
        if (maxTime > refDate.getTime()) {
          refDate = new Date(maxTime);
        }
      }
    }

    const days: DayActivity[] = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(refDate);
      d.setDate(refDate.getDate() - i);

      const year = d.getFullYear();
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const dayLabel = `${months[d.getMonth()]} ${d.getDate()}`;
      const weekday = weekdays[d.getDay()];

      // Match all transactions for this day
      const dayTxs = relevantTransactions.filter((t) => t.timestamp.startsWith(dateStr));
      const withdrawals = dayTxs.filter((t) => t.type === 'WITHDRAWAL');

      const frequency = withdrawals.length;
      const totalAmount = withdrawals.reduce((acc, cur) => acc + cur.amount, 0);

      days.push({
        dateStr,
        dayLabel,
        weekday,
        isToday: i === 0,
        withdrawals,
        frequency,
        totalAmount,
        allDayTransactions: dayTxs,
      });
    }

    return days;
  }, [relevantTransactions, transactions]);

  // Aggregate stats over the 30 days
  const stats = useMemo<StatsResult>(() => {
    let totalWithdrawals = 0;
    let totalWithdrawnAmount = 0;
    let activeDaysCount = 0;
    let maxFrequency = 0;
    let maxAmount = 0;
    let peakDay: DayActivity | null = null;

    thirtyDayData.forEach((d) => {
      totalWithdrawals += d.frequency;
      totalWithdrawnAmount += d.totalAmount;
      if (d.frequency > 0) {
        activeDaysCount++;
      }
      if (d.frequency > maxFrequency) {
        maxFrequency = d.frequency;
        peakDay = d;
      }
      if (d.totalAmount > maxAmount) {
        maxAmount = d.totalAmount;
      }
    });

    const avgPerWithdrawal = totalWithdrawals > 0 ? totalWithdrawnAmount / totalWithdrawals : 0;
    const dailyFrequencyRate = totalWithdrawals / 30;

    return {
      totalWithdrawals,
      totalWithdrawnAmount,
      activeDaysCount,
      maxFrequency: Math.max(maxFrequency, 1), // avoid division by zero
      maxAmount: Math.max(maxAmount, 100),
      peakDay,
      avgPerWithdrawal,
      dailyFrequencyRate,
    };
  }, [thirtyDayData]);

  // Sparkline SVG path generation
  const { sparklinePath, sparklineAreaPath, points } = useMemo(() => {
    const width = 1000;
    const height = 180;
    const paddingX = 20;
    const paddingTop = 25;
    const paddingBottom = 25;
    const innerHeight = height - paddingTop - paddingBottom;
    const innerWidth = width - paddingX * 2;
    const stepX = innerWidth / 29;

    const maxVal = metricMode === 'frequency' ? stats.maxFrequency : stats.maxAmount;

    const pts = thirtyDayData.map((d, index) => {
      const val = metricMode === 'frequency' ? d.frequency : d.totalAmount;
      const x = paddingX + index * stepX;
      // y is inverted in SVG: 0 at top, height at bottom
      const y = paddingTop + innerHeight - (val / maxVal) * innerHeight;
      return { x, y, day: d, val };
    });

    if (pts.length < 2) {
      return { sparklinePath: '', sparklineAreaPath: '', points: pts };
    }

    // Smooth Bezier Curve Path
    let dPath = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cpX1 = curr.x + (next.x - curr.x) / 2;
      const cpY1 = curr.y;
      const cpX2 = curr.x + (next.x - curr.x) / 2;
      const cpY2 = next.y;
      dPath += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${next.x},${next.y}`;
    }

    // Area path (closed at the bottom)
    const baselineY = paddingTop + innerHeight;
    const dArea = `${dPath} L ${pts[pts.length - 1].x},${baselineY} L ${pts[0].x},${baselineY} Z`;

    return { sparklinePath: dPath, sparklineAreaPath: dArea, points: pts };
  }, [thirtyDayData, stats, metricMode]);

  // Compact Mode (for embedding inside the ATM CRT Screen, e.g. MINI_STATEMENT)
  if (isCompact) {
    return (
      <div className="w-full bg-slate-950/80 border border-emerald-500/40 rounded-xl p-3 font-mono">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>30-DAY WITHDRAWAL FREQUENCY</span>
          </div>
          <span className="text-[11px] text-emerald-300/80">
            Total: <strong className="text-white">{stats.totalWithdrawals}</strong> withdrawals (${stats.totalWithdrawnAmount.toFixed(0)})
          </span>
        </div>

        {/* Compact SVG Sparkline & Bars */}
        <div className="relative h-20 w-full bg-emerald-950/30 rounded-lg overflow-hidden border border-emerald-900/60 p-1 flex items-end justify-between gap-[2px]">
          {thirtyDayData.map((d, i) => {
            const heightPercent = stats.maxFrequency > 0 ? (d.frequency / stats.maxFrequency) * 100 : 0;
            const hasActivity = d.frequency > 0;
            const isPeak = stats.peakDay && d.dateStr === stats.peakDay.dateStr && stats.peakDay.frequency > 1;

            return (
              <div
                key={d.dateStr}
                title={`${d.dayLabel}: ${d.frequency} withdrawals ($${d.totalAmount})`}
                className="flex-1 flex flex-col justify-end items-center h-full group relative cursor-pointer"
              >
                <div
                  style={{ height: `${Math.max(hasActivity ? heightPercent : 6, 6)}%` }}
                  className={`w-full rounded-t-[1px] transition-all ${
                    isPeak
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                      : hasActivity
                      ? 'bg-emerald-400 group-hover:bg-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                      : 'bg-emerald-950/80 border-t border-emerald-900/40 group-hover:bg-emerald-900/50'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* X Axis Indicators */}
        <div className="flex items-center justify-between text-[9px] text-emerald-500/70 mt-1 px-1">
          <span>{thirtyDayData[0]?.dayLabel || '30 days ago'}</span>
          <span>15 days ago</span>
          <span className="text-emerald-300 font-bold">Today</span>
        </div>
      </div>
    );
  }

  // Active highlighted day (hovered or selected or latest active)
  const currentInspectDay = hoveredDay || selectedDay || stats.peakDay || thirtyDayData[thirtyDayData.length - 1];

  return (
    <div className="w-full liquid-glass-panel rounded-2xl p-4 sm:p-5 relative transition-all">
      {/* Header bar with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/15 shadow-inner backdrop-blur-md">
            <BarChart3 className={`w-5 h-5 ${themeColors.text}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-1.5 crt-glow">
                <span>30-Day Activity & Withdrawal Frequency</span>
              </h2>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-white/[0.06] ${themeColors.text} border border-white/15 shadow-sm`}>
                {stats.totalWithdrawals} Cash Withdrawals
              </span>
            </div>
            <p className="text-xs text-slate-300/80">
              Interactive timeline of ATM cash dispensation patterns over the last 30 days
            </p>
          </div>
        </div>

        {/* Controls: Account Filter & View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Account Filter Pill */}
          <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-xl p-0.5 text-xs backdrop-blur-md">
            {activeAccount && (
              <button
                onClick={() => setFilterMode('active_account')}
                className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-all ${
                  filterMode === 'active_account'
                    ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Show only active card account transactions"
              >
                Card: {activeAccount.customerName.split(' ')[0]}
              </button>
            )}
            <button
              onClick={() => setFilterMode('all_accounts')}
              className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-all ${
                filterMode === 'all_accounts'
                  ? 'bg-white/10 text-white shadow-sm border border-white/15'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show all ATM kiosk transactions combined"
            >
              All Kiosk Cards
            </button>
          </div>

          {/* Metric Toggle: Frequency vs Amount */}
          <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-xl p-0.5 text-xs backdrop-blur-md">
            <button
              onClick={() => setMetricMode('frequency')}
              className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                metricMode === 'frequency'
                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Chart daily withdrawal counts"
            >
              <Hash className="w-3 h-3" />
              <span>Frequency</span>
            </button>
            <button
              onClick={() => setMetricMode('amount')}
              className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                metricMode === 'amount'
                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Chart daily dollar volumes"
            >
              <DollarSign className="w-3 h-3" />
              <span>Volume ($)</span>
            </button>
          </div>

          {/* Visual Style Switcher */}
          <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-xl p-0.5 text-xs backdrop-blur-md">
            <button
              onClick={() => setViewMode('bars')}
              className={`px-2 py-1 rounded-lg cursor-pointer transition-all ${
                viewMode === 'bars' ? 'bg-white/15 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Bar Chart Only"
            >
              Bars
            </button>
            <button
              onClick={() => setViewMode('sparkline')}
              className={`px-2 py-1 rounded-lg cursor-pointer transition-all ${
                viewMode === 'sparkline' ? 'bg-white/15 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Sparkline Curve Only"
            >
              Sparkline
            </button>
            <button
              onClick={() => setViewMode('combined')}
              className={`px-2 py-1 rounded-lg cursor-pointer transition-all ${
                viewMode === 'combined' ? 'bg-white/15 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Combined Bars & Sparkline"
            >
              Both
            </button>
          </div>

          {/* Collapse/Expand toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl liquid-glass-btn text-slate-300 hover:text-white cursor-pointer ml-1"
            title={isExpanded ? 'Collapse chart' : 'Expand chart'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* KPI Stats Summary Bar - Liquid Glass Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="liquid-glass-card rounded-xl p-3">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Hash className="w-3 h-3 text-emerald-400" />
            <span>30D Withdrawals</span>
          </div>
          <div className="text-xl font-bold font-mono text-white mt-0.5">
            {stats.totalWithdrawals}{' '}
            <span className="text-xs font-normal text-slate-400">times</span>
          </div>
          <div className="text-[10px] text-emerald-400/90 mt-0.5">
            Avg {stats.dailyFrequencyRate.toFixed(2)}/day
          </div>
        </div>

        <div className="liquid-glass-card rounded-xl p-3">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-400" />
            <span>30D Total Dispensed</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
            ${stats.totalWithdrawnAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            ~${stats.avgPerWithdrawal.toFixed(0)} avg per withdrawal
          </div>
        </div>

        <div className="liquid-glass-card rounded-xl p-3">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            <span>Peak Activity Day</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">
            {stats.peakDay ? stats.peakDay.dayLabel : 'None'}
          </div>
          <div className="text-[10px] text-amber-400/90 mt-0.5">
            {stats.peakDay ? `${stats.peakDay.frequency} withdrawals ($${stats.peakDay.totalAmount})` : 'No data'}
          </div>
        </div>

        <div className="liquid-glass-card rounded-xl p-3">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3 text-cyan-400" />
            <span>Active ATM Days</span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-0.5">
            {stats.activeDaysCount} <span className="text-xs font-normal text-slate-400">/ 30 days</span>
          </div>
          <div className="text-[10px] text-cyan-400/90 mt-0.5">
            {((stats.activeDaysCount / 30) * 100).toFixed(0)}% monthly frequency
          </div>
        </div>
      </div>

      {/* Main Chart Graphic Canvas (Collapsible) */}
      {isExpanded && (
        <div>
          {/* Chart Viewport Container */}
          <div className="relative w-full bg-slate-950/90 rounded-xl border border-slate-800/80 p-3 sm:p-4 overflow-hidden select-none">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 opacity-15">
              <div className="border-b border-emerald-500 w-full" />
              <div className="border-b border-emerald-500 w-full" />
              <div className="border-b border-emerald-500 w-full" />
              <div className="border-b border-emerald-500 w-full" />
            </div>

            {/* Sparkline Overlay Graphic (SVG) */}
            {(viewMode === 'sparkline' || viewMode === 'combined') && (
              <div className="absolute inset-0 px-3 sm:px-4 py-3 pointer-events-none">
                <svg
                  viewBox="0 0 1000 180"
                  preserveAspectRatio="none"
                  className="w-full h-full overflow-visible"
                >
                  <defs>
                    <linearGradient id="sparkline-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={themeColors.accent} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={themeColors.accent} stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Gradient Area under curve */}
                  {sparklineAreaPath && (
                    <path d={sparklineAreaPath} fill="url(#sparkline-gradient)" />
                  )}

                  {/* Main Bezier Line */}
                  {sparklinePath && (
                    <path
                      d={sparklinePath}
                      fill="none"
                      stroke={themeColors.accent}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#glow)"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Data Points on Curve */}
                  {points.map((pt, i) => {
                    const isHovered = hoveredDay?.dateStr === pt.day.dateStr;
                    const isPeak = stats.peakDay && pt.day.dateStr === stats.peakDay.dateStr && pt.day.frequency > 1;
                    const hasActivity = pt.day.frequency > 0;

                    if (!hasActivity && !isHovered) return null;

                    return (
                      <g key={i}>
                        {isPeak && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="9"
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth="1.5"
                            className="animate-ping opacity-60"
                          />
                        )}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 6 : isPeak ? 5 : 4}
                          fill={isPeak ? '#fbbf24' : isHovered ? '#ffffff' : themeColors.accentLight}
                          stroke="#0f172a"
                          strokeWidth="2"
                          className="transition-all duration-150"
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            {/* 30-Day Bar Columns */}
            <div className="relative z-10 h-36 sm:h-44 flex items-end justify-between gap-[2px] sm:gap-1 pt-2">
              {thirtyDayData.map((d, index) => {
                const maxVal = metricMode === 'frequency' ? stats.maxFrequency : stats.maxAmount;
                const currVal = metricMode === 'frequency' ? d.frequency : d.totalAmount;
                const heightPercent = maxVal > 0 ? (currVal / maxVal) * 100 : 0;
                const hasActivity = d.frequency > 0;
                const isHovered = hoveredDay?.dateStr === d.dateStr;
                const isSelected = selectedDay?.dateStr === d.dateStr;
                const isPeak = stats.peakDay && d.dateStr === stats.peakDay.dateStr && stats.peakDay.frequency > 1;

                return (
                  <div
                    key={d.dateStr}
                    onMouseEnter={() => setHoveredDay(d)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onClick={() => setSelectedDay(selectedDay?.dateStr === d.dateStr ? null : d)}
                    className="flex-1 flex flex-col justify-end items-center h-full group relative cursor-pointer"
                  >
                    {/* Hover vertical beam indicator */}
                    {isHovered && (
                      <div className="absolute inset-y-0 w-full bg-emerald-500/10 rounded-sm pointer-events-none animate-pulse" />
                    )}

                    {/* Bar Pillar */}
                    <div
                      style={{
                        height: `${Math.max(hasActivity ? heightPercent : 4, 4)}%`,
                        opacity: viewMode === 'sparkline' ? (hasActivity ? 0.35 : 0.1) : 1,
                      }}
                      className={`w-full rounded-t-sm transition-all duration-200 relative ${
                        isPeak
                          ? 'bg-gradient-to-t from-amber-600 via-amber-400 to-yellow-200 shadow-[0_0_12px_rgba(251,191,36,0.6)] ring-1 ring-amber-300'
                          : hasActivity
                          ? isHovered || isSelected
                            ? 'bg-gradient-to-t from-emerald-400 to-teal-100 shadow-[0_0_10px_rgba(52,211,153,0.8)] scale-y-[1.03]'
                            : 'bg-gradient-to-t from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-teal-300 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                          : 'bg-slate-800/40 hover:bg-slate-700/60 border-t border-slate-700/40'
                      }`}
                    >
                      {/* Peak indicator crown */}
                      {isPeak && hasActivity && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold text-amber-300 pointer-events-none">
                          ★
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis Date Tick Labels */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-800/80 mt-1">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span>{thirtyDayData[0]?.dayLabel} (-30d)</span>
              </span>
              <span className="hidden sm:inline-block text-slate-500">
                {thirtyDayData[9]?.dayLabel} (-20d)
              </span>
              <span className="text-slate-500">
                {thirtyDayData[19]?.dayLabel} (-10d)
              </span>
              <span className="flex items-center gap-1 font-bold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Today ({thirtyDayData[29]?.dayLabel})</span>
              </span>
            </div>
          </div>

          {/* Interactive Day Inspector Card */}
          {currentInspectDay && (
            <div className="mt-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${currentInspectDay.frequency > 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}`}>
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{currentInspectDay.weekday}, {currentInspectDay.dayLabel}, {currentInspectDay.dateStr.slice(0, 4)}</span>
                    {currentInspectDay.isToday && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {currentInspectDay.frequency === 0 ? (
                      'No cash withdrawals recorded on this date.'
                    ) : (
                      <span>
                        <strong className="text-emerald-300">{currentInspectDay.frequency} cash withdrawal{currentInspectDay.frequency > 1 ? 's' : ''}</strong>
                        {' · '}
                        Total dispensed: <strong className="text-white">${currentInspectDay.totalAmount.toFixed(2)}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Breakdown of transactions for that day */}
              {currentInspectDay.withdrawals.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 sm:max-w-md sm:justify-end">
                  {currentInspectDay.withdrawals.map((tx) => (
                    <div
                      key={tx.id}
                      className="px-2 py-1 rounded bg-slate-900 border border-emerald-500/30 text-[11px] text-slate-300 flex items-center gap-1.5"
                    >
                      <span className="text-emerald-400 font-bold">${tx.amount}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[130px]">{tx.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic">
                  ATM ready for dispense
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
