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

  if (ambientAudio) {
    ambientAudio.src = "IC.mp3";
    ambientAudio.loop = true;
  }

  const updateInterval = 100;
  const STAR_COUNT = 260;

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
    rafId: null
  };

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const MIN_SAFE_DILATION = 0.0005;
  const T_RAMP = 65;

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

    ctx.save();
    ctx.translate(x, y);

    const flameLength = halfH * (0.4 + Math.random() * 0.35);
    ctx.beginPath();
    ctx.moveTo(0, halfH + flameLength);
    ctx.lineTo(-halfW * 0.35, halfH * 0.7);
    ctx.lineTo(halfW * 0.35, halfH * 0.7);
    ctx.closePath();
    const flameGradient = ctx.createLinearGradient(0, halfH, 0, halfH + flameLength);
    flameGradient.addColorStop(0, "rgba(255, 180, 120, 0.9)");
    flameGradient.addColorStop(1, "rgba(255, 120, 80, 0.2)");
    ctx.fillStyle = flameGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -halfH);
    ctx.lineTo(-halfW, halfH);
    ctx.lineTo(halfW, halfH);
    ctx.closePath();
    const bodyGradient = ctx.createLinearGradient(0, -halfH, 0, halfH);
    bodyGradient.addColorStop(0, "rgba(111, 228, 255, 0.9)");
    bodyGradient.addColorStop(1, "rgba(185, 149, 255, 0.85)");
    ctx.fillStyle = bodyGradient;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(111, 228, 255, 0.55)";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, halfH * 0.1, halfW * 0.45, halfH * 0.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(5, 12, 22, 0.6)";
    ctx.fill();

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
      const gradient = ctx.createRadialGradient(0, 0, rock.radius * 0.2, 0, 0, rock.radius);
      gradient.addColorStop(0, "rgba(200, 235, 255, 0.9)");
      gradient.addColorStop(0.4, "rgba(160, 200, 230, 0.6)");
      gradient.addColorStop(1, "rgba(60, 90, 130, 0.5)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, rock.radius, 0, Math.PI * 2);
      ctx.fill();
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
    ctx.fillText("You were torn apart by tidal forces", game.width / 2, game.height / 2 - 10);

    ctx.fillStyle = "rgba(111, 228, 255, 0.9)";
    ctx.font = '400 18px "Titillium Web", sans-serif';
    ctx.fillText("Press Space or Play Again to re-enter the drift", game.width / 2, game.height / 2 + 22);
    ctx.restore();
  };

  const drawGameFrame = (forceOverlay = false) => {
    if (!game.ctx) {
      return;
    }
    const ctx = game.ctx;
    ctx.clearRect(0, 0, game.width, game.height);

    const maxShake = 10;
    const sx = (Math.random() - 0.5) * maxShake * game.shakeIntensity;
    const sy = (Math.random() - 0.5) * maxShake * game.shakeIntensity;
    ctx.save();
    ctx.translate(sx, sy);

    drawDebris();
    drawShip();

    ctx.save();
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(245, 250, 255, 0.8)";
    ctx.font = '600 14px "Orbitron", sans-serif';
    ctx.fillText(`Time: ${Math.floor(game.survivalTime)}s`, 16, 26);
    ctx.fillText(`Difficulty: ${(Math.round(game.progress * 100))}%`, 16, 46);
    ctx.restore();

    ctx.restore();

    if (game.over || forceOverlay) {
      drawGameOverlay();
    }
  };

  const triggerGameOver = () => {
    game.over = true;
    game.running = false;
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

  const spawnDebrisWithParams = (baseSpeed, difficulty, count = 1) => {
    const shipSafeMin = game.ship ? game.ship.x - 60 : null;
    const shipSafeMax = game.ship ? game.ship.x + 60 : null;
    for (let i = 0; i < count; i += 1) {
      const radius = Math.random() * 16 + 10;
      let x = Math.random() * game.width;
      if (shipSafeMin !== null && shipSafeMax !== null) {
        let attempts = 0;
        while (x > shipSafeMin && x < shipSafeMax && attempts < 6) {
          x = Math.random() * game.width;
          attempts += 1;
        }
      }
      const y = -radius * 2;
      const speed = baseSpeed * randRange(0.85, 1.15);
      const spin = (Math.random() - 0.5) * 2.5;
      const angle = Math.random() * Math.PI * 2;
      game.debris.push({ x, y, radius, speed, spin, angle });
    }
  };

  const updateDebris = (dt, difficulty) => {
    const spawnInterval = lerp(820, 160, difficulty);
    const maxDebris = Math.floor(lerp(14, 48, difficulty));
    const baseSpeed = lerp(150, 650, difficulty);

    game.spawnTimer += dt * 1000;
    while (game.spawnTimer >= spawnInterval) {
      if (game.debris.length >= maxDebris) {
        game.spawnTimer -= spawnInterval;
        break;
      }
      let clusterCount = 1;
      if (difficulty > 0.45 && Math.random() < 0.3) {
        clusterCount = 2;
      }
      if (difficulty > 0.7 && Math.random() < 0.15) {
        clusterCount = 3;
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
    const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const d = easeInOut(p);
    game.progress = d;
    game.shakeIntensity = d;

    updateShip(dt);
    updateDebris(dt, d);
    checkCollisions();

    if (game.running) {
      drawGameFrame();
      game.rafId = window.requestAnimationFrame(gameLoop);
    } else if (game.over) {
      drawGameFrame(true);
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
    game.running = true;
    attachGameListeners();
    drawGameFrame();
    game.rafId = window.requestAnimationFrame(gameLoop);
  }

  function stopGame() {
    game.running = false;
    if (game.rafId) {
      window.cancelAnimationFrame(game.rafId);
      game.rafId = null;
    }
    game.over = false;
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
    if (experience) {
      experience.classList.remove("game-hidden");
    }
    if (gameMode) {
      gameMode.classList.remove("visible");
      gameMode.classList.add("hidden");
    }
    stopGame();
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
    ambientAudio.volume = 0.7;
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
      showGameMode();
    });
  }

  if (backToTimefallButton) {
    backToTimefallButton.addEventListener("click", () => {
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
