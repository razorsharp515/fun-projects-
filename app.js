import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const techniqueNameEl = document.getElementById("technique-name");
const statusTextEl = document.getElementById("status-text");
const videoElement = document.querySelector(".input_video");
const canvasElement = document.getElementById("output_canvas");
const qualityModeEl = document.getElementById("quality-mode");
const particleSizeEl = document.getElementById("particle-size");
const reduceMotionEl = document.getElementById("reduce-motion");
const hudEl = document.getElementById("hud");
const controlPanelEl = document.getElementById("control-panel");
const panelToggleEl = document.getElementById("panel-toggle");
const canvasCtx = canvasElement.getContext("2d");

const isMobile = window.innerWidth < 900;
const HIGH_COUNT = isMobile ? 9000 : 14000;
const LOW_COUNT = isMobile ? 4500 : 7000;
const BLOOD_LINE_RATIO = 0.45;
const IRON_LAVA_RATIO = 0.18;
const IRON_CONE_RATIO = 0.66;
const IRON_JET_RATIO = 0.82;
const IRON_BOMB_RATIO = 0.92;
const MAHO_WHEEL_RATIO = 0.72;
const MAHO_CRESCENT_RATIO = 0.88;
const MAHO_BODY_RATIO = 0.9;
let activeCount = HIGH_COUNT;
let qualityMode = "auto";
let reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 55;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.domElement.dataset.engine = "three";
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.4, 0.35, 0.88);
composer.addPass(bloomPass);

const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(HIGH_COUNT * 3);
const colors = new Float32Array(HIGH_COUNT * 3);
const targetPositions = new Float32Array(HIGH_COUNT * 3);
const targetColors = new Float32Array(HIGH_COUNT * 3);
const ironBombVelocity = new Float32Array(HIGH_COUNT * 3);

geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
geometry.setDrawRange(0, activeCount);

const particles = new THREE.Points(
  geometry,
  new THREE.PointsMaterial({
    size: 0.32,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  })
);
scene.add(particles);

const techniqueBuffers = {
  neutral: createTechniqueBuffer("neutral"),
  red: createTechniqueBuffer("red"),
  void: createTechniqueBuffer("void"),
  purple: createTechniqueBuffer("purple"),
  shrine: createTechniqueBuffer("shrine"),
  blood: createTechniqueBuffer("blood"),
  iron_mountain: createTechniqueBuffer("iron_mountain"),
  mahoraga: createTechniqueBuffer("mahoraga")
};

let currentTech = "";
let candidateTech = "neutral";
let candidateFrames = 0;
let shakeIntensity = 0;
let glowColor = "#00ffff";
let avgFrameMs = 16.6;
let frameCounter = 0;
let resizedVideo = false;
let lastHudUpdate = 0;
const mobilePanelQuery = window.matchMedia("(max-width: 720px)");

function setStatus(text) {
  if (statusTextEl) statusTextEl.textContent = text;
}

function setTechnique(tech) {
  const resolvedTech = tech;
  if (currentTech === resolvedTech) return;
  currentTech = resolvedTech;

  if (resolvedTech === "shrine") {
    glowColor = "#ff0000";
    techniqueNameEl.innerText = "Domain Expansion: Malevolent Shrine";
    bloomPass.strength = 2.2;
    shakeIntensity = 0.42;
  } else if (resolvedTech === "purple") {
    glowColor = "#bb00ff";
    techniqueNameEl.innerText = "Secret Technique: Hollow Purple";
    bloomPass.strength = 3.4;
    shakeIntensity = 0.48;
  } else if (resolvedTech === "void") {
    glowColor = "#00ffff";
    techniqueNameEl.innerText = "Domain Expansion: Infinite Void";
    bloomPass.strength = 1.9;
    shakeIntensity = 0.35;
  } else if (resolvedTech === "red") {
    glowColor = "#ff3333";
    techniqueNameEl.innerText = "Reverse Cursed Technique: Red";
    bloomPass.strength = 2.35;
    shakeIntensity = 0.38;
  } else if (resolvedTech === "blood") {
    glowColor = "#d20f2a";
    techniqueNameEl.innerText = "Domain Expansion: Blood Manipulation";
    bloomPass.strength = 2.6;
    shakeIntensity = 0.22;
  } else if (resolvedTech === "iron_mountain") {
    glowColor = "#ff7a2f";
    techniqueNameEl.innerText = "Domain Expansion: Coffin of the Iron Mountain";
    bloomPass.strength = 1.85;
    shakeIntensity = 0.34;
  } else if (resolvedTech === "mahoraga") {
    glowColor = "#c9d3e0";
    techniqueNameEl.innerText = "Domain Expansion: Mahoraga";
    bloomPass.strength = 1.75;
    shakeIntensity = 0.28;
  } else {
    glowColor = "#00ffff";
    techniqueNameEl.innerText = "Neutral State";
    bloomPass.strength = 1.0;
    shakeIntensity = 0;
  }

  const src = techniqueBuffers[resolvedTech];
  for (let i = 0; i < activeCount * 3; i += 1) {
    targetPositions[i] = src.positions[i];
    targetColors[i] = src.colors[i];
  }
}

