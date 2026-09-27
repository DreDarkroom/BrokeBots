# BROKEBOTS

**DARKLABS BOT BEHAVIOUR EXPERIMENT**

Play it: **https://dredarkroom.github.io/brokebots/**

BrokeBots is a browser-game experiment from DreDarkroom / Darklabs. It puts two
over-engineered, malfunctioning robots in a very simple competitive environment
and watches what they do. The game is Pong-style. The robots are the point.

## Concept

The idea started with one question: what if game bots weren't just functional
AI, but odd machines with personality, quirks and faults? BrokeBots puts two
generations of robotics in one test chamber, and both of them are broken:

| | **OSSIE** · DL-1951 | **LUMA-9** · DL-2031 |
|---|---|---|
| Era | Analogue, industrial | Digital, precision-engineered |
| Build | Oxidised bronze, bolts, rail wheels, tired springs, exposed wiring | Clean plating, display face, mag-rail clamp, lidar bar, status LEDs |
| Sensor | Oscilloscope eye that slowly tracks the ball | Pixel eyes that look where it *thinks* the ball will land |
| Faults | Wobbly suspension, stutters, dozes off, lets off steam, loses a bolt every time it concedes | Over-corrects, glitches, throws error codes, its screen cracks and LEDs die as it concedes |
| Sound | Chunky, analogue, a bit out of tune | Sharp, digital, bit-crunchy |

The personality layer is only cosmetic. The AI decides where a plate goes, and
the personality layer decides how the machine looks and sounds while it gets
there. A bot can look like it's falling apart without changing the physics.

## Controls

| Action | Keys |
|---|---|
| OSSIE (left) | `W` / `S` |
| LUMA-9 (right) | `↑` / `↓` |
| Pause / resume | `Space` (or the `II` button) |
| Confirm / start | `Enter` |
| Menu | `Esc` |
| Restart | `R` |
| Mute | `M` (or the `SND` button) |

In single player, either key set drives your bot.

**Touch:** drag anywhere to steer. The drag is relative, so it also works in
portrait with your thumb below the arena. In two-player touch, the left half of
the screen steers OSSIE and the right half steers LUMA-9.

## Modes and difficulty

- **Single player:** you against the CPU. You pick which bot to pilot.
- **Two player:** local, same keyboard (or split-screen touch).
- **First to:** 5, 7 or 11.
- **Difficulty:** Easy, Normal or Hard. The AI only looks at the ball every so
  often (reaction delay). Its prediction error shrinks as the ball gets closer,
  its plate speed is capped, and on each incoming ball it has a chance of a bad
  read. Harder levels see more often, predict better, move faster and aim for
  the plate edges.

## Technical

- Vanilla HTML, CSS and JavaScript. No framework, no build step, no
  dependencies, no external requests.
- **Hybrid rendering:** the canvas draws the arena, plates, ball and sparks.
  The robots are original inline SVG in absolutely positioned DOM elements,
  animated with transforms. Both layers share one logical coordinate system
  (1200 × 675), and the whole cabinet scales as a single unit, so resizing
  never knocks them out of alignment.
- **Physics:** `requestAnimationFrame`, delta-time, and a clamped frame step.
  Ball-vs-plate collision is a swept test against each plate's face, so the
  ball can't tunnel through a plate at any speed. The automated QA fires balls
  at up to 8000 u/s with 0.2 s frames.
- **Audio:** a small Web Audio system with two primitives (tone and filtered
  noise) that every sound is built from. It starts only after a user gesture.
  There are no audio files.
- **CRT look:** CSS-only scanlines, vignette and flicker overlays with
  `pointer-events: none`. No canvas pixel processing.
- **Mobile:** `touch-action: none` and `preventDefault` on game input, so the
  page doesn't scroll, zoom or pull-to-refresh.

```
index.html      page + UI screens
style.css       Darklabs test-chamber styling, CRT overlays
js/config.js    constants, difficulty profiles, helpers
js/physics.js   plates, ball, swept collision, prediction
js/ai.js        gameplay AI (where to move)
js/bots.js      SVG bot art + personality layer (how to look/sound)
js/audio.js     procedural Web Audio
js/input.js     keyboard + pointer/touch
js/render.js    canvas drawing
js/game.js      state machine, loop, menus, layout
```

## Local development

No install step. Serve the folder with any static server and open it in a
browser:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

Opening `index.html` directly from disk also works, because the scripts are
plain, non-module files.

## GitHub Pages deployment

The site is served from the `main` branch root. Every path is relative, and the
empty `.nojekyll` file tells Pages to serve the files as they are. To deploy a
fork, go to **Settings → Pages → Build and deployment → Deploy from a branch**
and choose `main` / `/ (root)`.

## Originality / IP

BrokeBots is an original Darklabs experiment. The robot designs, names, SVG
artwork, sounds and code were all made for this project. The sounds are
synthesised in code. There are no samples, no AI-generated audio and no
third-party assets. The robots are not based on any existing franchise,
character, prop or brand. BrokeBots is an independent project and is not
affiliated with any other game or studio.

© DreDarkroom / Darklabs
