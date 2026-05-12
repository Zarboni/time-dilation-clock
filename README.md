# Timefall: A Relativity Clock

A browser-based experience that shows how gravity slows time near a black hole. Two clocks run side by side — one far from the black hole, one close to it — and you can adjust the gravitational pull to see how far apart they drift. There's also a short game where you fly a ship through a debris field and try to reach the event horizon.

---

## Live Demo

[https://zarboni.github.io/time-dilation-clock/](https://zarboni.github.io/time-dilation-clock/)

---

## What It Does

**Timefall screen**

- Two clocks run simultaneously. The observer clock (far from the black hole) keeps normal time. The clock near the black hole runs slower — how much slower depends on the gravity slider.
- The gravity slider lets you adjust the gravitational pull between 0.10 and 1.00. The near-black-hole clock updates in real time as you drag.
- The Time Differential panel shows the practical result: if 1 hour passes near the black hole, how much time has passed for a distant observer? At the default setting it's a little over 2 hours.
- A formula panel below the observer clock explains the physics: `Δt' = Δt × √(1 − gravityFactor)`.
- Science quotes rotate every 10 seconds in the lower section.
- The starfield and lensing animation in the background respond subtly to the gravity setting.

**Game mode**

- Click "Try to reach the black hole" to enter the game.
- You control a ship and have 75 seconds to reach the event horizon while a debris field falls toward you.
- Dodge what you can, shoot what you can't. Difficulty increases gradually over the 75 seconds.
- Reach the end and your ship gets pulled into the black hole. Get hit by debris and the run ends.

---

## Quick Start

1. Clone or download the project.
2. Open `index.html` in any modern desktop browser (Chrome, Firefox, Safari, Edge).
3. Click **Begin** to start the clocks and audio.

No build step, no dependencies, no server required.

> **Audio note:** Browsers block audio until the user interacts with the page. Clicking **Begin** handles this. If you want music, add your own audio files — see the Audio section below.

---

## Controls

**Timefall screen**

| Control | What it does |
|---|---|
| Gravity slider | Adjusts gravitational pull. Both the near-black-hole clock and the differential panel update instantly. |

**Game mode**

| Key | Action |
|---|---|
| `W` / `↑` | Move up |
| `S` / `↓` | Move down |
| `A` / `←` | Move left |
| `D` / `→` | Move right |
| `Space` | Shoot — tap to fire once, hold to autofire |
| **Play Again** button | Restart after a run ends |
| **Back to Timefall** button | Exit the game and return to the clocks |

---

## Files

| File | What it is |
|---|---|
| `index.html` | Page structure and all content |
| `style.css` | Layout, visual styling, and responsive behaviour |
| `script.js` | All logic: clocks, animations, game, audio |
| `IC.mp3` *(optional)* | Ambient audio that plays on the Timefall screen |
| `FLIGHT.mp3` *(optional)* | Audio that plays during the game — cross-fades with IC.mp3 |

---

## Audio

The project works without audio files. If you want sound:

- Place `IC.mp3` in the project root for the Timefall ambient track.
- Place `FLIGHT.mp3` in the project root for the game soundtrack.
- The two tracks cross-fade when you enter and exit the game.
- You can use any audio format your browser supports — just rename the files or update the source paths in `script.js`.

---

## Customising

- **Quotes** — Edit the `quotes` array near the top of `script.js`.
- **Starting gravity** — Change `value="0.8"` on the slider in `index.html`.
- **Colours and fonts** — Everything visual is in `style.css`. The two main accent colours are set as CSS variables at the top: `--accent` (cyan) and `--accent-deep` (purple).
- **Game difficulty** — The spawn rate, debris speed, and max debris count are controlled by three `lerp()` calls near the top of the `updateDebris` function in `script.js`.

---

## How the Physics Works

The time dilation formula used is a simplified version of the Schwarzschild solution:

```
Δt' = Δt × √(1 − gravityFactor)
```

- `Δt` is the time that passes for a distant observer.
- `Δt'` is the time that passes near the black hole.
- `gravityFactor` represents how deep in the gravitational well you are (0 = far away, 1 = at the event horizon).

At `gravityFactor = 0.8`, the near-black-hole clock runs at about 45% of normal speed. For every hour that passes there, roughly 2 hours and 14 minutes pass for a distant observer.

---

## Built With

- Plain HTML, CSS, and vanilla JavaScript — no frameworks or libraries.
- Canvas API for the starfield, lensing animation, and game.
- Google Fonts: [Orbitron](https://fonts.google.com/specimen/Orbitron) and [Titillium Web](https://fonts.google.com/specimen/Titillium+Web).

---

## Credits

Inspired by the film *Interstellar* and its portrayal of relativistic time dilation.
