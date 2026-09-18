import {
  FLEET, ORIENTS, TOTAL_TILES, createBoard, cellsFor, fits, place, pieceAt,
  remove, remaining, isComplete, autoPlace, unitById,
} from './fleet.js';
import {
  missileIcon, cannonIcon, mortarIcon, tankIcon, soldierIcon, mineIcon,
  rotateIcon, clockIcon, checkIcon, arrowLeftIcon,
} from './icons.js';
import { settings, DIFFICULTIES, COLOURS } from './match.js';
import { myHash, nameForHash } from './search.js';

/** Place your fleet inside two minutes, or the game does it for you. */
const PLACE_SECONDS = 120;

const UNIT_ICON = {
  missile: missileIcon, cannon: cannonIcon, mortar: mortarIcon,
  tank: tankIcon, soldier: soldierIcon, mine: mineIcon,
};

const RANKS = 'ABCDEFGHIJ';

/** The placed fleet, kept for the match screen to pick up. */
export let board = null;

let ticker;
let renderToken = 0;

const esc = (v) =>
  String(v).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const unitCard = (u) => `
  <button class="unit" type="button" data-unit="${u.id}">
    <span class="unit__name">${u.name}</span>
    <span class="unit__row">
      <span class="unit__shape">${UNIT_ICON[u.id]().repeat(u.length)}</span>
      <span class="unit__count">&times;${u.count}</span>
    </span>
  </button>`;

export function renderPlace(host) {
  clearInterval(ticker);
  const token = ++renderToken;

  const { size } = DIFFICULTIES.find((d) => d.id === settings.difficulty) ?? { size: 8 };
  const colour = COLOURS.find((c) => c.id === settings.colour) ?? COLOURS[0];
  const me = nameForHash(myHash());

  board = createBoard(size);

  let held = null;
  let orient = 'h';
  let left = PLACE_SECONDS;
  let locked = false;

  host.innerHTML = `
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
          <div class="board__grid" role="grid" aria-label="Your battlefield">
            ${Array.from({ length: size * size }, (_, i) =>
              `<div class="cell" role="gridcell" data-r="${Math.floor(i / size)}" data-c="${i % size}"></div>`).join('')}
          </div>
        </div>
      </div>

      <p class="who"><i class="who__dot"></i><span>${esc(me)}</span></p>

      <aside class="tray">
        <h2 class="tray__title">Your Defence</h2>
        <div class="tray__units">${FLEET.map(unitCard).join('')}</div>
      </aside>

      <div class="place__actions">
        <button class="action action--white" type="button" data-rotate>
          <span class="action__icon">${rotateIcon()}</span>
          <span class="action__label">Rotate</span>
        </button>
        <button class="action action--white" type="button" data-done disabled>
          <span class="action__label">Ready</span>
        </button>
      </div>
    </div>`;

  const grid = host.querySelector('.board__grid');
  const cells = [...grid.children];
  const cellAt = (r, c) => cells[r * size + c];
  const timerValue = host.querySelector('.timer__value');
  const timerChip = host.querySelector('.timer');
  const doneBtn = host.querySelector('[data-done]');
  const actions = host.querySelector('.place__actions');

  /* ── painting ──────────────────────────────────────────────────────── */

  function paint() {
    cells.forEach((el) => {
      el.className = 'cell';
      el.innerHTML = '';
    });

    board.pieces.forEach((piece) => {
      const icon = `<span class="cell__icon">${UNIT_ICON[piece.unit]()}</span>`;
      piece.cells.forEach(([r, c]) => {
        const el = cellAt(r, c);
        el.classList.add('cell--taken');
        if (piece.mine) el.classList.add('cell--mine');
        el.innerHTML = icon;   /* a 5-tile missile reads as five missiles */
      });
    });

    host.querySelectorAll('[data-unit]').forEach((card) => {
      const id = card.dataset.unit;
      const leftOver = remaining(board, id);
      card.querySelector('.unit__count').innerHTML = `&times;${leftOver}`;
      card.classList.toggle('is-selected', held === id);
      card.classList.toggle('is-empty', leftOver === 0);
    });

    doneBtn.disabled = !isComplete(board) || locked;
  }

  function clearPreview() {
    cells.forEach((el) => el.classList.remove('cell--ok', 'cell--bad'));
  }

  function showPreview(row, col) {
    clearPreview();
    if (!held) return;
    const unit = unitById(held);
    const shape = cellsFor(row, col, unit.length, orient);
    const ok = fits(board, shape);
    shape.forEach(([r, c]) => {
      if (r < 0 || c < 0 || r >= size || c >= size) return;
      cellAt(r, c).classList.add(ok ? 'cell--ok' : 'cell--bad');
    });
  }

  /* ── picking and placing ───────────────────────────────────────────── */

  function selectUnit(id) {
    if (locked) return;
    const card = host.querySelector(`[data-unit="${id}"]`);
    if (remaining(board, id) <= 0) {
      card.classList.remove('is-nudge');
      requestAnimationFrame(() => card.classList.add('is-nudge'));
      return;
    }
    held = held === id ? null : id;
    if (unitById(id).length === 1) orient = 'h';
    clearPreview();
    paint();
  }

  function tryPlace(row, col) {
    const unit = unitById(held);
    const shape = cellsFor(row, col, unit.length, orient);

    if (!fits(board, shape)) {
      shape.forEach(([r, c]) => {
        if (r >= 0 && c >= 0 && r < size && c < size) {
          const el = cellAt(r, c);
          el.classList.remove('cell--reject');
          requestAnimationFrame(() => el.classList.add('cell--reject'));
        }
      });
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

  host.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('[data-unit]');
    if (card) selectUnit(card.dataset.unit);
  });

  /* one move handler covers mouse hover and dragging a unit onto the board */
  host.addEventListener('pointermove', (e) => {
    if (!held || locked) return;
    const at = cellUnder(e.clientX, e.clientY);
    if (at) showPreview(at[0], at[1]);
    else clearPreview();
  });

  host.addEventListener('pointerup', (e) => {
    if (locked) return;
    const at = cellUnder(e.clientX, e.clientY);
    if (!at) { clearPreview(); return; }
    const [row, col] = at;

    if (held) { tryPlace(row, col); return; }

    const piece = pieceAt(board, row, col);   /* tap a placed unit to lift it */
    if (piece) {
      remove(board, piece.id);
      held = piece.unit;
      orient = piece.orient;
      paint();
      showPreview(row, col);
    }
  });

  host.querySelector('[data-rotate]').addEventListener('click', () => {
    if (locked) return;
    orient = ORIENTS[(ORIENTS.indexOf(orient) + 1) % ORIENTS.length];
    host.querySelector('[data-rotate]').dataset.orient = orient;
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

  doneBtn.addEventListener('click', () => finish(false));

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
