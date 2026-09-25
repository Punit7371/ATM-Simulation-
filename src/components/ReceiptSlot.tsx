import React from 'react';
import { Printer, FileText, ExternalLink } from 'lucide-react';
import { ReceiptData } from '../types/atm';

interface ReceiptSlotProps {
  currentReceipt: ReceiptData | null;
  onOpenReceiptModal: () => void;
  isPrinting?: boolean;
}

export const ReceiptSlot: React.FC<ReceiptSlotProps> = ({
  currentReceipt,
  onOpenReceiptModal,
  isPrinting = false,
}) => {
  return (
    <div className="liquid-glass-panel rounded-2xl p-4 shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Printer className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
            Thermal Receipt Slot
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isPrinting
                ? 'bg-amber-400 animate-ping'
                : currentReceipt
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : 'bg-slate-600'
            }`}
          />
          <span className="text-[10px] font-mono text-slate-300">
            {isPrinting ? 'PRINTING' : currentReceipt ? 'READY' : 'IDLE'}
          </span>
        </div>
      </div>

      {/* Printer slit & protruding receipt paper */}
      <div className="relative py-2">
        <div className="w-full h-6 liquid-glass-inset rounded-lg flex items-center justify-center relative shadow-inner overflow-visible">
          <div className="w-3/4 h-1 bg-black/90 rounded-sm" />

          {/* Paper feeding out */}
          {(currentReceipt || isPrinting) && (
            <button
              onClick={onOpenReceiptModal}
              className="absolute top-2 w-48 bg-amber-50 text-slate-900 rounded-b shadow-2xl p-2 border-x border-b border-amber-200 text-left font-mono text-[9px] cursor-pointer hover:scale-105 transition-all group z-20"
              title="Click to view & tear receipt"
            >
              <div className="text-center font-bold text-[10px] border-b border-dashed border-slate-400 pb-1 mb-1">
                *** APEX BANK RECEIPT ***
              </div>
              <div className="flex justify-between text-[8px] text-slate-600">
                <span>{currentReceipt?.transactionType || 'TRANSACTION'}</span>
                <span>${currentReceipt?.amount ? currentReceipt.amount.toFixed(2) : '0.00'}</span>
              </div>
              <div className="text-center text-[8px] text-emerald-700 font-bold mt-1.5 flex items-center justify-center gap-1">
                <span>TEAR / VIEW</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        {currentReceipt ? (
          <button
            onClick={onOpenReceiptModal}
            className="text-xs text-emerald-300 hover:text-emerald-200 font-semibold underline cursor-pointer transition-colors"
          >
            View / Print Full Thermal Receipt
          </button>
        ) : (
          <span className="text-[10px] text-slate-400 font-mono">
            Receipts print automatically or on demand
          </span>
        )}
      </div>
    </div>
  );
};
