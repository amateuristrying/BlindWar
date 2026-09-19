import {
  gridIcon, clockIcon, paletteIcon, infinityIcon, playIcon, arrowLeftIcon,
} from './icons.js';
import { helpButton } from './help.js';
import { feel } from './feel.js';

/* ── Options ────────────────────────────────────────────────────────── */

export const DIFFICULTIES = [
  { id: 'easy',     tone: 'green', label: 'Easy',     meta: '7 x 7',   size: 7 },
  { id: 'moderate', tone: 'blue',  label: 'Moderate', meta: '8 x 8',   size: 8 },
  { id: 'hard',     tone: 'red',   label: 'Hard',     meta: '10 x 10', size: 10 },
];

export const TIME_LIMITS = [
  { id: 'none', label: 'No Time Limit', icon: infinityIcon, minutes: 0 },
  { id: '10',   label: '10 Minutes',    icon: clockIcon,    minutes: 10 },
  { id: '5',    label: '5 Minutes',     icon: clockIcon,    minutes: 5 },
];

export const COLOURS = [
  { id: 'red',    name: 'Atmo' },
  { id: 'blue',   name: 'Kylo' },
  { id: 'green',  name: 'Jerry' },
  { id: 'purple', name: 'Shiv' },
];

/** Survives leaving and re-entering the screen within a session. */
export const settings = { difficulty: 'moderate', time: '10', colour: null };

let opponent = null;
export const setOpponent = (friend) => { opponent = friend; };
export const getOpponent = () => opponent;

/* ── Markup ─────────────────────────────────────────────────────────── */

const esc = (v) =>
  String(v).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

const section = (n, icon, title, sub, body, topic) => `
  <section class="card">
    <div class="card__head">
      <span class="card__icon card__icon--ink">${icon()}</span>
      <div class="card__text">
        <h2 class="card__title">${n}. ${title}${helpButton(topic)}</h2>
        <p class="card__sub">${sub}</p>
      </div>
    </div>
    ${body}
  </section>`;

const difficultyOpts = () => `
  <div class="opts opts--3">
    ${DIFFICULTIES.map((d) => `
      <button class="opt opt--${d.tone}${settings.difficulty === d.id ? ' is-selected' : ''}"
              type="button" role="radio" aria-checked="${settings.difficulty === d.id}"
              data-difficulty="${d.id}">
        <span class="opt__label">${d.label}</span>
        <span class="opt__meta">${d.meta}</span>
      </button>`).join('')}
  </div>`;

const timeOpts = () => `
  <div class="opts opts--3">
    ${TIME_LIMITS.map((t) => `
      <button class="opt opt--neutral${settings.time === t.id ? ' is-selected' : ''}"
              type="button" role="radio" aria-checked="${settings.time === t.id}"
              data-time="${t.id}">
        <span class="opt__label">${t.label}</span>
        <span class="opt__glyph">${t.icon()}</span>
      </button>`).join('')}
  </div>`;

/* Names stay hidden until a ball is picked — the space is reserved so
   the card doesn't jump when one appears. */
const colourOpts = () => `
  <div class="opts opts--4">
    ${COLOURS.map((c) => `
      <button class="ball-opt${settings.colour === c.id ? ' is-selected' : ''}"
              type="button" role="radio" aria-checked="${settings.colour === c.id}"
              data-colour="${c.id}" aria-label="${c.name}" style="--ball: var(--ball-${c.id})">
        <span class="ball"></span>
        <span class="ball-opt__name">${c.name}</span>
      </button>`).join('')}
  </div>`;

export function renderMatch(host) {
  const name = opponent?.name ?? 'a friend';

  host.innerHTML = `
    <button class="icon-btn" type="button" data-action="back" aria-label="Back">
      ${arrowLeftIcon()}
    </button>
    ${helpButton('settings', 'corner', 'About match settings')}

    <div class="screen__inner">
      <header class="brand brand--mini">
        <h1 class="brand__title">BlindWar</h1>
        <p class="brand__tagline">
          <span>Guess</span><b class="brand__dot" aria-hidden="true"></b>
          <span>Avoid</span><b class="brand__dot" aria-hidden="true"></b>
          <span>Win</span>
        </p>
      </header>

      <div class="match">
        <div class="match__head">
          <h2 class="match__title">Match Settings</h2>
          <p class="match__sub">Play with ${esc(name)}</p>
        </div>

        ${opponent ? `
          <div class="vs">
            <span class="vs__avatar">${esc(opponent.name.charAt(0))}</span>
            <span class="vs__text">
              <span class="vs__name">${esc(opponent.name)}</span>
              <span class="vs__hash">${esc(opponent.hash)}</span>
            </span>
          </div>` : ''}

        <div class="cards" role="group" aria-label="Match settings">
          ${section(1, gridIcon, 'Select Difficulty', 'Choose the size of the battlefield.', difficultyOpts(), 'difficulty')}
          ${section(2, clockIcon, 'Select Time Limit', 'Choose how much time you have.', timeOpts(), 'time')}
          ${section(3, paletteIcon, 'Choose Your Colour', 'Pick a colour to represent you in this match.', colourOpts(), 'colour')}
        </div>

        <button class="action action--white action--lg" type="button" data-start-match>
          <span class="action__icon">${playIcon()}</span>
          <span class="action__label">Start Match</span>
        </button>
      </div>
    </div>`;

  /* ── Picking ──────────────────────────────────────────────────────── */

  const pick = (attr, key) => {
    host.querySelectorAll(`[data-${attr}]`).forEach((btn) => {
      btn.addEventListener('click', () => {
        settings[key] = btn.dataset[key === 'colour' ? 'colour' : key];
        feel('select');
        const group = btn.parentElement;
        group.querySelectorAll('[role="radio"]').forEach((el) => {
          const on = el === btn;
          el.classList.toggle('is-selected', on);
          el.setAttribute('aria-checked', String(on));
        });
      });
    });
  };

  pick('difficulty', 'difficulty');
  pick('time', 'time');
  pick('colour', 'colour');

  host.querySelector('[data-start-match]').addEventListener('click', () => {
    /* a colour is the one thing with no sensible default */
    if (!settings.colour) {
      feel('invalid');
      const card = host.querySelectorAll('.card')[2];
      card.classList.remove('is-nudge');
      requestAnimationFrame(() => card.classList.add('is-nudge'));
      card.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    const detail = { opponent, ...settings };
    document.dispatchEvent(new CustomEvent('blindwar:start-match', { detail }));
    console.info('[blindwar] start match', detail, '— board not built yet');
  });
}
