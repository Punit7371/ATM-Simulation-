import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { motion } from 'framer-motion';
import { ShieldCheck, RefreshCw, Smartphone, QrCode } from 'lucide-react';

interface QRCodeDisplayProps {
  payload: string;
  sessionId: string;
  size?: number;
  status: 'READY' | 'SCANNED' | 'AUTHORIZING' | 'SUCCESS' | 'EXPIRED';
  countdown: number;
  maxCountdown: number;
  onRefresh?: () => void;
  onOpenMobile?: () => void;
  accentColor?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  payload,
  sessionId,
  size = 210,
  status,
  countdown,
  maxCountdown,
  onRefresh,
  onOpenMobile,
  accentColor = '#10b981', // emerald-500
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(payload, {
      width: size * 2,
      margin: 1,
      color: {
        dark: '#022c22', // deep emerald-950 dark modules
        light: '#ffffff', // bright crisp white background
      },
      errorCorrectionLevel: 'H', // High error correction so center logo doesn't disrupt reading
    })
      .then((url) => {
        if (isMounted) setDataUrl(url);
      })
      .catch((err) => console.error('Error generating QR Code', err));

    return () => {
      isMounted = false;
    };
  }, [payload, size]);

  const percentLeft = Math.max(0, Math.min(100, (countdown / maxCountdown) * 100));

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Outer Glow & Reticle Frame */}
      <div className="relative p-3.5 rounded-3xl bg-slate-950/80 border-2 border-emerald-500/40 shadow-[0_0_35px_rgba(16,185,129,0.25)] flex flex-col items-center">
        {/* Reticle Corner Brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm pointer-events-none" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-sm pointer-events-none" />

        {/* QR Code Canvas Frame */}
        <div
          className="relative bg-white p-2.5 rounded-2xl shadow-inner overflow-hidden flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="ATM Authorization QR Code"
              className="w-full h-full object-contain select-none"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-emerald-800">
              <QrCode className="w-12 h-12 animate-pulse" />
            </div>
          )}

          {/* Central ApexBank Security Seal in center of QR */}
          <div className="absolute inset-0 m-auto w-11 h-11 rounded-xl bg-slate-950 border-2 border-emerald-400 shadow-xl flex items-center justify-center p-1 pointer-events-none">
            <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-700 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-inner">
              <span className="tracking-tighter">A</span>
            </div>
          </div>

          {/* Laser Sweep Animation when Ready or Authorizing */}
          {status !== 'EXPIRED' && status !== 'SUCCESS' && (
            <motion.div
              animate={{
                y: [-size / 2 + 10, size / 2 - 10],
              }}
              transition={{
                repeat: Infinity,
                repeatType: 'reverse',
                duration: status === 'AUTHORIZING' ? 0.7 : 1.6,
                ease: 'easeInOut',
              }}
              className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,1)] pointer-events-none"
            />
          )}

          {/* Scanned / Authorizing Overlay */}
          {status === 'SCANNED' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-cyan-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center pointer-events-none"
            >
              <Smartphone className="w-8 h-8 text-cyan-300 animate-bounce mb-1" />
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                Mobile Scanned!
              </span>
              <span className="text-[9.5px] text-cyan-300/90 font-mono">
                Device Handshake Active
              </span>
            </motion.div>
          )}

          {status === 'AUTHORIZING' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-emerald-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center pointer-events-none"
            >
              <RefreshCw className="w-8 h-8 text-amber-300 animate-spin mb-1" />
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                Authorizing...
              </span>
              <span className="text-[9.5px] text-amber-200/90 font-mono">
                Verifying Biometric Token
              </span>
            </motion.div>
          )}

          {status === 'EXPIRED' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
                Token Expired
              </span>
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold cursor-pointer shadow-md flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Generate New</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Token ID & Session Status */}
        <div className="mt-2.5 w-full flex items-center justify-between text-[10px] font-mono text-slate-300 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-300 font-semibold">{sessionId}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={countdown <= 20 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
              ⏱ {countdown}s
            </span>
          </div>
        </div>

        {/* Countdown Progress Line */}
        <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mt-1.5">
          <motion.div
            className={`h-full ${
              countdown <= 20
                ? 'bg-rose-500'
                : countdown <= 50
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
            style={{ width: `${percentLeft}%` }}
            transition={{ ease: 'linear', duration: 0.5 }}
          />
        </div>
      </div>

      {/* Quick Mobile Device Simulator Invite Pill */}
      {onOpenMobile && (
        <button
          type="button"
          onClick={onOpenMobile}
          className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-600/30 via-emerald-600/30 to-teal-600/30 border border-cyan-400/50 hover:border-cyan-300 text-cyan-200 hover:text-white text-xs font-semibold cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all hover:scale-[1.02] group"
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400 group-hover:animate-pulse" />
          <span>Open Virtual Mobile Device Simulator</span>
          <span className="text-[10px] bg-cyan-400/20 text-cyan-300 px-1.5 py-0.2 rounded font-mono">
            LIVE SYNC
          </span>
        </button>
      )}
    </div>
  );
};
