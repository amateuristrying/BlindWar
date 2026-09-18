import { renderGridField } from './grids.js';
import { renderModes, FRIENDS } from './modes.js';
import { renderSearch } from './search.js';
import { renderMatch, setOpponent } from './match.js';
import { renderReady } from './ready.js';
import { curtain } from './curtain.js';

renderGridField(document.getElementById('gridField'));

/* Screens are rebuilt on entry, so they always show current data
   (a friend added on the search screen shows up in the friend list). */
const RENDER = { modes: renderModes, search: renderSearch, match: renderMatch, ready: renderReady };

/* ── Screen routing ─────────────────────────────────────────────────── */

const screens = new Map(
  [...document.querySelectorAll('.screen')].map((el) => [el.id.replace('screen-', ''), el])
);
let current = 'home';

function show(id, { push = true } = {}) {
  const next = screens.get(id);
  if (!next || id === current) return;

  RENDER[id]?.(next);
  screens.get(current)?.classList.remove('is-active');
  next.classList.add('is-active');
  next.scrollTop = 0;
  current = id;

  if (push) history.pushState({ screen: id }, '');
}

history.replaceState({ screen: 'home' }, '');
addEventListener('popstate', (e) => show(e.state?.screen ?? 'home', { push: false }));

/* ── Press feedback ─────────────────────────────────────────────────────
   :active alone can flash by too fast to see on a quick tap, so hold the
   black state for a beat.                                              */

const PRESS_MS = 180;

document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.btn, .tile, .cta, .action, .send, .friend, .icon-btn');
  if (!el) return;
  el.classList.add('is-pressed');
  setTimeout(() => el.classList.remove('is-pressed'), PRESS_MS);
});

/* ── Actions ────────────────────────────────────────────────────────── */

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action], [data-mode], [data-friend]');
  if (!el) return;

  /* isTrusted keeps Chrome from warning about synthetic clicks */
  if (e.isTrusted && navigator.vibrate) {
    try { navigator.vibrate(8); } catch { /* not allowed here */ }
  }

  const { action, mode, friend } = el.dataset;

  if (friend) {
    const match = FRIENDS.find((f) => f.hash === friend);
    if (match) { setOpponent(match); show('match'); }
    return;
  }

  if (mode) {
    document.dispatchEvent(new CustomEvent('blindwar:mode', { detail: { mode } }));
    console.info(`[blindwar] mode ${mode} — lobby not built yet`);
    return;
  }

  document.dispatchEvent(new CustomEvent('blindwar:navigate', { detail: { action } }));

  const route = { start: 'modes', 'search-friends': 'search' }[action];

  if (route) show(route);
  else if (action === 'back') history.back();
  else console.info(`[blindwar] ${action} — screen not built yet`);
});

/* Starting a match is the one navigation big enough to earn the curtain. */
document.addEventListener('blindwar:start-match', () => {
  curtain(() => show('ready'));
});

/* Keep the layout honest when the mobile URL bar shows/hides. */
const setViewportUnit = () => {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
};
setViewportUnit();
addEventListener('resize', setViewportUnit);
