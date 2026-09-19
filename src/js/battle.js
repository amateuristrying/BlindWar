import { createBoard, autoPlace, isComplete, FLEET, pieceAt, key } from './fleet.js';
import {
  createMatch, fire, progress, destroyedUnits, chooseShot, timeOut, DEFENCE_TILES,
} from './engine.js';
import {
  useIcon, crossIcon, flameIcon, cannonMarkup, clockIcon, gearIcon,
} from './icons.js';
import { settings, DIFFICULTIES, TIME_LIMITS, COLOURS, getOpponent } from './match.js';
import { myHash, nameForHash, hashSeed } from './search.js';
import { board as placedBoard } from './place.js';
import { helpButton } from './help.js';
import { feel } from './feel.js';
import { play } from './sound.js';

const RANKS = 'ABCDEFGHIJ';

const UNIT_NAME = {
  missile: 'Missile', cannon: 'Cannon', mortar: 'Mortar', tank: 'Tank', soldier: 'Soldier',
};

const ALL_TONES = ['var(--ball-red)', 'var(--ball-blue)', 'var(--ball-green)', 'var(--ball-purple)'];

const esc = (v) =>
  String(v).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

const mmss = (s) => `${Math.floor(Math.max(s, 0) / 60)}:${String(Math.max(s, 0) % 60).padStart(2, '0')}`;

/** Which edge of a tile each direction glows from. */
const HINT_ANGLE = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

