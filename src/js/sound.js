/**
 * Every sound in the game is synthesised on the fly with Web Audio: no
 * files to download, nothing to license, and it works offline.
 *
 * Browsers only allow audio after a user gesture, so the context is
 * created lazily on the first tap.
 */

import { prefs } from './prefs.js';

let ctx = null;
let out = null;
let noiseBuf = null;

function audio() {
  if (!prefs.sound) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;

  if (!ctx) {
    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = 0.55;
    const glue = ctx.createDynamicsCompressor();   /* stacked hits must not clip */
    out.connect(glue);
    glue.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** A pitched blip that can glide from f to f2. */
function tone(c, { f, f2, type = 'sine', t = 0, d = 0.12, g = 0.2, a = 0.004 }) {
  const start = c.currentTime + t;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, start);
  if (f2) osc.frequency.exponentialRampToValueAtTime(f2, start + d);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(g, start + a);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + d);
  osc.connect(amp);
  amp.connect(out);
  osc.start(start);
  osc.stop(start + d + 0.03);
}

/** Filtered noise: booms, crackles, whooshes. */
function noise(c, { t = 0, d = 0.2, g = 0.3, type = 'lowpass', f = 900, f2, q = 0.8 }) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const start = c.currentTime + t;
  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const amp = c.createGain();
  src.buffer = noiseBuf;
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(f, start);
  if (f2) filter.frequency.exponentialRampToValueAtTime(f2, start + d);
  amp.gain.setValueAtTime(g, start);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + d);
  src.connect(filter);
  filter.connect(amp);
  amp.connect(out);
  src.start(start, Math.random() * 0.9);
  src.stop(start + d + 0.03);
}

const chord = (c, notes, opts) => notes.forEach((f, i) => tone(c, { f, ...opts(i) }));

