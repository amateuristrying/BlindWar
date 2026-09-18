/**
 * Background "boards": four tilted grids that drift slowly at the corners
 * of the screen. Decorative — buildBoardSvg() below also draws the real
 * boards used in the match screens.
 */

const CELL = 40;
const PAD_LEFT = 30;   // room for the A–H rank labels
const PAD_TOP = 28;    // room for the 1–8 file labels
const BLEED = 12;

const LETTERS = 'ABCDEFGHIJ';

/**
 * One board, as an <svg> string: an n x n grid with file (1..n) and rank
 * (A..) labels. Used both for the drifting backdrop and for the real
 * boards, so the opacities are all dialable.
 */
export function buildBoardSvg({
  color,
  size = 8,
  labelColor = color,
  fill = 0.055,
  lines = 0.28,
  border = 0.5,
  labels = 0.9,
} = {}) {
  const w = size * CELL;
  const h = size * CELL;
  const vb = [
    -(PAD_LEFT + BLEED),
    -(PAD_TOP + BLEED),
    w + PAD_LEFT + BLEED * 2,
    h + PAD_TOP + BLEED * 2,
  ].join(' ');

  let grid = '';
  for (let i = 1; i < size; i++) {
    grid += `<path d="M${i * CELL} 0V${h}" />`;
    grid += `<path d="M0 ${i * CELL}H${w}" />`;
  }

  let marks = '';
  for (let i = 0; i < size; i++) {
    marks += `<text x="${i * CELL + CELL / 2}" y="-10" text-anchor="middle">${i + 1}</text>`;
    marks += `<text x="-13" y="${i * CELL + CELL / 2 + 5.5}" text-anchor="end">${LETTERS[i]}</text>`;
  }

  return `
<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="presentation" focusable="false">
  <g style="color:${color}">
    <rect x="0" y="0" width="${w}" height="${h}" rx="3"
          fill="currentColor" fill-opacity="${fill}"
          stroke="currentColor" stroke-opacity="${border}" stroke-width="1.7" />
    <g stroke="currentColor" stroke-opacity="${lines}" stroke-width="1.1">${grid}</g>
  </g>
  <g style="color:${labelColor}" fill="currentColor" fill-opacity="${labels}" font-size="15.5"
     font-weight="600" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${marks}</g>
</svg>`;
}

/**
 * Placement of each corner board. Offsets are expressed as a fraction of
 * the board's own width (--w), so every screen size crops them the same
 * way. `tilt` is clockwise-positive, `skew` fakes a little perspective,
 * and dx/dy/dr drive the drift keyframes.
 */
export const BOARDS = [
  {
    color: 'var(--c-red)',
    style: { '--bw': '310px', left: 'calc(var(--w) * -.20)', top: 'calc(var(--w) * -.04)' },
    tilt: 7, skew: -2, dx: '13px', dy: '10px', dr: '1.9deg', dur: '26s', delay: '-2s',
  },
  {
    color: 'var(--c-blue)',
    style: { '--bw': '300px', right: 'calc(var(--w) * -.18)', top: 'calc(var(--w) * .12)' },
    tilt: -6.5, skew: 2, dx: '-11px', dy: '12px', dr: '-2.1deg', dur: '31s', delay: '-9s',
  },
  {
    color: 'var(--c-green)',
    style: { '--bw': '305px', left: 'calc(var(--w) * -.13)', bottom: 'calc(var(--w) * .28)' },
    tilt: 8.5, skew: 2, dx: '12px', dy: '-11px', dr: '2.3deg', dur: '29s', delay: '-16s',
  },
  {
    color: 'var(--c-purple)',
    style: { '--bw': '315px', right: 'calc(var(--w) * -.16)', bottom: 'calc(var(--w) * -.04)' },
    tilt: -7, skew: -2, dx: '-13px', dy: '-9px', dr: '-1.8deg', dur: '34s', delay: '-5s',
  },
];

/** Paint the decorative boards into `host`. */
export function renderGridField(host) {
  host.innerHTML = BOARDS
    .map((b) => {
      const vars = {
        ...b.style,
        '--tilt': `${b.tilt}deg`,
        '--skew': `${b.skew}deg`,
        '--dx': b.dx,
        '--dy': b.dy,
        '--dr': b.dr,
        '--dur': b.dur,
        '--delay': b.delay,
      };
      const css = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
      return `<div class="grid-slot" style="${css}">
        <div class="grid-float">${buildBoardSvg({ color: b.color })}</div>
      </div>`;
    })
    .join('');
}