function updateGestureState(nextTech) {
  if (nextTech === candidateTech) {
    candidateFrames += 1;
  } else {
    candidateTech = nextTech;
    candidateFrames = 1;
  }
  if (candidateFrames >= 4) {
    setTechnique(candidateTech);
  }
}

function adaptQuality() {
  if (qualityMode !== "auto") return;

  if (avgFrameMs > 24 && activeCount > LOW_COUNT) {
    activeCount = Math.max(LOW_COUNT, activeCount - 900);
    geometry.setDrawRange(0, activeCount);
    setTechnique(currentTech);
    setStatus(`Running in performance mode (${activeCount} particles)`);
  } else if (avgFrameMs < 15 && activeCount < HIGH_COUNT) {
    activeCount = Math.min(HIGH_COUNT, activeCount + 600);
    geometry.setDrawRange(0, activeCount);
    setTechnique(currentTech);
    setStatus(`Quality increased (${activeCount} particles)`);
  }
}

function createTechniqueBuffer(type) {
  const outPos = new Float32Array(HIGH_COUNT * 3);
  const outCol = new Float32Array(HIGH_COUNT * 3);

  for (let i = 0; i < HIGH_COUNT; i += 1) {
    const p = pointForTechnique(type, i, HIGH_COUNT);
    const idx = i * 3;
    outPos[idx] = p.x;
    outPos[idx + 1] = p.y;
    outPos[idx + 2] = p.z;
    outCol[idx] = p.r;
    outCol[idx + 1] = p.g;
    outCol[idx + 2] = p.b;
  }
  return { positions: outPos, colors: outCol };
}

function applyQualityMode(nextMode) {
  qualityMode = nextMode;
  if (qualityMode === "low") {
    activeCount = LOW_COUNT;
    setStatus(`Low quality mode (${activeCount} particles)`);
  } else if (qualityMode === "high") {
    activeCount = HIGH_COUNT;
    setStatus(`High quality mode (${activeCount} particles)`);
  } else {
    activeCount = HIGH_COUNT;
    setStatus("Auto quality enabled");
  }
  geometry.setDrawRange(0, activeCount);
  setTechnique(currentTech || "neutral");
}

function pointForTechnique(type, i, count) {
  if (type === "red") return getRed(i, count);
  if (type === "void") return getVoid(i, count);
  if (type === "purple") return getPurple(i, count);
  if (type === "shrine") return getShrine(i, count);
  if (type === "blood") return getBlood(i, count);
  if (type === "iron_mountain") return getIronMountain(i, count);
  if (type === "mahoraga") return getMahoraga(i, count);
  return getNeutral(i, count);
}

function getNeutral(i, count) {
  if (i < count * 0.08) {
    const r = 15 + Math.random() * 20;
    const t = Math.random() * Math.PI * 2;
    const p = Math.random() * Math.PI;
    return {
      x: r * Math.sin(p) * Math.cos(t),
      y: r * Math.sin(p) * Math.sin(t),
      z: r * Math.cos(p),
      r: 0.12,
      g: 0.13,
      b: 0.22
    };
  }
  return { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0 };
}

function getRed(i, count) {
  if (i < count * 0.1) {
    const r = Math.random() * 9;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return {
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta),
      z: r * Math.cos(phi),
      r: 1.6,
      g: 0.25,
      b: 0.25
    };
  }
  const armCount = 3;
  const t = i / count;
  const angle = t * 15 + (i % armCount) * ((Math.PI * 2) / armCount);
  const radius = 2 + t * 40;
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
    z: (Math.random() - 0.5) * (10 * t),
    r: 1.0,
    g: 0.2,
    b: 0.2
  };
}

