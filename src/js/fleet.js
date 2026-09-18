/**
 * The fleet and the placement rules — pure logic, no DOM.
 *
 * 22 defence tiles + 2 mines = 24 occupied tiles, the same at every
 * board size.
 */

export const FLEET = [
  { id: 'missile', name: 'Missiles', length: 5, count: 1 },
  { id: 'cannon',  name: 'Cannons',  length: 4, count: 2 },
  { id: 'mortar',  name: 'Mortars',  length: 3, count: 2 },
  { id: 'tank',    name: 'Tanks',    length: 2, count: 1 },
  { id: 'soldier', name: 'Soldier',  length: 1, count: 1 },
  { id: 'mine',    name: 'Mines',    length: 1, count: 2, mine: true },
];

export const TOTAL_TILES = FLEET.reduce((n, f) => n + f.length * f.count, 0);

/** across, down, down-right, down-left */
export const ORIENTS = ['h', 'v', 'd', 'a'];

export const unitById = (id) => FLEET.find((f) => f.id === id);

export const key = (r, c) => `${r},${c}`;

/** The tiles a unit of `length` would occupy, anchored at (row, col). */
export function cellsFor(row, col, length, orient) {
  const out = [];
  for (let i = 0; i < length; i++) {
    if (orient === 'h') out.push([row, col + i]);
    else if (orient === 'v') out.push([row + i, col]);
    else if (orient === 'd') out.push([row + i, col + i]);
    else out.push([row + i, col - i]);
  }
  return out;
}

export function createBoard(size) {
  return { size, taken: new Map(), pieces: [], nextId: 1 };
}

/** In bounds and nothing already there — partial overlap is overlap. */
export function fits(board, cells) {
  return cells.every(([r, c]) =>
    r >= 0 && c >= 0 && r < board.size && c < board.size && !board.taken.has(key(r, c)));
}

export function placedCount(board, unitId) {
  return board.pieces.filter((p) => p.unit === unitId).length;
}

export function remaining(board, unitId) {
  return unitById(unitId).count - placedCount(board, unitId);
}

export const isComplete = (board) =>
  FLEET.every((f) => remaining(board, f.id) === 0);

/** Place a unit, or return null if it doesn't fit / none left. */
export function place(board, unitId, row, col, orient) {
  const unit = unitById(unitId);
  if (!unit || remaining(board, unitId) <= 0) return null;

  const cells = cellsFor(row, col, unit.length, orient);
  if (!fits(board, cells)) return null;

  const piece = { id: board.nextId++, unit: unitId, cells, orient, mine: !!unit.mine };
  board.pieces.push(piece);
  cells.forEach(([r, c]) => board.taken.set(key(r, c), piece.id));
  return piece;
}

export function pieceAt(board, row, col) {
  const id = board.taken.get(key(row, col));
  return id ? board.pieces.find((p) => p.id === id) : null;
}

export function remove(board, pieceId) {
  const i = board.pieces.findIndex((p) => p.id === pieceId);
  if (i < 0) return null;
  const [piece] = board.pieces.splice(i, 1);
  piece.cells.forEach(([r, c]) => board.taken.delete(key(r, c)));
  return piece;
}

/**
 * Fill whatever is still in the tray, leaving anything already placed by
 * hand alone. Biggest units first, and if a run paints itself into a
 * corner it rolls back only its own work and tries again.
 */
export function autoPlace(board, rng = Math.random) {
  const order = [...FLEET].sort((a, b) => b.length - a.length);

  for (let attempt = 0; attempt < 24; attempt++) {
    const mine = [];
    let stuck = false;

    for (const unit of order) {
      for (let n = remaining(board, unit.id); n > 0; n--) {
        const piece = tryOne(board, unit, rng, attempt > 12);
        if (!piece) { stuck = true; break; }
        mine.push(piece.id);
      }
      if (stuck) break;
    }

    if (!stuck) return true;
    mine.forEach((id) => remove(board, id));
  }

  return false;
}

/** Random darts first, then an exhaustive sweep so we never give up early. */
function tryOne(board, unit, rng, orthogonalOnly) {
  const orients = unit.length === 1
    ? ['h']
    : (orthogonalOnly ? ['h', 'v'] : ORIENTS);

  for (let i = 0; i < 90; i++) {
    const row = Math.floor(rng() * board.size);
    const col = Math.floor(rng() * board.size);
    const orient = orients[Math.floor(rng() * orients.length)];
    const piece = place(board, unit.id, row, col, orient);
    if (piece) return piece;
  }

  for (const orient of orients) {
    for (let row = 0; row < board.size; row++) {
      for (let col = 0; col < board.size; col++) {
        const piece = place(board, unit.id, row, col, orient);
        if (piece) return piece;
      }
    }
  }

  return null;
}
