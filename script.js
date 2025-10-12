document.addEventListener("DOMContentLoaded", () => {
  const beginButton = document.getElementById("beginButton");
  const landingScreen = document.getElementById("landing");
  const experience = document.getElementById("experience");
  const observerClock = document.getElementById("observerClock");
  const singularityClock = document.getElementById("singularityClock");
  const ambientAudio = document.getElementById("ambientAudio");
  if (ambientAudio) {
    ambientAudio.src = "IC.mp3";
  }

  const gravityFactor = 0.8;
  const dilationFactor = Math.sqrt(1 - gravityFactor);
  const updateInterval = 100;
  let clockIntervalId = null;

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
  });
});
