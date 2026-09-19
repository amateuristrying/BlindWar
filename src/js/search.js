import {
  duoIcon, searchIcon, copyIcon, planeIcon, checkIcon, infoIcon, arrowLeftIcon,
} from './icons.js';
import { FRIENDS } from './modes.js';
import { helpButton } from './help.js';
import { feel } from './feel.js';

/* ── Stand-in for a real lookup ───────────────────────────────────────
   Any hash finds someone. The name is derived from the digits, so the
   same hash always returns the same player — like a real directory
   would — instead of a new name on every search.                      */

const FIRST = ['Nova', 'Echo', 'Kite', 'Delta', 'Onyx', 'Pixel', 'Rook', 'Vega',
  'Zephyr', 'Comet', 'Blitz', 'Ember', 'Ghost', 'Indigo', 'Jetty', 'Koda'];

const LAST = ['Falcon', 'Ranger', 'Hunter', 'Pilot', 'Raven', 'Tiger', 'Captain',
  'Wolf', 'Storm', 'Phantom', 'Viper', 'Cobra', 'Drake', 'Fox', 'Shark', 'Lynx'];

/** Tiny stable hash — stands in for a server until there is one. */
export const hashSeed = (str) => {
  let h = 5381;
  for (const ch of String(str)) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return h;
};

export const nameForHash = (digits) => {
  const h = hashSeed(digits);
  return `${FIRST[h % FIRST.length]} ${LAST[(h >>> 4) % LAST.length]}`;
};

/* ── This player's own hash ──────────────────────────────────────────── */

const HASH_KEY = 'blindwar.hash';
let ownHash;

export function myHash() {
  if (ownHash) return ownHash;
  try {
    ownHash = localStorage.getItem(HASH_KEY) || '';
  } catch { /* private mode */ }
  if (!ownHash) {
    ownHash = String(Math.floor(10_000_000 + Math.random() * 90_000_000));
    try { localStorage.setItem(HASH_KEY, ownHash); } catch { /* ignore */ }
  }
  return ownHash;
}

/* Clipboard over plain http (phone on the LAN) has no navigator.clipboard,
   so fall back to the old selection trick. */
function legacyCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.append(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { /* ignore */ }
  ta.remove();
  return ok;
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  return legacyCopy(text);
}

/* ── Screen ─────────────────────────────────────────────────────────── */

const esc = (v) =>
  String(v).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

const META = {
  new: (hash) => `#${hash}`,
  added: () => 'Added to your friends',
  existing: () => 'Already your friend',
};

const resultRow = (digits, name, state) => `
  <div class="result${state === 'new' ? '' : ' is-added'}">
    <span class="result__avatar">${esc(name.charAt(0))}</span>
    <span class="result__text">
      <span class="result__name">${esc(name)}</span>
      <span class="result__meta">${META[state](digits)}</span>
    </span>
    ${state === 'new'
      ? `<button class="send" type="button" aria-label="Send friend request to ${esc(name)}">${planeIcon()}</button>`
      : `<span class="result__done">${checkIcon()}</span>`}
  </div>`;

export function renderSearch(host) {
  host.innerHTML = `
    <button class="icon-btn" type="button" data-action="back" aria-label="Back">
      ${arrowLeftIcon()}
    </button>
    ${helpButton('hash', 'corner', 'About Friend Hash')}

    <div class="screen__inner">
      <header class="brand brand--compact">
        <h1 class="brand__title">BlindWar</h1>
        <p class="brand__tagline">
          <span>Guess</span><b class="brand__dot" aria-hidden="true"></b>
          <span>Avoid</span><b class="brand__dot" aria-hidden="true"></b>
          <span>Win</span>
        </p>
      </header>

      <div class="cards">
        <section class="card hash">
          <span class="hash__icon">${duoIcon()}</span>
          <h2 class="hash__title">Friend Hash</h2>
          <p class="hash__sub">Every player has a unique Friend Hash.</p>

          <label class="hash-field">
            <span class="hash-field__prefix" aria-hidden="true">#</span>
            <input class="hash-field__input" type="text" inputmode="numeric"
                   autocomplete="off" spellcheck="false" maxlength="8"
                   placeholder="12345678" aria-label="Friend Hash" />
          </label>

          <button class="action action--primary" type="button" data-find>
            <span class="action__icon">${searchIcon()}</span>
            <span class="action__label">Find Friend</span>
          </button>

          <div class="hash__result" aria-live="polite" hidden></div>

          <button class="action action--ghost" type="button" data-copy>
            <span class="action__icon">${copyIcon()}</span>
            <span class="action__label">Copy My Hash</span>
          </button>

          <p class="hash__note">
            ${infoIcon()}<span>Your Friend Hash is available in Settings.</span>
          </p>
        </section>
      </div>
    </div>`;

  const input = host.querySelector('.hash-field__input');
  const findBtn = host.querySelector('[data-find]');
  const copyBtn = host.querySelector('[data-copy]');
  const copyLabel = copyBtn.querySelector('.action__label');
  const result = host.querySelector('.hash__result');

  const digits = () => input.value.replace(/\D/g, '').slice(0, 8);

  input.addEventListener('input', () => {
    const v = digits();
    if (v !== input.value) input.value = v;
    result.hidden = true;   // a new query invalidates the old answer
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); findBtn.click(); }
  });

  const field = host.querySelector('.hash-field');

  const findFriend = () => {
    const v = digits();

    /* nothing typed yet: point at the field rather than going dead */
    if (!v) {
      feel('invalid');
      input.focus();
      field.classList.remove('is-nudge');
      requestAnimationFrame(() => field.classList.add('is-nudge'));
      return;
    }

    const name = nameForHash(v);
    const known = FRIENDS.some((f) => f.hash === `#${v}`);
    result.innerHTML = resultRow(v, name, known ? 'existing' : 'new');
    result.hidden = false;
    feel('found');

    result.querySelector('.send')?.addEventListener('click', () => {
      FRIENDS.push({ name, hash: `#${v}` });
      feel('send');
      result.innerHTML = resultRow(v, name, 'added');
    });
  };

  findBtn.addEventListener('click', findFriend);

  copyBtn.addEventListener('click', async () => {
    feel('copy');
    const ok = await copyText(`#${myHash()}`);
    copyLabel.textContent = ok ? 'Copied!' : `#${myHash()}`;
    setTimeout(() => { copyLabel.textContent = 'Copy My Hash'; }, 1800);
  });
}
