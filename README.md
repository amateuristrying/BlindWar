# BlindWar

Mobile-first web game. No build step, no dependencies — plain HTML/CSS/ES modules.

## Run

```bash
python3 dev-server.py 4173
```

It is `http.server` with `Cache-Control: no-store` bolted on, because plain
`http.server` sends no cache headers and browsers then serve yesterday's
`index.html` — which looks exactly like a change that didn't work.

- Laptop: http://localhost:4173
- Phone (same Wi-Fi): http://<your-mac-ip>:4173

## Layout

```
index.html            home screen markup + empty slot for each later screen
src/styles/base.css   design tokens, reset, screen system, the black button state
src/styles/home.css   backdrop, brand, menu
src/styles/modes.css  mode picker tiles and friend list
src/styles/search.css Friend Hash screen
src/styles/match.css  match settings, option chips, glossy colour balls
src/styles/ready.css  readiness screen
src/styles/place.css  placement board and Your Defence tray
src/styles/battle.css the match screen
src/styles/sheet.css  bottom sheet, "?" buttons, settings switches
src/styles/curtain.css the curtain
src/js/grids.js       the four drifting corner boards (reusable board SVG)
src/js/icons.js       inline SVG icons, all drawn with currentColor
src/js/modes.js       mode picker, built from MODE_GROUPS
src/js/search.js      Friend Hash screen: lookup, send request, copy own hash
src/js/match.js       match settings: difficulty, time limit, player colour
src/js/ready.js       readiness screen: two boards, one black line
src/js/fleet.js       the fleet and the placement rules (pure logic, no DOM)
src/js/place.js       defence placement: board, inventory, 120s timer
src/js/engine.js      match rules: shots, turns, mines, progress, victory
src/js/battle.js      the match screen: two battlefields, cannons, clocks
src/js/sound.js       every sound, synthesised with Web Audio (no files)
src/js/haptics.js     vibration patterns, with an iPhone fallback
src/js/feel.js        feel('hit') = the sound and the vibration together
src/js/prefs.js       Sound / Vibration switches, remembered on the device
src/js/help.js        the "?" topics — also the game's rulebook
src/js/sheet.js       the bottom sheet for help and Settings
src/js/curtain.js     the white strip-to-cover page curtain
src/js/main.js        screen router, press feedback, actions
```

## Screens

- `home` — Start / Rules / Settings
- `modes` — Online and Friends, each with 1 v 1 and 2 v 2 (after Start).
  The Friends card also carries the friend list: `FRIENDS` in
  [modes.js](src/js/modes.js) is empty, so it shows the empty state; push
  `{ name, hash }` objects into it and the list renders instead.