/** What a run of hits is called. */
const streakWord = (n) =>
  ({ 1: 'Hit — fire again', 2: 'Double hit!', 3: 'Triple hit!' }[n] ?? `${n} in a row!`);

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

  /* only a finished placement counts; anything else is filled in for you */
  const yourBoard = placedBoard?.size === size && isComplete(placedBoard) ? placedBoard : (() => {
    const b = createBoard(size);
    autoPlace(b);
    return b;
  })();

  const match = createMatch({ size, yourBoard, rivalBoard, seconds });

  const who = {
    you: { name: nameForHash(myHash()), tone: mineColour.id },
    rival: { name: getOpponent()?.name ?? 'Rival', tone: rivalColour.id },
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
        <span class="score__label">Defences Destroyed${
          side === 'you' ? helpButton('progress', 'mini', 'About Defences Destroyed') : ''}</span>
        <span class="score__bar"><i style="width:0%"></i></span>
        <b class="score__count">0 / ${DEFENCE_TILES}</b>
      </div>

      <div class="army__board">${grid(side)}</div>
      ${stock(side)}
    </section>`;

  host.innerHTML = `
    <div class="battle">
      ${army('rival')}

      <div class="duel">
        <button class="duel__btn" type="button" data-sheet="settings" aria-label="Settings">${gearIcon()}</button>
        <span class="cannon cannon--rival" style="--tone: var(--ball-${who.rival.tone})">${cannonMarkup()}</span>
        <span class="duel__mid">
          <b class="duel__vs">VS</b>
          <span class="duel__say" aria-live="polite"></span>
        </span>
        <span class="cannon cannon--you" style="--tone: var(--ball-${who.you.tone})">${cannonMarkup()}</span>
        ${helpButton('match', 'duel', 'How turns work')}
      </div>

      ${army('you')}

      <div class="shots" aria-hidden="true"></div>
    </div>

    <div class="verdict" hidden>
      <div class="verdict__confetti" aria-hidden="true"></div>
      <div class="verdict__card">
        <p class="verdict__kicker"></p>
        <h2 class="verdict__title"></h2>
        <p class="verdict__stats"></p>
        <button class="action action--white" type="button" data-action="back">
          <span class="action__label">Leave match</span>
        </button>
      </div>
    </div>`;

  const grids = {
    you: host.querySelector('[data-side="you"]'),
    rival: host.querySelector('[data-side="rival"]'),
  };
  const cellsOf = { you: [...grids.you.children], rival: [...grids.rival.children] };
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

      el.classList.remove('cell--miss', 'cell--fire', 'cell--mine-hit', 'cell--taken', 'cell--down');
      if (!shot) return;

      if (shot === 'miss') el.classList.add('cell--miss');
      else if (shot === 'mine') el.classList.add('cell--mine-hit');
      else if (revealed) {
        el.classList.add('cell--taken', 'cell--down');
        el.querySelector('use').setAttribute('href', `#u-${piece.unit}`);
      } else el.classList.add('cell--fire');
    });

    /* a side's units still standing */
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
    turnLine.classList.remove('is-pop', 'is-streak');
    turnLine.textContent = match.over
      ? ''
      : (match.turn === 'you' ? 'Your shot' : `${who.rival.name} is aiming…`);
  }

  const paint = () => { paintSide('you'); paintSide('rival'); paintTurn(); };

  /* ── what the middle of the screen says ────────────────────────────── */

  let sayTimer;

  /** Show lines one after another, then fall back to whose turn it is. */
  function say(lines, streak = 0) {
    clearTimeout(sayTimer);
    const [first, ...rest] = lines;
    if (!first) { paintTurn(); return; }
    turnLine.textContent = first[0];
    turnLine.classList.remove('is-pop', 'is-streak');
    void turnLine.offsetWidth;   /* restart the pop animation */
    turnLine.classList.add(streak > 1 ? 'is-streak' : 'is-pop');
    sayTimer = setTimeout(() => say(rest), first[1]);
  }

  /* ── effects ───────────────────────────────────────────────────────── */

  const centreOf = (el) => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };

  function mark(el, html) {
    el.querySelector('.cell__mark').innerHTML = html;
    el.classList.remove('cell--pop');
    void el.offsetWidth;
    el.classList.add('cell--pop');
  }

  function showHints(side, r, c, dirs) {
    if (!dirs.length) return;
    const el = at(side, r, c);
    el.querySelector('.cell__mark').insertAdjacentHTML('beforeend',
      dirs.map((d) => `<i class="hint" style="--angle:${HINT_ANGLE[d]}deg"></i>`).join(''));
    el.classList.add('cell--warned');
  }

  /** Sparks thrown out of an impact. */
  function burst(el, { count = 8, spread = 34, tones }) {
    const [x, y] = centreOf(el);
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('i');
      spark.className = 'spark';
      spark.style.cssText = `left:${x}px;top:${y}px;background:${tones[i % tones.length]}`;
      shots.append(spark);
      const a = Math.random() * Math.PI * 2;
      const d = spread * (0.45 + Math.random() * 0.75);
      spark.animate(
        [{ transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
         { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.15)`, opacity: 0 }],
        { duration: 380 + Math.random() * 280, easing: 'cubic-bezier(.2, .8, .3, 1)' },
      ).finished.then(() => spark.remove());
    }
  }

  function confetti(count) {
    const layer = verdict.querySelector('.verdict__confetti');
    layer.innerHTML = '';
    const { width, height } = verdict.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      const bit = document.createElement('i');
      bit.style.cssText = `left:${Math.random() * width}px;background:${ALL_TONES[i % 4]}`;
      layer.append(bit);
      bit.animate(
        [{ transform: 'translate(0, -20px) rotate(0deg)', opacity: 1 },
         { transform: `translate(${(Math.random() - 0.5) * 140}px, ${height + 40}px) rotate(${Math.random() * 900 - 450}deg)`, opacity: 0.85 }],
        { duration: 1700 + Math.random() * 1500, delay: Math.random() * 600, easing: 'cubic-bezier(.25, .6, .4, 1)', fill: 'forwards' },
      ).finished.then(() => bit.remove());
    }
  }

  /** Swing the firing cannon onto the tile, then send a shot at it. */
  function shoot(attacker, targetEl) {
    const cannon = host.querySelector(`.cannon--${attacker}`);
    const barrel = cannon.querySelector('.cannon__barrel');
    const pivot = cannon.getBoundingClientRect();
    const [tx, ty] = centreOf(targetEl);

    const ox = pivot.left + pivot.width * 0.33;
    const oy = pivot.top + pivot.height * 0.64;
    barrel.style.rotate = `${(Math.atan2(ty - oy, tx - ox) * 180) / Math.PI}deg`;   /* 0deg points right */

    cannon.classList.remove('is-firing');
    void cannon.offsetWidth;
    cannon.classList.add('is-firing');

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
  let paused = false;
  let streak = 0;

  async function takeShot(attacker, r, c) {
    if (busy || match.over) return;
    const defender = attacker === 'you' ? 'rival' : 'you';
    const result = fire(match, attacker, r, c);

    if (result.type === 'invalid') {
      if (result.reason === 'already-searched' && attacker === 'you') {
        feel('invalid');
        const el = at(defender, r, c);
        el.classList.remove('cell--again');
        void el.offsetWidth;
        el.classList.add('cell--again');
      }
      return;
    }

    busy = true;
    const cell = at(defender, r, c);

    /* the cannon's own kick belongs to the tap, so it lands inside it */
    if (attacker === 'you') feel('fire');
    else play('fire');

    const flight = shoot(attacker, cell);
    await new Promise((res) => setTimeout(res, flight));

    paint();

    const mine = attacker === 'you';
    const defenderTones = [`var(--ball-${who[defender].tone})`, '#f2662f', '#ffd36b'];
    const lines = [];

    if (result.type === 'miss') {
      streak = 0;
      mark(cell, crossIcon());
      if (mine) feel('miss'); else play('miss');
      lines.push([mine ? 'Miss' : 'They missed', 900]);
    } else if (result.type === 'hit') {
      streak += 1;
      if (result.destroyed) {
        mark(cell, '');
        result.piece.cells.forEach(([pr, pc]) => {
          const el = at(defender, pr, pc);
          el.classList.remove('cell--boom');
          void el.offsetWidth;
          el.classList.add('cell--boom');
          burst(el, { count: 6, spread: 30, tones: defenderTones });
        });
        feel(mine ? 'destroyed' : 'lostUnit');
        lines.push([mine
          ? `${UNIT_NAME[result.unit]} destroyed!`
          : `Your ${UNIT_NAME[result.unit].toLowerCase()} is down`, 1300]);
      } else {
        mark(cell, flameIcon());
        burst(cell, { count: 9, spread: 32, tones: defenderTones });
        if (mine) feel('hit', streak); else feel('hurt');
        lines.push([mine ? streakWord(streak) : 'Your fleet is hit', 1000]);
      }
    } else if (result.type === 'mine') {
      streak = 0;
      mark(cell, useIcon('u-mine'));
      burst(cell, { count: 14, spread: 48, tones: ['#ff7a4d', '#ffd36b', '#2b1218'] });
      feel('mine');
      const battle = host.querySelector('.battle');
      battle.classList.remove('is-shaken');
      void battle.offsetWidth;
      battle.classList.add('is-shaken');
      lines.push([mine ? 'Mine! You lose your next turn' : `${who.rival.name} hit your mine!`, 1500]);
    }

    if (mine && result.hints?.length) setTimeout(() => feel('hint'), 360);
    showHints(defender, r, c, result.hints ?? []);

    /* a forfeited turn is its own moment */
    if (result.skipped) {
      setTimeout(() => feel('skipped'), 700);
      lines.push([result.skipped === 'you'
        ? 'Your turn is skipped'
        : 'Their turn is skipped — fire again', 1300]);
    }

    say(lines, mine ? streak : 0);
    if (match.turn !== attacker) streak = 0;

    /* the moment it comes back to you */
    if (match.turn === 'you' && attacker === 'rival') setTimeout(() => feel('turn'), 650);

    busy = false;

    if (match.over) return finishMatch();
    if (match.turn === 'rival') queueBot(result.skipped ? 2000 : 1100);
  }

  function queueBot(delay = 900) {
    bots.push(setTimeout(async () => {
      if (match.over || match.turn !== 'rival') return;
      if (paused || busy) { queueBot(400); return; }
      const spot = chooseShot(match, 'rival');
      if (spot) await takeShot('rival', spot[0], spot[1]);
    }, delay));
  }

  function finishMatch() {
    stopBots();
    clearInterval(clock);
    clearTimeout(sayTimer);
    paintTurn();

    const won = match.winner === 'you';
    const mines = progress(match, 'you').mines;

    verdict.querySelector('.verdict__kicker').textContent =
      won ? 'All defences destroyed' : 'Your fleet is gone';
    verdict.querySelector('.verdict__title').textContent =
      won ? (match.flawless ? 'Flawless victory' : 'You win') : 'You lose';
    verdict.querySelector('.verdict__stats').textContent = won
      ? (match.flawless ? 'Not a single mine triggered.' : `${mines} mine${mines === 1 ? '' : 's'} triggered on the way.`)
      : `You found ${progress(match, 'you').found} of ${DEFENCE_TILES}.`;
    verdict.classList.toggle('is-flawless', won && match.flawless);

    setTimeout(() => {
      verdict.hidden = false;
      if (won) {
        feel(match.flawless ? 'flawless' : 'win');
        confetti(match.flawless ? 110 : 70);
      } else {
        feel('lose');
      }
    }, 900);
  }

  /* ── input ─────────────────────────────────────────────────────────── */

  on(grids.rival, 'click', (e) => {
    if (match.turn !== 'you' || match.over || paused) return;
    const cell = e.target.closest('.cell');
    if (cell) takeShot('you', +cell.dataset.r, +cell.dataset.c);
  });

  /* Help and Settings pause the match: the clock and the opponent wait. */
  on(document, 'blindwar:sheet', (e) => { paused = e.detail.open; });

  /* ── clocks ────────────────────────────────────────────────────────── */

  if (seconds) {
    clock = setInterval(() => {
      if (match.over || paused) return;
      const who_ = match.turn;
      const side = match.sides[who_];
      side.time -= 1;

      const el = host.querySelector(`[data-clock="${who_}"] b`);
      if (el) el.textContent = mmss(side.time);
      host.querySelector(`[data-clock="${who_}"]`)?.classList.toggle('is-low', side.time <= 10);
      if (who_ === 'you' && side.time > 0 && side.time <= 10) feel('lowTime');

      if (side.time <= 0) {
        timeOut(match, who_);
        paint();
        say([[who_ === 'you' ? 'Out of time' : `${who.rival.name} ran out of time`, 1200]]);
        if (match.turn === 'rival') queueBot(1300);
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
