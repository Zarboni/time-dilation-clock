const quotes = [
  { text: "Time is relative, okay? It can stretch, and it can squeeze, but... it can't run backwards.", author: "Cooper, Interstellar" },
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
  if (ambientAudio) {
    ambientAudio.src = "IC.mp3";
    ambientAudio.loop = true;
  }

  const gravityFactor = 0.8;
  const dilationFactor = Math.sqrt(1 - gravityFactor);
  const updateInterval = 100;
  let clockIntervalId = null;
  let quoteTimeoutId = null;
  let quoteIntervalId = null;
  let currentQuoteIndex = -1;

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const startClocks = () => {
    const baseTimestamp = Date.now();
    let lastTick = baseTimestamp;
    let dilatedElapsed = 0;

    const tick = () => {
      const now = Date.now();
      const delta = now - lastTick;
      lastTick = now;
      dilatedElapsed += delta * dilationFactor;

      const realTime = new Date(now);
      observerClock.textContent = formatTime(realTime);

      const dilatedTime = new Date(baseTimestamp + dilatedElapsed);
      singularityClock.textContent = formatTime(dilatedTime);
    };

    tick();
    clockIntervalId = setInterval(tick, updateInterval);
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
    if (!quoteContainer || quoteTimeoutId) {
      return;
    }
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

    setTimeout(() => {
      landingScreen.style.display = "none";
    }, 750);

    if (!clockIntervalId) {
      startClocks();
    }

    activateAudio();
    scheduleQuoteReveal();

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
});
