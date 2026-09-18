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

const EASE_WIPE = 'cubic-bezier(.87, 0, .13, 1)';   /* ≈ expo.inOut */
const EASE_LIFT = 'cubic-bezier(.56, 0, .35, .98)'; /* the demo's "hop" */

const WIPE_MS = 420;
const OPEN_MS = 280;
const WORD_MS = 320;
const LIFT_MS = 420;

const COVER = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
const LIFT = 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)';

const frame = () => new Promise((r) => requestAnimationFrame(r));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const play = (el, keyframes, options) =>
  el.animate(keyframes, { fill: 'forwards', ...options }).finished;

/**
 * Run the curtain, calling `swap()` while the screen is fully covered.
 * Resolves once the curtain has left.
 */
export async function curtain(swap, { text = 'BlindWar' } = {}) {
  const root = document.getElementById('curtain');
  if (!root) { swap(); return; }

  const panel = root.querySelector('.curtain__panel');
  const line = root.querySelector('.curtain__text');
  const word = root.querySelector('.curtain__word');
  word.textContent = text;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    swap();
    return;
  }

  root.classList.add('is-active');
  document.body.classList.add('is-transitioning');

  /* the strip is exactly as tall as the word it carries */
  const half = (line.getBoundingClientRect().height / window.innerHeight) * 50;
  const strip = (right) =>
    `polygon(0% ${50 - half}%, ${right}% ${50 - half}%, ${right}% ${50 + half}%, 0% ${50 + half}%)`;

  await play(panel, [{ clipPath: strip(0) }, { clipPath: strip(100) }],
    { duration: WIPE_MS, easing: EASE_WIPE });

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
  await play(panel, [{ clipPath: COVER }, { clipPath: LIFT }],
    { duration: LIFT_MS, easing: EASE_LIFT });

  [panel, word].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
  root.classList.remove('is-active');
  document.body.classList.remove('is-transitioning');
}