function getVoid(i, count) {
  if (i < count * 0.15) {
    const angle = Math.random() * Math.PI * 2;
    return { x: 26 * Math.cos(angle), y: 26 * Math.sin(angle), z: (Math.random() - 0.5), r: 1, g: 1, b: 1 };
  }
  const radius = 30 + Math.random() * 90;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi),
    r: 0.1,
    g: 0.6,
    b: 1.0
  };
}

function getPurple() {
  if (Math.random() > 0.8) {
    return {
      x: (Math.random() - 0.5) * 100,
      y: (Math.random() - 0.5) * 100,
      z: (Math.random() - 0.5) * 100,
      r: 0.5,
      g: 0.5,
      b: 0.7
    };
  }
  const r = 20;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi),
    r: 0.6,
    g: 0.5,
    b: 1.0
  };
}

function getShrine(i, count) {
  if (i < count * 0.3) {
    return { x: (Math.random() - 0.5) * 80, y: -15, z: (Math.random() - 0.5) * 80, r: 0.4, g: 0, b: 0 };
  }
  if (i < count * 0.4) {
    const px = (i % 4 < 2 ? 1 : -1) * 12;
    const pz = (i % 4) % 2 === 0 ? 1 : -1;
    return {
      x: px + (Math.random() - 0.5) * 2,
      y: -15 + Math.random() * 30,
      z: pz * 8 + (Math.random() - 0.5) * 2,
      r: 0.2,
      g: 0.2,
      b: 0.2
    };
  }
  if (i < count * 0.6) {
    const t = Math.random() * Math.PI * 2;
    const rad = Math.random() * 30;
    const curve = Math.pow(rad / 30, 2) * 10;
    return {
      x: rad * Math.cos(t),
      y: 15 - curve + Math.random() * 2,
      z: rad * Math.sin(t) * 0.6,
      r: 0.6,
      g: 0,
      b: 0
    };
  }
  return { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0 };
}

function getBlood(i, count) {
  const lineLimit = count * BLOOD_LINE_RATIO;

  if (i < lineLimit) {
    const t = i / Math.max(1, lineLimit - 1);
    const x = -105 + t * 210;
    return {
      x: x + (Math.random() - 0.5) * 0.3,
      y: (Math.random() - 0.5) * 0.18,
      z: (Math.random() - 0.5) * 0.4,
      r: 0.82,
      g: 0.08,
      b: 0.1
    };
  }

  // Cylindrical cloud around the center line; rotated in animate() for a revolving look.
  const x = -105 + Math.random() * 210;
  const angle = Math.random() * Math.PI * 2;
  const radius = 3 + Math.random() * 10;
  return {
    x,
    y: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    r: 0.9,
    g: 0.12,
    b: 0.14
  };
}

function getIronMountain(i, count) {
  const lavaLimit = count * IRON_LAVA_RATIO;
  const coneLimit = count * IRON_CONE_RATIO;
  const jetLimit = count * IRON_JET_RATIO;
  const bombLimit = count * IRON_BOMB_RATIO;

  if (i < lavaLimit) {
    // Crater interior as an uneven vent volume (avoid flat luminous plane).
    const t = Math.random() * Math.PI * 2;
    const r = Math.pow(Math.random(), 0.68) * 13;
    const y = -7 + Math.random() * 10;
    const skew = 0.75 + Math.random() * 0.45;
    return {
      x: Math.cos(t) * r * skew,
      y,
      z: Math.sin(t) * r * (2 - skew),
      r: 0.82 + Math.random() * 0.12,
      g: 0.2 + Math.random() * 0.22,
      b: 0.03 + Math.random() * 0.02
    };
  }

  if (i < coneLimit) {
    // Main cone shell (wide base, narrow vent).
    const t = Math.random() * Math.PI * 2;
    const h = Math.random();
    const radius = 44 - h * 36 + (Math.random() - 0.5) * 1.4;
    return {
      x: Math.cos(t) * radius,
      y: -28 + h * 34,
      z: Math.sin(t) * radius * 0.9,
      r: 0.22 + h * 0.33,
      g: 0.05 + h * 0.15,
      b: 0.02
    };
  }

  if (i < jetLimit) {
    // Central fire jet.
    const t = Math.random() * Math.PI * 2;
    const radius = Math.random() * 6;
    const y = 0 + Math.pow(Math.random(), 0.7) * 62;
    return {
      x: Math.cos(t) * radius + (Math.random() - 0.5) * 1.5,
      y,
      z: Math.sin(t) * radius + (Math.random() - 0.5) * 1.5,
      r: 1.0,
      g: 0.5 + Math.random() * 0.35,
      b: 0.08
    };
  }

  if (i < bombLimit) {
    // Lava bombs seeded near vent with varied launch spread.
    const t = Math.random() * Math.PI * 2;
    const launch = 1.5 + Math.random() * 10;
    return {
      x: Math.cos(t) * launch,
      y: 2 + Math.random() * 14,
      z: Math.sin(t) * launch,
      r: 0.95,
      g: 0.28 + Math.random() * 0.22,
      b: 0.05
    };
  }

  // Ash cloud.
  const t = Math.random() * Math.PI * 2;
  const p = Math.acos(2 * Math.random() - 1);
  const r = 30 + Math.random() * 90;
  const ash = 0.1 + Math.random() * 0.18;
  return {
    x: r * Math.sin(p) * Math.cos(t),
    y: 18 + r * 0.28 * Math.sin(p) * Math.sin(t),
    z: r * Math.cos(p),
    r: ash,
    g: ash * 0.7,
    b: ash * 0.45
  };
}

