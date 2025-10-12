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

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const MIN_SAFE_DILATION = 0.0005;

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
    updateGravityDisplay(gravityFactor);
    if (!silent) {
      updateDifferentialValue();
    }
  };

  const startClocks = () => {
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
    };

    tick();
    clockIntervalId = window.setInterval(tick, updateInterval);
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
        /* User agent blocked playback; wait for manual interaction. */
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
      star.y += 0.045 * star.depth;
      star.x += 0.012 * star.depth;
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

    lensingAngle += 0.0026;
    lensingAnimationId = window.requestAnimationFrame(renderLensing);
  };

  const handleResize = () => {
    resizeStarfield();
    resizeLensing();
  };

  window.addEventListener("resize", () => {
    window.cancelAnimationFrame(starfieldAnimationId);
    window.cancelAnimationFrame(lensingAnimationId);
    handleResize();
    renderStarfield();
    renderLensing();
  });

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
  });

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

  handleResize();
  renderStarfield();
  renderLensing();
});
