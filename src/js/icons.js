/**
 * Inline SVG icons. Everything is drawn with `currentColor` so an icon
 * flips to white automatically when its button turns black.
 */

const svg = (viewBox, body, extra = '') =>
  `<svg viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation" focusable="false" ${extra}>${body}</svg>`;

/* One person: head + shoulders, centred on (0, 0). */
const PERSON =
  '<circle cx="0" cy="-4.3" r="3.9" />' +
  '<path d="M0 .3c-3.9 0-7 2.5-7 6.1 0 .8.6 1.4 1.4 1.4h11.2c.8 0 1.4-.6 1.4-1.4 0-3.6-3.1-6.1-7-6.1Z" />';

const person = (x, y, scale, opacity = 1) =>
  `<g transform="translate(${x} ${y}) scale(${scale})" fill="currentColor"${
    opacity === 1 ? '' : ` opacity="${opacity}"`
  }>${PERSON}</g>`;

/** Two players — one solid, one faded behind. */
export const duoIcon = () =>
  svg('0 0 40 24', person(25.5, 12.4, 0.88, 0.45) + person(14, 12.6, 1.05));

/** Two pairs of players, for the 2 v 2 modes. */
export const quadIcon = () =>
  svg(
    '0 0 47 24',
    person(17, 12.4, 0.74, 0.45) + person(9.5, 12.6, 0.88) +
    person(39, 12.4, 0.74, 0.45) + person(31.5, 12.6, 0.88)
  );

/** Solid globe; the meridians are cut out in the surface colour. */
export const globeIcon = () =>
  svg(
    '0 0 24 24',
    '<circle cx="12" cy="12" r="10.6" fill="currentColor" />' +
      '<g stroke="var(--surface)" stroke-width="1.5" stroke-linecap="round">' +
      '<path d="M1.6 12h20.8" />' +
      '<path d="M2.5 7.4h19" />' +
      '<path d="M2.5 16.6h19" />' +
      '<ellipse cx="12" cy="12" rx="4.4" ry="10.6" />' +
      '</g>'
  );

export const chevronIcon = () =>
  svg(
    '0 0 24 24',
    '<path d="M9.5 5.8 15.7 12l-6.2 6.2" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" />'
  );

export const arrowLeftIcon = () =>
  svg(
    '0 0 24 24',
    '<path d="M18.6 12H5.8m6.4-6.3L5.6 12l6.6 6.3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />'
  );

export const searchIcon = () =>
  svg(
    '0 0 24 24',
    '<circle cx="10.6" cy="10.6" r="6.4" stroke="currentColor" stroke-width="2.4" />' +
      '<path d="m15.4 15.4 4.4 4.4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />'
  );

export const copyIcon = () =>
  svg(
    '0 0 24 24',
    '<g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="8.6" y="8.6" width="12" height="12" rx="3.2" />' +
      '<path d="M5.6 15.4H5a2.6 2.6 0 0 1-2.6-2.6V5A2.6 2.6 0 0 1 5 2.4h7.8A2.6 2.6 0 0 1 15.4 5v.6" />' +
      '</g>'
  );

export const planeIcon = () =>
  svg(
    '0 0 24 24',
    '<path d="M21.5 2.3 2.7 9.8a1.05 1.05 0 0 0 .07 1.98l7.2 2.15 2.15 7.2a1.05 1.05 0 0 0 1.98.07L21.5 2.3Z" fill="currentColor" />'
  );

export const checkIcon = () =>
  svg(
    '0 0 24 24',
    '<path d="m5.2 12.6 4.6 4.6L18.9 7.2" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round" />'
  );

export const infoIcon = () =>
  svg(
    '0 0 24 24',
    '<circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.8" />' +
      '<path d="M12 10.9v5.3" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />' +
      '<circle cx="12" cy="7.8" r="1.15" fill="currentColor" />'
  );

export const gridIcon = () =>
  svg(
    '0 0 24 24',
    '<g stroke="currentColor" stroke-width="2" stroke-linejoin="round">' +
      '<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="2.4" />' +
      '<path d="M9.07 3.2v17.6M14.93 3.2v17.6M3.2 9.07h17.6M3.2 14.93h17.6" />' +
      '</g>'
  );