function getMahoraga(i, count) {
  const wheelLimit = count * MAHO_WHEEL_RATIO;
  const crescentLimit = count * MAHO_CRESCENT_RATIO;
  const bodyLimit = count * MAHO_BODY_RATIO;
  const centerY = 10;
  const haloCenterY = centerY - 10;
  const outerR = 22;
  const innerR = 14;

  if (i < wheelLimit) {
    const part = Math.random();
    const a = Math.random() * Math.PI * 2;

    // Front-facing 8-armed wheel sigil (XY plane).
    if (part < 0.24) {
      const r = outerR + (Math.random() - 0.5) * 1.2;
      return { x: Math.cos(a) * r, y: centerY + Math.sin(a) * r, z: (Math.random() - 0.5) * 0.65, r: 0.84, g: 0.87, b: 0.92 };
    }
    if (part < 0.44) {
      const r = innerR + (Math.random() - 0.5) * 1.0;
      return { x: Math.cos(a) * r, y: centerY + Math.sin(a) * r, z: (Math.random() - 0.5) * 0.65, r: 0.82, g: 0.85, b: 0.9 };
    }
    if (part < 0.56) {
      const r = Math.random() * 4.6;
      return { x: Math.cos(a) * r, y: centerY + Math.sin(a) * r, z: (Math.random() - 0.5) * 0.8, r: 0.86, g: 0.89, b: 0.94 };
    }

    const spoke = Math.floor(Math.random() * 8);
    const spokeA = (spoke / 8) * Math.PI * 2;
    const s = Math.random();
    const r = 3.8 + s * 25;
    return {
      x: Math.cos(spokeA) * r + (Math.random() - 0.5) * 0.85,
      y: centerY + Math.sin(spokeA) * r + (Math.random() - 0.5) * 0.85,
      z: (Math.random() - 0.5) * 0.9,
      r: 0.8,
      g: 0.84,
      b: 0.9
    };
  }

  if (i < crescentLimit) {
    // Circular nodes at spoke endpoints.
    const node = Math.floor(Math.random() * 8);
    const nodeA = (node / 8) * Math.PI * 2;
    const cx = Math.cos(nodeA) * 30;
    const cy = centerY + Math.sin(nodeA) * 30;
    const a = Math.random() * Math.PI * 2;
    const rr = 2.5 + Math.random() * 1.3;
    return {
      x: cx + Math.cos(a) * rr,
      y: cy + Math.sin(a) * rr,
      z: (Math.random() - 0.5) * 1.6,
      r: 0.81,
      g: 0.85,
      b: 0.9
    };
  }

  if (i < bodyLimit) {
    // Reduced aura halo so the sigil stays readable.
    const a = Math.random() * Math.PI * 2;
    const r = 24 + Math.random() * 18;
    return {
      x: Math.cos(a) * r + (Math.random() - 0.5) * 1.4,
      y: haloCenterY + Math.sin(a) * (r * 0.62) + (Math.random() - 0.5) * 1.2,
      z: (Math.random() - 0.5) * 10,
      r: 0.22 + Math.random() * 0.1,
      g: 0.28 + Math.random() * 0.12,
      b: 0.4 + Math.random() * 0.16
    };
  }
  // Grey withering particles below the halo.
  const a = Math.random() * Math.PI * 2;
  const r = 8 + Math.random() * 26;
  return {
    x: Math.cos(a) * r + (Math.random() - 0.5) * 18,
    y: haloCenterY + 4 + Math.random() * 28,
    z: (Math.random() - 0.5) * (12 + Math.random() * 12),
    r: 0.32 + Math.random() * 0.2,
    g: 0.32 + Math.random() * 0.2,
    b: 0.34 + Math.random() * 0.22
  };
}
function classifyTechnique(results) {
  const hands = results.multiHandLandmarks || [];
  if (!hands.length) return { tech: "neutral" };

  const isUp = (lm, t, p) => lm[t].y < lm[p].y;
  let sawPinch = false;
  let sawShrine = false;
  let sawVoid = false;
  let sawRed = false;
  let sawBlood = false;
  let sawIronMountain = false;
  let closedFistCount = 0;

  for (const lm of hands) {
    const pinch = Math.hypot(lm[8].x - lm[4].x, lm[8].y - lm[4].y);
    if (pinch < 0.04) sawPinch = true;

    const idxUp = isUp(lm, 8, 6);
    const midUp = isUp(lm, 12, 10);
    const ringUp = isUp(lm, 16, 14);
    const pinkUp = isUp(lm, 20, 18);

    const closedIndex = Math.hypot(lm[8].x - lm[5].x, lm[8].y - lm[5].y) < 0.12;
    const closedMiddle = Math.hypot(lm[12].x - lm[9].x, lm[12].y - lm[9].y) < 0.12;
    const closedRing = Math.hypot(lm[16].x - lm[13].x, lm[16].y - lm[13].y) < 0.12;
    const closedPinky = Math.hypot(lm[20].x - lm[17].x, lm[20].y - lm[17].y) < 0.12;
    const closedFist = closedIndex && closedMiddle && closedRing && closedPinky;

    const indexPinkySign = idxUp && pinkUp && !midUp && !ringUp;

    if (closedFist) closedFistCount += 1;

    if (indexPinkySign) {
      sawIronMountain = true;
    } else if (closedFist) {
      sawBlood = true;
    } else if (idxUp && midUp && ringUp && pinkUp) sawShrine = true;
    else if (idxUp && midUp && !ringUp) sawVoid = true;
    else if (idxUp && !midUp) sawRed = true;
  }

  if (closedFistCount >= 2) return { tech: "mahoraga" };
  if (sawIronMountain) return { tech: "iron_mountain" };
  if (sawBlood) return { tech: "blood" };
  if (sawPinch) return { tech: "purple" };
  if (sawShrine) return { tech: "shrine" };
  if (sawVoid) return { tech: "void" };
  if (sawRed) return { tech: "red" };
  return { tech: "neutral" };
}

