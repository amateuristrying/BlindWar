/** One call per game moment: its sound and its vibration together. */

import { play } from './sound.js';
import { buzz } from './haptics.js';

export function feel(name, ...args) {
  play(name, ...args);
  buzz(name);
}
