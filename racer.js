const canvas = document.getElementById("racerCanvas");
const ctx = canvas.getContext("2d");
const arrivalText = document.getElementById("arrivalText");
const stabilityFill = document.getElementById("stabilityFill");
const retryBtn = document.getElementById("retryBtn");
const backBtn = document.getElementById("backBtn");
const continueBtn = document.getElementById("continueBtn");
const endOverlay = document.getElementById("endOverlay");

let w = window.innerWidth;
let h = window.innerHeight;
let dpr = window.devicePixelRatio || 1;

const rng = (a, b) => a + Math.random() * (b - a);
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

const LANES = 4;
const laneWidth = 110;
const laneOffset = () => -((LANES - 1) * laneWidth) / 2;
const TRACK_LENGTH = 999999;
const ARRIVAL_SECONDS = 75;

const keys = { a: false, d: false, w: false, s: false };
const state = {
  time: 0,
  arrival: ARRIVAL_SECONDS,
  speed: 500,
  speedTarget: 500,
  difficulty: 0,
  stability: 100,
  boost: 0,
  boostCooldown: 0,
  running: true,
  finished: false,
  gatePhase: 0
};

const player = {
  lane: 1,
  x: 0,
  y: h * 0.78,
  velX: 0,
  wobble: 0
};

const aiList = [];
const hazards = [];
const pickups = [];
const gates = [];
const stars = [];

const palette = {
  bg: "#050a12",
  rail: "#64d8ff",
  divider: "rgba(100,200,255,0.3)",
  hazardRing: "#a26dff",
  hazardCore: "#2a143d",
  pickupCell: "#59e0ff",
  pickupBoost: "#ff9d5c"
};

const resize = () => {
  w = window.innerWidth;
  h = window.innerHeight;
  dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  player.y = h * 0.78;
};
resize();
window.addEventListener("resize", resize);

const setupStars = () => {
  stars.length = 0;
  for (let i = 0; i < 200; i += 1) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      speed: rng(80, 160),
      depth: rng(0.3, 1)
    });
  }
};
setupStars();

const createAI = () => {
  const variant = ["arrow", "twin", "disk"][Math.floor(Math.random() * 3)];
  const colors = ["#ff9d5c", "#ff6ad5", "#7bff75", "#ffd85c"];
  const c = colors[Math.floor(Math.random() * colors.length)];
  aiList.push({
    lane: Math.floor(Math.random() * LANES),
    y: -rng(200, 800),
    variant,
    color: c,
    glow: rng(0.5, 1),
    changeTimer: rng(1.5, 3)
  });
};
for (let i = 0; i < 6; i += 1) createAI();

const spawnHazard = () => {
  hazards.push({
    lane: Math.floor(Math.random() * LANES),
    y: -50,
    type: Math.random() < 0.5 ? "orb" : "shard",
    spin: rng(-2, 2)
  });
};

const spawnPickup = () => {
  pickups.push({
    lane: Math.floor(Math.random() * LANES),
    y: -50,
    type: Math.random() < 0.5 ? "stability" : "boost"
  });
};

const spawnGate = () => {
  gates.push({
    y: -120,
    pulse: 0
  });
};

const drawStarfield = (dt) => {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  stars.forEach((s) => {
    s.y += (state.speed * 0.2 + 200) * dt * s.depth;
    if (s.y > h + 10) {
      s.y = -10;
      s.x = Math.random() * w;
    }
    ctx.fillStyle = `rgba(130,200,255,${0.25 * s.depth})`;
    ctx.fillRect(s.x, s.y, 2, 6 * s.depth);
  });
  ctx.restore();
};

const laneX = (lane) => w / 2 + laneOffset() + lane * laneWidth;

