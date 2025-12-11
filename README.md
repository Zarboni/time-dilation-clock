# Timefall: A Relativity Clock

An immersive, browser-based journey into gravitational time dilation inspired by *Interstellar*. Watch two clocks tick at different speeds, explore animated spacetime visuals, and hear ambient music as you immerse in the pull of gravity.

---

## What You’ll See
- **Landing Moment** – A star-dusted introduction with a “Begin” button that starts the experience and the soundtrack (when an audio file is present).
- **Observer vs. Singularity Clocks** – One clock keeps regular time while the other slows down according to Einstein’s relativity.
- **Interactive Gravity Slider** – Drag to strengthen gravity and immediately see the singularity clock slow down.
- **Time Differential Panel** – Learn how much extra time passes for a distant observer when an hour slips by near the black hole.
- **Animated Space Backdrop** – A canvas-powered starfield and gravitational lensing effect create a cinematic feel.
- **Gravity-Reactive Visuals** – The starfield drift and lensing ring motion subtly speed up or slow down as you adjust gravity.
- **Rotating Quotes** – Every few seconds a new science or sci-fi quote appears, keeping the narrative alive.

---

## Quick Start

1. Download or clone the project files.
2. Optional: place an ambient soundtrack and name it `IC.mp3` in the project root.
3. Open `index.html` in any modern desktop or mobile browser.
4. Click **Begin** to start the clocks, animations, and audio.

> Tip: Browsers require a user action before playing sound. Clicking **Begin** satisfies that requirement.

---

## Live Preview

- Experience the project in your browser: <https://zarboni.github.io/time-dilation-clock/>

---

## Controls & Interactions

| Control | What It Does |
|---------|--------------|
| **Begin** button | Reveals the experience and starts the ambient audio (if present). |
| **Gravitational Pull slider** | Adjusts the gravity factor between 0.10 and 1.00. The singularity clock and differential panel update instantly. |
| **Hover on “Near the Singularity” card** | A tooltip explains the time dilation formula. |

---

## Files at a Glance

| File | Purpose |
|------|---------|
| `index.html` | Page structure and content. |
| `style.css` | Styling, layout, and responsive behavior. |
| `script.js` | Clock logic, animations, audio activation, and slider interactions. |
| `IC.mp3` *(optional)* | Ambient soundtrack that plays after **Begin** is clicked. |

---

## Customising the Experience

- **Audio**: Replace `IC.mp3` with any track you like (keep the same filename or update the `script.js` source path).
- **Quote Pool**: Edit the `quotes` array in `script.js` to include your favourite lines.
- **Initial Gravity**: Adjust the default slider value in `index.html` (`value="0.8"`) to start with a different intensity.
- **Colours & Fonts**: Tweak `style.css` to match your preferred sci-fi palette or typography.

---

## Tech Notes (for the curious)

- Built with plain HTML, CSS, and vanilla JavaScript – no frameworks required.
- Uses `requestAnimationFrame` for smooth starfield and lensing animations.
- Time dilation uses the simplified formula `Δt' = Δt × √(1 - gravityFactor)`.
- The differential panel converts the gravity factor into an Earth-time ratio and displays it in hours, minutes, and seconds.

---

## Credits & Inspiration

- Inspired by the film *Interstellar* and its exploration of relativity.
- Typeface choices: [Orbitron](https://fonts.google.com/specimen/Orbitron) and [Titillium Web](https://fonts.google.com/specimen/Titillium+Web).
- Soundtrack placeholder: `IC.mp3` (bring your own audio to personalise the atmosphere).

Enjoy bending time! If you adapt or share the project, a mention of the original concept is always appreciated. ✨
