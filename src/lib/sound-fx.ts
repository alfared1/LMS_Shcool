/**
 * Lightweight Web Audio API procedural synthesizer for Game & UI feedback.
 * Respects global mute state and degrades gracefully if AudioContext is unavailable.
 */

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) {
    sharedCtx = new AudioCtx();
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => undefined);
  }
  return sharedCtx;
}

export function playTone(
  type: 'correct' | 'wrong' | 'click' | 'victory' | 'laser' | 'swipe',
  isMuted: boolean
): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const beep = (freq: number, startOffset: number, duration: number, wave: OscillatorType = 'sine', gainVal = 0.08) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, now + startOffset);
    gain.gain.setValueAtTime(gainVal, now + startOffset);
    gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + startOffset);
    osc.stop(now + startOffset + duration);
  };

  if (type === 'click') {
    beep(540, 0, 0.06, 'triangle', 0.05);
  } else if (type === 'swipe') {
    beep(380, 0, 0.08, 'sine', 0.05);
  } else if (type === 'laser') {
    beep(880, 0, 0.09, 'sawtooth', 0.05);
    beep(440, 0.05, 0.09, 'sawtooth', 0.04);
  } else if (type === 'correct') {
    beep(523.25, 0, 0.1, 'triangle', 0.08);
    beep(659.25, 0.09, 0.14, 'triangle', 0.08);
  } else if (type === 'wrong') {
    beep(220, 0, 0.14, 'sawtooth', 0.07);
    beep(175, 0.12, 0.18, 'sawtooth', 0.07);
  } else if (type === 'victory') {
    beep(523.25, 0, 0.12, 'triangle', 0.08);
    beep(659.25, 0.11, 0.12, 'triangle', 0.08);
    beep(783.99, 0.22, 0.12, 'triangle', 0.08);
    beep(1046.5, 0.34, 0.28, 'triangle', 0.09);
  }
}
