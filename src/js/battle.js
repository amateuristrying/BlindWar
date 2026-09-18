import { createBoard, autoPlace, FLEET, pieceAt, key } from './fleet.js';
import {
  createMatch, fire, progress, destroyedUnits, targetOf, chooseShot, timeOut,
  DEFENCE_TILES,
} from './engine.js';
import {
  spriteMarkup, useIcon, crossIcon, flameIcon, cannonMarkup, clockIcon, arrowLeftIcon,
} from './icons.js';
import { settings, DIFFICULTIES, TIME_LIMITS, COLOURS } from './match.js';
import { getOpponent } from './match.js';
import { myHash, nameForHash, hashSeed } from './search.js';
import { board as placedBoard } from './place.js';

const RANKS = 'ABCDEFGHIJ';

const esc = (v) =>
  String(v).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.max(s, 0) % 60).padStart(2, '0')}`;

/** Angle names to the edge of a tile they point at. */
const HINT_ANGLE = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

let listeners;
let bots = [];
let clock;

const stopBots = () => { bots.forEach(clearTimeout); bots = []; };

export function renderBattle(host) {
  listeners?.abort();
  listeners = new AbortController();
  const on = (el, type, fn) => el.addEventListener(type, fn, { signal: listeners.signal });
  stopBots();
  clearInterval(clock);

  const { size } = DIFFICULTIES.find((d) => d.id === settings.difficulty) ?? { size: 8 };
  const mineColour = COLOURS.find((c) => c.id === settings.colour) ?? COLOURS[0];
  const rivalColour = COLOURS.filter((c) => c.id !== mineColour.id)[
    hashSeed(getOpponent()?.hash ?? '0') % 3];

  const limit = TIME_LIMITS.find((t) => t.id === settings.time) ?? TIME_LIMITS[1];
  const seconds = limit.minutes * 60;

  const rivalBoard = createBoard(size);
  autoPlace(rivalBoard);

  const yourBoard = placedBoard?.size === size ? placedBoard : (() => {
    const b = createBoard(size);
    autoPlace(b);
    return b;
  })();

  const match = createMatch({ size, yourBoard, rivalBoard, seconds });

  const who = {
    you: { name: nameForHash(myHash()), hash: `#${myHash()}`, tone: mineColour.id },
    rival: {
      name: getOpponent()?.name ?? 'Rival',
      hash: getOpponent()?.hash ?? '',
      tone: rivalColour.id,
    },
  };

  /* ── markup ────────────────────────────────────────────────────────── */

  const grid = (side) => `
    <div class="board" style="--n: ${size}">
      <div class="board__files">
        ${Array.from({ length: size }, (_, i) => `<span>${i + 1}</span>`).join('')}
      </div>
      <div class="board__ranks">
        ${Array.from({ length: size }, (_, i) => `<span>${RANKS[i]}</span>`).join('')}
      </div>
      <div class="board__play">
        <div class="board__grid" role="grid" data-side="${side}">
          ${Array.from({ length: size * size }, (_, i) => `
            <div class="cell" role="gridcell" data-r="${Math.floor(i / size)}" data-c="${i % size}">
              ${useIcon('', 'cell__icon')}
              <span class="cell__mark"></span>
            </div>`).join('')}
        </div>
      </div>
    </div>`;

  const stock = (side) => `
    <div class="stock" data-stock="${side}">
      ${FLEET.map((u) => `
        <span class="stock__unit" data-unit="${u.id}">
          ${useIcon(`u-${u.id}`)}<b>×${u.count}</b>
        </span>`).join('')}
    </div>`;

  const army = (side) => `
    <section class="army army--${side}" data-army="${side}" style="--tone: var(--ball-${who[side].tone})">
      <div class="army__id">
        <span class="army__name"><i class="army__dot"></i>${esc(who[side].name)}</span>
        <span class="army__clock" data-clock="${side}">
          ${seconds ? `${clockIcon()}<b>${mmss(seconds)}</b>` : '<b>No limit</b>'}
        </span>
      </div>

      <div class="score" data-score="${side}">
        <span class="score__label">Defences Destroyed</span>
        <span class="score__bar"><i style="width:0%"></i></span>
        <b class="score__count">0 / ${DEFENCE_TILES}</b>
      </div>

      <div class="army__board">${grid(side)}</div>
      ${stock(side)}
    </section>`;

  host.innerHTML = `
    ${spriteMarkup()}

    <button class="icon-btn" type="button" data-action="back" aria-label="Leave match">
      ${arrowLeftIcon()}
    </button>

    <div class="battle">
      ${army('rival')}

      <div class="duel">
        <span class="cannon cannon--rival" style="--tone: var(--ball-${who.rival.tone})">${cannonMarkup()}</span>
        <span class="duel__mid">
          <b class="duel__vs">VS</b>
          <span class="duel__say" aria-live="polite"></span>
        </span>
        <span class="cannon cannon--you" style="--tone: var(--ball-${who.you.tone})">${cannonMarkup()}</span>
      </div>

      ${army('you')}

      <div class="shots" aria-hidden="true"></div>
    </div>

    <div class="verdict" hidden>
      <div class="verdict__card">
        <p class="verdict__kicker">All defences destroyed</p>
        <h2 class="verdict__title">You win</h2>
        <button class="action action--white" type="button" data-action="back">
          <span class="action__label">Leave match</span>
        </button>
      </div>
    </div>`;

  const grids = {
    you: host.querySelector('[data-side="you"]'),
    rival: host.querySelector('[data-side="rival"]'),
  };
  const cellsOf = {
    you: [...grids.you.children],
    rival: [...grids.rival.children],
  };
  const shots = host.querySelector('.shots');
  const turnLine = host.querySelector('.duel__say');
  const verdict = host.querySelector('.verdict');

  const at = (side, r, c) => cellsOf[side][r * size + c];

  /* ── painting ──────────────────────────────────────────────────────── */

  function paintSide(side) {
    const state = match.sides[side];

    cellsOf[side].forEach((el, i) => {
      const r = Math.floor(i / size);
      const c = i % size;
      const shot = state.shots.get(key(r, c));
      const piece = pieceAt(state.board, r, c);
      const revealed = piece && !piece.mine && state.destroyed.has(piece.id);

      el.className = 'cell';
      if (!shot) return;

      if (shot === 'miss') {
        el.classList.add('cell--miss');
      } else if (shot === 'mine') {
        el.classList.add('cell--mine-hit');
      } else if (revealed) {
        el.classList.add('cell--taken', 'cell--down');
        el.querySelector('use').setAttribute('href', `#u-${piece.unit}`);
      } else {
        el.classList.add('cell--fire');
      }
    });

    /* a side's remaining units, from the attacker's point of view */
    const gone = destroyedUnits(state);
    host.querySelectorAll(`[data-stock="${side}"] .stock__unit`).forEach((chip) => {
      const unit = FLEET.find((u) => u.id === chip.dataset.unit);
      const left = unit.count - (gone[unit.id] ?? 0);
      chip.querySelector('b').textContent = `×${left}`;
      chip.classList.toggle('is-down', left === 0);
    });

    /* a player's panel counts what THEY have destroyed of the other */
    const p = progress(match, side);
    const panel = host.querySelector(`[data-score="${side}"]`);
    panel.querySelector('i').style.width = `${p.percent}%`;
    panel.querySelector('.score__count').textContent = `${p.found} / ${p.total}`;
  }

  function paintTurn() {
    host.querySelectorAll('[data-army]').forEach((el) =>
      el.classList.toggle('is-active', !match.over && el.dataset.army === match.turn));
    turnLine.textContent = match.over
      ? ''
      : (match.turn === 'you' ? 'Your shot' : `${who.rival.name} is aiming…`);
  }

  const paint = () => { paintSide('you'); paintSide('rival'); paintTurn(); };

  /* ── effects ───────────────────────────────────────────────────────── */

  function mark(el, html, cls) {
    const slot = el.querySelector('.cell__mark');
    slot.innerHTML = html;
    if (cls) el.classList.add(cls);
  }

  function showHints(side, r, c, dirs) {
    if (!dirs.length) return;
    const el = at(side, r, c);
    const slot = el.querySelector('.cell__mark');
    slot.insertAdjacentHTML('beforeend',
      dirs.map((d) => `<i class="hint" style="--angle:${HINT_ANGLE[d]}deg"></i>`).join(''));
    el.classList.add('cell--warned');
  }

  /** Swing the firing cannon onto the tile, then send a shot at it. */
  function shoot(attacker, targetEl) {
    const cannon = host.querySelector(`.cannon--${attacker}`);
    const barrel = cannon.querySelector('.cannon__barrel');
    const pivot = cannon.getBoundingClientRect();
    const spot = targetEl.getBoundingClientRect();

    const ox = pivot.left + pivot.width * 0.33;
    const oy = pivot.top + pivot.height * 0.64;
    const tx = spot.left + spot.width / 2;
    const ty = spot.top + spot.height / 2;
    const angle = (Math.atan2(ty - oy, tx - ox) * 180) / Math.PI;

    barrel.style.rotate = `${angle}deg`;   /* 0deg points right */
    cannon.classList.add('is-firing');
    setTimeout(() => cannon.classList.remove('is-firing'), 340);

    const ball = document.createElement('i');
    ball.className = 'shot';
    ball.style.cssText = `--tone: var(--ball-${who[attacker].tone});left:${ox}px;top:${oy}px`;
    shots.append(ball);
    ball.animate(
      [{ transform: 'translate(-50%, -50%) scale(.6)' },
       { transform: `translate(${tx - ox}px, ${ty - oy}px) translate(-50%, -50%) scale(1)` }],
      { duration: 260, easing: 'cubic-bezier(.4, 0, .9, .5)' },
    ).finished.then(() => ball.remove());

    return 260;
  }

  /* ── firing ────────────────────────────────────────────────────────── */

  let busy = false;

  async function takeShot(attacker, r, c) {
    if (busy || match.over) return;
    const defender = attacker === 'you' ? 'rival' : 'you';
    const result = fire(match, attacker, r, c);
    if (result.type === 'invalid') {
      if (result.reason === 'already-searched') at(defender, r, c).classList.add('cell--again');
      setTimeout(() => at(defender, r, c).classList.remove('cell--again'), 300);
      return;
    }

    busy = true;
    const cell = at(defender, r, c);
    const flight = shoot(attacker, cell);
    await new Promise((res) => setTimeout(res, flight));

    paint();

    if (result.type === 'miss') {
      mark(cell, crossIcon(), 'cell--pop');
    } else if (result.type === 'hit') {
      mark(cell, result.destroyed ? '' : flameIcon(), 'cell--pop');
      if (result.destroyed) {
        result.piece.cells.forEach(([pr, pc]) => at(defender, pr, pc).classList.add('cell--boom'));
      }
    } else if (result.type === 'mine') {
      mark(cell, useIcon('u-mine'), 'cell--pop');
      host.querySelector('.battle').classList.add('is-shaken');
      setTimeout(() => host.querySelector('.battle')?.classList.remove('is-shaken'), 420);
    }

    showHints(defender, r, c, result.hints ?? []);
    announce(result);

    busy = false;

    if (match.over) return finishMatch();
    if (match.turn === 'rival') queueBot();
  }

  function announce(result) {
    const words = {
      miss: 'Miss',
      hit: result.destroyed ? `${result.unit} destroyed` : 'Hit — shoot again',
      mine: 'Mine — next turn skipped',
    };
    turnLine.textContent = words[result.type] ?? '';
    setTimeout(paintTurn, 900);
  }

  function queueBot() {
    bots.push(setTimeout(async () => {
      if (match.over || match.turn !== 'rival') return;
      const spot = chooseShot(match, 'rival');
      if (spot) await takeShot('rival', spot[0], spot[1]);
    }, 850));
  }

  function finishMatch() {
    stopBots();
    clearInterval(clock);
    paintTurn();
    const won = match.winner === 'you';
    verdict.querySelector('.verdict__kicker').textContent =
      won ? 'All defences destroyed' : 'Your fleet is gone';
    verdict.querySelector('.verdict__title').textContent =
      won ? (match.flawless ? 'Flawless victory' : 'You win') : 'You lose';
    verdict.classList.toggle('is-flawless', won && match.flawless);
    verdict.hidden = false;
  }

  /* ── input ─────────────────────────────────────────────────────────── */

  on(grids.rival, 'click', (e) => {
    if (match.turn !== 'you' || match.over) return;
    const cell = e.target.closest('.cell');
    if (cell) takeShot('you', +cell.dataset.r, +cell.dataset.c);
  });

  /* ── clocks ────────────────────────────────────────────────────────── */

  if (seconds) {
    clock = setInterval(() => {
      if (match.over) return;
      const side = match.sides[match.turn];
      side.time -= 1;
      const el = host.querySelector(`[data-clock="${match.turn}"] b`);
      if (el) el.textContent = mmss(side.time);
      if (side.time <= 0) {
        timeOut(match, match.turn);
        turnLine.textContent = 'Out of time';
        paint();
        if (match.turn === 'rival') queueBot();
      }
    }, 1000);
  }

  paint();
  if (match.turn === 'rival') queueBot();
}

export function stopBattle() {
  stopBots();
  clearInterval(clock);
  listeners?.abort();
}