function drawHands(results) {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  const landmarks = results.multiHandLandmarks;
  if (!landmarks) return;
  for (const lm of landmarks) {
    drawConnectors(canvasCtx, lm, HAND_CONNECTIONS, { color: glowColor, lineWidth: 4 });
    drawLandmarks(canvasCtx, lm, { color: "#fff", lineWidth: 1, radius: 2 });
  }
}

function ensureVideoCanvasSize() {
  const w = videoElement.videoWidth;
  const h = videoElement.videoHeight;
  if (!w || !h) return;
  if (canvasElement.width !== w || canvasElement.height !== h) {
    canvasElement.width = w;
    canvasElement.height = h;
    resizedVideo = true;
  }
}

function updateHud(now) {
  if (!hudEl || now - lastHudUpdate < 250) return;
  const fps = Math.max(1, Math.round(1000 / Math.max(avgFrameMs, 1)));
  hudEl.textContent = `FPS: ${fps} | Particles: ${activeCount} | Mode: ${qualityMode.toUpperCase()}`;
  lastHudUpdate = now;
}

function setupControls() {
  if (qualityModeEl) {
    qualityModeEl.value = qualityMode;
    qualityModeEl.addEventListener("change", (event) => {
      applyQualityMode(event.target.value);
    });
  }

  if (particleSizeEl) {
    particleSizeEl.value = String(particles.material.size);
    particleSizeEl.addEventListener("input", (event) => {
      particles.material.size = Number(event.target.value);
    });
  }

  if (reduceMotionEl) {
    reduceMotionEl.checked = reduceMotion;
    reduceMotionEl.addEventListener("change", (event) => {
      reduceMotion = Boolean(event.target.checked);
      if (reduceMotion) {
        shakeIntensity = 0;
        renderer.domElement.style.transform = "translate(0,0)";
      }
    });
  }
}

