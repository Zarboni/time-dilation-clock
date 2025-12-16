import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const instructionsEl = document.querySelector(".instructions");
const messageEl = document.getElementById("message");
const fogLayers = Array.from(document.querySelectorAll(".fog-layer"));
const particleCanvas = document.getElementById("particleOverlay");
const crosshairEl = document.querySelector(".crosshair");
const humAudio = document.getElementById("humAudio");

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0c1624, 0.0038);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 2, -6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setClearColor(0x0f1928);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.inset = "0";
renderer.domElement.style.zIndex = "0";
document.body.appendChild(renderer.domElement);

// Hum audio (graceful fallback)
let humInitialized = false;
const HUM_VOL_IDLE = 0.18;
const HUM_VOL_MOVE = 0.32;
const initHum = () => {
  if (!humAudio || humInitialized) return;
  humAudio.src = "HUM.mp3";
  humAudio.loop = true;
  humAudio.volume = HUM_VOL_IDLE;
  humInitialized = true;
  const playPromise = humAudio.play();
  if (playPromise && typeof playPromise.then === "function") {
    playPromise.catch(() => {
      console.info("Hum playback blocked; will try again on interaction.");
    });
  }
};

const ambientLight = new THREE.AmbientLight(0x9ac7ff, 0.85);
scene.add(ambientLight);
const hemiLight = new THREE.HemisphereLight(0x8fbfff, 0x0c1624, 0.5);
scene.add(hemiLight);

const corridorLights = [];
const addPointLight = (x, y, z, color, intensity) => {
  const light = new THREE.PointLight(color, intensity, 42, 1.6);
  light.position.set(x, y, z);
  scene.add(light);
  corridorLights.push(light);
};

const corridor = {
  length: 140,
  width: 10,
  height: 8
};

addPointLight(0, 5, 0, 0x7fd4ff, 1);
addPointLight(0, 5, -corridor.length * 0.5, 0x7fd4ff, 1);
addPointLight(0, 5, -corridor.length, 0x7fd4ff, 1);

const floorMat = new THREE.MeshStandardMaterial({
  color: 0x22364c,
  emissive: 0x14243a,
  roughness: 0.7,
  metalness: 0.2
});
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x15263a,
  emissive: 0x102034,
  roughness: 0.8,
  metalness: 0.14
});
const ceilingMat = new THREE.MeshStandardMaterial({
  color: 0x0b1320,
  emissive: 0x0b1222,
  roughness: 0.82,
  metalness: 0.1
});

