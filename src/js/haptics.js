/**
 * Vibration, shaped per event.
 *
 * Android has the Vibration API and gets every pattern below. iPhone
 * Safari has no Vibration API at all; on iOS 18+ toggling a hidden
 * <input switch> produces one light system tap, which is the most the web
 * can do there — and only inside a tap the player just made.
 */

import { prefs } from './prefs.js';

const PATTERN = {
  tap: 6, back: 6, select: 10, invalid: [14, 40, 14], copy: 10, found: 14, send: 14,
  tick: 12, go: 35, join: [12, 40, 12], ready: 22,
  place: 16, lift: 8, rotate: 8, lowTime: 5,
  fire: 16, miss: 8, hit: [20, 30, 40], hurt: 45,
  destroyed: [35, 35, 70, 35, 110], lostUnit: [90, 40, 90],
  hint: [10, 50, 10], mine: [120, 50, 220], turn: 12, skipped: [20, 60, 20],
  win: [40, 50, 40, 50, 160], flawless: [30, 30, 30, 30, 30, 30, 220], lose: 200,
};

let iosSwitch;

function iosTap() {
  if (!iosSwitch) {
    iosSwitch = document.createElement('label');
    iosSwitch.setAttribute('aria-hidden', 'true');
    iosSwitch.style.cssText =
      'position:fixed;left:-200px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    iosSwitch.append(input);
    document.body.append(iosSwitch);
  }
  iosSwitch.click();
}

export const canVibrate = () => typeof navigator.vibrate === 'function';

export function buzz(name) {
  if (!prefs.haptics) return;
  const pattern = PATTERN[name];
  if (pattern == null) return;

  if (canVibrate()) {
    /* Chrome refuses (and logs an error) until the page has had a real tap */
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try { navigator.vibrate(pattern); } catch { /* not allowed right now */ }
    return;
  }
  try { iosTap(); } catch { /* no haptics available */ }
}