export const clockIcon = () =>
  svg(
    '0 0 24 24',
    '<g stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<circle cx="12" cy="12" r="8.9" />' +
      '<path d="M12 7.1V12l3.4 2.1" />' +
      '</g>'
  );

export const infinityIcon = () =>
  svg(
    '0 0 24 24',
    '<path d="M7.3 8.6c-2.1 0-3.8 1.5-3.8 3.4s1.7 3.4 3.8 3.4c3.3 0 5.5-6.8 8.8-6.8 2.1 0 3.8 1.5 3.8 3.4s-1.7 3.4-3.8 3.4c-3.3 0-5.5-6.8-8.8-6.8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />'
  );

export const paletteIcon = () =>
  svg(
    '0 0 24 24',
    '<path d="M12 2.7a9.3 9.3 0 0 0 0 18.6c1.06 0 1.9-.85 1.9-1.9 0-.5-.2-.95-.52-1.28a1.8 1.8 0 0 1-.52-1.27c0-1.05.85-1.9 1.9-1.9h2.16a4.4 4.4 0 0 0 4.38-4.4c0-4.35-4.16-7.85-9.3-7.85Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />' +
      '<g fill="currentColor">' +
      '<circle cx="7.3" cy="12.2" r="1.3" /><circle cx="9.8" cy="7.9" r="1.3" />' +
      '<circle cx="14.7" cy="7.6" r="1.3" />' +
      '</g>'
  );

export const playIcon = () =>
  svg(
    '0 0 24 24',
    '<path d="M8.4 5.4 19 12 8.4 18.6Z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />'
  );

/* ── Defence units ──────────────────────────────────────────────────────
   Flat silhouettes, readable down to ~13px in the inventory rows.      */

const solid = (body) => svg('0 0 24 24', `<g fill="currentColor">${body}</g>`);

export const missileIcon = () => solid(
  '<path d="M12 1.5c2.1 2.2 3.3 5 3.3 8.1v5.6H8.7V9.6c0-3.1 1.2-5.9 3.3-8.1Z" />' +
  '<path d="M8.7 11.6 6 14.5v3.6l2.7-1.9zM15.3 11.6 18 14.5v3.6l-2.7-1.9z" />' +
  '<path d="M9.7 16.4h4.6l-1.1 4.1h-2.4z" />'
);

export const cannonIcon = () => solid(
  '<path d="M9.1 13.9 17.6 5.6l2.9 3-8.5 8.3z" />' +
  '<circle cx="8.2" cy="17.6" r="3.3" />' +
  '<path d="M4.2 19.1h7.6l-1.1 2.2H5.1z" />'
);

export const mortarIcon = () => solid(
  '<path d="M9.4 17.2 15.4 5.4l3.1 1.6-6 11.8z" />' +
  '<path d="M5.6 17.8h9.6l1.1 2.7H4.5z" />'
);

export const tankIcon = () => solid(
  '<rect x="2.6" y="16.4" width="18.8" height="4.2" rx="2.1" />' +
  '<path d="M4.8 11.9h14.4v4.1H4.8z" />' +
  '<path d="M9.4 8.6h5.8v3.1H9.4z" />' +
  '<path d="M15.1 9.5h6.3v1.7h-6.3z" />'
);

export const soldierIcon = () => solid(
  '<path d="M8.4 6.7a3.6 3.6 0 0 1 7.2 0z" />' +
  '<circle cx="12" cy="9.1" r="2.4" />' +
  '<path d="M9.2 11.8h5.6l1.3 8.8H7.9z" />' +
  '<path d="M14.6 12.4h6.8v1.6h-6.8z" />'
);

export const mineIcon = () => solid(
  '<path d="M4.3 17.1a7.7 7.7 0 0 1 15.4 0z" />' +
  '<path d="M11 5.2h2v3.1h-2z" />' +
  '<rect x="3.2" y="17.3" width="17.6" height="2.4" rx="1.2" />'
);

export const rotateIcon = () =>
  svg(
    '0 0 24 24',
    '<g stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M20.4 12a8.4 8.4 0 1 1-2.5-6" />' +
      '<path d="M20.6 3.4v4.4h-4.4" />' +
      '</g>'
  );
