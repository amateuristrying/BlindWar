/**
 * One bottom sheet for everything that explains or configures: the "?"
 * topics and Settings. Opening it announces blindwar:sheet so a running
 * clock can pause while the player reads.
 */

import { prefs, setPref } from './prefs.js';
import { feel } from './feel.js';
import { canVibrate } from './haptics.js';
import { HELP } from './help.js';
import { myHash } from './search.js';

let root;
let lastFocus;
let hideTimer;

const sheet = () => (root ??= document.getElementById('sheet'));

const announce = (open) =>
  document.dispatchEvent(new CustomEvent('blindwar:sheet', { detail: { open } }));

export const isSheetOpen = () => !!sheet() && !sheet().hidden;

export function openSheet(title, html, kind = 'help') {
  const el = sheet();
  if (!el) return;

  clearTimeout(hideTimer);
  if (el.hidden) lastFocus = document.activeElement;

  el.dataset.kind = kind;
  el.querySelector('.sheet__title').textContent = title;
  el.querySelector('.sheet__body').innerHTML = html;
  el.querySelector('.sheet__body').scrollTop = 0;

  const wasOpen = !el.hidden;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('is-open'));
  el.querySelector('.sheet__close').focus({ preventScroll: true });
  if (!wasOpen) announce(true);
}

export function closeSheet() {
  const el = sheet();
  if (!el || el.hidden) return;
  el.classList.remove('is-open');
  hideTimer = setTimeout(() => { el.hidden = true; }, 280);
  lastFocus?.focus?.({ preventScroll: true });
  announce(false);
}

export function openHelp(topic) {
  const t = HELP[topic] ?? HELP.game;
  openSheet(t.title, t.body(), 'help');
}

/* ── Settings ───────────────────────────────────────────────────────── */

function vibrationNote() {
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && canVibrate()) return 'Feel every hit, mine and turn.';
  if (touch) return 'iPhone allows one light tap, only on your own moves.';
  return 'Works on phones and tablets.';
}

const toggle = (name, title, detail) => `
  <button class="pref" type="button" role="switch" aria-checked="${prefs[name]}" data-pref="${name}">
    <span class="pref__text"><b>${title}</b><small>${detail}</small></span>
    <span class="switch" aria-hidden="true"></span>
  </button>`;

export function openSettings({ inMatch = false } = {}) {
  openSheet('Settings', `
    <div class="prefs">
      ${toggle('sound', 'Sound effects', 'Cannons, hits, mines and the countdown.')}
      ${toggle('haptics', 'Vibration', vibrationNote())}
    </div>

    <div class="sheet__hash">
      <span>Your Friend Hash</span>
      <b>#${myHash()}</b>
    </div>

    <div class="sheet__actions">
      <button class="action action--ghost" type="button" data-help="game">
        <span class="action__label">How to play</span>
      </button>
      ${inMatch ? `
        <button class="action action--white" type="button" data-action="back">
          <span class="action__label">Leave match</span>
        </button>` : ''}
    </div>`, 'settings');
}

/* Toggles are wired once, on the sheet itself. */
document.addEventListener('click', (e) => {
  const pref = e.target.closest('#sheet [data-pref]');
  if (!pref) return;
  const name = pref.dataset.pref;
  setPref(name, !prefs[name]);
  pref.setAttribute('aria-checked', String(prefs[name]));
  if (prefs[name]) feel('select');   /* confirm it is on by using it */
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSheet();
});
