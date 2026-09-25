/**
 * Web Audio API synthesizer for realistic ATM tactile and mechanical sounds.
 * Generates pure synthesizer audio without needing external mp3 files.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

/** Crisp tactile keypad beep */
export function playKeypadBeep(freq = 1100): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

/** Card insertion motor sound */
export function playCardInsertSound(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    // Low mechanical motor hum
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(180, t + 0.25);
    osc.frequency.linearRampToValueAtTime(90, t + 0.35);

    gain.gain.setValueAtTime(0.04, t);
    gain.gain.linearRampToValueAtTime(0.06, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.42);

    // Click latch at end
    setTimeout(() => {
      playKeypadBeep(650);
    }, 380);
  } catch {
    // Ignore
  }
}

/** Bill dispenser counting and dispensing whirr */
export function playDispenserSound(billCount = 4): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const duration = Math.min(2.5, Math.max(0.8, billCount * 0.15 + 0.6));
    const t = ctx.currentTime;

    // Motor background hum
    const motor = ctx.createOscillator();
    const motorGain = ctx.createGain();
    motor.type = 'triangle';
    motor.frequency.setValueAtTime(95, t);
    motorGain.gain.setValueAtTime(0.06, t);
    motorGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    motor.connect(motorGain);
    motorGain.connect(ctx.destination);
    motor.start(t);
    motor.stop(t + duration);

    // Bill flutters / friction pulses
    const pulses = Math.max(4, Math.min(18, billCount * 2));
    for (let i = 0; i < pulses; i++) {
      const pulseTime = t + 0.1 + (i * (duration - 0.3)) / pulses;
      const noise = ctx.createOscillator();
      const nGain = ctx.createGain();
      noise.type = 'square';
      noise.frequency.setValueAtTime(320 + (i % 3) * 60, pulseTime);
      nGain.gain.setValueAtTime(0.03, pulseTime);
      nGain.gain.exponentialRampToValueAtTime(0.001, pulseTime + 0.03);
      noise.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(pulseTime);
      noise.stop(pulseTime + 0.035);
    }
  } catch {
    // Ignore
  }
}

/** Thermal receipt printing sound (micro-stepper motor) */
export function playReceiptPrintSound(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const pTime = t + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800 + (i % 2) * 200, pTime);
      gain.gain.setValueAtTime(0.025, pTime);
      gain.gain.exponentialRampToValueAtTime(0.001, pTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(pTime);
      osc.stop(pTime + 0.09);
    }
  } catch {
    // Ignore
  }
}

/** Success transaction chime */
export function playSuccessChime(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const t = ctx.currentTime + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  } catch {
    // Ignore
  }
}

/** Error or warning buzzer */
export function playErrorBuzz(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    [196, 185].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  } catch {
    // Ignore
  }
}

/** Biometric optical scanner high-frequency laser sweep */
export function playBiometricScanSound(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.35);

    gain.gain.setValueAtTime(0.04, t);
    gain.gain.linearRampToValueAtTime(0.06, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.42);
  } catch {
    // Ignore
  }
}

/** Biometric match confirmation chime */
export function playBiometricSuccessSound(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [880, 1174.66, 1760]; // A5, D6, A6
    notes.forEach((freq, idx) => {
      const t = ctx.currentTime + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.35);
    });
  } catch {
    // Ignore
  }
}

/** Optical QR Scanner recognition beep */
export function playQrScanSound(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.setValueAtTime(3200, t + 0.05);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);
  } catch {
    // Ignore
  }
}

/** Virtual Mobile Phone tactile feedback thud/click */
export function playPhoneHapticSound(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  } catch {
    // Ignore
  }
}


