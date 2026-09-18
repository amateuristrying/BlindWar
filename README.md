# BlindWar

Mobile-first web game. No build step, no dependencies — plain HTML/CSS/ES modules.

## Run

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

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
src/styles/curtain.css the curtain
src/js/grids.js       the four drifting corner boards (reusable board SVG)
src/js/icons.js       inline SVG icons, all drawn with currentColor
src/js/modes.js       mode picker, built from MODE_GROUPS
src/js/search.js      Friend Hash screen: lookup, send request, copy own hash
src/js/match.js       match settings: difficulty, time limit, player colour
src/js/ready.js       readiness screen: two boards, one black line
src/js/fleet.js       the fleet and the placement rules (pure logic, no DOM)
src/js/place.js       defence placement: board, inventory, 120s timer
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
filter on the clipped element is cut away with it, and a white strip on a
near-white page needs that shadow to read at all.

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
tap a unit to pick it up, tap a square to drop it (or drag from the tray
straight onto the board), Rotate cycles the four orientations, and tapping a
placed unit lifts it back into the tray. Ready unlocks at 24/24. If the
120-second timer runs out first, `autoPlace()` finishes the job and the
badge says so.

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
