import React from 'react';
import { ReceiptData } from '../types/atm';
import { X, Printer, Download, Check } from 'lucide-react';
import { CURRENCY_CONFIGS } from '../types/currency';

interface ReceiptModalProps {
  receipt: ReceiptData | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!receipt) return null;

  const isForeign = receipt.currency && receipt.currency !== 'USD';
  const currencySymbol = receipt.currencySymbol || (receipt.currency ? CURRENCY_CONFIGS[receipt.currency]?.symbol : '$') || '$';

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = `
========================================
         APEX TRUST & BANKING
        24/7 ATM TERMINAL #${receipt.terminalId}
========================================
Receipt ID:  ${receipt.receiptId}
Date/Time:   ${receipt.timestamp}
Customer:    ${receipt.customerName}
Card:        ${receipt.maskedCardNumber}
Account:     ${receipt.accountNumber} (${receipt.accountType})
----------------------------------------
TRANSACTION: ${receipt.transactionType}
${
  isForeign
    ? `Dispensed:   ${currencySymbol}${receipt.currencyAmount} ${receipt.currency}
Exchange Rate: 1 USD = ${receipt.exchangeRate} ${receipt.currency}
Account Debit: $${(receipt.baseAmountDebited || receipt.amount || 0).toFixed(2)} USD`
    : receipt.amount !== undefined
    ? `Amount:      $${receipt.amount.toFixed(2)} USD`
    : ''
}
${
  receipt.denominationBreakdown
    ? `Breakdown:   ${Object.entries(receipt.denominationBreakdown)
        .map(([d, c]) => `${c}x ${currencySymbol}${d}`)
        .join(', ')}`
    : ''
}
----------------------------------------
Available Balance:       $${receipt.availableBalance.toFixed(2)} USD
Withdrawn Today:         $${receipt.withdrawnToday.toFixed(2)} USD
Remaining Daily Limit:   $${receipt.remainingDailyLimit.toFixed(2)} USD
========================================
 THANK YOU FOR BANKING WITH APEX TRUST
========================================
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-sm flex flex-col items-center">
        {/* Close Button Floating */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-slate-300 hover:text-white liquid-glass-btn rounded-full cursor-pointer shadow-lg"
          title="Close receipt"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Thermal Paper Receipt */}
        <div className="w-full receipt-paper rounded-lg p-6 font-mono text-slate-800 text-xs shadow-2xl border border-amber-200/80 relative">
          {/* Top Zigzag Pattern */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-100 to-amber-50 border-b border-dashed border-slate-300" />

          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-400 mt-1">
            <div className="font-bold text-sm tracking-wider text-slate-900">
              APEX TRUST & BANKING
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">
              TERMINAL #{receipt.terminalId} · ATM BRANCH 04
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{receipt.timestamp}</div>
          </div>

          {/* Receipt ID and Customer */}
          <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt No:</span>
              <span className="font-bold">{receipt.receiptId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-bold">{receipt.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Card:</span>
              <span>{receipt.maskedCardNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Account:</span>
              <span>
                {receipt.accountNumber} ({receipt.accountType})
              </span>
            </div>
          </div>

          {/* Transaction Core */}
          <div className="py-3 border-b-2 border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between font-bold text-slate-900 text-sm">
              <span>{receipt.transactionType}</span>
              {isForeign ? (
                <span className="text-blue-900">
                  {currencySymbol}{receipt.currencyAmount} {receipt.currency}
                </span>
              ) : (
                receipt.amount !== undefined && <span>${receipt.amount.toFixed(2)}</span>
              )}
            </div>

            {/* Currency conversion disclosure */}
            {isForeign && (
              <div className="bg-slate-100 p-2 rounded text-[10px] text-slate-700 space-y-0.5 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Foreign Cash Dispensed:</span>
                  <span className="font-bold text-slate-900">
                    {currencySymbol}{receipt.currencyAmount} {receipt.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Exchange Rate:</span>
                  <span className="font-mono">1 USD = {receipt.exchangeRate} {receipt.currency}</span>
                </div>
                <div className="flex justify-between font-semibold pt-0.5 border-t border-slate-200">
                  <span className="text-slate-600">Account Debited:</span>
                  <span className="text-slate-900">
                    ${(receipt.baseAmountDebited || receipt.amount || 0).toFixed(2)} USD
                  </span>
                </div>
              </div>
            )}

            {receipt.denominationBreakdown && (
              <div className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded">
                <span className="font-semibold">Notes Dispensed:</span>{' '}
                {Object.entries(receipt.denominationBreakdown)
                  .map(([d, c]) => `${c}x ${currencySymbol}${d}`)
                  .join(', ')}
              </div>
            )}

            {receipt.targetAccount && (
              <div className="text-[10px] text-slate-600">
                <span>Transferred to: </span>
                <span className="font-bold">{receipt.targetAccount}</span>
              </div>
            )}
          </div>

          {/* Balances */}
          <div className="py-3 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
            <div className="flex justify-between font-bold text-slate-900">
              <span>AVAILABLE BALANCE:</span>
              <span>${receipt.availableBalance.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between text-slate-600 text-[10px]">
              <span>Withdrawn Today:</span>
              <span>${receipt.withdrawnToday.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between text-slate-600 text-[10px]">
              <span>Remaining Daily Limit:</span>
              <span>${receipt.remainingDailyLimit.toFixed(2)} USD</span>
            </div>
          </div>

          {/* Barcode & Footer */}
          <div className="pt-3 text-center">
            {/* Fake SVG Barcode */}
            <div className="h-9 w-48 mx-auto flex items-center justify-between px-2 bg-white border border-slate-200 my-1">
              {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 2].map((w, idx) => (
                <div
                  key={idx}
                  className="h-7 bg-slate-900"
                  style={{ width: `${w * 1.5}px` }}
                />
              ))}
            </div>
            <div className="text-[9px] text-slate-500 tracking-widest font-mono">
              *APEX-4092-FX-AUTH*
            </div>
            <div className="text-[10px] font-semibold text-slate-700 mt-2">
              THANK YOU FOR BANKING WITH US
            </div>
            <div className="text-[8px] text-slate-400 mt-0.5">
              Retain receipt for your personal records
            </div>
          </div>
        </div>

        {/* Action Buttons Below Receipt */}
        <div className="flex items-center gap-2 mt-4 w-full justify-center">
          <button
            onClick={handleCopyText}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
