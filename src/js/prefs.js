/** Player preferences, remembered on this device. */

const KEY = 'blindwar.prefs';
const DEFAULTS = { sound: true, haptics: true };

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export const prefs = load();

export function setPref(name, value) {
  prefs[name] = value;
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* private mode */ }
}