function setMobilePanelOpen(isOpen) {
  if (!controlPanelEl || !panelToggleEl) return;
  controlPanelEl.classList.toggle("is-open", isOpen);
  panelToggleEl.setAttribute("aria-expanded", String(isOpen));
}

function syncMobilePanelState() {
  if (!mobilePanelQuery.matches) {
    setMobilePanelOpen(true);
    return;
  }
  setMobilePanelOpen(false);
}

function setupMobilePanelToggle() {
  if (!controlPanelEl || !panelToggleEl) return;

  panelToggleEl.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = panelToggleEl.getAttribute("aria-expanded") === "true";
    setMobilePanelOpen(!isOpen);
  });

  document.addEventListener("click", (event) => {
    if (!mobilePanelQuery.matches) return;
    if (!(event.target instanceof Node)) return;
    if (panelToggleEl.contains(event.target) || controlPanelEl.contains(event.target)) return;
    setMobilePanelOpen(false);
  });

  mobilePanelQuery.addEventListener("change", syncMobilePanelState);
  syncMobilePanelState();
}

async function setupHands() {
  if (!window.Hands || !window.Camera || !window.drawConnectors) {
    throw new Error("MediaPipe libraries failed to load. Check internet/CDN availability.");
  }

  const hands = new window.Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.65
  });

  hands.onResults((results) => {
    ensureVideoCanvasSize();
    drawHands(results);
    const detected = classifyTechnique(results);
    updateGestureState(detected.tech);
  });

  const cameraFeed = new window.Camera(videoElement, {
    onFrame: async () => {
      await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
  });

  await cameraFeed.start();
}

