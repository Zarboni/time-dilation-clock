const quotes = [
  { text: "Somewhere, something incredible is waiting to be known.", author: "Carl Sagan" },
  { text: "Equipped with his five senses, man explores the universe around him and calls the adventure Science.", author: "Edwin Hubble" },
  { text: "Time is what prevents everything from happening at once.", author: "John Archibald Wheeler" },
  { text: "The important thing is not to stop questioning. Curiosity has its own reason for existing.", author: "Albert Einstein" },
  { text: "The Universe doesn’t allow perfection.", author: "Stephen Hawking" },
  { text: "Look up at the stars and not down at your feet. Try to make sense of what you see.", author: "Stephen Hawking" },
  { text: "Physics is not the most important thing. Love is.", author: "Murph, Interstellar" },
  { text: "Reality is merely an illusion — albeit a very persistent one.", author: "Albert Einstein" }
];

document.addEventListener("DOMContentLoaded", () => {
  const beginButton = document.getElementById("beginButton");
  const landingScreen = document.getElementById("landing");
  const experience = document.getElementById("experience");
  const observerClock = document.getElementById("observerClock");
  const singularityClock = document.getElementById("singularityClock");
  const ambientAudio = document.getElementById("ambientAudio");
  const formulaTooltip = document.getElementById("formulaTooltip");
  const singularityCard = document.querySelector(".clock-card.singularity");
  const quoteContainer = document.getElementById("quoteContainer");
  const differentialCard = document.querySelector(".differential-card");
  const gravitySlider = document.getElementById("gravitySlider");
  const gravityValue = document.getElementById("gravityValue");
  const tooltipGravityValue = document.getElementById("tooltipGravityValue");
  const differentialValue = document.getElementById("differentialValue");
  const starfieldCanvas = document.getElementById("starfieldCanvas");
  const lensingCanvas = document.getElementById("lensingCanvas");
  const gameToggleButton = document.getElementById("gameToggle");
  const gameMode = document.getElementById("gameMode");
  const backToTimefallButton = document.getElementById("backToTimefallButton");
  const gameCanvas = document.getElementById("gameCanvas");
  const playAgainButton = document.getElementById("playAgainButton");
  const flightAudio = document.getElementById("flightAudio");

  if (ambientAudio) {
    ambientAudio.src = "IC.mp3";
    ambientAudio.loop = true;
  }
  if (flightAudio) {
    flightAudio.src = "FLIGHT.mp3";
    flightAudio.loop = true;
    flightAudio.volume = 0;
  }

  const updateInterval = 100;
  const STAR_COUNT = 260;
  const ARRIVAL_SECONDS = 75;
  const END_PHASE_SECONDS = 12;
  const ABSORB_DURATION_MS = 1400;

  let gravityFactor = gravitySlider ? parseFloat(gravitySlider.value) : 0.8;
  gravityFactor = Number.isFinite(gravityFactor) ? gravityFactor : 0.8;
  let dilationFactor = Math.sqrt(Math.max(0, 1 - gravityFactor));
  let clockIntervalId = null;
  let baseTimestamp = Date.now();
  let lastTickTimestamp = baseTimestamp;
  let dilatedElapsed = 0;
  let quoteTimeoutId = null;
  let quoteIntervalId = null;
  let currentQuoteIndex = -1;
  let starfieldCtx = null;
  let lensingCtx = null;
  const stars = [];
  let starfieldAnimationId = null;
  let lensingAnimationId = null;
  let lensingAngle = 0;
  let starDriftMultiplier = 1;
  let lensingSpeed = 0.0026;

  const game = {
    running: false,
    over: false,
    ctx: null,
    width: 0,
    height: 0,
    lastTimestamp: 0,
    ship: null,
    debris: [],
    keys: new Set(),
    progress: 0,
    survivalTime: 0,
    spawnTimer: 0,
    spawnInterval: 900,
    shakeIntensity: 0,
    rafId: null,
    reachedHorizon: false,
    pEase: 0,
    qEase: 0,
    absorbing: false,
    absorbTimer: 0,
    absorbDuration: ABSORB_DURATION_MS,
    absorbStart: { x: 0, y: 0 },
    shipScale: 1,
    cameraOffsetX: 0,
    cameraOffsetY: 0,
    shipTilt: 0,
    shipTiltTarget: 0,
    renderTime: 0,
    failureMessages: [
      "The event horizon has been reached.",
      "Causal contact is no longer possible.",
      "Information cannot escape this region."
    ],
    lastFailureMessage: null,
    arrivalMessages: [
      "The event horizon has been reached.",
      "Causal contact is no longer possible.",
      "Information cannot escape this region."
    ],
    lastArrivalMessage: null,
    nextStageLaunched: false
  };

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const MIN_SAFE_DILATION = 0.0005;
  const T_RAMP = ARRIVAL_SECONDS;
  const AMBIENT_VOL = 0.7;
  const FLIGHT_VOL = 0.75;

  const formatHoursToHMS = (hours) => {
    if (!Number.isFinite(hours) || hours > 1e6) {
      return "∞";
    }
    const totalSeconds = Math.max(0, Math.round(hours * 3600));
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    const pad = (value) => String(value).padStart(2, "0");
    return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  };

  function updateDifferentialValue() {
    if (!differentialValue) {
      return;
    }
    const safeDilation = Math.max(dilationFactor, MIN_SAFE_DILATION);
    const ratioHours = 1 / safeDilation;
    const nextValue = formatHoursToHMS(ratioHours);

    differentialValue.classList.add("updating");
    window.setTimeout(() => {
      differentialValue.textContent = nextValue;
      requestAnimationFrame(() => {
        differentialValue.classList.remove("updating");
      });
    }, 120);
  }

  const updateGravityDisplay = (value) => {
    if (gravityValue) {
      gravityValue.textContent = value.toFixed(2);
    }
    if (tooltipGravityValue) {
      tooltipGravityValue.textContent = value.toFixed(2);
    }
  };

  const setGravityFactor = (value, { silent = false } = {}) => {
    const clamped = Math.min(Math.max(value, 0.1), 1);
    gravityFactor = clamped;
    const adjusted = Math.min(clamped, 0.999);
    dilationFactor = Math.sqrt(Math.max(0, 1 - adjusted));
    starDriftMultiplier = 0.5 + gravityFactor * 1.2;
    lensingSpeed = 0.001 + gravityFactor * 0.003;
    updateGravityDisplay(gravityFactor);
    if (!silent) {
      updateDifferentialValue();
    }
  };

  const startClocks = () => {
    if (clockIntervalId) {
      return;
    }

    baseTimestamp = Date.now();
    lastTickTimestamp = baseTimestamp;
    dilatedElapsed = 0;

    const tick = () => {
      const now = Date.now();
      const delta = now - lastTickTimestamp;
      lastTickTimestamp = now;
      dilatedElapsed += delta * dilationFactor;

      const realTime = new Date(now);
      observerClock.textContent = formatTime(realTime);

      const dilatedTime = new Date(baseTimestamp + dilatedElapsed);
      singularityClock.textContent = formatTime(dilatedTime);

      clockIntervalId = window.requestAnimationFrame(tick);
    };

    tick();
  };

  const stopClocks = () => {
    if (clockIntervalId) {
      window.cancelAnimationFrame(clockIntervalId);
      clockIntervalId = null;
    }
  };

  const initGameCanvas = () => {
    if (!gameCanvas) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    gameCanvas.width = width * dpr;
    gameCanvas.height = height * dpr;
    gameCanvas.style.width = `${width}px`;
    gameCanvas.style.height = `${height}px`;
    game.ctx = gameCanvas.getContext("2d");
    game.ctx.setTransform(1, 0, 0, 1, 0, 0);
    game.ctx.scale(dpr, dpr);
    game.width = width;
    game.height = height;
  };

  const spawnDebris = () => {
    if (!game.ctx) {
      return;
    }
    const radius = Math.random() * 16 + 10;
    const x = Math.random() * game.width;
    const y = -radius * 2;
    const baseSpeed = 120;
    const speed = (baseSpeed + Math.random() * 80) * (1 + game.progress * 2);
    const spin = (Math.random() - 0.5) * 2.5;
    const angle = Math.random() * Math.PI * 2;
    game.debris.push({ x, y, radius, speed, spin, angle });
  };

  const resetShip = () => {
    game.ship = {
      x: game.width / 2,
      y: game.height * 0.82,
      width: 46,
      height: 56,
      speed: 280
    };
  };

  const attachGameListeners = () => {
    if (game.keyDownHandler || !window) {
      return;
    }
    game.keyDownHandler = (event) => {
      if (event.code === "Space" && game.over) {
        startGame();
        return;
      }
      if (event.code === "ArrowLeft" || event.code === "ArrowRight" || event.code === "ArrowUp" || event.code === "ArrowDown") {
        game.keys.add(event.code);
      }
    };

    game.keyUpHandler = (event) => {
      if (game.keys.has(event.code)) {
        game.keys.delete(event.code);
      }
    };

    window.addEventListener("keydown", game.keyDownHandler);
    window.addEventListener("keyup", game.keyUpHandler);
  };

  const detachGameListeners = () => {
    if (game.keyDownHandler) {
      window.removeEventListener("keydown", game.keyDownHandler);
      game.keyDownHandler = null;
    }
    if (game.keyUpHandler) {
      window.removeEventListener("keyup", game.keyUpHandler);
      game.keyUpHandler = null;
    }
    game.keys.clear();
  };

  const drawShip = () => {
    if (!game.ship || !game.ctx) {
      return;
    }
    const { x, y, width, height } = game.ship;
    const ctx = game.ctx;
    const halfW = width / 2;
    const halfH = height / 2;
    const scale = game.shipScale || 1;

    const t = game.renderTime / 1000;
    const progress = game.pEase || 0;
    const plunge = game.qEase || 0;
    const moveX = (game.keys.has("ArrowLeft") ? -1 : 0) + (game.keys.has("ArrowRight") ? 1 : 0);
    const moveY = (game.keys.has("ArrowUp") ? -1 : 0) + (game.keys.has("ArrowDown") ? 1 : 0);

    // Shadow/depth cue
    const shadowAlpha = 0.12 + progress * 0.22 + plunge * 0.18;
    ctx.save();
    ctx.translate(x + 4 * (moveX * 0.2 + plunge * 0.3), y + halfH * 0.9);
    ctx.scale(scale, scale * 0.6);
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfW * 0.9, halfH * 0.35, 0, 0, Math.PI * 2);
    ctx.filter = "blur(6px)";
    ctx.fill();
    ctx.restore();

    // Stress micro-jitter late game (render only)
    let jitterX = 0;
    let jitterY = 0;
    if (progress > 0.75) {
      const j = (progress - 0.75) / 0.25;
      jitterX = (Math.random() - 0.5) * 2 * j;
      jitterY = (Math.random() - 0.5) * 2 * j;
    }

    // Tilt target based on horizontal input
    game.shipTiltTarget = moveX * 0.17 * Math.PI; // ~9.7deg
    game.shipTilt += (game.shipTiltTarget - game.shipTilt) * 0.12;

    const flameInput = Math.min(1, Math.abs(moveX) + Math.abs(moveY) * 0.6);
    const flicker = 0.65 + 0.35 * Math.sin(t * 9 + Math.cos(t * 4));
    const baseFlame = halfH * (0.5 + flameInput * 0.5 + progress * 0.4 + plunge * 0.8);
    const flameLength = baseFlame * flicker * (1 - game.absorbing ? 1 : Math.max(0.2, 1 - game.absorbTimer / game.absorbDuration));

    const innerColor = `rgba(${200 + plunge * 30}, ${240 - plunge * 40}, 255, ${0.65 + progress * 0.25})`;
    const midColor = `rgba(${170 + plunge * 60}, ${210 - plunge * 50}, ${255 - plunge * 80}, ${0.45 + progress * 0.3})`;
    const edgeColor = `rgba(${120 + plunge * 120}, ${180 - plunge * 60}, ${255 - plunge * 150}, ${0.18 + progress * 0.2})`;

    ctx.save();
    ctx.translate(x + jitterX, y + jitterY);
    ctx.scale(scale, scale);
    ctx.rotate(game.shipTilt);

    // Hull base: elongated, tapered interceptor body
    ctx.shadowColor = `rgba(150, 220, 255, ${0.15 + progress * 0.35 + plunge * 0.25})`;
    ctx.shadowBlur = 14 + progress * 12 + plunge * 10;
    const hullTopWidth = halfW * 0.7;
    const hullMidWidth = halfW * 1.35;
    const hullRearWidth = halfW * 1.1;
    const hullNoseY = -halfH * 1.2;
    const hullMidY = halfH * 0.05;
    const hullRearY = halfH * 0.95;
    ctx.beginPath();
    ctx.moveTo(0, hullNoseY);
    ctx.lineTo(hullTopWidth, hullNoseY + halfH * 0.35);
    ctx.lineTo(hullMidWidth, hullMidY);
    ctx.lineTo(hullRearWidth, hullRearY);
    ctx.lineTo(-hullRearWidth, hullRearY);
    ctx.lineTo(-hullMidWidth, hullMidY);
    ctx.lineTo(-hullTopWidth, hullNoseY + halfH * 0.35);
    ctx.closePath();
    const hullGradient = ctx.createLinearGradient(0, hullNoseY, 0, hullRearY);
    hullGradient.addColorStop(0, "rgba(80, 120, 170, 0.95)");
    hullGradient.addColorStop(1, "rgba(40, 70, 110, 0.9)");
    ctx.fillStyle = hullGradient;
    ctx.fill();

    // Central spine
    ctx.beginPath();
    ctx.moveTo(0, hullNoseY);
    ctx.lineTo(hullTopWidth * 0.42, hullNoseY + halfH * 0.42);
    ctx.lineTo(hullMidWidth * 0.4, hullMidY);
    ctx.lineTo(hullRearWidth * 0.32, hullRearY - halfH * 0.1);
    ctx.lineTo(-hullRearWidth * 0.32, hullRearY - halfH * 0.1);
    ctx.lineTo(-hullMidWidth * 0.4, hullMidY);
    ctx.lineTo(-hullTopWidth * 0.42, hullNoseY + halfH * 0.42);
    ctx.closePath();
    const spineGradient = ctx.createLinearGradient(0, hullNoseY, 0, hullRearY);
    spineGradient.addColorStop(0, "rgba(180, 220, 255, 0.65)");
    spineGradient.addColorStop(1, "rgba(90, 140, 200, 0.3)");
    ctx.fillStyle = spineGradient;
    ctx.fill();

    // Warm accent strips
    const accentAlpha = 0.18 + plunge * 0.2;
    ctx.strokeStyle = `rgba(255, 180, 100, ${accentAlpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-hullMidWidth * 0.75, hullMidY - halfH * 0.15);
    ctx.lineTo(-hullRearWidth * 0.85, hullRearY - halfH * 0.08);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hullMidWidth * 0.75, hullMidY - halfH * 0.15);
    ctx.lineTo(hullRearWidth * 0.85, hullRearY - halfH * 0.08);
    ctx.stroke();

    // Nose cap
    ctx.beginPath();
    ctx.moveTo(0, hullNoseY - halfH * 0.15);
    ctx.quadraticCurveTo(hullTopWidth * 0.55, hullNoseY + halfH * 0.05, hullTopWidth * 0.32, hullNoseY + halfH * 0.38);
    ctx.lineTo(-hullTopWidth * 0.32, hullNoseY + halfH * 0.38);
    ctx.quadraticCurveTo(-hullTopWidth * 0.55, hullNoseY + halfH * 0.05, 0, hullNoseY - halfH * 0.15);
    const noseGradient = ctx.createLinearGradient(0, hullNoseY - halfH * 0.2, 0, hullNoseY + halfH * 0.4);
    noseGradient.addColorStop(0, "rgba(190, 230, 255, 0.95)");
    noseGradient.addColorStop(1, "rgba(120, 180, 230, 0.8)");
    ctx.fillStyle = noseGradient;
    ctx.fill();

    // Wings / stabilizers (compact intakes)
    const wingY = hullMidY + halfH * 0.05;
    const wingX = hullMidWidth * 0.9;
    ctx.beginPath();
    ctx.moveTo(wingX, wingY);
    ctx.lineTo(wingX + halfW * 0.55, wingY + halfH * 0.12);
    ctx.lineTo(wingX, wingY + halfH * 0.32);
    ctx.lineTo(wingX - halfW * 0.2, wingY + halfH * 0.1);
    ctx.closePath();
    ctx.fillStyle = "rgba(90, 140, 200, 0.75)";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-wingX, wingY);
    ctx.lineTo(-wingX - halfW * 0.55, wingY + halfH * 0.12);
    ctx.lineTo(-wingX, wingY + halfH * 0.32);
    ctx.lineTo(-wingX + halfW * 0.2, wingY + halfH * 0.1);
    ctx.closePath();
    ctx.fillStyle = "rgba(90, 140, 200, 0.75)";
    ctx.fill();

    // Cockpit / canopy
    ctx.beginPath();
    ctx.ellipse(0, hullNoseY + halfH * 0.55, halfW * 0.32, halfH * 0.2, 0, 0, Math.PI * 2);
    const canopyGradient = ctx.createLinearGradient(0, hullNoseY + halfH * 0.35, 0, hullNoseY + halfH * 0.75);
    canopyGradient.addColorStop(0, "rgba(120, 200, 230, 0.9)");
    canopyGradient.addColorStop(1, "rgba(50, 90, 140, 0.85)");
    ctx.fillStyle = canopyGradient;
    ctx.strokeStyle = "rgba(200, 240, 255, 0.45)";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();

    // Engine housings (triple cluster)
    ctx.save();
    ctx.translate(0, hullRearY - halfH * 0.05);
    const nozzleR = halfW * 0.3;
    const nozzleGlow = 0.35 + progress * 0.3 + plunge * 0.35;
    const nozzlePositions = [
      { x: -nozzleR * 0.9, y: 0 },
      { x: nozzleR * 0.9, y: 0 },
      { x: 0, y: nozzleR * 0.35 }
    ];
    nozzlePositions.forEach((pos) => {
      ctx.save();
      ctx.translate(pos.x, pos.y);
      const nozzleGradient = ctx.createRadialGradient(0, 0, nozzleR * 0.15, 0, 0, nozzleR);
      nozzleGradient.addColorStop(0, "rgba(10, 20, 35, 0.15)");
      nozzleGradient.addColorStop(1, "rgba(10, 20, 35, 0.8)");
      ctx.fillStyle = nozzleGradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, nozzleR * 1.05, nozzleR * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Engine core glow
      const glowR = nozzleR * 0.6;
      const glowGradient = ctx.createRadialGradient(0, 0, glowR * 0.2, 0, 0, glowR);
      glowGradient.addColorStop(0, `rgba(180, 230, 255, ${0.65 + nozzleGlow * 0.3})`);
      glowGradient.addColorStop(1, `rgba(80, 150, 220, ${0.05 + nozzleGlow * 0.25})`);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(0, 0, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    });
    ctx.restore();

    // Engine flame (central exhaust)
    ctx.beginPath();
    ctx.moveTo(0, hullRearY + flameLength);
    ctx.lineTo(-halfW * 0.38, hullRearY + halfH * 0.35);
    ctx.lineTo(halfW * 0.38, hullRearY + halfH * 0.35);
    ctx.closePath();
    const flameGradient = ctx.createLinearGradient(0, hullRearY + halfH * 0.15, 0, hullRearY + flameLength);
    flameGradient.addColorStop(0, innerColor);
    flameGradient.addColorStop(0.45, midColor);
    flameGradient.addColorStop(1, edgeColor);
    ctx.fillStyle = flameGradient;
    ctx.shadowColor = `rgba(150, 220, 255, ${0.3 + progress * 0.4 + plunge * 0.3})`;
    ctx.shadowBlur = 20 + progress * 10;
    ctx.fill();

    // Tiny sparks late game
    if (progress > 0.75 && Math.random() < 0.15) {
      ctx.save();
      const sparkR = 1 + Math.random() * 1.5;
      const sparkX = (Math.random() - 0.5) * halfW * 0.6;
      const sparkY = halfH * 0.7 + Math.random() * halfH * 0.3;
      ctx.fillStyle = `rgba(255, ${190 + Math.random() * 30}, ${120 + Math.random() * 40}, ${0.35 + plunge * 0.3})`;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, sparkR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  };

  const drawDebris = () => {
    if (!game.ctx) {
      return;
    }
    const ctx = game.ctx;
    game.debris.forEach((rock) => {
      ctx.save();
      ctx.translate(rock.x, rock.y);
      ctx.rotate(rock.angle);

      const { palette = {}, type, vertices, radius } = rock;
      const base = palette.base || "rgba(120, 150, 180, 0.9)";
      const highlight = palette.highlight || "rgba(190, 220, 255, 0.6)";
      const rim = palette.rim || "rgba(120, 200, 255, 0.25)";
      const accent = palette.accent || "rgba(255, 170, 120, 0.12)";

      if (vertices && vertices.length) {
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i += 1) {
          ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();

        // Fill based on type
        if (type === "metal") {
          const grad = ctx.createLinearGradient(-radius, -radius, radius, radius);
          grad.addColorStop(0, base);
          grad.addColorStop(0.6, highlight);
          grad.addColorStop(1, base);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.strokeStyle = rim;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          if (Math.random() < 0.15) {
            ctx.strokeStyle = accent;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-radius * 0.4, 0);
            ctx.lineTo(radius * 0.4, radius * 0.1);
            ctx.stroke();
          }
        } else if (type === "rock") {
          const grad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
          grad.addColorStop(0, base);
          grad.addColorStop(1, palette.rim || "rgba(30,30,35,0.7)");
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.strokeStyle = "rgba(20, 20, 25, 0.35)";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (type === "panel") {
          const grad = ctx.createLinearGradient(-radius, 0, radius, 0);
          grad.addColorStop(0, base);
          grad.addColorStop(1, highlight);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.strokeStyle = rim;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          // panel seams
          ctx.strokeStyle = "rgba(255,255,255,0.18)";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(-radius * 0.5, 0);
          ctx.lineTo(radius * 0.5, radius * 0.08);
          ctx.moveTo(0, -radius * 0.4);
          ctx.lineTo(0, radius * 0.35);
          ctx.stroke();
        }
      }

      ctx.restore();
    });
  };

  const drawGameOverlay = () => {
    if (!game.ctx) {
      return;
    }
    const ctx = game.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(3, 6, 12, 0.7)";
    ctx.fillRect(0, 0, game.width, game.height);

    ctx.textAlign = "center";
    ctx.fillStyle = "#f5faff";
    ctx.font = '600 26px "Orbitron", sans-serif';
    const headline = game.reachedHorizon
      ? game.lastArrivalMessage || "The event horizon has been reached."
      : game.lastFailureMessage || "You were torn apart by tidal forces";
    ctx.fillText(headline, game.width / 2, game.height / 2 - 10);

    ctx.fillStyle = "rgba(111, 228, 255, 0.9)";
    ctx.font = '400 18px "Titillium Web", sans-serif';
    ctx.fillText("Press Space or Play Again to re-enter the drift", game.width / 2, game.height / 2 + 22);
    ctx.restore();
  };

  const drawGameFrame = (forceOverlay = false, renderTime = 0) => {
    if (!game.ctx) {
      return;
    }
    const ctx = game.ctx;
    game.renderTime = renderTime;
    ctx.clearRect(0, 0, game.width, game.height);

    const maxShake = 10;
    const sx = (Math.random() - 0.5) * maxShake * game.shakeIntensity;
    const sy = (Math.random() - 0.5) * maxShake * game.shakeIntensity;
    ctx.save();
    ctx.translate(sx + game.cameraOffsetX, sy + game.cameraOffsetY);

    drawBlackHole(ctx, game.width, game.height, game.pEase, game.qEase, renderTime / 1000);
    drawDebris();
    drawShip();

    ctx.save();
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(245, 250, 255, 0.8)";
    ctx.font = '600 14px "Orbitron", sans-serif';
    const remaining = Math.max(0, ARRIVAL_SECONDS - game.survivalTime);
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    const pad = (v) => String(v).padStart(2, "0");
    ctx.fillText(`Arrival in: ${pad(minutes)}:${pad(seconds)}`, 16, 26);
    ctx.restore();

    ctx.restore();

    if (game.over || forceOverlay) {
      drawGameOverlay();
    }
  };

  const triggerGameOver = () => {
    game.over = true;
    game.running = false;
    if (!game.reachedHorizon) {
      const options = game.failureMessages || [];
      if (options.length) {
        const pick = options[Math.floor(Math.random() * options.length)];
        game.lastFailureMessage = pick;
      }
    }
    if (game.rafId) {
      window.cancelAnimationFrame(game.rafId);
      game.rafId = null;
    }
    drawGameFrame(true);
  };

  const updateShip = (dt) => {
    if (!game.ship) {
      return;
    }
    const moveX = (game.keys.has("ArrowLeft") ? -1 : 0) + (game.keys.has("ArrowRight") ? 1 : 0);
    const moveY = (game.keys.has("ArrowUp") ? -1 : 0) + (game.keys.has("ArrowDown") ? 1 : 0);
    const speed = game.ship.speed;
    game.ship.x += moveX * speed * dt;
    game.ship.y += moveY * speed * dt * 0.65;

    const halfW = game.ship.width / 2;
    const halfH = game.ship.height / 2;
    game.ship.x = Math.min(Math.max(game.ship.x, halfW + 4), game.width - halfW - 4);
    game.ship.y = Math.min(Math.max(game.ship.y, game.height * 0.6), game.height - halfH - 6);
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  const randRange = (min, max) => min + Math.random() * (max - min);
  const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
  const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

  const fadeState = { id: null };
  const crossfade = (fromAudio, toAudio, toVolume, durationMs = 800) => {
    if (!toAudio) {
      return;
    }
    if (fadeState.id) {
      cancelAnimationFrame(fadeState.id);
      fadeState.id = null;
    }
    const start = performance.now();
    const fromStart = fromAudio ? fromAudio.volume : 0;
    const toStart = toAudio.volume || 0;
    const fromActive = Boolean(fromAudio);
    const targetTo = toVolume;
    const targetFrom = 0;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      if (fromActive) {
        fromAudio.volume = lerp(fromStart, targetFrom, t);
      }
      toAudio.volume = lerp(toStart, targetTo, t);
      if (t < 1) {
        fadeState.id = requestAnimationFrame(tick);
      } else {
        fadeState.id = null;
        if (fromActive) {
          fromAudio.pause();
          fromAudio.volume = 0;
        }
        toAudio.volume = targetTo;
      }
    };
    // ensure playback requested inside user gesture
    const playPromise = toAudio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.catch(() => {
        console.info("Audio playback was blocked by the browser; interact again to enable sound.");
      });
    }
    fadeState.id = requestAnimationFrame(tick);
  };

  const drawBlackHole = (ctx, width, height, pEase, qEase, timeSeconds) => {
    const eased = clamp01(pEase);
    const plunge = clamp01(qEase);
    const cx = width * 0.5;
    const cy = height * 0.38;
    const base = Math.min(width, height);
    const rStart = base * 0.03;
    const rEnd = base * 0.14;
    const rBoost = base * 0.08;
    const baseR = lerp(rStart, rEnd, eased);
    const radius = baseR + lerp(0, rBoost, plunge * plunge);
    const t = timeSeconds || 0;
    const swirlSpeed = 0.5 + eased * 1.4 + plunge * 2.2;
    const emberFactor = Math.max(0, (eased - 0.65) / 0.35 + plunge * 0.6);

    ctx.save();
    ctx.translate(cx, cy);

    const coreGradient = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius * 0.9);
    coreGradient.addColorStop(0, "rgba(0, 0, 0, 0.95)");
    coreGradient.addColorStop(1, "rgba(0, 0, 0, 0.2)");
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    const ringGradient = ctx.createRadialGradient(0, 0, radius * 0.7, 0, 0, radius * 1.25 + plunge * 8);
    ringGradient.addColorStop(0, `rgba(120, 190, 255, ${0.18 + eased * 0.22 + plunge * 0.2})`);
    ringGradient.addColorStop(1, `rgba(70, 110, 180, ${0.08 + eased * 0.12 + plunge * 0.1})`);
    ctx.fillStyle = ringGradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.2, 0, Math.PI * 2);
    ctx.fill();

    const swirlCount = 5;
    for (let i = 0; i < swirlCount; i += 1) {
      const angle = t * swirlSpeed + (Math.PI * 2 * i) / swirlCount;
      const innerR = radius * 0.72;
      const outerR = radius * (1.15 + Math.sin(t * 0.6 + i) * 0.03);
      const alpha = 0.12 + eased * 0.24 + plunge * 0.18;
      const emberAlpha = emberFactor * 0.25;
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${150 + emberFactor * 80}, ${220 - emberFactor * 40}, ${255 - emberFactor * 120}, ${alpha})`;
      ctx.lineWidth = 2 + eased * 3;
      ctx.arc(0, 0, (innerR + outerR) / 2, -0.6, 0.6);
      ctx.stroke();
      if (emberAlpha > 0) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, ${170 + emberFactor * 70}, ${120}, ${emberAlpha})`;
        ctx.lineWidth = 1.5 + eased * 2;
        ctx.arc(0, 0, outerR, -0.35, 0.35);
        ctx.stroke();
      }
      ctx.restore();
    }

    const vignetteAlpha = Math.min(0.2, 0.05 + eased * 0.12 + plunge * 0.2);
    const vignette = ctx.createRadialGradient(0, 0, radius * 0.4, 0, 0, radius * 2.4);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, `rgba(0, 0, 0, ${vignetteAlpha})`);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = vignette;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const spawnDebrisWithParams = (baseSpeed, difficulty, count = 1) => {
    const shipSafeMin = game.ship ? game.ship.x - 70 : null;
    const shipSafeMax = game.ship ? game.ship.x + 70 : null;
    const chooseType = () => {
      const r = Math.random();
      if (r < 0.45) return "metal";
      if (r < 0.7) return "rock";
      return "panel";
    };

    const chooseSize = () => {
      const r = Math.random();
      if (r < 0.25) return "small";
      if (r < 0.85) return "medium";
      return "large";
    };

    const makePalette = (type) => {
      if (type === "metal") {
        return {
          base: "rgba(90, 120, 150, 0.95)",
          highlight: "rgba(170, 210, 240, 0.8)",
          rim: "rgba(120, 200, 255, 0.35)",
          accent: "rgba(255, 170, 110, 0.15)"
        };
      }
      if (type === "rock") {
        return {
          base: "rgba(70, 70, 80, 0.95)",
          highlight: "rgba(120, 120, 130, 0.35)",
          rim: "rgba(40, 40, 45, 0.4)",
          accent: "rgba(120, 80, 50, 0.08)"
        };
      }
      return {
        base: "rgba(80, 110, 150, 0.9)",
        highlight: "rgba(150, 190, 230, 0.35)",
        rim: "rgba(120, 180, 240, 0.4)",
        accent: "rgba(255, 180, 120, 0.12)"
      };
    };

    const makePolygon = (radius, variance, vertexCount) => {
      const verts = [];
      for (let i = 0; i < vertexCount; i += 1) {
        const angle = (Math.PI * 2 * i) / vertexCount + Math.random() * 0.25;
        const r = radius * (1 - variance + Math.random() * variance * 2);
        verts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      return verts;
    };

    const makePanelShape = (radius) => {
      const w = radius * (1.6 + Math.random() * 0.4);
      const h = radius * (0.9 + Math.random() * 0.3);
      const skew = 0.15 + Math.random() * 0.1;
      return [
        { x: -w * 0.5, y: -h * 0.5 },
        { x: w * 0.5, y: -h * 0.5 + skew * h },
        { x: w * 0.55, y: h * 0.5 },
        { x: -w * 0.55, y: h * 0.5 - skew * h }
      ];
    };

    const pickSpawnX = () => {
      const avoid = 70;
      const minX = 0;
      const maxX = game.width;
      const shipX = game.ship ? game.ship.x : maxX * 0.5;
      const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

      const leftAvoid = Math.max(20, Math.min(avoid, shipX));
      const rightAvoid = Math.max(20, Math.min(avoid, maxX - shipX));

      let banL = clamp(shipX - leftAvoid, minX, maxX);
      let banR = clamp(shipX + rightAvoid, minX, maxX);

      let intervals = [];
      if (banL - minX >= 5) intervals.push([minX, banL]);
      if (maxX - banR >= 5) intervals.push([banR, maxX]);

      if (!intervals.length) {
        const reduced = Math.max(10, avoid * 0.4);
        banL = clamp(shipX - reduced, minX, maxX);
        banR = clamp(shipX + reduced, minX, maxX);
        if (banL - minX >= 2) intervals.push([minX, banL]);
        if (maxX - banR >= 2) intervals.push([banR, maxX]);
        if (!intervals.length) {
          return Math.random() * maxX;
        }
      }

      const widths = intervals.map(([a, b]) => b - a);
      const total = widths.reduce((sum, w) => sum + w, 0);
      const r = Math.random() * total;
      let acc = 0;
      for (let i = 0; i < intervals.length; i += 1) {
        acc += widths[i];
        if (r <= acc) {
          const [a, b] = intervals[i];
          return a + Math.random() * (b - a);
        }
      }
      const last = intervals[intervals.length - 1];
      return last[0] + Math.random() * (last[1] - last[0]);
    };

    const spawnOne = (typeOverride = null, sizeOverride = null, offset = { x: 0, y: 0 }, speedJitter = 1) => {
      const type = typeOverride || chooseType();
      const size = sizeOverride || chooseSize();
      const sizeScale = size === "small" ? 0.6 : size === "medium" ? 1 : 1.35;
      const baseRadius = (Math.random() * 10 + 14) * sizeScale;

      let x = pickSpawnX() + offset.x;
      const y = -baseRadius * 2 + offset.y;
      const speed = baseSpeed * randRange(0.85, 1.15) * speedJitter;
      const spin = (Math.random() - 0.5) * (size === "large" ? 1.6 : size === "small" ? 3.2 : 2.2);
      const angle = Math.random() * Math.PI * 2;
      const palette = makePalette(type);
      let vertices;
      if (type === "panel") {
        vertices = makePanelShape(baseRadius);
      } else {
        const verts = type === "rock" ? 6 + Math.floor(Math.random() * 3) : 5 + Math.floor(Math.random() * 4);
        vertices = makePolygon(baseRadius, type === "rock" ? 0.28 : 0.18, verts);
      }

      game.debris.push({
        x,
        y,
        radius: baseRadius,
        speed,
        spin,
        angle,
        type,
        size,
        vertices,
        palette
      });
    };

    for (let i = 0; i < count; i += 1) {
      spawnOne();
      // Occasionally add a shard cluster trailing the main piece.
      if (Math.random() < 0.25) {
        const shardCount = 3 + Math.floor(Math.random() * 6);
        const shardType = chooseType();
        const baseOffsetX = (Math.random() - 0.5) * 40;
        const baseOffsetY = (Math.random() - 0.5) * 20;
        for (let s = 0; s < shardCount; s += 1) {
          spawnOne(shardType, "small", { x: baseOffsetX + (Math.random() - 0.5) * 30, y: baseOffsetY + (Math.random() - 0.5) * 20 }, 1 + Math.random() * 0.2);
        }
      }
    }
  };

  const updateDebris = (dt, difficulty) => {
    const spawnInterval = lerp(850, 110, difficulty);
    const maxDebris = Math.floor(lerp(16, 72, difficulty));
    const baseSpeed = lerp(180, 800, difficulty);

    game.spawnTimer += dt * 1000;
    while (game.spawnTimer >= spawnInterval) {
      if (game.debris.length >= maxDebris) {
        game.spawnTimer -= spawnInterval;
        break;
      }
      let clusterCount = 1;
      if (difficulty > 0.55 && Math.random() < 0.5) {
        clusterCount = 2;
      }
      if (difficulty > 0.8) {
        if (Math.random() < 0.7) {
          clusterCount = 2;
        }
        if (Math.random() < 0.28) {
          clusterCount = 3;
        }
      }
      spawnDebrisWithParams(baseSpeed, difficulty, clusterCount);
      game.spawnTimer -= spawnInterval;
    }

    game.debris.forEach((rock) => {
      rock.y += rock.speed * dt;
      rock.x += Math.sin(rock.angle) * 18 * dt;
      rock.angle += rock.spin * dt;
    });
    game.debris = game.debris.filter((rock) => rock.y - rock.radius <= game.height + 40);
  };

  const checkCollisions = () => {
    if (!game.ship) {
      return;
    }
    const shipLeft = game.ship.x - game.ship.width / 2;
    const shipRight = game.ship.x + game.ship.width / 2;
    const shipTop = game.ship.y - game.ship.height / 2;
    const shipBottom = game.ship.y + game.ship.height / 2;

    for (let i = 0; i < game.debris.length; i += 1) {
      const rock = game.debris[i];
      const nearestX = Math.max(shipLeft, Math.min(rock.x, shipRight));
      const nearestY = Math.max(shipTop, Math.min(rock.y, shipBottom));
      const dx = rock.x - nearestX;
      const dy = rock.y - nearestY;
      if (dx * dx + dy * dy < rock.radius * rock.radius) {
        triggerGameOver();
        return;
      }
    }
  };

  const gameLoop = (timestamp) => {
    if (!game.running) {
      return;
    }
    if (!game.lastTimestamp) {
      game.lastTimestamp = timestamp;
    }
    const deltaMs = timestamp - game.lastTimestamp;
    game.lastTimestamp = timestamp;
    const dt = Math.min(deltaMs, 100) / 1000;

    game.survivalTime += dt;
    const p = Math.min(1, game.survivalTime / T_RAMP);
    const endPhaseStart = ARRIVAL_SECONDS - END_PHASE_SECONDS;
    const qRaw = (game.survivalTime - endPhaseStart) / END_PHASE_SECONDS;
    const q = Math.min(Math.max(qRaw, 0), 1);
    const d = easeInOut(p);
    const qEase = q * q;
    game.progress = d;
    game.pEase = d;
    game.qEase = qEase;
    game.shakeIntensity = d * 0.9 + qEase * 0.5;

    const bhx = game.width * 0.5;
    const bhy = game.height * 0.38;
    const pullStrength = qEase * 18;
    game.cameraOffsetX = ((bhx - game.width / 2) / game.width) * pullStrength;
    game.cameraOffsetY = ((bhy - game.height / 2) / game.height) * pullStrength;

    if (!game.absorbing && game.survivalTime >= ARRIVAL_SECONDS) {
      game.absorbing = true;
      game.absorbTimer = 0;
      game.absorbStart = { x: game.ship.x, y: game.ship.y };
      game.survivalTime = ARRIVAL_SECONDS;
    }

    if (game.absorbing) {
      game.absorbTimer += deltaMs;
      const progress = Math.min(1, game.absorbTimer / game.absorbDuration);
      game.shipScale = 1 - 0.45 * progress;
      const targetX = bhx;
      const targetY = bhy;
      game.ship.x = lerp(game.absorbStart.x, targetX, progress);
      game.ship.y = lerp(game.absorbStart.y, targetY, progress);
      game.debris.forEach((rock) => {
        rock.y += rock.speed * dt;
        rock.x += Math.sin(rock.angle) * 18 * dt;
        rock.angle += rock.spin * dt;
      });
      if (progress >= 1) {
        game.reachedHorizon = true;
        const arrivals = game.arrivalMessages || [];
        if (arrivals.length) {
          game.lastArrivalMessage = arrivals[Math.floor(Math.random() * arrivals.length)];
        }
        game.over = true;
        game.running = false;
        drawGameFrame(true, timestamp);
        if (!game.nextStageLaunched) {
          game.nextStageLaunched = true;
          window.setTimeout(() => {
            window.location.href = "racer.html";
          }, 700);
        }
        return;
      }
    } else {
      updateShip(dt);
      updateDebris(dt, d);
      checkCollisions();
    }

    if (game.running) {
      drawGameFrame(false, timestamp);
      game.rafId = window.requestAnimationFrame(gameLoop);
    } else if (game.over) {
      drawGameFrame(true, timestamp);
    }
  };

  function startGame() {
    if (!gameCanvas) {
      return;
    }
    stopGame();
    initGameCanvas();
    resetShip();
    game.debris = [];
    game.progress = 0;
    game.survivalTime = 0;
    game.spawnTimer = 0;
    game.lastTimestamp = 0;
    game.shakeIntensity = 0;
    game.over = false;
    game.reachedHorizon = false;
    game.absorbing = false;
    game.absorbTimer = 0;
    game.absorbDuration = ABSORB_DURATION_MS;
    game.absorbStart = { x: 0, y: 0 };
    game.shipScale = 1;
    game.cameraOffsetX = 0;
    game.cameraOffsetY = 0;
    game.lastFailureMessage = null;
    game.lastArrivalMessage = null;
    game.nextStageLaunched = false;
    game.running = true;
    attachGameListeners();
    drawGameFrame(false, performance.now());
    game.rafId = window.requestAnimationFrame(gameLoop);
  }

  function stopGame() {
    game.running = false;
    if (game.rafId) {
      window.cancelAnimationFrame(game.rafId);
      game.rafId = null;
    }
    game.over = false;
    game.reachedHorizon = false;
    game.absorbing = false;
    game.absorbTimer = 0;
    game.absorbDuration = ABSORB_DURATION_MS;
    game.absorbStart = { x: 0, y: 0 };
    game.shipScale = 1;
    game.cameraOffsetX = 0;
    game.cameraOffsetY = 0;
    game.lastFailureMessage = null;
    game.lastArrivalMessage = null;
    detachGameListeners();
    game.debris = [];
  }

  const showGameMode = () => {
    if (experience) {
      experience.classList.add("game-hidden");
    }
    if (gameMode) {
      gameMode.classList.add("visible");
      gameMode.classList.remove("hidden");
    }
    startGame();
  };

  const hideGameMode = () => {
    stopGame();
    if (experience) {
      experience.classList.remove("game-hidden");
    }
    if (gameMode) {
      gameMode.classList.remove("visible");
      gameMode.classList.add("hidden");
    }
  };

  const pickNextQuote = () => {
    if (!quotes.length) {
      return null;
    }
    let nextIndex = Math.floor(Math.random() * quotes.length);
    if (quotes.length > 1) {
      while (nextIndex === currentQuoteIndex) {
        nextIndex = Math.floor(Math.random() * quotes.length);
      }
    }
    currentQuoteIndex = nextIndex;
    return quotes[nextIndex];
  };

  const renderQuote = () => {
    const quote = pickNextQuote();
    if (!quote || !quoteContainer) {
      return;
    }
    quoteContainer.innerHTML = `
      <p class="quote-text">“${quote.text}”</p>
      <p class="quote-author">— ${quote.author}</p>
    `;
  };

  const cycleQuote = () => {
    if (!quoteContainer) {
      return;
    }
    quoteContainer.classList.add("fade-out");
    quoteContainer.classList.remove("visible");
    window.setTimeout(() => {
      renderQuote();
      requestAnimationFrame(() => {
        quoteContainer.classList.remove("fade-out");
        quoteContainer.classList.add("visible");
      });
    }, 450);
  };

  const scheduleQuoteReveal = () => {
    if (!quoteContainer) {
      return;
    }
    window.clearTimeout(quoteTimeoutId);
    window.clearInterval(quoteIntervalId);
    const INITIAL_DELAY = 5000;
    quoteTimeoutId = window.setTimeout(() => {
      quoteContainer.classList.remove("hidden");
      renderQuote();
      requestAnimationFrame(() => {
        quoteContainer.classList.add("visible");
      });
      const ROTATION_INTERVAL = 10000;
      quoteIntervalId = window.setInterval(cycleQuote, ROTATION_INTERVAL);
    }, INITIAL_DELAY);
  };

  const activateAudio = () => {
    if (!ambientAudio) {
      return;
    }
    ambientAudio.volume = AMBIENT_VOL;
    const playPromise = ambientAudio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.catch(() => {
        console.info("Audio playback was blocked by the browser; interact again to enable sound.");
      });
    }
  };

  const createStars = (width, height) => {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i += 1) {
      const depth = Math.random() * 3 + 1;
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        depth,
        radius: Math.random() * 1.2 + depth * 0.08,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  };

  const resizeStarfield = () => {
    if (!starfieldCanvas) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    starfieldCanvas.width = width * dpr;
    starfieldCanvas.height = height * dpr;
    starfieldCanvas.style.width = `${width}px`;
    starfieldCanvas.style.height = `${height}px`;
    starfieldCtx = starfieldCanvas.getContext("2d");
    starfieldCtx.setTransform(1, 0, 0, 1, 0, 0);
    starfieldCtx.scale(dpr, dpr);
    createStars(width, height);
  };

  const renderStarfield = () => {
    if (!starfieldCtx || !starfieldCanvas) {
      return;
    }
    const width = starfieldCanvas.clientWidth;
    const height = starfieldCanvas.clientHeight;
    starfieldCtx.clearRect(0, 0, width, height);
    stars.forEach((star) => {
      star.y += 0.045 * star.depth * starDriftMultiplier;
      star.x += 0.012 * star.depth * starDriftMultiplier;
      if (star.y > height + 12) {
        star.y = -12;
        star.x = Math.random() * width;
      }
      if (star.x > width + 12) {
        star.x = -12;
        star.y = Math.random() * height;
      }
      const alpha = 0.28 + star.depth * 0.1 + Math.sin(star.twinkle) * 0.05;
      star.twinkle += 0.006 + star.depth * 0.001;
      starfieldCtx.beginPath();
      starfieldCtx.fillStyle = `rgba(218, 235, 255, ${Math.min(alpha, 0.78)})`;
      starfieldCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      starfieldCtx.fill();
    });
    starfieldAnimationId = window.requestAnimationFrame(renderStarfield);
  };

  const resizeLensing = () => {
    if (!lensingCanvas) {
      return;
    }
    const parent = lensingCanvas.parentElement;
    const size = parent ? parent.offsetWidth : 320;
    const dpr = window.devicePixelRatio || 1;
    lensingCanvas.width = size * dpr;
    lensingCanvas.height = size * dpr;
    lensingCanvas.style.width = `${size}px`;
    lensingCanvas.style.height = `${size}px`;
    lensingCtx = lensingCanvas.getContext("2d");
    lensingCtx.setTransform(1, 0, 0, 1, 0, 0);
    lensingCtx.scale(dpr, dpr);
  };

  const renderLensing = () => {
    if (!lensingCtx || !lensingCanvas) {
      return;
    }
    const width = lensingCanvas.clientWidth;
    const height = lensingCanvas.clientHeight;
    const radius = Math.min(width, height) / 2;
    const cx = width / 2;
    const cy = height / 2;

    lensingCtx.clearRect(0, 0, width, height);

    const horizonGradient = lensingCtx.createRadialGradient(cx, cy, radius * 0.06, cx, cy, radius * 0.96);
    horizonGradient.addColorStop(0, "rgba(3, 6, 12, 0.95)");
    horizonGradient.addColorStop(0.25, "rgba(10, 18, 35, 0.9)");
    horizonGradient.addColorStop(0.45, "rgba(38, 64, 112, 0.55)");
    horizonGradient.addColorStop(0.75, "rgba(135, 180, 255, 0.25)");
    horizonGradient.addColorStop(1, "rgba(3, 6, 12, 0)");
    lensingCtx.fillStyle = horizonGradient;
    lensingCtx.beginPath();
    lensingCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    lensingCtx.fill();

    lensingCtx.save();
    lensingCtx.translate(cx, cy);
    lensingCtx.rotate(lensingAngle);
    lensingCtx.scale(1.2, 0.8);
    lensingCtx.globalCompositeOperation = "lighter";

    const ringGradient = lensingCtx.createRadialGradient(0, 0, radius * 0.28, 0, 0, radius * 0.9);
    ringGradient.addColorStop(0, "rgba(125, 220, 255, 0.3)");
    ringGradient.addColorStop(0.6, "rgba(168, 144, 255, 0.18)");
    ringGradient.addColorStop(1, "rgba(10, 20, 40, 0)");
    lensingCtx.fillStyle = ringGradient;
    lensingCtx.beginPath();
    lensingCtx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
    lensingCtx.fill();

    for (let i = 0; i < 3; i += 1) {
      lensingCtx.save();
      lensingCtx.rotate(lensingAngle * (1.3 + i * 0.25));
      lensingCtx.beginPath();
      lensingCtx.lineWidth = radius * (0.05 - i * 0.01);
      lensingCtx.strokeStyle = `rgba(111, 228, 255, ${0.25 - i * 0.05})`;
      lensingCtx.globalAlpha = 0.65;
      lensingCtx.arc(0, 0, radius * (0.5 + i * 0.12), 0, Math.PI * 2);
      lensingCtx.stroke();
      lensingCtx.restore();
    }

    lensingCtx.restore();
    lensingCtx.globalCompositeOperation = "source-over";

    lensingAngle += lensingSpeed;
    lensingAnimationId = window.requestAnimationFrame(renderLensing);
  };

  const handleResize = () => {
    resizeStarfield();
    resizeLensing();
    if (game.ctx) {
      initGameCanvas();
    }
  };

  window.addEventListener("resize", () => {
    window.cancelAnimationFrame(starfieldAnimationId);
    window.cancelAnimationFrame(lensingAnimationId);
    handleResize();
    renderStarfield();
    renderLensing();
  });

  if (beginButton) {
    beginButton.addEventListener("click", () => {
      if (landingScreen.classList.contains("fade-out")) {
        return;
      }

      beginButton.disabled = true;

      landingScreen.classList.add("fade-out");
      experience.classList.remove("hidden");

    requestAnimationFrame(() => {
      experience.classList.add("revealed");
    });

      window.setTimeout(() => {
        landingScreen.style.display = "none";
      }, 750);

      if (!clockIntervalId) {
        startClocks();
      }

      activateAudio();
      scheduleQuoteReveal();
      if (differentialCard) {
        window.setTimeout(() => differentialCard.classList.add("revealed"), 450);
      }

    if (formulaTooltip) {
      formulaTooltip.style.opacity = "0";
      formulaTooltip.style.transform = "translateY(25px)";
    }

    if (gameToggleButton) {
      gameToggleButton.classList.add("visible");
    }
  });
}

  if (singularityCard && formulaTooltip) {
    singularityCard.addEventListener("mouseenter", () => {
      formulaTooltip.style.opacity = "1";
      formulaTooltip.style.transform = "translateY(0)";
    });
    singularityCard.addEventListener("mouseleave", () => {
      formulaTooltip.style.opacity = "0";
      formulaTooltip.style.transform = "translateY(25px)";
    });
    singularityCard.addEventListener("focusin", () => {
      formulaTooltip.style.opacity = "1";
      formulaTooltip.style.transform = "translateY(0)";
    });
    singularityCard.addEventListener("focusout", () => {
      formulaTooltip.style.opacity = "0";
      formulaTooltip.style.transform = "translateY(25px)";
    });
  }

  if (gravitySlider) {
    gravitySlider.addEventListener("input", (event) => {
      const value = parseFloat(event.target.value);
      if (Number.isFinite(value)) {
        setGravityFactor(value);
      }
    });
    setGravityFactor(gravityFactor);
  } else {
    updateGravityDisplay(gravityFactor);
  }

  if (gameToggleButton) {
    gameToggleButton.addEventListener("click", () => {
      crossfade(ambientAudio, flightAudio, FLIGHT_VOL);
      showGameMode();
    });
  }

  if (backToTimefallButton) {
    backToTimefallButton.addEventListener("click", () => {
      crossfade(flightAudio, ambientAudio, AMBIENT_VOL);
      hideGameMode();
    });
  }

  if (playAgainButton) {
    playAgainButton.addEventListener("click", () => {
      startGame();
    });
  }

  handleResize();
  renderStarfield();
  renderLensing();
});
