/**
 * The match: deterministic rules, no DOM.
 *
 * Each side owns its fleet and the shots that have landed on it, so the
 * attacker's progress is simply how much of the other side has been found.
 */

import { FLEET, pieceAt, key } from './fleet.js';

/** Mines are not defence tiles and never count towards progress. */
export const DEFENCE_TILES = FLEET
  .filter((u) => !u.mine)
  .reduce((n, u) => n + u.length * u.count, 0);

export const DIRS = [
  ['N', -1, 0], ['NE', -1, 1], ['E', 0, 1], ['SE', 1, 1],
  ['S', 1, 0], ['SW', 1, -1], ['W', 0, -1], ['NW', -1, -1],
];

const other = (side) => (side === 'you' ? 'rival' : 'you');

function createSide(board, seconds) {
  return {
    board,
    shots: new Map(),     // "r,c" -> 'miss' | 'hit' | 'mine'
    hits: new Set(),      // defence tiles found on this board
    minesFound: 0,
    destroyed: new Set(), // piece ids fully discovered
    skipNext: false,
    time: seconds,
  };
}

export function createMatch({ size, yourBoard, rivalBoard, seconds = 0, first = 'you' }) {
  return {
    size,
    seconds,
    turn: first,
    over: false,
    winner: null,
    flawless: false,
    sides: {
      you: createSide(yourBoard, seconds),
      rival: createSide(rivalBoard, seconds),
    },
  };
}

export const targetOf = (match, attacker) => match.sides[other(attacker)];

export const shotAt = (side, r, c) => side.shots.get(key(r, c)) ?? null;

/** How much of a side's fleet the attacker has uncovered. */
export function progress(match, attacker) {
  const target = targetOf(match, attacker);
  return {
    found: target.hits.size,
    total: DEFENCE_TILES,
    percent: Math.round((target.hits.size / DEFENCE_TILES) * 100),
    mines: target.minesFound,
  };
}

/** Units of a side that are completely uncovered. */
export function destroyedUnits(side) {
  const tally = {};
  side.board.pieces.forEach((piece) => {
    if (side.destroyed.has(piece.id)) tally[piece.unit] = (tally[piece.unit] ?? 0) + 1;
  });
  return tally;
}

/** Which way a hidden mine lies, from a tile just searched. */
function mineHints(side, r, c) {
  const out = [];
  for (const [name, dr, dc] of DIRS) {
    const piece = pieceAt(side.board, r + dr, c + dc);
    if (piece?.mine && shotAt(side, r + dr, c + dc) !== 'mine') out.push(name);
  }
  return out;
}

function passTurn(match, from) {
  const to = other(from);
  if (match.sides[to].skipNext) {
    match.sides[to].skipNext = false;
    match.turn = from;          // their turn is burned, the mover goes again
    return to;                  // who was skipped
  }
  match.turn = to;
  return null;
}

/**
 * Take a shot. Returns what happened, or { type: 'invalid' } if the shot
 * was not allowed.
 */
export function fire(match, attacker, r, c) {
  if (match.over || match.turn !== attacker) return { type: 'invalid', reason: 'not-your-turn' };
  if (r < 0 || c < 0 || r >= match.size || c >= match.size) return { type: 'invalid', reason: 'off-board' };

  const target = targetOf(match, attacker);
  if (target.shots.has(key(r, c))) return { type: 'invalid', reason: 'already-searched' };

  const piece = pieceAt(target.board, r, c);

  /* ── mine: revealed, turn over, and the next one is forfeit ────────── */
  if (piece?.mine) {
    target.shots.set(key(r, c), 'mine');
    target.minesFound += 1;
    match.sides[attacker].skipNext = true;
    const skipped = passTurn(match, attacker);
    return {
      type: 'mine', r, c, attacker,
      minesFound: target.minesFound,
      hints: [],
      skipped,
      turn: match.turn,
    };
  }

  /* ── defence: another shot, and maybe a whole unit goes down ───────── */
  if (piece) {
    target.shots.set(key(r, c), 'hit');
    target.hits.add(key(r, c));

    const whole = piece.cells.every(([pr, pc]) => target.shots.get(key(pr, pc)) === 'hit');
    if (whole) target.destroyed.add(piece.id);

    const done = target.hits.size >= DEFENCE_TILES;
    if (done) {
      match.over = true;
      match.winner = attacker;
      match.flawless = target.minesFound === 0;
    }

    return {
      type: 'hit', r, c, attacker,
      unit: piece.unit,
      piece: whole ? piece : null,
      destroyed: whole,
      hints: mineHints(target, r, c),
      progress: progress(match, attacker),
      won: done,
      flawless: match.flawless,
      turn: match.turn,          // unchanged: hitting keeps the turn
    };
  }

  /* ── empty: turn over ──────────────────────────────────────────────── */
  target.shots.set(key(r, c), 'miss');
  const skipped = passTurn(match, attacker);
  return {
    type: 'miss', r, c, attacker,
    hints: mineHints(target, r, c),
    skipped,
    turn: match.turn,
  };
}

/** The active player's clock ran out: their turn ends. */
export function timeOut(match, side) {
  if (match.over || match.turn !== side) return null;
  match.sides[side].time = 0;
  return { skipped: passTurn(match, side), turn: match.turn };
}

/* ── A stand-in opponent: hunts around its hits, else searches fresh ─── */

export function chooseShot(match, attacker, rng = Math.random) {
  const target = targetOf(match, attacker);
  const open = (r, c) =>
    r >= 0 && c >= 0 && r < match.size && c < match.size && !target.shots.has(key(r, c));

  /* finish a wounded unit first */
  for (const hit of target.hits) {
    const [r, c] = hit.split(',').map(Number);
    const piece = pieceAt(target.board, r, c);
    if (piece && target.destroyed.has(piece.id)) continue;
    const near = DIRS.map(([, dr, dc]) => [r + dr, c + dc]).filter(([nr, nc]) => open(nr, nc));
    if (near.length) return near[Math.floor(rng() * near.length)];
  }

  const free = [];
  for (let r = 0; r < match.size; r++) {
    for (let c = 0; c < match.size; c++) if (open(r, c)) free.push([r, c]);
  }
  return free.length ? free[Math.floor(rng() * free.length)] : null;
}