function animate() {
  requestAnimationFrame(animate);
  if (document.hidden) return;
  const now = performance.now();

  if (!reduceMotion && shakeIntensity > 0.001) {
    const power = shakeIntensity * 34;
    renderer.domElement.style.transform = `translate(${(Math.random() - 0.5) * power}px, ${(Math.random() - 0.5) * power}px)`;
    shakeIntensity *= 0.92;
  } else {
    renderer.domElement.style.transform = "translate(0,0)";
  }

  const pos = particles.geometry.attributes.position.array;
  const col = particles.geometry.attributes.color.array;
  const lerp = currentTech === "neutral" ? 0.065 : 0.1;

  const total = activeCount * 3;
  for (let i = 0; i < total; i += 1) {
    pos[i] += (targetPositions[i] - pos[i]) * lerp;
    col[i] += (targetColors[i] - col[i]) * lerp;
  }

  if (currentTech === "blood") {
    // Keep the beam fixed; only move surrounding particles right -> left.
    const lineCount = Math.floor(activeCount * BLOOD_LINE_RATIO);
    const flowStart = lineCount * 3;
    const flowSpeed = reduceMotion ? 0.35 : 0.8;
    for (let i = flowStart; i < total; i += 3) {
      pos[i] -= flowSpeed;
      if (pos[i] < -110) {
        pos[i] = 110;
      }
    }
  }

  if (currentTech === "iron_mountain") {
    // Layered eruption: crater bubbling, fire jet, lava bombs, ash swirl.
    const lavaEnd = Math.floor(activeCount * IRON_LAVA_RATIO) * 3;
    const coneEnd = Math.floor(activeCount * IRON_CONE_RATIO) * 3;
    const jetEnd = Math.floor(activeCount * IRON_JET_RATIO) * 3;
    const bombEnd = Math.floor(activeCount * IRON_BOMB_RATIO) * 3;
    const jetRise = reduceMotion ? 0.33 : 0.82;
    const lavaPulse = 0.92 + (Math.sin(now * 0.01) * 0.5 + 0.5) * 0.14;

    for (let i = 0; i < lavaEnd; i += 3) {
      const x = pos[i];
      const z = pos[i + 2];
      const rad = Math.hypot(x, z) || 1;
      const wobble = 1 + Math.sin(now * 0.013 + i * 0.002) * 0.012;
      pos[i] = (x / rad) * rad * wobble;
      pos[i + 2] = (z / rad) * rad * wobble;
      pos[i + 1] += Math.sin(now * 0.01 + i * 0.0037) * 0.045;
      if (pos[i + 1] < -8.5 || pos[i + 1] > 4.2) {
        pos[i + 1] = -7 + Math.random() * 10;
      }

      col[i] = 0.7 + Math.random() * 0.12;
      col[i + 1] = 0.12 + lavaPulse * 0.18;
      col[i + 2] = 0.02 + Math.random() * 0.015;
    }

    for (let i = lavaEnd; i < coneEnd; i += 3) {
      const heat = 0.2 + ((pos[i + 1] + 28) / 32) * 0.42;
      col[i] = 0.35 + heat;
      col[i + 1] = 0.08 + heat * 0.35;
      col[i + 2] = 0.02;
    }

    for (let i = coneEnd; i < jetEnd; i += 3) {
      pos[i + 1] += jetRise;
      const widen = 0.22 + (pos[i + 1] / 120) * 0.42;
      pos[i] += Math.sin(now * 0.005 + i * 0.0012) * widen;
      pos[i + 2] += Math.cos(now * 0.005 + i * 0.0011) * widen;
      if (pos[i + 1] > 105) {
        pos[i + 1] = 0.5 + Math.random() * 5;
        pos[i] = (Math.random() - 0.5) * 5;
        pos[i + 2] = (Math.random() - 0.5) * 5;
      }

      const spark = 0.6 + (Math.sin(now * 0.034 + i * 0.0025) * 0.5 + 0.5) * 0.4;
      col[i] = 0.95 + Math.random() * 0.05;
      col[i + 1] = 0.32 + spark * 0.6;
      col[i + 2] = 0.04 + spark * 0.06;
    }

    // Lava bombs: ballistic ejecta thrown into empty space around the volcano.
    for (let i = jetEnd; i < bombEnd; i += 3) {
      if (ironBombVelocity[i] === 0 && ironBombVelocity[i + 1] === 0 && ironBombVelocity[i + 2] === 0) {
        const a = Math.random() * Math.PI * 2;
        const h = reduceMotion ? 0.2 : 0.4;
        ironBombVelocity[i] = Math.cos(a) * (0.12 + Math.random() * 0.42);
        ironBombVelocity[i + 1] = 0.7 + Math.random() * 1.35;
        ironBombVelocity[i + 2] = Math.sin(a) * (0.12 + Math.random() * 0.42);
        pos[i] = Math.cos(a) * (2 + Math.random() * 7);
        pos[i + 1] = 2 + Math.random() * 7;
        pos[i + 2] = Math.sin(a) * (2 + Math.random() * 7);
        ironBombVelocity[i + 1] *= h > 0.3 ? 1 : 0.75;
      }

      pos[i] += ironBombVelocity[i];
      pos[i + 1] += ironBombVelocity[i + 1];
      pos[i + 2] += ironBombVelocity[i + 2];

      ironBombVelocity[i] *= 0.998;
      ironBombVelocity[i + 2] *= 0.998;
      ironBombVelocity[i + 1] -= reduceMotion ? 0.03 : 0.06;

      const tooFar = Math.hypot(pos[i], pos[i + 2]) > 120;
      if (pos[i + 1] < -22 || tooFar) {
        const a = Math.random() * Math.PI * 2;
        pos[i] = Math.cos(a) * (2 + Math.random() * 8);
        pos[i + 1] = 2 + Math.random() * 8;
        pos[i + 2] = Math.sin(a) * (2 + Math.random() * 8);
        ironBombVelocity[i] = Math.cos(a) * (0.16 + Math.random() * 0.5);
        ironBombVelocity[i + 1] = 0.8 + Math.random() * 1.4;
        ironBombVelocity[i + 2] = Math.sin(a) * (0.16 + Math.random() * 0.5);
      }

      col[i] = 0.98;
      col[i + 1] = 0.28 + Math.random() * 0.35;
      col[i + 2] = 0.04 + Math.random() * 0.05;
    }

    // Upper ash cloud drifts and curls.
    for (let i = bombEnd; i < total; i += 3) {
      const angle = now * 0.0007 + i * 0.00002;
      const dx = Math.cos(angle) * (reduceMotion ? 0.035 : 0.08);
      const dz = Math.sin(angle) * (reduceMotion ? 0.035 : 0.08);
      pos[i] += dx + (Math.random() - 0.5) * 0.06;
      pos[i + 2] += dz + (Math.random() - 0.5) * 0.06;
      pos[i + 1] += reduceMotion ? 0.025 : 0.06;
      if (pos[i + 1] > 120) {
        pos[i + 1] = 24 + Math.random() * 14;
        pos[i] = (Math.random() - 0.5) * 70;
        pos[i + 2] = (Math.random() - 0.5) * 70;
      }

      col[i] = 0.12 + Math.random() * 0.12;
      col[i + 1] = 0.07 + Math.random() * 0.08;
      col[i + 2] = 0.04 + Math.random() * 0.05;
    }

    // Keep mountain planted so no underside appears.
    for (let i = 0; i < coneEnd; i += 3) {
      if (pos[i + 1] < -28) pos[i + 1] = -28;
    }
  }

  particles.geometry.attributes.position.needsUpdate = true;
  particles.geometry.attributes.color.needsUpdate = true;

  if (currentTech === "red") {
    particles.rotation.z -= reduceMotion ? 0.03 : 0.08;
    particles.scale.set(1, 1, 1);
  } else if (currentTech === "purple") {
    particles.rotation.z += reduceMotion ? 0.05 : 0.14;
    particles.rotation.y += reduceMotion ? 0.018 : 0.045;
    particles.scale.set(1, 1, 1);
  } else if (currentTech === "blood") {
    particles.rotation.set(0, 0, 0);
    particles.scale.set(1, 1, 1);
  } else if (currentTech === "iron_mountain") {
    // Lock pitch/roll so the camera never appears to view under the volcano.
    particles.rotation.x = 0;
    particles.rotation.z = 0;
    particles.rotation.y += reduceMotion ? 0.002 : 0.005;
    const pulse = 1 + Math.sin(now * (reduceMotion ? 0.002 : 0.0048)) * 0.06;
    particles.scale.set(pulse, pulse, pulse);
  } else if (currentTech === "mahoraga") {
    const witherStart = Math.floor(activeCount * MAHO_BODY_RATIO) * 3;
    const fallSpeed = reduceMotion ? 0.08 : 0.16;
    for (let i = witherStart; i < total; i += 3) {
      pos[i] += (Math.random() - 0.5) * 0.06;
      pos[i + 2] += (Math.random() - 0.5) * 0.08;
      pos[i + 1] -= fallSpeed;
      if (pos[i + 1] < -52) {
        const a = Math.random() * Math.PI * 2;
        const rr = 8 + Math.random() * 24;
        pos[i] = Math.cos(a) * rr + (Math.random() - 0.5) * 18;
        pos[i + 1] = 20 + Math.random() * 22;
        pos[i + 2] = (Math.random() - 0.5) * (12 + Math.random() * 12);
      }
      const c = 0.2 + Math.random() * 0.14;
      col[i] = c;
      col[i + 1] = c;
      col[i + 2] = c + 0.03;
    }

    particles.rotation.x = 0;
    particles.rotation.y = 0;
    particles.rotation.z += reduceMotion ? 0.0012 : 0.003;
    const pulse = 1 + Math.sin(now * (reduceMotion ? 0.0018 : 0.004)) * 0.04;
    particles.scale.set(pulse, pulse, pulse);
    shakeIntensity = Math.max(shakeIntensity, reduceMotion ? 0.05 : 0.16);
  } else if (currentTech === "shrine") {
    particles.rotation.set(0, 0, 0);
    particles.scale.set(1, 1, 1);
  } else {
    particles.rotation.y += reduceMotion ? 0.002 : 0.004;
    particles.scale.set(1, 1, 1);
  }

  composer.render();
  updateHud(now);

  const frameMs = performance.now() - now;
  avgFrameMs = avgFrameMs * 0.93 + frameMs * 0.07;
  frameCounter += 1;
  if (frameCounter % 25 === 0) {
    adaptQuality();
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", onResize);

async function bootstrap() {
  try {
    setStatus("Initializing camera and hand tracking...");
    setupMobilePanelToggle();
    setupControls();
    applyQualityMode(qualityMode);
    setTechnique("neutral");
    await setupHands();
    setStatus(resizedVideo ? "Ready" : "Ready (waiting camera frame)");
    animate();
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`Startup failed: ${msg}`);
    techniqueNameEl.innerText = "Startup Error";
    alert(`Could not start app.\n\n${msg}`);
  }
}

bootstrap();