- `search` — Friend Hash lookup (from "Search for friends")
- `match` — match settings (tap a friend's row in the friend list)
- `ready` — player readiness, entered through the curtain from Start Match
- `place` — defence placement, entered through a 3-2-1 countdown curtain
- `battle` — the match itself, entered by pulling back from your own board

Routing is `history`-based, so the phone's back gesture works. Screens are
re-rendered on entry, so a friend added on the search screen is already in
the list when you go back. Rules and
Settings dispatch `blindwar:navigate` but have no screen yet; the mode tiles
dispatch `blindwar:mode` (`detail.mode` = `online-1v1` | `online-2v2` |
`friends-1v1` | `friends-2v2`). "Search for friends" opens the `search` screen.

## The curtain

`curtain(swap)` in [curtain.js](src/js/curtain.js) runs the page transition
adapted from the Codrops Astro/Barba/GSAP "team" demo: a white strip the
height of its own text wipes in from the left edge, opens out to cover the
screen (`swap()` is called here), then the word slides up and the cover
retracts off the top. No GSAP — `clip-path` polygons interpolate natively as
long as the point count stays at four. Eases are the originals:
`cubic-bezier(.87,0,.13,1)` going in, `cubic-bezier(.56,0,.35,.98)` coming
out, at roughly a third of the original's duration.

The drop-shadow sits on `.curtain`, not on the clipped `.curtain__panel`: a
filter on the clipped element is cut away with it. A shadow alone still isn't
enough on a white screen, so the page dims behind the strip while it travels
— the curtain itself stays white. Passing `countdown: ['3','2','1']` shows
each number in turn and deepens the strip to carry them.

## Placement

[fleet.js](src/js/fleet.js) holds the fleet and the rules, with no DOM
attached, so it can be exercised straight from node:

- 1 missile (5), 2 cannons (4), 2 mortars (3), 1 tank (2), 1 soldier (1),
  2 mines (1) = 22 defence tiles + 2 mines = `TOTAL_TILES` 24, the same at
  every board size
- four orientations: `h` across, `v` down, `d` down-right, `a` down-left
- `fits()` rejects anything off-board or overlapping, partial overlap
  included
- `autoPlace()` fills whatever is left in the tray without disturbing
  anything placed by hand; if a run boxes itself in it rolls back only its
  own pieces and retries, falling back to orthogonal-only for the last few
  attempts

The screen ([place.js](src/js/place.js)) drives it with one pointer flow:
tap a unit to pick it up, tap a square to drop it, or drag it from the tray
straight onto the board with a finger. Dropping takes the first orientation
that fits (`firstFit`), and every placed multi-tile unit carries a pair of
half-circle arrows that turn it around its anchor square — `rotate()` skips
orientations that don't fit and puts the unit back untouched if none do.
Tapping a placed unit lifts it back into the tray. Ready unlocks at 24/24;
if the 120-second timer runs out first, `autoPlace()` finishes the job and
the badge says so.

Two details that matter on a phone: the tray cards set `touch-action: none`
so a drag off them doesn't pan the page, and the unit icons are sprite
symbols referenced with `<use>` rather than inline SVG — a board and tray
hold 40 of them, and re-parsing that markup on every repaint made icons
arrive late or not at all.

## The match

[engine.js](src/js/engine.js) is the rules, with no DOM, so it can be played
from node. Each side owns its fleet and the shots that have landed on it,
which makes the attacker's progress simply how much of the other side has
been uncovered.

- **Miss** — the square is marked and the turn passes.
- **Hit** — the tile burns, the attacker's Defences Destroyed goes up, and
  they shoot again. When every tile of a unit is found it stops burning and
  is revealed for what it was, and the owner's fleet strip strikes it off.
- **Mine** — revealed permanently, never counted as defence progress, and
  the attacker forfeits their *next* turn: the other player takes a turn,
  then goes again while the forfeited one is consumed.
- **Win** at 22/22. **Flawless** if no mine was ever triggered.

Timers count down only on the active player's turn; "No Time Limit" shows no
clock. Running out ends that turn.

The screen ([battle.js](src/js/battle.js)) lays both battlefields out with
the cannons between them. Tapping a square swings the firing cannon onto it
and sends a shot before the result lands. The far side is rotated 180°: it
belongs to the player sitting across from you, so it reads the right way up
for them.

Neither board ever draws its owner's fleet — only what has been found — so
one device can hold both players without leaking placements.

The opponent is a stand-in until there is a backend: `chooseShot()` finishes
whatever unit it has wounded before searching fresh squares.

## Sound, vibration and help

**Sound.** [sound.js](src/js/sound.js) synthesises everything with Web Audio —
oscillators and filtered noise, no audio files — so it adds nothing to load
and works offline. The context is created on the first tap, as browsers
require. Each hit in a row climbs a whole tone, so a streak *sounds* like
one. On iPhone the ringer switch silences Web Audio.

**Vibration.** [haptics.js](src/js/haptics.js) has a pattern per moment: a
single pulse to fire, a double on a hit, a long rumble on a mine. Android
plays all of them. iPhone Safari has no Vibration API; on iOS 18+ toggling a
hidden `<input switch>` gives one light system tap, which is the most the web
can do there — only one tap per event, and only during a tap the player just
made, so the opponent's shots can't be felt.

Both are switched in Settings and remembered on the device.

**Help.** Every screen has a "?" in the corner (or in the duel band during a
match), and the key sections have their own small one — difficulty, time,
colour, the fleet, Defences Destroyed. The topics in
[help.js](src/js/help.js) double as the rulebook, and the home screen's
Rules button opens the full one. Opening help or Settings pauses the match
clock and the opponent, and the placement timer.

## Placeholder behaviour (no backend yet)

- Any hash finds a player. The name comes from a hash of the digits, so the
  same hash always returns the same player — `nameForHash()` in
  [search.js](src/js/search.js).
- The paper-plane button adds them to `FRIENDS` immediately; there is no
  pending-request state yet.
- The player's own hash is generated once and kept in `localStorage`
  (`blindwar.hash`). `FRIENDS` is in memory only, so it resets on reload.
- Match settings live in `settings` in [match.js](src/js/match.js) and default
  to Moderate 8x8 / 10 Minutes. No colour is preselected, so Start Match
  nudges the colour card until one is picked; then it dispatches
  `blindwar:start-match` with the opponent and the chosen settings.
- Colour ball names (Atmo, Kylo, Jerry, Shiv) show only for the selected ball;
  the space is reserved so the card never jumps.
- The readiness screen invents a local player: `nameForHash(myHash())`, so
  you get a stable handle without a profile screen. The rival takes a colour
  that isn't yours, picked from their hash.
- The rival "joins" on a 5s timer that starts once the curtain is clear, then
  their plate slides in from their side of the line. Tapping Ready dispatches
  `blindwar:ready`; placement is not built yet.
- Clipboard: `navigator.clipboard` needs a secure context, which
  `http://<lan-ip>` is not, so copy falls back to `execCommand` and then to
  showing the hash in the button for manual copying.

Any button that *does* something — menu buttons, mode tiles, friend rows,
Find Friend, Start Match, the round back button — turns black with white text
and icons on hover (mouse) or press (touch). Icons use `currentColor` so they
invert for free.

Buttons that *choose* something are the exception: difficulty, time limit and
the colour balls keep their own colour, because black would erase the meaning
they carry and collide with the selected state. They answer hover with a
coloured border and, for the balls, a lift and a brighter glow.