const buildCorridor = () => {
  const geoFloor = new THREE.BoxGeometry(corridor.width, 0.5, corridor.length);
  const floor = new THREE.Mesh(geoFloor, floorMat);
  floor.position.set(0, -0.25, -corridor.length / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  const geoCeiling = new THREE.BoxGeometry(corridor.width, 0.5, corridor.length);
  const ceiling = new THREE.Mesh(geoCeiling, ceilingMat);
  ceiling.position.set(0, corridor.height, -corridor.length / 2);
  scene.add(ceiling);

  const wallGeo = new THREE.BoxGeometry(0.5, corridor.height, corridor.length);
  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.position.set(-corridor.width / 2, corridor.height / 2, -corridor.length / 2);
  scene.add(leftWall);
  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.position.set(corridor.width / 2, corridor.height / 2, -corridor.length / 2);
  scene.add(rightWall);
};

buildCorridor();

const emissiveStrips = [];
const addStrips = () => {
  const stripMat = new THREE.MeshStandardMaterial({
    color: 0x0a1f2f,
    emissive: 0x51caff,
    emissiveIntensity: 1.35,
    metalness: 0.2,
    roughness: 0.32
  });
  const warmMat = new THREE.MeshStandardMaterial({
    color: 0x1c0f08,
    emissive: 0xffa060,
    emissiveIntensity: 1.3,
    metalness: 0.4,
    roughness: 0.3
  });
  for (let i = 0; i < corridor.length; i += 6) {
    const stripGeo = new THREE.BoxGeometry(0.2, 0.2, 4);
    const stripL = new THREE.Mesh(stripGeo, stripMat);
    stripL.position.set(-corridor.width / 2 + 0.3, 0.01, -i);
    scene.add(stripL);
    emissiveStrips.push(stripL);
    const stripR = stripL.clone();
    stripR.position.x = corridor.width / 2 - 0.3;
    scene.add(stripR);
    emissiveStrips.push(stripR);

    if (i % 12 === 0) {
      const warmGeo = new THREE.BoxGeometry(0.25, 0.1, 1.2);
      const warmL = new THREE.Mesh(warmGeo, warmMat);
      warmL.position.set(-corridor.width / 2 + 0.3, 0.02, -i - 2);
      scene.add(warmL);
      emissiveStrips.push(warmL);
      const warmR = warmL.clone();
      warmR.position.x = corridor.width / 2 - 0.3;
      scene.add(warmR);
      emissiveStrips.push(warmR);
    }
  }
  const centerLineGeo = new THREE.BoxGeometry(0.1, 0.05, corridor.length);
  const centerLine = new THREE.Mesh(centerLineGeo, new THREE.MeshStandardMaterial({
    color: 0x0f2635,
    emissive: 0x50d0ff,
    emissiveIntensity: 0.9,
    metalness: 0.2,
    roughness: 0.25
  }));
  centerLine.position.set(0, 0.05, -corridor.length / 2);
  scene.add(centerLine);

  // Cross floor strips for readability
  const crossGeo = new THREE.BoxGeometry(corridor.width * 0.9, 0.04, 0.15);
  const crossMat = new THREE.MeshStandardMaterial({
    color: 0x163049,
    emissive: 0x45c0ff,
    emissiveIntensity: 0.35,
    metalness: 0.25,
    roughness: 0.35
  });
  for (let z = 0; z >= -corridor.length; z -= 6) {
    const strip = new THREE.Mesh(crossGeo, crossMat);
    strip.position.set(0, 0.04, z);
    scene.add(strip);
  }
};

addStrips();

const floatingDebris = [];
const addFloatingDebris = () => {
  const debrisMat = new THREE.MeshStandardMaterial({
    color: 0x122234,
    emissive: 0x0d1828,
    metalness: 0.25,
    roughness: 0.55
  });
  for (let i = 0; i < 14; i += 1) {
    const geo = new THREE.BoxGeometry(0.6 + Math.random() * 1.6, 0.4 + Math.random() * 0.8, 1 + Math.random() * 2);
    const mesh = new THREE.Mesh(geo, debrisMat);
    mesh.position.set((Math.random() - 0.5) * corridor.width * 0.9, 1 + Math.random() * 4, -Math.random() * corridor.length);
    mesh.userData.speed = 0.5 + Math.random() * 0.6;
    mesh.userData.rot = new THREE.Vector3(Math.random() * 0.4, Math.random() * 0.4, Math.random() * 0.4);
    floatingDebris.push(mesh);
    scene.add(mesh);
  }
};
addFloatingDebris();

// Portal/anchor at corridor end
const addPortal = () => {
  const ringGeo = new THREE.TorusGeometry(1.6, 0.12, 16, 64);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x7fd8ff,
    emissive: 0x7fd8ff,
    emissiveIntensity: 1.6,
    metalness: 0.4,
    roughness: 0.25
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(0, 2.2, -corridor.length + 4);
  scene.add(ring);

  const outerGeo = new THREE.TorusGeometry(2.2, 0.18, 12, 48);
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0x9be0ff,
    transparent: true,
    opacity: 0.35
  });
  const outer = new THREE.Mesh(outerGeo, outerMat);
  outer.position.copy(ring.position);
  scene.add(outer);

  return { ring, outer };
};
const portal = addPortal();

// Doors
const doors = [];
const doorRaycaster = new THREE.Raycaster();
const doorDistance = 8;
const buildDoor = (zPos, side = "left") => {
  const doorWidth = 2.4;
  const doorHeight = 4.2;
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1c2a3c,
    emissive: 0x0d1724,
    roughness: 0.55,
    metalness: 0.45
  });
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x1d2f45,
    emissive: 0x0d1725,
    roughness: 0.5,
    metalness: 0.42
  });
  const indicatorOn = new THREE.MeshBasicMaterial({ color: 0x53c7ff });
  const indicatorOff = new THREE.MeshBasicMaterial({ color: 0xff6b4d });

  const group = new THREE.Group();
  group.position.set(side === "left" ? -corridor.width / 2 + 0.25 : corridor.width / 2 - 0.25, 0, zPos);

  const frameGeo = new THREE.BoxGeometry(0.4, doorHeight, 0.4);
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.set(side === "left" ? 0.2 : -0.2, doorHeight / 2, 0);
  group.add(frame);

  const panelGeo = new THREE.BoxGeometry(0.2, doorHeight * 0.9, 1.8);
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.set(side === "left" ? 0.35 : -0.35, doorHeight * 0.45, 0);
  group.add(panel);

  const keypadGeo = new THREE.BoxGeometry(0.08, 0.25, 0.18);
  const keypad = new THREE.Mesh(keypadGeo, new THREE.MeshStandardMaterial({
    color: 0x102030,
    emissive: 0x53c7ff,
    emissiveIntensity: 0.9,
    roughness: 0.4,
    metalness: 0.4
  }));
  keypad.position.set(side === "left" ? 0.7 : -0.7, doorHeight * 0.45, 0.9);
  group.add(keypad);

  const indicatorGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  const indicator = new THREE.Mesh(indicatorGeo, indicatorOff);
  indicator.position.set(panel.position.x, doorHeight * 0.8, 0.4);
  group.add(indicator);

  scene.add(group);
  doors.push({
    group,
    panel,
    indicator,
    open: false,
    openProgress: 0,
    side
  });
};

