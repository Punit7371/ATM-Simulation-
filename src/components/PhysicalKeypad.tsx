import React, { useEffect, useState } from 'react';
import { playKeypadBeep } from '../utils/audio';

interface PhysicalKeypadProps {
  onNumberPress: (digit: string) => void;
  onClear: () => void;
  onCancel: () => void;
  onEnter: () => void;
  disabled?: boolean;
}

export const PhysicalKeypad: React.FC<PhysicalKeypadProps> = ({
  onNumberPress,
  onClear,
  onCancel,
  onEnter,
  disabled = false,
}) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const handleKeyPress = (key: string) => {
    if (disabled) return;
    setActiveKey(key);
    setTimeout(() => setActiveKey(null), 120);

    if (key >= '0' && key <= '9') {
      playKeypadBeep(1000 + parseInt(key, 10) * 40);
      onNumberPress(key);
    } else if (key === 'CANCEL') {
      playKeypadBeep(450);
      onCancel();
    } else if (key === 'CLEAR') {
      playKeypadBeep(650);
      onClear();
    } else if (key === 'ENTER') {
      playKeypadBeep(1200);
      onEnter();
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      // Don't intercept if user is typing inside an active HTML input field
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleKeyPress('ENTER');
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleKeyPress('CLEAR');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleKeyPress('CANCEL');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onNumberPress, onClear, onCancel, onEnter]);

  return (
    <div className="liquid-glass-panel p-4 sm:p-5 rounded-2xl max-w-sm mx-auto select-none relative overflow-hidden">
      <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-slate-300 border-b border-white/10 pb-1.5 px-1">
        <span className="tracking-wider">ENCRYPTED PIN PAD (EPP)</span>
        <span className="text-emerald-400 font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          PCI-PTS LIQUID GLASS
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {/* Row 1 */}
        <button
          onClick={() => handleKeyPress('1')}
          className={`keypad-glass-num h-12 rounded-xl text-white font-mono font-bold text-lg cursor-pointer ${
            activeKey === '1' ? 'brightness-150 translate-y-1' : ''
          }`}
        >
          1
        </button>
        <button
          onClick={() => handleKeyPress('2')}
          className={`keypad-glass-num h-12 rounded-xl text-white font-mono font-bold text-lg cursor-pointer ${
            activeKey === '2' ? 'brightness-150 translate-y-1' : ''
          }`}
        >
          2
        </button>
        <button
          onClick={() => handleKeyPress('3')}
          className={`keypad-glass-num h-12 rounded-xl text-white font-mono font-bold text-lg cursor-pointer ${
            activeKey === '3' ? 'brightness-150 translate-y-1' : ''
          }`}
        >
          3
        </button>
        <button
          onClick={() => handleKeyPress('CANCEL')}
          className={`keypad-glass-cancel h-12 rounded-xl text-rose-100 font-bold text-xs cursor-pointer flex flex-col items-center justify-center ${
            activeKey === 'CANCEL' ? 'brightness-150 translate-y-1' : ''
          }`}
        >
          <span>CANCEL</span>
          <span className="text-[9px] opacity-80">✕</span>
        </button>

        {/* Row 2 */}
        <button
          onClick={() => handleKeyPress('4')}
          className={`keypad-glass-num h-12 rounded-xl text-white font-mono font-bold text-lg cursor-pointer ${
            activeKey === '4' ? 'brightness-150 translate-y-1' : ''
          }`}
        >
          4
        </button>
        <button
          onClick={() => handleKeyPress('5')}
          className={`keypad-glass-num h-12 rounded-xl text-white font-mono font-bold text-lg cursor-pointer relative ${
            activeKey === '5' ? 'brightness-150 translate-y-1' : ''
          }`}
        >
          5
          {/* Tactile Braille Dot */}
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
        </button>
        <button
          onClick={() => handleKeyPress('6')}
          className={`keypad-glass-num h-12 rounded-xl text-white font-mono font-bold text-lg cursor-pointer ${
            activeKey === '6' ? 'brightness-150 translate-y-1' : ''
          }`}
        >
          6
        </button>
        <button
          onClick={() => handleKeyPress('CLEAR')}
          className={`keypad-glass-clear h-12 rounded-xl text-amber-100 font-bold text-xs cursor-pointer flex flex-col items-center justify-center ${
            activeKey === 'CLEAR' ? 'brightness-150 translate-y-1' : ''
          }`}
        >
          <span>CLEAR</span>
          <span className="text-[9px] opacity-80">⌫</span>
        </button>

        {/* Row 3 */}
        <button
          onClick={() => handleKeyPress('7')}
          className={`keypad-glass-num h-12 rounded-xl text-white font-mono font-bold text-lg cursor-pointer ${
            activeKey === '7' ? 'brightness-150 translate-y-1' : ''
          }`}
        >
          7
        </button>
        <button
          onClick={() => handleKeyPress('8')}
          className={`keypad-glass-num h-12 rounded-xl text-white font-mono font-bold text-lg cursor-pointer ${
            activeKey === '8' ? 'brightness-150 translate-y-1' : ''
          }`}
        >
          8
        </button>
        <button
          onClick={() => handleKeyPress('9')}
          className={`keypad-glass-num h-12 rounded-xl text-white font-mono font-bold text-lg cursor-pointer ${
            activeKey === '9' ? 'brightness-150 translate-y-1' : ''
          }`}
        >
          9
        </button>
        <button
          onClick={() => handleKeyPress('ENTER')}
          className={`keypad-glass-enter h-12 rounded-xl text-emerald-100 font-bold text-xs cursor-pointer flex flex-col items-center justify-center ${
            activeKey === 'ENTER' ? 'brightness-150 translate-y-1' : ''
          }`}
        >
          <span>ENTER</span>
          <span className="text-[9px] opacity-80">↵</span>
        </button>

        {/* Row 4 */}
        <div className="keypad-glass-num h-12 rounded-xl opacity-30 cursor-not-allowed flex items-center justify-center text-slate-400 font-bold">
          *
        </div>
        <button
          onClick={() => handleKeyPress('0')}
          className={`keypad-glass-num h-12 rounded-xl text-white font-mono font-bold text-lg cursor-pointer ${
            activeKey === '0' ? 'brightness-150 translate-y-1' : ''
          }`}
        >
          0
        </button>
        <div className="keypad-glass-num h-12 rounded-xl opacity-30 cursor-not-allowed flex items-center justify-center text-slate-400 font-bold">
          #
        </div>
        <div className="keypad-glass-num h-12 rounded-xl opacity-20 cursor-not-allowed" />
      </div>

      <div className="text-[10px] text-slate-400 text-center mt-3">
        Physical Keyboard Supported: Numbers [0-9] · Enter [↵] · Clear [Backspace] · Cancel [Esc]
      </div>
    </div>
  );
};
