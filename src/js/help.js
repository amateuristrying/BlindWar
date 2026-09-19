/**
 * The "?" explanations, one topic per screen or section. The same text
 * is the game's rulebook, so it has to stay true to what the game does.
 *
 * DIFFICULTIES is read only inside the body functions: match.js imports
 * this module too, and a top-level read would hit it mid-load.
 */

import { useIcon, crossIcon, flameIcon } from './icons.js';
import { FLEET, TOTAL_TILES } from './fleet.js';
import { DEFENCE_TILES } from './engine.js';
import { DIFFICULTIES } from './match.js';

/** A "?" that opens a topic. variant: inline | corner | chip | duel */
export const helpButton = (topic, variant = 'inline', label = 'What is this?') =>
  `<button class="help-btn help-btn--${variant}" type="button" data-help="${topic}" aria-label="${label}">?</button>`;

/* ── little building blocks ─────────────────────────────────────────── */

const lead = (s) => `<p class="help-lead">${s}</p>`;
const p = (s) => `<p>${s}</p>`;
const h = (s) => `<h3>${s}</h3>`;
const note = (s) => `<p class="help-note">${s}</p>`;

const steps = (items) => `
  <ol class="help-steps">
    ${items.map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('')}
  </ol>`;

const rows = (items) => `
  <ul class="help-rows">
    ${items.map(([icon, t, d]) => `
      <li>${icon ? `<span class="help-rows__icon">${icon}</span>` : ''}
        <span><b>${t}</b> ${d}</span></li>`).join('')}
  </ul>`;

const swatch = {
  miss: () => `<span class="swatch swatch--miss">${crossIcon()}</span>`,
  hit: () => `<span class="swatch swatch--fire">${flameIcon()}</span>`,
  down: () => `<span class="swatch swatch--down">${useIcon('u-missile')}</span>`,
  mine: () => `<span class="swatch swatch--mine">${useIcon('u-mine')}</span>`,
  hint: () => '<span class="swatch swatch--hint"></span>',
};

const outcomes = () => rows([
  [swatch.miss(), 'Miss —', 'nothing there. Your turn ends.'],
  [swatch.hit(), 'Hit —', 'part of a defence. It burns, and you fire again.'],
  [swatch.down(), 'Destroyed —', 'find every tile of a unit and it is revealed.'],
  [swatch.mine(), 'Mine —', 'revealed, your turn ends, and you lose your next one too.'],
  [swatch.hint(), 'Red glow —', 'a hidden mine sits right next to that square, on that side.'],
]);

const fleetTable = () => `
  <table class="help-fleet">
    <thead><tr><th>Unit</th><th>Tiles</th><th>Count</th></tr></thead>
    <tbody>
      ${FLEET.map((u) => `
        <tr${u.mine ? ' class="is-mine"' : ''}>
          <td><span class="help-fleet__unit">${useIcon(`u-${u.id}`)}${u.name}</span></td>
          <td>${u.length}</td><td>&times;${u.count}</td>
        </tr>`).join('')}
    </tbody>
    <tfoot>
      <tr><td colspan="3">${DEFENCE_TILES} defence tiles + 2 mines = ${TOTAL_TILES} tiles hidden</td></tr>
    </tfoot>
  </table>`;

const sizeTable = () => `
  <table class="help-fleet">
    <thead><tr><th>Board</th><th>Tiles</th><th>Occupied</th></tr></thead>
    <tbody>
      ${DIFFICULTIES.map((d) => `
        <tr><td><b>${d.label}</b> ${d.meta}</td><td>${d.size * d.size}</td>
          <td>${Math.round((TOTAL_TILES / (d.size * d.size)) * 100)}%</td></tr>`).join('')}
    </tbody>
  </table>`;

/* ── topics ─────────────────────────────────────────────────────────── */

