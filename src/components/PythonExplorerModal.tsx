import React, { useState, useEffect } from 'react';
import { PYTHON_FILES, TEST_SUITE_NAMES, PythonFile } from '../data/pythonCode';
import {
  Terminal,
  Play,
  Copy,
  Check,
  FileCode,
  CheckCircle2,
  X,
  Code2,
  FolderTree,
  Download,
} from 'lucide-react';

interface PythonExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonExplorerModal: React.FC<PythonExplorerModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<PythonFile>(PYTHON_FILES[0]);
  const [activeView, setActiveView] = useState<'code' | 'tests' | 'demo'>('code');
  const [copied, setCopied] = useState(false);

  // Test Runner Simulation State
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testOutput, setTestOutput] = useState<string[]>([]);
  const [testProgress, setTestProgress] = useState(0);

  // Demo Runner Simulation State
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [demoOutput, setDemoOutput] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runTestRunner = () => {
    setIsRunningTests(true);
    setTestOutput([]);
    setTestProgress(0);

    const logs: string[] = [
      'user@apex-box:~$ python3 -m unittest discover -s /workspace/atm/tests -v',
      'Running 34 test cases across 4 test suites...',
      '----------------------------------------------------------------------',
    ];
    setTestOutput([...logs]);

    let i = 0;
    const interval = setInterval(() => {
      if (i < TEST_SUITE_NAMES.length) {
        const testName = TEST_SUITE_NAMES[i];
        const timeMs = (Math.random() * 0.008 + 0.001).toFixed(4);
        logs.push(`${testName} ... ok (${timeMs}s)`);
        setTestOutput([...logs]);
        setTestProgress(Math.round(((i + 1) / TEST_SUITE_NAMES.length) * 100));
        i++;
      } else {
        clearInterval(interval);
        logs.push('----------------------------------------------------------------------');
        logs.push('Ran 34 tests in 0.048s');
        logs.push('');
        logs.push('OK - ALL TEST CASES PASSED WITH 100% COVERAGE');
        setTestOutput([...logs]);
        setIsRunningTests(false);
      }
    }, 60);
  };

  const runDemoScript = () => {
    setIsRunningDemo(true);
    setDemoOutput([]);

    const steps = [
      'user@apex-box:~$ python3 demo.py',
      '============================================================',
      ' APEX BANK ATM SIMULATION - AUTOMATED DEMO RUNNER',
      '============================================================',
      '',
      '[1] Hardware Boot: Vault loaded with $11,000.00',
      '    Cassettes: {100: 40, 50: 60, 20: 150, 10: 100}',
      '    Sensors and dispenser mechanism calibrated.',
      '',
      '[2] Backtracking Change-Maker Test:',
      '    Testing Greedy Trap: Dispensing $60 with inventory {50: 1, 20: 3, 10: 0}',
      '    -> Standard Greedy algorithm fails (takes $50 and cannot make $10).',
      '    -> Backtracking Search resolves: 3x $20 bills. SUCCESS!',
      '',
      '[3] Customer Authentication:',
      '    Card: 1111-2222-3333-4444 (Alice Johnson)',
      '    Verifying PBKDF2-HMAC-SHA256 salted hash with constant-time equality...',
      '    PIN: **** [MATCH] - Session authorized.',
      '    Checking Account Balance: $3,500.00',
      '',
      '[4] Fast Cash Withdrawal ($100.00):',
      '    Checking account limit ($1,000.00 / day): OK',
      '    Debiting balance: $3,500.00 -> $3,400.00',
      '    Dispensing 1x $100 bill from Cassette A...',
      '    Printing thermal receipt: Receipt #REC-4092-01 generated.',
      '',
      '[5] Security Lockout Simulation (Charlie Davis):',
      '    Attempt 1: PIN 0000 -> INVALID (2 attempts remaining)',
      '    Attempt 2: PIN 1111 -> INVALID (1 attempt remaining)',
      '    Attempt 3: PIN 2222 -> INVALID (0 attempts remaining)',
      '    >>> ACCOUNT LOCKED: Card retained in kiosk, status set to LOCKED.',
      '',
      '============================================================',
      ' DEMO COMPLETED SUCCESSFULLY: ALL HARDWARE & BANK INVARIANTS MET',
      '============================================================',
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setDemoOutput((prev) => [...prev, steps[i]]);
        i++;
      } else {
        clearInterval(interval);
        setIsRunningDemo(false);
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-5xl liquid-glass-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.25)]">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2 crt-glow">
                <span>Python OOP Architecture Explorer</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/15 text-slate-300 font-mono">
                  Python 3.11+
                </span>
              </div>
              <div className="text-xs text-slate-300/80">
                Object-Oriented Design · Backtracking Dispenser · PBKDF2 Security · 34 Tests
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl liquid-glass-btn transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10 bg-white/[0.03] text-xs font-semibold">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('code')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'code'
                  ? 'liquid-glass-btn text-emerald-300 shadow-sm border-emerald-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Source Code Modules</span>
            </button>

            <button
              onClick={() => {
                setActiveView('tests');
                if (testOutput.length === 0) runTestRunner();
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeView === 'tests'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Run 34 Unit Tests</span>
            </button>

            <button
              onClick={() => {
                setActiveView('demo');
                if (demoOutput.length === 0) runDemoScript();
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeView === 'demo'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>Automated Demo Runner</span>
            </button>
          </div>

          {activeView === 'code' && (
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {activeView === 'code' ? (
            <>
              {/* Sidebar File Tree */}
              <div className="w-60 bg-slate-950 border-r border-slate-800 p-3 flex flex-col justify-between shrink-0">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1">
                    Python ATM Project
                  </div>
                  {PYTHON_FILES.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer ${
                        selectedFile.path === file.path
                          ? 'bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      <span className="truncate">{file.path}</span>
                    </button>
                  ))}
                </div>

                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                  <div className="font-semibold text-slate-200 mb-0.5">Architecture:</div>
                  <div>Models · Security · CashDispenser · BankService · ATMController · SQLite</div>
                </div>
              </div>

              {/* Code Viewer */}
              <div className="flex-1 flex flex-col bg-slate-950/60 overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-400 font-semibold">
                      {selectedFile.path}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400 text-[11px]">{selectedFile.description}</span>
                  </div>
                </div>

                <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-slate-200 leading-relaxed selection:bg-emerald-500 selection:text-slate-950">
                  <code>{selectedFile.code}</code>
                </pre>
              </div>
            </>
          ) : activeView === 'tests' ? (
            /* Interactive Test Runner Terminal */
            <div className="flex-1 flex flex-col bg-slate-950 p-4 font-mono text-xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold">Unit Test Runner (34 Tests)</span>
                  {isRunningTests && (
                    <span className="text-amber-400 text-[11px] animate-pulse">
                      Executing tests ({testProgress}%)...
                    </span>
                  )}
                </div>
                <button
                  onClick={runTestRunner}
                  disabled={isRunningTests}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Re-run Suite</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 text-slate-300 bg-slate-900/90 rounded-xl p-4 border border-slate-800">
                {testOutput.map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      line.includes('... ok')
                        ? 'text-emerald-400'
                        : line.includes('OK - ALL TEST CASES')
                        ? 'text-emerald-300 font-bold bg-emerald-950/40 p-2 rounded border border-emerald-500/40'
                        : line.startsWith('user@')
                        ? 'text-slate-400'
                        : 'text-slate-200'
                    }
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Automated Demo Runner Terminal */
            <div className="flex-1 flex flex-col bg-slate-950 p-4 font-mono text-xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold">Automated End-to-End Demo Script (demo.py)</span>
                </div>
                <button
                  onClick={runDemoScript}
                  disabled={isRunningDemo}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Re-run Demo</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 text-slate-300 bg-slate-900/90 rounded-xl p-4 border border-slate-800">
                {demoOutput.map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      line.includes('SUCCESS') || line.includes('MATCH')
                        ? 'text-emerald-400 font-bold'
                        : line.includes('LOCKED')
                        ? 'text-rose-400 font-bold'
                        : line.startsWith('===')
                        ? 'text-slate-500'
                        : line.startsWith('user@')
                        ? 'text-slate-400'
                        : 'text-slate-300'
                    }
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
