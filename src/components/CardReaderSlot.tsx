import React from 'react';
import { Account } from '../types/atm';
import { CreditCard, ArrowDown, LogOut } from 'lucide-react';
import { maskCardNumber } from '../utils/security';

interface CardReaderSlotProps {
  currentCard: Account | null;
  accounts: Account[];
  onInsertCard: (account: Account) => void;
  onEjectCard: () => void;
  isProcessing?: boolean;
}

export const CardReaderSlot: React.FC<CardReaderSlotProps> = ({
  currentCard,
  accounts,
  onInsertCard,
  onEjectCard,
  isProcessing = false,
}) => {
  return (
    <div className="liquid-glass-panel rounded-2xl p-4 shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
            Motorized Card Reader
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              currentCard ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            }`}
          />
          <span className="text-[10px] font-mono text-slate-300">
            {currentCard ? 'CARD INSERTED' : 'READY'}
          </span>
        </div>
      </div>

      {/* The Physical Card Slot Bezel */}
      <div className="relative py-2">
        <div className="w-full h-8 liquid-glass-inset rounded-lg flex items-center justify-center relative shadow-inner overflow-hidden">
          {/* LED Glow strip */}
          <div
            className={`absolute inset-x-0 h-1 top-0 ${
              currentCard
                ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]'
                : 'bg-emerald-500/40 slot-pulse'
            }`}
          />

          {/* Slot Opening */}
          <div className="w-4/5 h-2 bg-black/90 rounded-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] relative flex items-center justify-center">
            {/* Visual card inserted sticking out */}
            {currentCard && (
              <div className="absolute top-1 w-32 h-14 bg-gradient-to-r from-emerald-900/90 to-slate-900/90 backdrop-blur-md rounded-t-md border-t border-x border-emerald-400/80 shadow-lg -translate-y-6 flex flex-col p-1.5 text-[8px] font-mono text-emerald-200 transition-transform">
                <div className="flex items-center justify-between">
                  <div className="w-3 h-2 bg-amber-400 rounded-sm" />
                  <span className="text-[7px]">CHIP</span>
                </div>
                <div className="mt-1 font-bold text-white truncate">
                  {currentCard.customerName}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Flashing entry arrow when empty */}
        {!currentCard && (
          <div className="flex justify-center mt-1 text-emerald-400 text-xs animate-bounce">
            <ArrowDown className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Card Info or Quick Insertion Deck */}
      <div className="mt-3">
        {currentCard ? (
          <div className="liquid-glass-card rounded-xl p-3 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{currentCard.customerName}</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  ({currentCard.accountType})
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                {maskCardNumber(currentCard.cardNumber)}
              </div>
            </div>
            <button
              onClick={onEjectCard}
              disabled={isProcessing}
              className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/50 rounded-lg text-rose-200 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-all"
              title="Eject Card"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Eject</span>
            </button>
          </div>
        ) : (
          <div>
            <div className="text-[10px] text-slate-300 font-semibold uppercase mb-1.5">
              Insert a customer card:
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => onInsertCard(acc)}
                  className="px-2 py-1.5 liquid-glass-btn text-slate-200 rounded-lg text-xs font-medium cursor-pointer transition-all hover:text-emerald-300 hover:border-emerald-400/50 truncate text-left"
                >
                  <div className="font-semibold truncate">{acc.customerName.split(' ')[0]}</div>
                  <div className="text-[9px] text-emerald-400 font-mono">${acc.balance.toFixed(0)}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
