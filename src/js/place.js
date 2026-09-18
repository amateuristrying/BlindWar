import {
  FLEET, TOTAL_TILES, createBoard, cellsFor, firstFit, place, pieceAt,
  remove, rotate, remaining, isComplete, autoPlace, unitById,
} from './fleet.js';
import {
  spriteMarkup, useIcon, clockIcon, checkIcon, arrowLeftIcon,
} from './icons.js';
import { settings, DIFFICULTIES, COLOURS } from './match.js';
import { myHash, nameForHash } from './search.js';

/** Place your fleet inside two minutes, or the game does it for you. */
const PLACE_SECONDS = 120;

const RANKS = 'ABCDEFGHIJ';

/** The placed fleet, kept for the match screen to pick up. */
export let board = null;

let ticker;
let renderToken = 0;
/* The screen element outlives its contents, so listeners bound to it must
   be dropped on re-render or a second match runs two sets at once. */
let listeners;

const esc = (v) =>
  String(v).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const unitCard = (u) => `
  <button class="unit" type="button" data-unit="${u.id}">
    <span class="unit__name">${u.name}</span>
    <span class="unit__row">
      <span class="unit__shape">${useIcon(`u-${u.id}`).repeat(u.length)}</span>
      <span class="unit__count">&times;${u.count}</span>
    </span>
  </button>`;