export const HELP = {
  game: {
    title: 'How BlindWar works',
    body: () => `
      ${lead('A two-player game of hidden defences. You hide a fleet on your own grid, then take turns firing blind at your opponent’s. Uncover every one of their defences before they uncover yours.')}
      <p class="help-motto"><b>Guess</b> where they are <i></i> <b>Avoid</b> their mines <i></i> <b>Win</b> at 22 / 22</p>
      ${h('A match, start to finish')}
      ${steps([
        ['Set up', 'Pick the board size, the clock and your colour.'],
        ['Hide your fleet', 'Two minutes to place 7 defences and 2 mines. Your opponent never sees them.'],
        ['Take turns firing', 'Tap a square on your opponent’s board and see what was there.'],
        ['Destroy all 22', 'The first player to uncover every enemy defence tile wins.'],
      ])}
      ${h('What a shot can do')}
      ${outcomes()}
      ${note('Win without ever hitting a mine and it is a <b>Flawless victory</b>.')}`,
  },

  modes: {
    title: 'Game modes',
    body: () => `
      ${lead('Two ways to find an opponent, each as 1 v 1 or 2 v 2.')}
      ${rows([
        ['', 'Online —', 'play people from around the world. 1 v 1 finds a random player; 2 v 2 teams you up.'],
        ['', 'Friends —', 'challenge someone on your friend list.'],
      ])}
      ${note('Online matchmaking and 2 v 2 need a game server and are on the way. To play now, add a friend and tap their name under Your Friends.')}`,
  },

  friends: {
    title: 'Your friends',
    body: () => `
      ${p('Everyone you have added, by their Friend Hash. Tap a friend to set up a match with them.')}
      ${p('<b>Search for friends</b> opens the Friend Hash screen, where you can add someone new.')}`,
  },

  hash: {
    title: 'Friend Hash',
    body: () => `
      ${lead('Every player has a unique 8-digit Friend Hash, like #48213907.')}
      ${steps([
        ['Share yours', 'Tap Copy My Hash and send it to a friend.'],
        ['Find theirs', 'Type their hash and tap Find Friend.'],
        ['Add them', 'Tap the paper plane to send a request.'],
      ])}
      ${note('Your own hash is also shown in Settings.')}`,
  },

  settings: {
    title: 'Match settings',
    body: () => `
      ${p('Three choices before you play.')}
      ${rows([
        ['', 'Difficulty —', 'how big the battlefield is.'],
        ['', 'Time limit —', 'how long each player may think in total.'],
        ['', 'Colour —', 'your identity for the match.'],
      ])}
      ${note('Tap the ? beside any section for the details.')}`,
  },

  difficulty: {
    title: 'Battlefield size',
    body: () => `
      ${p('The fleet is always the same 24 tiles, so the board size decides how crowded it is.')}
      ${sizeTable()}
      ${note('A small board is easier to hit but harder to hide on. A big one is the other way round.')}`,
  },

  time: {
    title: 'Time limit',
    body: () => `
      ${p('Each player has their own clock, and it only runs during their turn. While your opponent is aiming, yours is paused.')}
      ${p('If your clock runs out, your turn ends at once.')}
      ${p('<b>No Time Limit</b> switches the clocks off.')}`,
  },

  colour: {
    title: 'Your colour',
    body: () => `
      ${p('Your colour marks everything that is yours this match: your board, your cannon, your badges. Your opponent always gets a different one.')}
      <p class="help-colours">
        <span style="--tone: var(--ball-red)">Atmo</span>
        <span style="--tone: var(--ball-blue)">Kylo</span>
        <span style="--tone: var(--ball-green)">Jerry</span>
        <span style="--tone: var(--ball-purple)">Shiv</span>
      </p>`,
  },

  ready: {
    title: 'Getting ready',
    body: () => `
      ${p('Both players confirm before a match starts. Once your opponent has joined, tap <b>Ready?</b>')}
      ${p('A 3, 2, 1 countdown then drops you onto your own board to hide your fleet.')}`,
  },

  placement: {
    title: 'Hiding your fleet',
    body: () => `
      ${steps([
        ['Pick a unit', 'Tap it in Your Defence.'],
        ['Drop it', 'Tap a square — or drag the unit straight onto the board.'],
        ['Turn it', 'Use the ↺ ↻ arrows on a placed unit. Units run across, down or diagonally.'],
        ['Move it', 'Tap a placed unit to pick it back up.'],
      ])}
      ${h('Rules')}
      ${p('Units cannot overlap, and cannot hang off the board. A dropped unit takes the first direction that fits.')}
      ${p('You have <b>2 minutes</b>. When time runs out, anything left is placed for you. Tap Ready once all 24 tiles are down.')}
      ${note('Your fleet disappears from view when the match begins. Nobody sees it — not even from across the table.')}`,
  },

  fleet: {
    title: 'Your defence',
    body: () => `
      ${fleetTable()}
      ${h('Mines')}
      ${p('Mines are not defences — they are traps. An opponent who fires on one loses their next turn, and mines never count towards the 22.')}
      ${note('Firing next to a mine makes its square glow on that side. Place mines where you expect fire, and not so they are obvious.')}`,
  },

  match: {
    title: 'Taking your turn',
    body: () => `
      ${lead('Fire at the top board. It belongs to your opponent, which is why it faces the other way.')}
      ${outcomes()}
      ${h('Reading mine hints')}
      ${p('A red glow on the edge of a square means a hidden mine is right next to it, on that side — corners included. One glow narrows it down. Two can pin it.')}
      ${h('Winning')}
      ${p('Uncover all 22 defence tiles to win. Hits keep your turn going, so chain them. Do it without ever triggering a mine for a <b>Flawless victory</b>.')}
      ${note('The match pauses while Help or Settings is open.')}`,
  },

  progress: {
    title: 'Defences destroyed',
    body: () => `
      ${p(`How many of your opponent’s ${DEFENCE_TILES} defence tiles you have uncovered. The bar fills as you go.`)}
      ${p('Mines never count — they are traps, not defences.')}
      ${p('The strip under each board lists that player’s units. A unit is struck off once every one of its tiles has been found.')}`,
  },
};