const SFX = {
  /* moving around the app */
  tap: (c) => tone(c, { f: 900, f2: 700, d: 0.045, g: 0.06 }),
  back: (c) => tone(c, { f: 520, f2: 380, d: 0.07, g: 0.07 }),
  select: (c) => tone(c, { f: 660, f2: 990, type: 'triangle', d: 0.08, g: 0.09 }),
  invalid: (c) => {
    tone(c, { f: 165, type: 'square', d: 0.09, g: 0.05 });
    tone(c, { f: 123, type: 'square', t: 0.1, d: 0.12, g: 0.05 });
  },
  copy: (c) => tone(c, { f: 1046.5, type: 'triangle', d: 0.06, g: 0.08 }),
  found: (c) => tone(c, { f: 659.25, f2: 987.77, type: 'triangle', d: 0.16, g: 0.1 }),
  send: (c) => {
    noise(c, { type: 'bandpass', f: 600, f2: 3400, d: 0.26, g: 0.1 });
    tone(c, { f: 1318.5, type: 'triangle', t: 0.2, d: 0.22, g: 0.07 });
  },

  /* the run-up to a match */
  whoosh: (c) => noise(c, { type: 'bandpass', f: 260, f2: 2600, d: 0.5, g: 0.2, q: 0.9 }),
  tick: (c, n = 3) => tone(c, { f: { 3: 587.33, 2: 659.25, 1: 783.99 }[n] ?? 700, type: 'triangle', d: 0.15, g: 0.18 }),
  go: (c) => chord(c, [523.25, 659.25, 783.99], (i) => ({ type: 'triangle', t: i * 0.025, d: 0.5, g: 0.11 })),
  join: (c) => {
    tone(c, { f: 587.33, type: 'triangle', d: 0.12, g: 0.09 });
    tone(c, { f: 783.99, type: 'triangle', t: 0.1, d: 0.2, g: 0.09 });
  },
  ready: (c) => tone(c, { f: 523.25, f2: 783.99, type: 'triangle', d: 0.22, g: 0.11 }),

  /* placing the fleet */
  place: (c) => {
    tone(c, { f: 190, f2: 80, d: 0.16, g: 0.3 });
    noise(c, { f: 700, d: 0.07, g: 0.1 });
  },
  lift: (c) => tone(c, { f: 320, f2: 560, type: 'triangle', d: 0.09, g: 0.09 }),
  rotate: (c) => {
    tone(c, { f: 740, f2: 880, type: 'triangle', d: 0.05, g: 0.07 });
    tone(c, { f: 880, f2: 1100, type: 'triangle', t: 0.045, d: 0.06, g: 0.07 });
  },
  lowTime: (c) => tone(c, { f: 1250, d: 0.035, g: 0.05 }),

  /* the match */
  fire: (c) => {
    noise(c, { f: 1400, f2: 140, d: 0.32, g: 0.38 });
    tone(c, { f: 120, f2: 42, d: 0.3, g: 0.36 });
  },
  miss: (c) => {
    tone(c, { f: 460, f2: 250, d: 0.13, g: 0.08 });
    noise(c, { type: 'highpass', f: 2600, d: 0.09, g: 0.04 });
  },
  /* each hit in a row climbs a whole tone */
  hit: (c, streak = 1) => {
    const up = 2 ** ((Math.min(streak, 7) - 1) * 2 / 12);
    noise(c, { type: 'bandpass', f: 1500, f2: 380, d: 0.24, g: 0.36, q: 1.1 });
    tone(c, { f: 330 * up, f2: 165 * up, type: 'square', d: 0.13, g: 0.06 });
    tone(c, { f: 660 * up, type: 'triangle', t: 0.05, d: 0.2, g: 0.08 });
  },
  hurt: (c) => {
    noise(c, { f: 900, f2: 120, d: 0.28, g: 0.3 });
    tone(c, { f: 140, f2: 60, d: 0.26, g: 0.22 });
  },
  destroyed: (c) => {
    noise(c, { f: 2200, f2: 70, d: 0.75, g: 0.5 });
    tone(c, { f: 95, f2: 34, d: 0.65, g: 0.4 });
    chord(c, [392, 493.88, 587.33, 783.99], (i) => ({ type: 'triangle', t: 0.14 + i * 0.075, d: 0.24, g: 0.09 }));
  },
  lostUnit: (c) => {
    noise(c, { f: 1600, f2: 60, d: 0.7, g: 0.4 });
    chord(c, [392, 349.23, 293.66], (i) => ({ type: 'triangle', t: 0.12 + i * 0.1, d: 0.26, g: 0.07 }));
  },
  hint: (c) => {
    tone(c, { f: 988, d: 0.07, g: 0.08 });
    tone(c, { f: 988, t: 0.13, d: 0.07, g: 0.08 });
  },
  mine: (c) => {
    noise(c, { f: 3200, f2: 55, d: 0.95, g: 0.6 });
    tone(c, { f: 78, f2: 30, type: 'sawtooth', d: 0.8, g: 0.18 });
    chord(c, [880, 660, 880, 660], (i) => ({ type: 'square', t: 0.28 + i * 0.13, d: 0.1, g: 0.03 }));
  },
  turn: (c) => {
    tone(c, { f: 659.25, type: 'triangle', d: 0.14, g: 0.08 });
    tone(c, { f: 987.77, type: 'triangle', t: 0.09, d: 0.22, g: 0.08 });
  },
  skipped: (c) => chord(c, [493.88, 392, 329.63], (i) => ({ t: i * 0.11, d: 0.14, g: 0.09 })),

  /* the end */
  win: (c) => {
    chord(c, [523.25, 659.25, 783.99, 1046.5], (i) => ({ type: 'triangle', t: i * 0.11, d: 0.3, g: 0.11 }));
    chord(c, [1046.5, 1318.5, 1568], () => ({ type: 'triangle', t: 0.46, d: 0.8, g: 0.06 }));
  },
  flawless: (c) => {
    SFX.win(c);
    chord(c, [1568, 2093, 2637, 3136, 4186], (i) => ({ t: 0.66 + i * 0.07, d: 0.3, g: 0.045 }));
  },
  lose: (c) => chord(c, [392, 349.23, 311.13, 261.63], (i) => ({ t: i * 0.22, d: 0.36, g: 0.09 })),
};

export function play(name, ...args) {
  const c = audio();
  if (!c || !SFX[name]) return;
  try { SFX[name](c, ...args); } catch { /* never let a sound break the game */ }
}

/* Unlock audio on the very first touch, as browsers require. */
addEventListener('pointerdown', () => { if (prefs.sound) audio(); }, { once: true, capture: true });