buildDoor(-20, "left");
buildDoor(-40, "right");
buildDoor(-70, "left");
buildDoor(-100, "right");

// Dust motes
const addDust = () => {
  const count = 120;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * corridor.width * 0.9;
    positions[i * 3 + 1] = Math.random() * corridor.height * 0.9;
    positions[i * 3 + 2] = -Math.random() * corridor.length;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0x9fcfff, size: 0.05, transparent: true, opacity: 0.4 });
  const points = new THREE.Points(geom, mat);
  scene.add(points);
};
addDust();

// Particle overlay (2D) for parallax depth
const particles2D = [];
const initParticles2D = () => {
  if (!particleCanvas) return;
  const count = 180;
  particleCanvas.width = window.innerWidth;
  particleCanvas.height = window.innerHeight;
  for (let i = 0; i < count; i += 1) {
    particles2D.push({
      x: Math.random() * particleCanvas.width,
      y: Math.random() * particleCanvas.height,
      depth: 0.4 + Math.random() * 0.8,
      size: 1 + Math.random() * 1.5
    });
  }
};
initParticles2D();

const renderParticles2D = (movementVec = { x: 0, y: 0 }) => {
  if (!particleCanvas) return;
  const ctx = particleCanvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  ctx.fillStyle = "rgba(170, 220, 255, 0.35)";
  particles2D.forEach((p) => {
    p.x += (Math.random() - 0.5) * 0.2 + movementVec.x * 0.6 * p.depth;
    p.y += (Math.random() - 0.5) * 0.2 + movementVec.y * 0.6 * p.depth - 0.25 * p.depth;
    if (p.x < 0) p.x += particleCanvas.width;
    if (p.x > particleCanvas.width) p.x -= particleCanvas.width;
    if (p.y < 0) p.y += particleCanvas.height;
    if (p.y > particleCanvas.height) p.y -= particleCanvas.height;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
};

// Movement
const keys = { w: false, a: false, s: false, d: false };
let pointerLocked = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let moveVector2D = { x: 0, y: 0 };

const onKeyDown = (event) => {
  if (event.code === "KeyW") keys.w = true;
  if (event.code === "KeyS") keys.s = true;
  if (event.code === "KeyA") keys.a = true;
  if (event.code === "KeyD") keys.d = true;
  if (event.code === "KeyE") {
    tryInteract();
  }
};
const onKeyUp = (event) => {
  if (event.code === "KeyW") keys.w = false;
  if (event.code === "KeyS") keys.s = false;
  if (event.code === "KeyA") keys.a = false;
  if (event.code === "KeyD") keys.d = false;
};

document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", onKeyUp);

// Pointer lock
const pointerMove = (event) => {
  if (!pointerLocked) return;
  const lookSpeed = 0.0023;
  camera.rotation.order = "YXZ";
  camera.rotation.y -= event.movementX * lookSpeed;
  camera.rotation.x -= event.movementY * lookSpeed;
  camera.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, camera.rotation.x));
};

document.addEventListener("mousemove", pointerMove);

const lockPointer = () => {
  document.body.requestPointerLock();
};

document.addEventListener("click", () => {
  if (!pointerLocked) {
    lockPointer();
  }
  initHum();
});

document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === document.body;
  if (pointerLocked) {
    initHum();
  }
});

// Doors interaction
const showMessage = (text) => {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.classList.add("visible");
  window.clearTimeout(showMessage.timeout);
  showMessage.timeout = window.setTimeout(() => messageEl.classList.remove("visible"), 1200);
};

const tryInteract = () => {
  doorRaycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const intersects = doorRaycaster.intersectObjects(doors.map((d) => d.panel), false);
  if (intersects.length) {
    const hit = intersects[0].object;
    const door = doors.find((d) => d.panel === hit);
    if (!door) return;
    const dist = intersects[0].distance;
    if (dist > doorDistance) return;
    door.open = !door.open;
    door.indicator.material.color.set(door.open ? 0x53c7ff : 0xff6b4d);
    showMessage(door.open ? "Door opened" : "Door locked");
  }
};