const drawTrack = (dt) => {
  ctx.lineWidth = 4;
  ctx.strokeStyle = palette.rail;
  ctx.beginPath();
  ctx.moveTo(laneX(0) - laneWidth * 0.6, -50);
  ctx.lineTo(laneX(0) - laneWidth * 0.6, h + 50);
  ctx.moveTo(laneX(LANES - 1) + laneWidth * 0.6, -50);
  ctx.lineTo(laneX(LANES - 1) + laneWidth * 0.6, h + 50);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.divider;
  for (let i = 1; i < LANES; i += 1) {
    const x = laneX(i - 0.5);
    ctx.setLineDash([12, 14]);
    ctx.beginPath();
    ctx.moveTo(x, -20);
    ctx.lineTo(x, h + 20);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Flowing center glow
  if (centerLinePhase > 99999) centerLinePhase = 0;
  centerLinePhase += dt * 400;
  const grad = ctx.createLinearGradient(w / 2, 0, w / 2, h);
  grad.addColorStop(0, "rgba(80,220,255,0.12)");
  grad.addColorStop(1, "rgba(120,80,255,0.08)");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(w / 2, -((centerLinePhase % 40)));
  for (let y = -40; y < h + 80; y += 40) {
    ctx.moveTo(w / 2, y - (centerLinePhase % 40));
    ctx.lineTo(w / 2, y + 10 - (centerLinePhase % 40));
  }
  ctx.stroke();
};
let centerLinePhase = 0;

const drawVehicle = (x, y, isPlayer, variant, color, glow = 1, boostFlame = false) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = `${color}55`;
  ctx.shadowBlur = isPlayer ? 20 : 10;

  const body = new Path2D();
  if (variant === "twin") {
    body.moveTo(-16, 16);
    body.lineTo(-24, -10);
    body.lineTo(-16, -28);
    body.lineTo(-6, -36);
    body.lineTo(-6, 22);
    body.closePath();
    body.moveTo(16, 16);
    body.lineTo(24, -10);
    body.lineTo(16, -28);
    body.lineTo(6, -36);
    body.lineTo(6, 22);
    body.closePath();
  } else if (variant === "disk") {
    body.moveTo(0, -34);
    body.bezierCurveTo(26, -28, 32, -6, 26, 16);
    body.bezierCurveTo(18, 30, -18, 30, -26, 16);
    body.bezierCurveTo(-32, -6, -26, -28, 0, -34);
  } else {
    body.moveTo(0, -42);
    body.lineTo(24, 24);
    body.lineTo(0, 36);
    body.lineTo(-24, 24);
    body.closePath();
  }

  ctx.fillStyle = isPlayer ? "#78e3ff" : color;
  ctx.fill(body);
  ctx.strokeStyle = `${color}aa`;
  ctx.lineWidth = 2;
  ctx.stroke(body);

  // canopy
  ctx.fillStyle = "rgba(10,20,35,0.8)";
  ctx.fillRect(-10, -6, 20, 14);

  // fins
  ctx.fillStyle = `${color}aa`;
  ctx.beginPath();
  ctx.moveTo(-22, 8);
  ctx.lineTo(-32, 18);
  ctx.lineTo(-12, 18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(22, 8);
  ctx.lineTo(32, 18);
  ctx.lineTo(12, 18);
  ctx.closePath();
  ctx.fill();

  // thrusters
  ctx.fillStyle = `${color}bb`;
  ctx.beginPath();
  ctx.arc(-10, 26, 5, 0, Math.PI * 2);
  ctx.arc(10, 26, 5, 0, Math.PI * 2);
  ctx.fill();

  if (boostFlame) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const flame = new Path2D();
    flame.moveTo(0, 42);
    flame.lineTo(-8, 26);
    flame.lineTo(8, 26);
    flame.closePath();
    const grad = ctx.createLinearGradient(0, 26, 0, 44);
    grad.addColorStop(0, `${color}cc`);
    grad.addColorStop(1, `${color}00`);
    ctx.fillStyle = grad;
    ctx.fill(flame);
    ctx.restore();
  }
  ctx.restore();
};

const drawGate = (g, dt) => {
  g.pulse += dt;
  const y = g.y;
  const alpha = 0.5 + Math.sin(g.pulse * 4) * 0.2;
  ctx.strokeStyle = `rgba(120,220,255,${alpha})`;
  ctx.lineWidth = 6;
  const margin = laneWidth * 0.8 + laneWidth * (LANES - 1);
  ctx.strokeRect(w / 2 - margin, y - 20, margin * 2, 60);
};

