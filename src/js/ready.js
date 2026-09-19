import { buildBoardSvg } from './grids.js';
import { getOpponent, settings, COLOURS, DIFFICULTIES, TIME_LIMITS } from './match.js';
import { myHash, nameForHash, hashSeed } from './search.js';
import { checkIcon } from './icons.js';
import { helpButton } from './help.js';
import { feel } from './feel.js';

/** How long the rival takes to appear. Stands in for matchmaking. */
const JOIN_MS = 5000;

let joinTimer;
let renderToken = 0;

const esc = (v) =>
  String(v).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

const colourById = (id) => COLOURS.find((c) => c.id === id) ?? COLOURS[0];

/** The rival takes a colour that isn't yours — stable for a given hash. */
function rivalColour(hash) {
  const pool = COLOURS.filter((c) => c.id !== settings.colour);
  return pool[hashSeed(hash) % pool.length];
}

/** Board tinted in a player's colour, sized by the chosen difficulty. */
function boardFor(colourId) {
  const { size } = DIFFICULTIES.find((d) => d.id === settings.difficulty) ?? { size: 8 };
  return buildBoardSvg({
    color: `var(--ball-${colourId})`,
    size,
    labelColor: 'var(--ink)',
    fill: 0.075,
    lines: 0.34,
    border: 0.62,
    labels: 0.62,
  });
}

const plate = (p, tone) => `
  <div class="plate">
    <span class="plate__avatar" style="--tone: var(--ball-${tone})">${esc(p.name.charAt(0))}</span>
    <span class="plate__text">
      <span class="plate__name">${esc(p.name)}</span>
      <span class="plate__hash">${esc(p.hash)}</span>
    </span>
  </div>`;

const readyBadge = (tone, label) => `
  <span class="badge" style="--tone: var(--ball-${tone})">
    ${checkIcon()}<span>${label}</span>
  </span>`;

export function renderReady(host) {
  clearTimeout(joinTimer);
  const token = ++renderToken;

  const rival = getOpponent() ?? { name: 'Rival', hash: '#00000000' };
  const rivalTone = rivalColour(rival.hash).id;

  const mine = { name: nameForHash(myHash()), hash: `#${myHash()}` };
  const myColour = colourById(settings.colour);

  const grid = DIFFICULTIES.find((d) => d.id === settings.difficulty) ?? DIFFICULTIES[1];
  const time = TIME_LIMITS.find((t) => t.id === settings.time) ?? TIME_LIMITS[1];

  host.innerHTML = `
    ${helpButton('ready', 'corner', 'About getting ready')}
    <button class="icon-btn" type="button" data-action="back" aria-label="Leave match">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18.6 12H5.8m6.4-6.3L5.6 12l6.6 6.3" />
      </svg>
    </button>

    <div class="arena">
      <section class="side side--rival" aria-live="polite">
        <div class="side__board">${boardFor(rivalTone)}</div>
        <div class="side__body">
          <div class="joining">
            <span class="joining__pulse" style="--tone: var(--ball-${rivalTone})"></span>
            <p class="joining__text">Waiting for player to join…</p>
          </div>
          <div class="side__arrive" hidden>
            ${plate(rival, rivalTone)}
            ${readyBadge(rivalTone, 'Player Ready')}
          </div>
        </div>
      </section>

      <div class="arena__line"></div>

      <section class="side side--you">
        <div class="side__board">${boardFor(myColour.id)}</div>
        <div class="side__body">
          ${plate(mine, myColour.id)}
          <div class="chips">
            <span class="chip">${grid.meta}</span>
            <span class="chip">${time.label}</span>
            <span class="chip">
              <i class="chip__dot" style="--tone: var(--ball-${myColour.id})"></i>${myColour.name}
            </span>
          </div>
          <div class="you__action">
            <button class="action action--white ready-btn" type="button" data-ready hidden>
              <span class="action__label">Ready?</span>
            </button>
          </div>
        </div>
      </section>
    </div>`;

  const arrive = host.querySelector('.side__arrive');
  const joining = host.querySelector('.joining');
  const readyBtn = host.querySelector('[data-ready]');

  const reveal = () => {
    if (token !== renderToken) return;
    if (!host.classList.contains('is-active')) return;   /* player left */

    feel('join');
    joining.hidden = true;
    arrive.hidden = false;
    arrive.classList.add('is-arriving');                 /* slides in from their side */

    readyBtn.hidden = false;
    readyBtn.classList.add('is-arriving');
  };

  /* the wait starts when the screen is actually on show, not while the
     curtain is still covering it */
  const startWait = () => {
    if (token !== renderToken) return;
    if (document.getElementById('curtain')?.classList.contains('is-active')) {
      requestAnimationFrame(startWait);
      return;
    }
    joinTimer = setTimeout(reveal, JOIN_MS);
  };

  startWait();

  readyBtn.addEventListener('click', () => {
    feel('ready');
    readyBtn.outerHTML = readyBadge(myColour.id, "You're Ready");
    document.dispatchEvent(new CustomEvent('blindwar:ready', {
      detail: { you: mine, rival, ...settings },
    }));
    console.info('[blindwar] both players ready — placement not built yet');
  });
}
