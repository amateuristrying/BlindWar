import { helpButton } from './help.js';
import {
  duoIcon, quadIcon, globeIcon, chevronIcon, arrowLeftIcon, searchIcon,
} from './icons.js';

/** Friends the player has added. Stays empty until there's a backend. */
export const FRIENDS = [];

const esc = (v) =>
  String(v).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

/** The two groups of match modes shown after Start. */
export const MODE_GROUPS = [
  {
    id: 'online',
    title: 'Online',
    sub: 'Play with players around the world',
    icon: globeIcon,
    iconTone: 'red',
    modes: [
      { id: 'online-1v1', tone: 'red',   label: '1 v 1', sub: 'Find a random player', icon: duoIcon },
      { id: 'online-2v2', tone: 'blue',  label: '2 v 2', sub: 'Team up online',       icon: quadIcon },
    ],
  },
  {
    id: 'friends',
    title: 'Friends',
    sub: 'Play with your friends',
    icon: duoIcon,
    iconTone: 'ink',
    modes: [
      { id: 'friends-1v1', tone: 'green',  label: '1 v 1', sub: 'Challenge a friend', icon: duoIcon },
      { id: 'friends-2v2', tone: 'purple', label: '2 v 2', sub: 'Play with friends',  icon: quadIcon },
    ],
    panel: friendsPanel,
  },
];

const tile = (m) => `
  <button class="tile tile--${m.tone}" type="button" data-mode="${m.id}">
    <span class="tile__icon">${m.icon()}</span>
    <span class="tile__title">${m.label}</span>
    <span class="tile__sub">${m.sub}</span>
    <span class="tile__chevron">${chevronIcon()}</span>
  </button>`;

const friendRow = (f) => `
  <li>
    <button class="friend" type="button" data-friend="${esc(f.hash)}">
      <span class="friend__avatar">${esc(f.name.trim().charAt(0).toUpperCase())}</span>
      <span class="friend__text">
        <span class="friend__name">${esc(f.name)}</span>
        <span class="friend__hash">${esc(f.hash)}</span>
      </span>
      <span class="friend__chevron">${chevronIcon()}</span>
    </button>
  </li>`;

const searchCta = () => `
  <button class="cta" type="button" data-action="search-friends">
    <span class="cta__icon">${searchIcon()}</span>
    <span class="cta__label">Search for friends</span>
  </button>`;

const emptyFriends = () => `
  <div class="friends__empty">
    <span class="friends__empty-icon">${duoIcon()}</span>
    <p class="friends__empty-title">No friends added yet.</p>
    <p class="friends__empty-sub">Add your first friend to start playing!</p>
    ${searchCta()}
  </div>`;

/** Friend list that hangs below the Friends modes. */
function friendsPanel(friends) {
  return `
    <div class="friends">
      <h3 class="friends__title">Your Friends (${friends.length})${helpButton('friends')}</h3>
      <p class="friends__sub">Add friends using their Friend Hash.</p>
      ${friends.length
        ? `<ul class="friends__list">${friends.map(friendRow).join('')}</ul>${searchCta()}`
        : emptyFriends()}
    </div>`;
}

const card = (g) => `
  <section class="card">
    <div class="card__head">
      <span class="card__icon card__icon--${g.iconTone}">${g.icon()}</span>
      <div class="card__text">
        <h2 class="card__title">${g.title}</h2>
        <p class="card__sub">${g.sub}</p>
      </div>
    </div>
    <div class="card__modes">${g.modes.map(tile).join('')}</div>
    ${g.panel ? g.panel(FRIENDS) : ''}
  </section>`;

/** Paint the mode picker into its screen element. */
export function renderModes(host) {
  host.innerHTML = `
    <button class="icon-btn" type="button" data-action="back" aria-label="Back">
      ${arrowLeftIcon()}
    </button>
    ${helpButton('modes', 'corner', 'About game modes')}

    <div class="screen__inner">
      <header class="brand brand--compact">
        <h1 class="brand__title">BlindWar</h1>
        <p class="brand__tagline">
          <span>Guess</span><b class="brand__dot" aria-hidden="true"></b>
          <span>Avoid</span><b class="brand__dot" aria-hidden="true"></b>
          <span>Win</span>
        </p>
      </header>

      <div class="cards">${MODE_GROUPS.map(card).join('')}</div>
    </div>`;
}