const drawHazard = (h) => {
  const x = laneX(h.lane);
  const y = h.y;
  if (h.type === "orb") {
    ctx.fillStyle = palette.hazardCore;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.hazardRing;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(state.time * h.spin);
    ctx.fillStyle = palette.hazardRing;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(12, 10);
    ctx.lineTo(-14, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};

const drawPickup = (p) => {
  const x = laneX(p.lane);
  const y = p.y;
  ctx.save();
  ctx.translate(x, y);
  if (p.type === "stability") {
    ctx.fillStyle = palette.pickupCell;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = palette.pickupBoost;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawPortal = (dt) => {
  const cy = h * 0.18;
  const radius = 120 + Math.sin(state.time * 2) * 6;
  ctx.save();
  ctx.translate(w / 2, cy);
  ctx.rotate(state.time * 0.4);
  const ring = new Path2D();
  ring.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(100,220,255,0.5)";
  ctx.lineWidth = 12;
  ctx.stroke(ring);
  ctx.strokeStyle = "rgba(255,160,100,0.18)";
  ctx.lineWidth = 18;
  ctx.stroke(ring);
  ctx.restore();
};

const drawUI = () => {
  const remaining = Math.max(0, Math.ceil(state.arrival));
  const m = String(Math.floor(remaining / 60)).padStart(2, "0");
  const s = String(remaining % 60).padStart(2, "0");
  arrivalText.textContent = `${m}:${s}`;
  const stabilityScale = clamp(state.stability / 100, 0, 1);
  stabilityFill.style.transform = `scaleX(${stabilityScale})`;
};

const updateAI = (dt) => {
  aiList.forEach((ai) => {
    ai.y += state.speed * dt * 0.8;
    ai.changeTimer -= dt;
    if (ai.changeTimer <= 0 && Math.random() < 0.4) {
      ai.lane = clamp(ai.lane + (Math.random() < 0.5 ? -1 : 1), 0, LANES - 1);
      ai.changeTimer = rng(1.5, 3);
    }
    if (ai.y > h + 80) {
      ai.y = -rng(200, 600);
      ai.lane = Math.floor(Math.random() * LANES);
    }
  });
};

const updateHazards = (dt) => {
  hazards.forEach((hzd) => {
    hzd.y += state.speed * dt;
  });
  while (hazards.length && hazards[0].y > h + 60) hazards.shift();
};

const updatePickups = (dt) => {
  pickups.forEach((p) => (p.y += state.speed * dt));
  while (pickups.length && pickups[0].y > h + 60) pickups.shift();
};

const updateGates = (dt) => {
  gates.forEach((g) => (g.y += state.speed * dt * 1.1));
  while (gates.length && gates[0].y > h + 120) gates.shift();
};

const spawnLoop = (dt) => {
  spawnTimers.hazard -= dt;
  if (spawnTimers.hazard <= 0) {
    spawnHazard();
    spawnTimers.hazard = Math.max(0.35, 1.2 - state.difficulty * 0.8);
  }
  spawnTimers.pickup -= dt;
  if (spawnTimers.pickup <= 0) {
    spawnPickup();
    spawnTimers.pickup = 3.5 - state.difficulty * 1.2;
  }
  spawnTimers.gate -= dt;
  if (spawnTimers.gate <= 0) {
    spawnGate();
    spawnTimers.gate = 6 + Math.random() * 3;
  }
};
const spawnTimers = { hazard: 1, pickup: 2.5, gate: 5 };

const applyInput = (dt) => {
  const targetLaneChange = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
  player.velX += targetLaneChange * 800 * dt;
  player.velX *= 0.88;
  player.x += player.velX * dt;

  player.x = clamp(player.x, laneX(0) - laneWidth * 0.5, laneX(LANES - 1) + laneWidth * 0.5);

  if (keys.w && state.boostCooldown <= 0) {
    state.boost = 0.35;
    state.boostCooldown = 3;
  }
  if (state.boost > 0) {
    state.speedTarget = 900;
    state.boost -= dt;
  } else if (keys.s) {
    state.speedTarget = 400;
  } else {
    state.speedTarget = 550 + state.difficulty * 400;
  }
  state.speed += (state.speedTarget - state.speed) * 0.08;
  state.boostCooldown = Math.max(0, state.boostCooldown - dt);
};

const rectHit = (ax, ay, aw, ah, bx, by, bw, bh) => {
  return Math.abs(ax - bx) < (aw + bw) && Math.abs(ay - by) < (ah + bh);
};

const handleCollisions = (dt) => {
  const playerRect = { x: player.x, y: player.y - 12, w: 24, h: 36 };

  hazards.forEach((hzd) => {
    const hx = laneX(hzd.lane);
    if (rectHit(playerRect.x, playerRect.y, playerRect.w, playerRect.h, hx, hzd.y, 18, 24)) {
      state.stability -= 18;
      state.speed *= 0.7;
      hzd.y = h + 200;
    }
  });

  pickups.forEach((p) => {
    const px = laneX(p.lane);
    if (rectHit(playerRect.x, playerRect.y, playerRect.w, playerRect.h, px, p.y, 16, 16)) {
      if (p.type === "stability") {
        state.stability = clamp(state.stability + 22, 0, 100);
      } else {
        state.boost = 0.45;
        state.boostCooldown = 1;
      }
      p.y = h + 200;
    }
  });

  gates.forEach((g) => {
    if (g.y > player.y - 10 && g.y < player.y + 30) {
      state.speed *= 1.08;
      state.stability = clamp(state.stability + 5, 0, 100);
    }
  });

  if (state.stability <= 0 && state.running) {
    state.running = false;
    endOverlay.classList.add("visible");
    document.getElementById("endTitle").textContent = "Stability lost. Run failed.";
  }
};

const updateDifficulty = (dt) => {
  state.time += dt;
  state.arrival = Math.max(0, ARRIVAL_SECONDS - state.time);
  const p = clamp(state.time / ARRIVAL_SECONDS, 0, 1);
  state.difficulty = p;
  if (state.arrival <= 0 && state.running) {
    state.running = false;
    state.finished = true;
    state.gatePhase = 0;
    state.speedTarget = 200;
  }
};

const renderFinish = (dt) => {
  if (!state.finished) return;
  state.gatePhase += dt;
  const alpha = clamp(state.gatePhase, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  drawPortal(dt);
  if (state.gatePhase > 1.2) {
    endOverlay.classList.add("visible");
    document.getElementById("endTitle").textContent = [
      "The event horizon has been reached.",
      "Causal contact is no longer possible.",
      "Information cannot escape this region."
    ][Math.floor(Math.random() * 3)];
  }
};

const update = (dt) => {
  drawStarfield(dt);
  drawTrack(dt);
  drawPortal(dt);

  applyInput(dt);
  updateDifficulty(dt);
  updateAI(dt);
  updateHazards(dt);
  updatePickups(dt);
  updateGates(dt);
  spawnLoop(dt);
  handleCollisions(dt);

  // Move objects visually
  hazards.forEach((h) => (h.y += state.speed * dt));
  pickups.forEach((p) => (p.y += state.speed * dt));
  gates.forEach((g) => (g.y += state.speed * dt * 1.1));

  aiList.forEach((ai) => {
    drawVehicle(laneX(ai.lane), ai.y, false, ai.variant, ai.color, ai.glow, false);
  });
  hazards.forEach(drawHazard);
  pickups.forEach(drawPickup);
  gates.forEach((g) => drawGate(g, dt));

  drawVehicle(player.x, player.y, true, "arrow", "#7fe7ff", 1, state.boost > 0);
  renderFinish(dt);
  drawUI();
};

const loop = () => {
  const now = performance.now();
  const dt = clamp((now - lastTime) / 1000, 0, 0.05);
  lastTime = now;
  if (state.running || state.finished) {
    update(dt);
  }
  requestAnimationFrame(loop);
};
let lastTime = performance.now();

const reset = () => {
  state.time = 0;
  state.arrival = ARRIVAL_SECONDS;
  state.speed = 500;
  state.running = true;
  state.finished = false;
  state.stability = 100;
  state.boost = 0;
  state.boostCooldown = 0;
  hazards.length = 0;
  pickups.length = 0;
  gates.length = 0;
  aiList.length = 0;
  for (let i = 0; i < 6; i += 1) createAI();
  endOverlay.classList.remove("visible");
  centerLinePhase = 0;
};

retryBtn.addEventListener("click", reset);
continueBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});
backBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

document.addEventListener("keydown", (e) => {
  if (e.code === "KeyA" || e.code === "ArrowLeft") keys.a = true;
  if (e.code === "KeyD" || e.code === "ArrowRight") keys.d = true;
  if (e.code === "KeyW" || e.code === "ArrowUp") keys.w = true;
  if (e.code === "KeyS" || e.code === "ArrowDown") keys.s = true;
});
document.addEventListener("keyup", (e) => {
  if (e.code === "KeyA" || e.code === "ArrowLeft") keys.a = false;
  if (e.code === "KeyD" || e.code === "ArrowRight") keys.d = false;
  if (e.code === "KeyW" || e.code === "ArrowUp") keys.w = false;
  if (e.code === "KeyS" || e.code === "ArrowDown") keys.s = false;
});

reset();
loop();
