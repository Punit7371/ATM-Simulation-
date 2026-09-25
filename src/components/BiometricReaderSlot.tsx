import React, { useState } from 'react';
import { Fingerprint, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playBiometricScanSound, playBiometricSuccessSound } from '../utils/audio';

interface BiometricReaderSlotProps {
  isScanningActive: boolean;
  onScanComplete: () => void;
  cardholderName?: string;
}

export const BiometricReaderSlot: React.FC<BiometricReaderSlotProps> = ({
  isScanningActive,
  onScanComplete,
  cardholderName,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isMatched, setIsMatched] = useState(false);

  const handleTriggerScan = () => {
    if (!isScanningActive || isScanning || isMatched) return;

    setIsScanning(true);
    setScanProgress(0);
    playBiometricScanSound();

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setIsMatched(true);
          playBiometricSuccessSound();
          setTimeout(() => {
            onScanComplete();
            setIsMatched(false);
            setScanProgress(0);
          }, 800);
          return 100;
        }
        return prev + 20;
      });
    }, 180);
  };

  return (
    <div className="liquid-glass-panel rounded-2xl p-3.5 shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Fingerprint
            className={`w-4 h-4 ${
              isScanningActive ? 'text-cyan-400 animate-pulse' : 'text-slate-400'
            }`}
          />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
            Biometric Scanner
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isMatched
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                : isScanning
                ? 'bg-amber-400 animate-ping shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                : isScanningActive
                ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                : 'bg-slate-600'
            }`}
          />
          <span className="text-[10px] font-mono text-slate-300">
            {isMatched
              ? 'VERIFIED'
              : isScanning
              ? 'SCANNING...'
              : isScanningActive
              ? 'AWAITING THUMB'
              : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Optical Scanner Plinth */}
      <div className="flex flex-col items-center justify-center py-1">
        <button
          type="button"
          onClick={handleTriggerScan}
          disabled={!isScanningActive || isScanning || isMatched}
          className={`relative w-24 h-24 rounded-2xl border-2 transition-all flex flex-col items-center justify-center p-2 group cursor-pointer disabled:cursor-not-allowed ${
            isMatched
              ? 'bg-emerald-950/80 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]'
              : isScanning
              ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)]'
              : isScanningActive
              ? 'bg-slate-900/90 border-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:border-cyan-300 hover:scale-105'
              : 'bg-slate-950/60 border-slate-800 opacity-60'
          }`}
          title={
            isScanningActive
              ? 'Click to place thumb on optical scanner'
              : 'Biometric reader standby'
          }
        >
          {/* Circular Optical Scanning Ring */}
          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center">
            {/* Ambient Background Aura */}
            <motion.div
              animate={
                isScanningActive
                  ? {
                      opacity: [0.3, 0.7, 0.3],
                      scale: [0.95, 1.05, 0.95],
                    }
                  : { opacity: 0.1 }
              }
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-tr from-cyan-600/40 via-teal-500/30 to-emerald-400/40 rounded-xl"
            />

            {/* Fingerprint Vector Graphic */}
            <Fingerprint
              className={`w-12 h-12 transition-colors z-10 ${
                isMatched
                  ? 'text-emerald-300'
                  : isScanning
                  ? 'text-cyan-300'
                  : isScanningActive
                  ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]'
                  : 'text-slate-600'
              }`}
            />

            {/* Scanning Laser Beam */}
            {(isScanning || isScanningActive) && !isMatched && (
              <motion.div
                animate={{
                  y: [-30, 30],
                }}
                transition={{
                  repeat: Infinity,
                  repeatType: 'reverse',
                  duration: isScanning ? 0.45 : 1.1,
                  ease: 'easeInOut',
                }}
                className={`absolute inset-x-0 h-0.5 shadow-md pointer-events-none z-20 ${
                  isScanning
                    ? 'bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                    : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]'
                }`}
              />
            )}

            {/* Success Overlay Checkmark */}
            <AnimatePresence>
              {isMatched && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-emerald-900/90 flex items-center justify-center z-30 rounded-xl"
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-300" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Micro Progress Bar inside scanner frame */}
          {isScanning && (
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1.5 border border-cyan-500/40">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${scanProgress}%` }}
                className="h-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)]"
              />
            </div>
          )}
        </button>

        {/* Micro instructions */}
        <div className="text-center mt-2">
          {isMatched ? (
            <span className="text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Identity Confirmed</span>
            </span>
          ) : isScanningActive ? (
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="text-[11px] font-bold text-cyan-300 cursor-pointer"
              onClick={handleTriggerScan}
            >
              Touch Sensor to Scan
            </motion.div>
          ) : (
            <span className="text-[10px] text-slate-500 font-mono">
              Optical Prism · 500 DPI
            </span>
          )}
        </div>
      </div>

      {/* Bottom Sub-label */}
      <div className="text-[10px] text-slate-400 text-center border-t border-white/5 pt-1.5 flex items-center justify-center gap-1.5">
        <span>FIDO2 / Biometric Token</span>
        <span>·</span>
        <span className="text-cyan-400 font-semibold">Live Scanner</span>
      </div>
    </div>
  );
};
