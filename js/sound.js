/* ============================================================================
 * sound.js — Web Audio feedback
 * ----------------------------------------------------------------------------
 * Every sound is synthesised at runtime, so the game ships no audio files and
 * makes no network request for them. The AudioContext is created lazily on the
 * first sound, because browsers refuse to start one before a user gesture.
 * ==========================================================================*/

let audioCtx = null;
let muted = false;

/** Mirror of the UI's mute preference; ui.js keeps this in step. */
export function setMuted(value) {
  muted = !!value;
}

export function isMuted() {
  return muted;
}

function ensureAudio() {
  if (audioCtx) return audioCtx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try { audioCtx = new Ctor(); } catch (err) { return null; }
  return audioCtx;
}

/** One short enveloped note. Silent when muted or when Web Audio is missing. */
export function tone(freq, duration, type, delay, volume) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  const start = ctx.currentTime + (delay || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume || 0.14, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

export const sfx = {
  click()   { tone(420, 0.06, 'square', 0, 0.05); },
  success() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.22, 'triangle', i * 0.085, 0.12)); },
  fail()    { tone(180, 0.22, 'sawtooth', 0, 0.09); tone(120, 0.3, 'sawtooth', 0.09, 0.08); },
  victory() { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, 0.34, 'triangle', i * 0.13, 0.12)); },
};
