import React, { useState, useMemo, useEffect } from 'react';
import { Banknote, Hand, CheckCircle2, Cog, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSuccessChime, playKeypadBeep } from '../utils/audio';
import { CurrencyCode, CURRENCY_CONFIGS } from '../types/currency';
import { formatCurrencyAmount } from '../utils/currency';

interface CashDispenserSlotProps {
  dispensedBills: { [denom: number]: number } | null;
  totalAmount: number;
  isOpen: boolean;
  onTakeCash: () => void;
  currency?: CurrencyCode;
}

export const CashDispenserSlot: React.FC<CashDispenserSlotProps> = ({
  dispensedBills,
  totalAmount,
  isOpen,
  onTakeCash,
  currency = 'USD',
}) => {
  const config = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.USD;
  const formattedTotal = formatCurrencyAmount(totalAmount, currency);

  // Transient feedback banner when user plucks the money from the tray
  const [retrievedNotice, setRetrievedNotice] = useState<string | null>(null);

  // Clear notice after delay
  useEffect(() => {
    if (retrievedNotice) {
      const timer = setTimeout(() => setRetrievedNotice(null), 2400);
      return () => clearTimeout(timer);
    }
  }, [retrievedNotice]);

  // Construct individual physical bills for layered tactile fanning
  const visualNotes = useMemo(() => {
    if (!dispensedBills) return [];
    const notes: { denom: number; id: string; serial: string }[] = [];
    const entries = Object.entries(dispensedBills)
      .map(([d, c]) => ({ denom: Number(d), count: c }))
      .sort((a, b) => b.denom - a.denom);

    let countAdded = 0;
    for (const item of entries) {
      for (let i = 0; i < item.count; i++) {
        const serialSuffix = (1000 + (countAdded * 173 + item.denom) % 8999).toString();
        notes.push({
          denom: item.denom,
          id: `${item.denom}-${i}`,
          serial: `${config.code.slice(0, 2)}${serialSuffix}K`,
        });
        countAdded++;
        if (countAdded >= 5) break; // Max 5 visual layers for clean realism
      }
      if (countAdded >= 5) break;
    }
    return notes;
  }, [dispensedBills, config.code]);

  const handleCollect = () => {
    playSuccessChime();
    setRetrievedNotice(`${formattedTotal} ${config.code}`);
    onTakeCash();
  };

  const hasCash = Boolean(dispensedBills);

  return (
    <div className="liquid-glass-panel rounded-2xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden">
      {/* Top Header & Telemetry Status */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <motion.div
            animate={isOpen ? { rotate: [0, 180, 360] } : { rotate: 0 }}
            transition={{ repeat: isOpen ? Infinity : 0, duration: 1.2, ease: 'linear' }}
          >
            <Banknote className="w-4 h-4 text-emerald-400" />
          </motion.div>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
            Cash Dispenser Tray ({config.code} {config.flag})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <motion.span
            animate={
              hasCash
                ? { scale: [1, 1.35, 1], opacity: [1, 0.7, 1] }
                : isOpen
                ? { scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }
                : { scale: 1, opacity: 0.5 }
            }
            transition={{ repeat: Infinity, duration: hasCash ? 0.9 : 1.5 }}
            className={`w-2 h-2 rounded-full ${
              hasCash
                ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]'
                : isOpen
                ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                : 'bg-slate-600'
            }`}
          />
          <span className="text-[10px] font-mono text-slate-300">
            {hasCash
              ? `${config.code} CASH READY`
              : isOpen
              ? 'DISPENSING...'
              : 'SHUTTER CLOSED'}
          </span>
        </div>
      </div>

      {/* Physical Dispenser Motorized Shutter Box */}
      <div className="relative py-1">
        <div className="w-full h-28 liquid-glass-inset rounded-xl relative flex flex-col items-center justify-center overflow-hidden border border-white/10 shadow-inner">
          {/* Fiber-optic ambient LED rim */}
          <motion.div
            animate={{
              opacity: hasCash ? [0.6, 1, 0.6] : isOpen ? [0.4, 0.8, 0.4] : 0.2,
            }}
            transition={{ repeat: Infinity, duration: hasCash ? 1.0 : 1.8 }}
            className={`absolute inset-x-2 top-1 h-0.5 rounded-full z-20 ${
              hasCash
                ? 'bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.9)]'
                : isOpen
                ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]'
                : 'bg-emerald-500/20'
            }`}
          />

          {/* Motorized Feed Rollers Window (active during dispense) */}
          <div className="absolute top-2 inset-x-8 flex justify-between px-4 pointer-events-none z-10">
            <motion.div
              animate={isOpen ? { rotate: 360 } : { rotate: 0 }}
              transition={{ repeat: isOpen ? Infinity : 0, duration: 0.45, ease: 'linear' }}
              className="w-4 h-4 rounded-full border border-slate-600/70 bg-slate-800/90 flex items-center justify-center shadow-md"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <div className="absolute w-3.5 h-0.5 bg-slate-500/60 rounded" />
            </motion.div>
            <div className="text-[9px] font-mono text-slate-500/70 uppercase tracking-widest pt-0.5 flex items-center gap-1">
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                  className="text-amber-400 font-bold"
                >
                  ◀ MECHANICAL ROLLERS ACTIVE ▶
                </motion.span>
              )}
            </div>
            <motion.div
              animate={isOpen ? { rotate: -360 } : { rotate: 0 }}
              transition={{ repeat: isOpen ? Infinity : 0, duration: 0.45, ease: 'linear' }}
              className="w-4 h-4 rounded-full border border-slate-600/70 bg-slate-800/90 flex items-center justify-center shadow-md"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <div className="absolute w-3.5 h-0.5 bg-slate-500/60 rounded" />
            </motion.div>
          </div>

          {/* Motorized Shutter Door */}
          <motion.div
            initial={false}
            animate={{
              y: isOpen || hasCash ? -34 : 0,
              opacity: isOpen || hasCash ? 0.25 : 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 240,
              damping: 22,
            }}
            className="absolute inset-x-2 top-1.5 h-7 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 rounded-t-lg border-b-2 border-white/20 shadow-lg flex items-center justify-between px-3 z-30 pointer-events-none"
          >
            {/* Shutter mechanical ribs */}
            <div className="flex gap-1.5 opacity-60">
              <span className="w-1.5 h-3 bg-slate-600 rounded-xs" />
              <span className="w-1.5 h-3 bg-slate-600 rounded-xs" />
              <span className="w-1.5 h-3 bg-slate-600 rounded-xs" />
            </div>
            <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              SAFETY SHUTTER
            </span>
            <div className="flex gap-1.5 opacity-60">
              <span className="w-1.5 h-3 bg-slate-600 rounded-xs" />
              <span className="w-1.5 h-3 bg-slate-600 rounded-xs" />
              <span className="w-1.5 h-3 bg-slate-600 rounded-xs" />
            </div>
          </motion.div>

          {/* Tray Cavity Interior */}
          <div className="w-full h-full flex flex-col items-center justify-center relative p-2">
            <AnimatePresence mode="wait">
              {hasCash ? (
                /* Tactile Multi-Banknote Layered Emergence */
                <motion.button
                  key="cash-stack"
                  initial={{ y: 40, scale: 0.85, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  exit={{
                    y: -65,
                    scale: 0.92,
                    opacity: 0,
                    transition: { duration: 0.28, ease: 'easeOut' },
                  }}
                  whileHover={{ y: -4, scale: 1.025 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{
                    type: 'spring',
                    stiffness: 220,
                    damping: 18,
                  }}
                  onClick={handleCollect}
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer group focus:outline-none z-20"
                  title={`Click or tap to collect ${formattedTotal} in ${config.name}`}
                >
                  <div className="relative flex items-center justify-center w-full max-w-[240px] h-14">
                    {/* Render layered background notes for physical volume */}
                    {visualNotes.slice(0, -1).map((note, idx) => {
                      const spreadRot = (idx - 1) * 2.2;
                      const spreadY = -((visualNotes.length - 1 - idx) * 3);
                      return (
                        <motion.div
                          key={note.id}
                          initial={{ y: 30, opacity: 0 }}
                          animate={{ y: spreadY, opacity: 0.75, rotate: spreadRot }}
                          transition={{ delay: idx * 0.05, duration: 0.3 }}
                          className={`absolute w-52 h-11 rounded-lg border shadow-md flex items-center justify-between px-3 font-mono text-xs ${config.billColor.bg} ${config.billColor.border} ${config.billColor.text} pointer-events-none`}
                        >
                          <span className="font-bold text-xs">{config.symbol}{note.denom}</span>
                          <span className="text-[9px] uppercase tracking-wider opacity-60">
                            {config.centralBank}
                          </span>
                          <span className="font-bold text-xs">{config.symbol}{note.denom}</span>
                        </motion.div>
                      );
                    })}

                    {/* Front Master Banknote with Realistic Security Foil & Details */}
                    {visualNotes.length > 0 && (
                      <motion.div
                        className={`relative w-54 h-12 bg-gradient-to-r ${config.billColor.gradient} border-2 ${config.billColor.border} rounded-lg shadow-2xl flex items-center justify-between px-3 text-white font-mono text-xs overflow-hidden`}
                        style={{
                          transform: `rotate(${visualNotes.length % 2 === 0 ? '1.2deg' : '-1deg'})`,
                        }}
                      >
                        {/* Animated Holographic Security Sheen Shimmer */}
                        <motion.div
                          animate={{
                            x: ['-120%', '240%'],
                          }}
                          transition={{
                            repeat: Infinity,
                            repeatDelay: 2.2,
                            duration: 1.1,
                            ease: 'easeInOut',
                          }}
                          className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] pointer-events-none"
                        />

                        {/* Left Note Denomination Stamp */}
                        <div className="flex flex-col items-start leading-none z-10">
                          <span className="font-black text-sm sm:text-base drop-shadow">
                            {config.symbol}
                            {visualNotes[visualNotes.length - 1].denom}
                          </span>
                          <span className="text-[7.5px] opacity-75 font-mono">
                            {visualNotes[visualNotes.length - 1].serial}
                          </span>
                        </div>

                        {/* Center Intaglio & Breakdown Badge */}
                        <div className="text-[10px] text-center leading-tight z-10 px-1">
                          <div className="font-bold text-[11px] flex items-center justify-center gap-1">
                            <span className="text-amber-300 drop-shadow font-black">
                              {formattedTotal}
                            </span>
                            <span className="text-[8.5px] px-1 py-0.2 rounded bg-black/50 text-emerald-300 font-bold border border-white/10">
                              {config.code}
                            </span>
                          </div>
                          <div className="text-[8.5px] opacity-90 truncate max-w-[130px] font-mono text-slate-200">
                            {Object.entries(dispensedBills || {})
                              .map(([d, c]) => `${c}x${config.symbol}${d}`)
                              .join(' ')}
                          </div>
                        </div>

                        {/* Right Note Denomination Stamp */}
                        <div className="flex flex-col items-end leading-none z-10">
                          <span className="font-black text-sm sm:text-base drop-shadow">
                            {config.symbol}
                            {visualNotes[visualNotes.length - 1].denom}
                          </span>
                          <span className="text-[7.5px] text-amber-300 uppercase tracking-widest">
                            VALID
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Tactile Pulsing Hand Guide Button */}
                  <motion.div
                    animate={{
                      y: [0, -3, 0],
                      scale: [1, 1.03, 1],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.1,
                      ease: 'easeInOut',
                    }}
                    className="mt-1 text-[11px] font-bold text-amber-300 group-hover:text-amber-200 flex items-center gap-1.5 drop-shadow"
                  >
                    <Hand className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      CLICK TO TAKE CASH ({formattedTotal})
                    </span>
                  </motion.div>
                </motion.button>
              ) : retrievedNotice ? (
                /* Floating Collection Confirmation */
                <motion.div
                  key="retrieved"
                  initial={{ scale: 0.8, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex flex-col items-center justify-center text-center p-2"
                >
                  <div className="inline-flex items-center gap-1.5 text-emerald-300 font-bold text-xs bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full shadow-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Retrieved: {retrievedNotice}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1">
                    Safe closure in progress...
                  </span>
                </motion.div>
              ) : (
                /* Idle closed tray */
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-[10px] text-slate-500 font-mono flex flex-col items-center gap-1"
                >
                  <div className="w-24 h-0.5 bg-slate-700/40 rounded-full" />
                  <span>[ MOTORIZED DISPENSER SHUTTER CLOSED ]</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom Sub-Telemetry */}
      <div className="text-[10px] text-slate-400 text-center mt-1.5 flex items-center justify-center gap-2">
        <span className="flex items-center gap-1">
          <Cog className={`w-3 h-3 ${isOpen ? 'animate-spin text-amber-400' : 'text-slate-500'}`} />
          <span>Vault Dispenser</span>
        </span>
        <span>·</span>
        <span className="text-emerald-400 font-semibold">{config.name} Cassettes Ready</span>
      </div>
    </div>
  );
};