// Loop trigger
const loopTriggerZ = -corridor.length + 8;
let flickerTimer = 0;

// Camera bob
let bobPhase = 0;

const updateDoors = (dt) => {
  doors.forEach((door) => {
    const target = door.open ? 1 : 0;
    door.openProgress += (target - door.openProgress) * Math.min(1, dt * 6);
    const offset = (door.side === "left" ? -1 : 1) * door.openProgress * 1.5;
    door.panel.position.x = (door.side === "left" ? 0.35 : -0.35) + offset;
  });
};

const updateMovement = (dt) => {
  direction.set(0, 0, 0);
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

  if (keys.w) direction.add(forward);
  if (keys.s) direction.sub(forward);
  if (keys.d) direction.add(right);
  if (keys.a) direction.sub(right);
  if (direction.lengthSq() > 0) {
    direction.normalize();
  }

  const speed = 6;
  const vx = direction.x * speed * dt;
  const vz = direction.z * speed * dt;

  camera.position.addScaledVector(direction, speed * dt);
  moveVector2D = { x: vx, y: vz };

  const margin = 1.8;
  camera.position.x = Math.max(-corridor.width / 2 + margin, Math.min(corridor.width / 2 - margin, camera.position.x));
  camera.position.y = Math.max(1.4, Math.min(corridor.height - 1.5, camera.position.y));
  camera.position.z = Math.max(-corridor.length + 2, Math.min(2, camera.position.z));

  // bob
  const moving = direction.lengthSq() > 0;
  if (moving) {
    bobPhase += dt * 8;
  } else {
    bobPhase += dt * 2;
  }
  const bobOffset = Math.sin(bobPhase) * 0.04 * (moving ? 1 : 0.5);
  camera.position.y += bobOffset;

  // high-stress jitter near end
  const progress = Math.abs(camera.position.z) / corridor.length;
  if (progress > 0.8) {
    const j = (progress - 0.8) / 0.2;
    camera.position.x += (Math.random() - 0.5) * 0.03 * j;
    camera.position.y += (Math.random() - 0.5) * 0.02 * j;
  }
};

const updateLoopTrigger = (dt) => {
  if (camera.position.z <= loopTriggerZ) {
    flickerTimer = 0.3;
    camera.position.set(0, 2, 3);
  }
  if (flickerTimer > 0) {
    flickerTimer -= dt;
    const intensity = flickerTimer > 0 ? 0.3 : 1;
    corridorLights.forEach((l) => (l.intensity = 0.4 + Math.random() * 0.5));
  } else {
    corridorLights.forEach((l, idx) => {
      l.intensity = 0.6 + Math.sin(performance.now() * 0.001 + idx) * 0.1;
    });
  }
};

const clock = new THREE.Clock();

const updateFogLayers = () => {
  if (!fogLayers.length) return;
  const baseTime = performance.now() * 0.00003;
  fogLayers.forEach((layer, idx) => {
    const speed = 0.35 + idx * 0.12;
    const offsetX = (Math.sin(baseTime * speed) + moveVector2D.x * 10) * (8 + idx * 3);
    const offsetY = (Math.cos(baseTime * speed * 1.1) + moveVector2D.y * 10) * (8 + idx * 3);
    layer.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  });
};

const updateHumVolume = () => {
  if (!humAudio || !humInitialized) return;
  const moveMag = Math.min(1, Math.sqrt(moveVector2D.x * moveVector2D.x + moveVector2D.y * moveVector2D.y) * 2);
  const target = HUM_VOL_IDLE + (HUM_VOL_MOVE - HUM_VOL_IDLE) * moveMag;
  humAudio.volume += (target - humAudio.volume) * 0.1;
};

const animate = () => {
  const dt = Math.min(0.05, clock.getDelta());
  updateMovement(dt);
  updateDoors(dt);
  updateLoopTrigger(dt);
  updateFogLayers();
  renderParticles2D(moveVector2D);
  updateHumVolume();
  if (portal && portal.ring) {
    portal.ring.rotation.y += dt * 0.6;
    portal.outer.rotation.y -= dt * 0.4;
  }
  if (crosshairEl) {
    const moving = Math.abs(moveVector2D.x) + Math.abs(moveVector2D.y) > 0.01;
    crosshairEl.classList.toggle("moving", moving);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (particleCanvas) {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
  }
});

animate();
