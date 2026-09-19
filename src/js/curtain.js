/**
 * Page curtain, after the Codrops "team" transition.
 *
 *   1. a strip the height of its own text wipes in from the left edge
 *   2. the strip opens out to cover the screen  → the screen swap happens here
 *   3. the word slides up and the cover retracts off the top edge
 *
 * Same clip-path choreography as the original, but white, at game pace,
 * and with no GSAP: clip-path polygons interpolate natively as long as the
 * point count stays at four.
 */

import { feel } from './feel.js';

const EASE_WIPE = 'cubic-bezier(.87, 0, .13, 1)';   /* ≈ expo.inOut */
const EASE_LIFT = 'cubic-bezier(.56, 0, .35, .98)'; /* the demo's "hop" */

const WIPE_MS = 420;
const OPEN_MS = 280;
const WORD_MS = 320;
const LIFT_MS = 420;
const TICK_MS = 620;   /* how long each countdown number holds */

const COVER = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
const LIFT = 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)';

const frame = () => new Promise((r) => requestAnimationFrame(r));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const play = (el, keyframes, options) =>
  el.animate(keyframes, { fill: 'forwards', ...options }).finished;

/**
 * Run the curtain, calling `swap()` while the screen is fully covered.
 * Resolves once the curtain has left.
 *
 * `countdown` shows each label in turn inside the strip before it opens
 * out; `zoomFrom` is pushed towards the viewer as the cover closes, so the
 * screen reads as diving into whatever that element is.
 */
export async function curtain(swap, { text = 'BlindWar', countdown = null, zoomFrom = null } = {}) {
  const root = document.getElementById('curtain');
  if (!root) { swap(); return; }

  const panel = root.querySelector('.curtain__panel');
  const veil = root.querySelector('.curtain__veil');
  const line = root.querySelector('.curtain__text');
  const word = root.querySelector('.curtain__word');
  const labels = countdown?.length ? countdown : [text];
  word.textContent = labels[0];

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    swap();
    return;
  }

  root.classList.add('is-active');
  root.classList.toggle('is-countdown', labels.length > 1);
  document.body.classList.add('is-transitioning');

  /* the strip is exactly as tall as the word it carries */
  const half = (line.getBoundingClientRect().height / window.innerHeight) * 50;
  const strip = (right) =>
    `polygon(0% ${50 - half}%, ${right}% ${50 - half}%, ${right}% ${50 + half}%, 0% ${50 + half}%)`;

  feel('whoosh');
  play(veil, [{ opacity: 0 }, { opacity: 1 }], { duration: WIPE_MS, easing: 'ease-out' });
  await play(panel, [{ clipPath: strip(0) }, { clipPath: strip(100) }],
    { duration: WIPE_MS, easing: EASE_WIPE });

  /* 3 … 2 … 1 in the strip */
  if (labels.length > 1) feel('tick', Number(labels[0]));
  for (const label of labels.slice(1)) {
    await wait(TICK_MS);
    word.textContent = label;
    feel('tick', Number(label));
    word.animate(
      [{ transform: 'scale(.55)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: 190, easing: 'cubic-bezier(.2, .9, .3, 1)' },
    );
  }
  if (labels.length > 1) {
    await wait(TICK_MS);
    feel('go');
  }

  const zoom = typeof zoomFrom === 'string' ? document.querySelector(zoomFrom) : zoomFrom;
  if (zoom) {
    zoom.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(1.75)', opacity: .35 }],
      { duration: OPEN_MS + 140, easing: EASE_WIPE, fill: 'forwards' });
  }

  await play(panel, [{ clipPath: strip(100) }, { clipPath: COVER }],
    { duration: OPEN_MS, easing: EASE_WIPE });

  swap();
  await frame();

  /* a small wind-up before the word leaves, like the original's elastic.in */
  play(word, [
    { transform: 'translateY(0)', offset: 0 },
    { transform: 'translateY(9%)', offset: .28 },
    { transform: 'translateY(-125%)', offset: 1 },
  ], { duration: WORD_MS, easing: 'cubic-bezier(.6, 0, .78, 0)' });

  await wait(WORD_MS * 0.38);
  play(veil, [{ opacity: 1 }, { opacity: 0 }], { duration: LIFT_MS, easing: 'ease-in' });
  await play(panel, [{ clipPath: COVER }, { clipPath: LIFT }],
    { duration: LIFT_MS, easing: EASE_LIFT });

  [panel, word, veil].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
  if (zoom) zoom.getAnimations().forEach((a) => a.cancel());
  root.classList.remove('is-active', 'is-countdown');
  document.body.classList.remove('is-transitioning');
}