export function renderPlace(host) {
  clearInterval(ticker);
  listeners?.abort();
  listeners = new AbortController();
  const on = (el, type, fn) => el.addEventListener(type, fn, { signal: listeners.signal });
  const token = ++renderToken;

  const { size } = DIFFICULTIES.find((d) => d.id === settings.difficulty) ?? { size: 8 };
  const colour = COLOURS.find((c) => c.id === settings.colour) ?? COLOURS[0];
  const me = nameForHash(myHash());

  board = createBoard(size);

  let held = null;
  let left = PLACE_SECONDS;
  let locked = false;

  /* Each square owns its icon from the start; placing only re-points it. */
  const cellMarkup = Array.from({ length: size * size }, (_, i) => `
    <div class="cell" role="gridcell" data-r="${Math.floor(i / size)}" data-c="${i % size}">
      ${useIcon('', 'cell__icon')}
    </div>`).join('');

  host.innerHTML = `
    ${spriteMarkup()}

    <button class="icon-btn" type="button" data-action="back" aria-label="Leave match">
      ${arrowLeftIcon()}
    </button>

    <div class="place" style="--tone: var(--ball-${colour.id})">
      <div class="place__bar">
        <span class="timer">${clockIcon()}<b class="timer__value">${mmss(left)}</b></span>
      </div>

      <div class="place__board">
        <div class="board" style="--n: ${size}">
          <div class="board__files">
            ${Array.from({ length: size }, (_, i) => `<span>${i + 1}</span>`).join('')}
          </div>
          <div class="board__ranks">
            ${Array.from({ length: size }, (_, i) => `<span>${RANKS[i]}</span>`).join('')}
          </div>
          <div class="board__play">
            <div class="board__grid" role="grid" aria-label="Your battlefield">${cellMarkup}</div>
            <div class="board__arrows"></div>
          </div>
        </div>
      </div>

      <p class="who"><i class="who__dot"></i><span>${esc(me)}</span></p>

      <aside class="tray">
        <h2 class="tray__title">Your Defence</h2>
        <div class="tray__units">${FLEET.map(unitCard).join('')}</div>
      </aside>

      <div class="place__actions">
        <button class="action action--white" type="button" data-done disabled>
          <span class="action__label">Ready</span>
        </button>
      </div>
    </div>`;

  const play = host.querySelector('.board__play');
  const grid = host.querySelector('.board__grid');
  const arrows = host.querySelector('.board__arrows');
  const cells = [...grid.children];
  const icons = cells.map((el) => el.querySelector('use'));
  const cards = [...host.querySelectorAll('[data-unit]')];
  const timerValue = host.querySelector('.timer__value');
  const timerChip = host.querySelector('.timer');
  const doneBtn = host.querySelector('[data-done]');
  const actions = host.querySelector('.place__actions');

  const at = (r, c) => r * size + c;
  const onBoard = (r, c) => r >= 0 && c >= 0 && r < size && c < size;

  /* ── painting ──────────────────────────────────────────────────────── */

  function paint() {
    cells.forEach((el) => { el.className = 'cell'; });

    board.pieces.forEach((piece) => {
      piece.cells.forEach(([r, c]) => {
        const i = at(r, c);
        cells[i].classList.add('cell--taken');
        if (piece.mine) cells[i].classList.add('cell--mine');
        icons[i].setAttribute('href', `#u-${piece.unit}`);
      });
    });

    cards.forEach((card) => {
      const leftOver = remaining(board, card.dataset.unit);
      card.querySelector('.unit__count').textContent = `×${leftOver}`;
      card.classList.toggle('is-selected', held === card.dataset.unit);
      card.classList.toggle('is-empty', leftOver === 0);
    });

    paintArrows();
    play.classList.toggle('is-holding', !!held);
    doneBtn.disabled = !isComplete(board) || locked;
  }

  /* A pair of half-circle arrows above and below every multi-tile unit. */
  function paintArrows() {
    if (locked) { arrows.innerHTML = ''; return; }

    arrows.innerHTML = board.pieces
      .filter((piece) => piece.cells.length > 1)
      .map((piece) => {
        const rows = piece.cells.map(([r]) => r);
        const cols = piece.cells.map(([, c]) => c);
        const x = ((Math.min(...cols) + Math.max(...cols) + 1) / 2 / size) * 100;
        const top = (Math.min(...rows) / size) * 100;
        const bottom = ((Math.max(...rows) + 1) / size) * 100;

        return `
          <button class="rot" type="button" data-rot="${piece.id}" data-dir="-1"
                  style="left:${x}%;top:${top}%" aria-label="Turn left">
            ${useIcon('rot-ccw')}
          </button>
          <button class="rot" type="button" data-rot="${piece.id}" data-dir="1"
                  style="left:${x}%;top:${bottom}%" aria-label="Turn right">
            ${useIcon('rot-cw')}
          </button>`;
      })
      .join('');
  }

  const clearPreview = () =>
    cells.forEach((el) => el.classList.remove('cell--ok', 'cell--bad'));

  function showPreview(row, col) {
    clearPreview();
    if (!held) return;
    const orient = firstFit(board, held, row, col);
    const shape = cellsFor(row, col, unitById(held).length, orient ?? 'h');
    shape.forEach(([r, c]) => {
      if (onBoard(r, c)) cells[at(r, c)].classList.add(orient ? 'cell--ok' : 'cell--bad');
    });
  }

  function reject(shape) {
    shape.forEach(([r, c]) => {
      if (!onBoard(r, c)) return;
      const el = cells[at(r, c)];
      el.classList.remove('cell--reject');
      requestAnimationFrame(() => el.classList.add('cell--reject'));
    });
  }

  /* ── picking and placing ───────────────────────────────────────────── */

  function selectUnit(id) {
    if (locked) return;
    const card = cards.find((c) => c.dataset.unit === id);
    if (remaining(board, id) <= 0) {
      card.classList.remove('is-nudge');
      requestAnimationFrame(() => card.classList.add('is-nudge'));
      return;
    }
    held = held === id ? null : id;
    clearPreview();
    paint();
  }

  /* No rotate button: a tap takes the first orientation that fits, and the
     arrows on the placed unit turn it from there. */
  function tryPlace(row, col) {
    const orient = firstFit(board, held, row, col);
    if (!orient) {
      reject(cellsFor(row, col, unitById(held).length, 'h'));
      return;
    }
    place(board, held, row, col, orient);
    if (remaining(board, held) <= 0) held = null;
    clearPreview();
    paint();
  }

  const cellUnder = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest?.('.cell');
    return el ? [+el.dataset.r, +el.dataset.c] : null;
  };

  on(host, 'pointerdown', (e) => {
    const card = e.target.closest('[data-unit]');
    if (card) selectUnit(card.dataset.unit);
  });

  /* One move handler covers mouse hover and dragging a unit with a finger:
     on touch the events keep targeting the tray card, so the square is
     found by coordinate rather than by event target. */
  on(host, 'pointermove', (e) => {
    if (!held || locked) return;
    const spot = cellUnder(e.clientX, e.clientY);
    if (spot) showPreview(spot[0], spot[1]);
    else clearPreview();
  });

  on(host, 'pointercancel', clearPreview);

  on(host, 'pointerup', (e) => {
    if (locked) return;
    const spot = cellUnder(e.clientX, e.clientY);
    if (!spot) { clearPreview(); return; }
    const [row, col] = spot;

    if (held) { tryPlace(row, col); return; }

    const piece = pieceAt(board, row, col);   /* tap a placed unit to lift it */
    if (piece) {
      remove(board, piece.id);
      held = piece.unit;
      paint();
      showPreview(row, col);
    }
  });

  on(arrows, 'click', (e) => {
    const btn = e.target.closest('[data-rot]');
    if (!btn || locked) return;

    const piece = board.pieces.find((p) => p.id === +btn.dataset.rot);
    const anchor = piece?.cells[0];
    if (!rotate(board, +btn.dataset.rot, +btn.dataset.dir) && anchor) {
      reject(pieceAt(board, anchor[0], anchor[1])?.cells ?? []);
    }
    paint();
  });

  /* ── finishing ─────────────────────────────────────────────────────── */

  function finish(auto) {
    if (locked) return;
    locked = true;
    clearInterval(ticker);
    held = null;
    clearPreview();
    paint();

    actions.innerHTML = `
      <span class="badge badge--done">${checkIcon()}<span>${auto ? 'Fleet placed for you' : 'Fleet Ready'}</span></span>`;

    /* the fleet goes back under wraps before the view pulls out */
    host.querySelector('.place').classList.add('is-sealed');

    document.dispatchEvent(new CustomEvent('blindwar:fleet-ready', {
      detail: {
        auto,
        size,
        colour: colour.id,
        tiles: board.taken.size,
        pieces: board.pieces.map((p) => ({ unit: p.unit, orient: p.orient, cells: p.cells })),
      },
    }));
    console.info(`[blindwar] fleet ready (${board.taken.size}/${TOTAL_TILES} tiles${auto ? ', auto-placed' : ''}) — match not built yet`);
  }

  on(doneBtn, 'click', () => finish(false));

  ticker = setInterval(() => {
    if (token !== renderToken) { clearInterval(ticker); return; }
    left -= 1;
    timerValue.textContent = mmss(Math.max(left, 0));
    timerChip.classList.toggle('is-low', left <= 20);

    if (left <= 0) {
      clearInterval(ticker);
      autoPlace(board);
      finish(true);
    }
  }, 1000);

  paint();
}
