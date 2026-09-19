import { renderGridField } from './grids.js';
import { renderModes, FRIENDS } from './modes.js';
import { renderSearch } from './search.js';
import { renderMatch, setOpponent } from './match.js';
import { renderReady } from './ready.js';
import { renderPlace } from './place.js';
import { renderBattle, stopBattle } from './battle.js';
import { curtain } from './curtain.js';
import { spriteMarkup } from './icons.js';
import { openHelp, openSettings, closeSheet } from './sheet.js';
import { feel } from './feel.js';

renderGridField(document.getElementById('gridField'));

/* One icon sprite for every screen and every help sheet. */
document.body.insertAdjacentHTML('afterbegin', spriteMarkup());

/* Screens are rebuilt on entry, so they always show current data
   (a friend added on the search screen shows up in the friend list). */
const RENDER = {
  modes: renderModes,
  search: renderSearch,
  match: renderMatch,
  ready: renderReady,
  place: renderPlace,
  battle: renderBattle,
};

/* ── Screen routing ─────────────────────────────────────────────────── */

const screens = new Map(
  [...document.querySelectorAll('.screen')].map((el) => [el.id.replace('screen-', ''), el])
);
let current = 'home';

function show(id, { push = true } = {}) {
  const next = screens.get(id);
  if (!next || id === current) return;

  closeSheet();
  RENDER[id]?.(next);
  screens.get(current)?.classList.remove('is-active');
  next.classList.add('is-active');
  next.scrollTop = 0;
  current = id;

  if (push) history.pushState({ screen: id }, '');
}

history.replaceState({ screen: 'home' }, '');
addEventListener('popstate', (e) => show(e.state?.screen ?? 'home', { push: false }));

/* Fleet locked: the pieces fade, then the view pulls back to both boards. */
document.addEventListener('blindwar:fleet-ready', () => {
  setTimeout(() => show('battle'), 620);
});

/* Leaving the match must stop its clock and its opponent. */
addEventListener('popstate', () => { if (current !== 'battle') stopBattle(); });

/* ── Press feedback ─────────────────────────────────────────────────────
   :active alone can flash by too fast to see on a quick tap, so hold the
   black state for a beat.                                              */

const PRESS_MS = 180;

document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.btn, .tile, .cta, .action, .send, .friend, .icon-btn, .help-btn, .duel__btn');
  if (!el) return;
  el.classList.add('is-pressed');
  setTimeout(() => el.classList.remove('is-pressed'), PRESS_MS);
});

/* ── Actions ────────────────────────────────────────────────────────── */

document.addEventListener('click', (e) => {
  /* synthetic clicks (tests, the iOS haptic trick) make no noise */
  const real = e.isTrusted;

  const help = e.target.closest('[data-help]');
  if (help) {
    if (real) feel('tap');
    openHelp(help.dataset.help);
    return;
  }

  if (e.target.closest('[data-sheet]')) {
    if (real) feel('tap');
    openSettings({ inMatch: current === 'battle' });
    return;
  }

  if (e.target.closest('[data-sheet-close]')) {
    if (real) feel('back');
    closeSheet();
    return;
  }

  const el = e.target.closest('[data-action], [data-mode], [data-friend]');
  if (!el) return;

  const { action, mode, friend } = el.dataset;
  if (real) feel(action === 'back' ? 'back' : 'tap');

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
  else if (action === 'back') { closeSheet(); history.back(); }
  else if (action === 'rules') openHelp('game');
  else if (action === 'settings') openSettings();
  else console.info(`[blindwar] ${action} — screen not built yet`);
});

/* The two navigations big enough to earn the curtain. */
document.addEventListener('blindwar:start-match', () => {
  curtain(() => show('ready'));
});

/* Both ready: count down in the strip, then dive into your own board. */
document.addEventListener('blindwar:ready', () => {
  curtain(() => show('place'), {
    countdown: ['3', '2', '1'],
    zoomFrom: '#screen-ready .side--you',
  });
});

/* Keep the layout honest when the mobile URL bar shows/hides. */
const setViewportUnit = () => {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
};
setViewportUnit();
addEventListener('resize', setViewportUnit);
