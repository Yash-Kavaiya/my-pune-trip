/**
 * A hand-built, procedural 3D model of Shinde Chhatri in Wanowrie.
 *
 * Same approach as the other dioramas: plain three.js, zero external
 * assets, geometry generated at runtime. What defines this place is a
 * yellow-sandstone Indo-Rajasthani memorial hall (clustered onion
 * domes, jharokha balconies, arched corridors, English stained glass)
 * standing in front of an older Shiva temple (yellow carved steeple
 * over a black-stone base and sanctum), with Mahadji's samadhi on the
 * cremation spot outside that sanctum.
 *
 * This is not a fort, not an Italianate palace, not a Ganesh temple,
 * and not a war-memorial column on a parade lawn. Do not reuse those scenes.
 *
 * Mode: daylight = an ordinary visiting afternoon;
 * evening = the floodlit hall after dusk.
 */

import * as THREE from "three";
import {
  SKY_FRAG,
  SKY_VERT,
  clamp,
  damp,
  markerSprite,
  mulberry32,
  radialSprite,
  smoothstep,
  type Palette,
  type TimeOfDay,
} from "@/components/places/three/diorama-core";

export { supportsWebGL } from "@/components/places/three/diorama-core";
export type { TimeOfDay } from "@/components/places/three/diorama-core";

export type FeatureId =
  | "chhatri-hall"
  | "domes"
  | "jharokhas"
  | "stained-glass"
  | "shiva-temple"
  | "samadhi";

/** daylight = open visit, evening = floodlit memorial. */
export type ChhatriMode = "daylight" | "evening";

export type ChhatriWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type ChhatriWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setMode: (m: ChhatriMode) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export const FEATURE_ORDER: FeatureId[] = [
  "chhatri-hall",
  "domes",
  "jharokhas",
  "stained-glass",
  "shiva-temple",
  "samadhi",
];

/* ------------------------------------------------------------------ */
/* Pure layout helpers (testable without WebGL)                        */
/* ------------------------------------------------------------------ */

export const LAWN = { y: 0 };

/** Yellow-sandstone memorial hall — visitor / gate side (+Z). */
export const HALL = {
  x: 0,
  z: 8,
  w: 28,
  d: 14,
  storeyH: 4.2,
  storeys: 2,
  plinth: 0.85,
};

/** Shiva temple behind the hall (−Z). */
export const TEMPLE = {
  x: 0,
  z: -20,
  w: 11.5,
  d: 11.5,
  baseH: 2.15,
  sanctumH: 5.2,
  steepleH: 11.4,
};

/** Samadhi outside the sanctum, on the 1794 cremation spot. */
export const SAMADHI = { x: 0, z: -13.2, w: 4.4, d: 3.4, h: 1.65 };

/** Approach gate on the cantonment road (+Z). */
export const GATE = { x: 0, z: 34, w: 7.2, h: 5.6 };

export const HALL_STONE = { hex: "#d8b86a", stone: "yellow-sandstone" as const };
export const STEEPLE = { hex: "#d4b45a", stone: "yellow-sandstone" as const };
export const SANCTUM = { hex: "#16161a", stone: "black-stone" as const };
export const BASE = { hex: "#1a1a20", stone: "black-stone" as const };

export type DomeKind = "central" | "corner" | "ridge";

export const DOMES: { id: string; x: number; z: number; r: number; kind: DomeKind }[] = [
  { id: "central", x: 0, z: 8, r: 4.4, kind: "central" },
  { id: "nw", x: -11.5, z: 2.2, r: 1.7, kind: "corner" },
  { id: "ne", x: 11.5, z: 2.2, r: 1.7, kind: "corner" },
  { id: "sw", x: -11.5, z: 13.8, r: 1.7, kind: "corner" },
  { id: "se", x: 11.5, z: 13.8, r: 1.7, kind: "corner" },
  { id: "west", x: -7, z: 8, r: 1.35, kind: "ridge" },
  { id: "east", x: 7, z: 8, r: 1.35, kind: "ridge" },
];

export const JHAROKHAS: { x: number; z: number; storey: number }[] = [
  { x: -8.2, z: 15, storey: 1 },
  { x: -3.4, z: 15, storey: 1 },
  { x: 3.4, z: 15, storey: 1 },
  { x: 8.2, z: 15, storey: 1 },
];

export type WindowFace = "front" | "east" | "west";

export const STAINED_WINDOWS: { x: number; y: number; z: number; face: WindowFace }[] = [
  { x: -5.8, y: 7.1, z: 15.05, face: "front" },
  { x: 0, y: 7.1, z: 15.05, face: "front" },
  { x: 5.8, y: 7.1, z: 15.05, face: "front" },
  { x: -11.2, y: 7.1, z: 15.05, face: "front" },
  { x: 11.2, y: 7.1, z: 15.05, face: "front" },
  { x: 14.05, y: 3.4, z: 8, face: "east" },
  { x: 14.05, y: 7.1, z: 8, face: "east" },
  { x: 14.05, y: 7.1, z: 4.2, face: "east" },
  { x: -14.05, y: 3.4, z: 8, face: "west" },
  { x: -14.05, y: 7.1, z: 8, face: "west" },
  { x: -14.05, y: 7.1, z: 4.2, face: "west" },
];

export const ARCADE_ARCHES = [-10.5, -6.3, -2.1, 2.1, 6.3, 10.5];

export function hallFrontZ(): number {
  return HALL.z + HALL.d / 2;
}

export function hallRearZ(): number {
  return HALL.z - HALL.d / 2;
}

export function templeFrontZ(): number {
  return TEMPLE.z + TEMPLE.d / 2;
}

export function templeRearZ(): number {
  return TEMPLE.z - TEMPLE.d / 2;
}

export function hallRoofY(): number {
  return HALL.plinth + HALL.storeyH * HALL.storeys;
}

export function hallInFrontOfTemple(): boolean {
  return HALL.z > TEMPLE.z && hallRearZ() > templeFrontZ();
}

export function inHallFootprint(x: number, z: number): boolean {
  return Math.abs(x - HALL.x) < HALL.w / 2 + 1.4 && Math.abs(z - HALL.z) < HALL.d / 2 + 1.4;
}

export function inTempleFootprint(x: number, z: number): boolean {
  return Math.abs(x - TEMPLE.x) < TEMPLE.w / 2 + 1.2 && Math.abs(z - TEMPLE.z) < TEMPLE.d / 2 + 1.2;
}

export function samadhiDistanceToTemple(): number {
  return Math.hypot(SAMADHI.x - TEMPLE.x, SAMADHI.z - TEMPLE.z);
}

export function samadhiDistanceToHall(): number {
  return Math.hypot(SAMADHI.x - HALL.x, SAMADHI.z - HALL.z);
}

/** True when the samadhi sits at the temple/cremation spot, not a plaza column. */
export function samadhiAtTempleCremationSpot(): boolean {
  return (
    samadhiDistanceToTemple() < samadhiDistanceToHall() &&
    samadhiDistanceToTemple() < 10 &&
    SAMADHI.h < 4 &&
    Math.abs(SAMADHI.x - TEMPLE.x) < 4
  );
}

export function terrainHeight(x: number, z: number): number {
  let h = 0.04 * Math.sin(x * 0.13) * Math.cos(z * 0.1);
  if (inHallFootprint(x, z)) h = Math.max(h, HALL.plinth * 0.35);
  if (inTempleFootprint(x, z)) h = Math.max(h, 0.28);
  if (Math.hypot(x - SAMADHI.x, z - SAMADHI.z) < 4) h = Math.max(h, 0.22);
  if (Math.abs(x) < 4.2 && z > hallFrontZ() && z < GATE.z) h = Math.max(h, 0.08);
  const outside = Math.max(Math.abs(x), Math.abs(z)) - 52;
  if (outside > -1) h -= 14 * smoothstep(-1, 5, outside);
  return h;
}

export type ChhatriPropKind =
  | "lamp"
  | "tree"
  | "hedge"
  | "jharokha"
  | "stained-window"
  | "dome"
  | "arcade-pier"
  | "temple-figure"
  | "samadhi-stone";

export type ChhatriPropSpec = {
  kind: ChhatriPropKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  feature: FeatureId | null;
};

/**
 * Deterministic layout of memorial props and marker bases.
 * Pure — no three.js objects — so vitest can assert density and feature
 * coverage without WebGL.
 */
export function buildChhatriLayout(seed = 1794): {
  props: ChhatriPropSpec[];
  propCount: number;
  markerBases: Record<FeatureId, { x: number; y: number; z: number }>;
  domeCount: number;
  jharokhaCount: number;
  windowCount: number;
} {
  const rnd = mulberry32(seed);
  const props: ChhatriPropSpec[] = [];
  const push = (p: ChhatriPropSpec) => props.push(p);

  const roofY = hallRoofY();

  for (const dome of DOMES) {
    push({
      kind: "dome",
      x: dome.x,
      y: roofY,
      z: dome.z,
      scale: dome.r,
      feature: "domes",
    });
  }

  for (const j of JHAROKHAS) {
    push({
      kind: "jharokha",
      x: j.x,
      y: HALL.plinth + HALL.storeyH * j.storey + 1.4,
      z: j.z,
      scale: 1,
      feature: "jharokhas",
    });
  }

  for (const w of STAINED_WINDOWS) {
    push({
      kind: "stained-window",
      x: w.x,
      y: w.y,
      z: w.z,
      scale: 1,
      feature: "stained-glass",
    });
  }

  for (const ax of ARCADE_ARCHES) {
    push({
      kind: "arcade-pier",
      x: ax,
      y: HALL.plinth,
      z: hallFrontZ(),
      scale: 1,
      feature: "chhatri-hall",
    });
  }

  // Approach lamps flanking the path.
  for (const side of [-1, 1]) {
    push({ kind: "lamp", x: side * 5.4, y: 0, z: 24, scale: 1, feature: "chhatri-hall" });
    push({ kind: "lamp", x: side * 5.4, y: 0, z: 30, scale: 1, feature: "chhatri-hall" });
    push({
      kind: "lamp",
      x: side * (HALL.w / 2 + 1.6),
      y: 0,
      z: hallFrontZ() + 1.2,
      scale: 1,
      feature: "chhatri-hall",
    });
  }

  // Carved saint figures on the yellow steeple.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    push({
      kind: "temple-figure",
      x: TEMPLE.x + Math.cos(a) * 2.4,
      y: TEMPLE.baseH + TEMPLE.sanctumH + 3.2,
      z: TEMPLE.z + Math.sin(a) * 2.4,
      scale: 1,
      feature: "shiva-temple",
    });
  }

  push({
    kind: "samadhi-stone",
    x: SAMADHI.x,
    y: SAMADHI.h,
    z: SAMADHI.z,
    scale: 1,
    feature: "samadhi",
  });

  // Hedge along the approach.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      push({
        kind: "hedge",
        x: side * 6.6,
        y: 0,
        z: 18 + i * 2,
        scale: 1,
        feature: null,
      });
    }
  }

  let guard = 0;
  const treeSpots: { x: number; z: number; s: number }[] = [];
  while (treeSpots.length < 22 && guard < 4000) {
    guard++;
    const x = (rnd() - 0.5) * 92;
    const z = (rnd() - 0.5) * 92;
    if (inHallFootprint(x, z)) continue;
    if (inTempleFootprint(x, z)) continue;
    if (Math.hypot(x - SAMADHI.x, z - SAMADHI.z) < 7) continue;
    if (Math.abs(x) < 8 && z > 14 && z < 38) continue;
    if (Math.max(Math.abs(x), Math.abs(z)) > 44) continue;
    if (treeSpots.some((s) => Math.hypot(s.x - x, s.z - z) < 7)) continue;
    treeSpots.push({ x, z, s: 0.8 + rnd() * 0.55 });
  }
  for (const s of treeSpots) {
    push({
      kind: "tree",
      x: s.x,
      y: Math.max(terrainHeight(s.x, s.z), LAWN.y),
      z: s.z,
      scale: s.s,
      feature: "shiva-temple",
    });
  }

  const markerBases: Record<FeatureId, { x: number; y: number; z: number }> = {
    "chhatri-hall": { x: HALL.x, y: hallRoofY() * 0.55, z: hallFrontZ() },
    domes: { x: 0, y: hallRoofY() + 6.2, z: HALL.z },
    jharokhas: { x: 0, y: HALL.plinth + HALL.storeyH + 2.4, z: hallFrontZ() + 1.6 },
    "stained-glass": { x: 5.8, y: 7.1, z: hallFrontZ() },
    "shiva-temple": {
      x: TEMPLE.x,
      y: TEMPLE.baseH + TEMPLE.sanctumH + TEMPLE.steepleH * 0.55,
      z: TEMPLE.z,
    },
    samadhi: { x: SAMADHI.x, y: SAMADHI.h + 1.4, z: SAMADHI.z },
  };

  return {
    props,
    propCount: props.length,
    markerBases,
    domeCount: DOMES.length,
    jharokhaCount: JHAROKHAS.length,
    windowCount: STAINED_WINDOWS.length,
  };
}

export function getChhatriAnchors(): Record<
  FeatureId,
  { target: [number, number, number]; dir: [number, number, number]; distance: number }
> {
  return {
    "chhatri-hall": {
      target: [HALL.x, hallRoofY() * 0.42, hallFrontZ() - 1],
      dir: [0.16, 0.38, 0.91],
      distance: 34,
    },
    domes: {
      target: [0, hallRoofY() + 3.2, HALL.z],
      dir: [0.22, 0.62, 0.75],
      distance: 28,
    },
    jharokhas: {
      target: [0, HALL.plinth + HALL.storeyH + 1.6, hallFrontZ()],
      dir: [0.08, 0.32, 0.94],
      distance: 18,
    },
    "stained-glass": {
      target: [6.2, 6.8, hallFrontZ()],
      dir: [0.42, 0.28, 0.86],
      distance: 14,
    },
    "shiva-temple": {
      target: [TEMPLE.x, TEMPLE.baseH + TEMPLE.sanctumH + 3.4, TEMPLE.z],
      dir: [0.18, 0.46, -0.86],
      distance: 26,
    },
    samadhi: {
      target: [SAMADHI.x, SAMADHI.h + 0.4, SAMADHI.z],
      dir: [0.12, 0.4, -0.9],
      distance: 12,
    },
  };
}

export function getChhatriHomeView() {
  return {
    // Gate-side approach: hall in front, temple steeple rising behind.
    target: [0, 6.4, 10] as [number, number, number],
    radius: 38,
    phi: 1.22,
    theta: 0.28,
  };
}

export function getChhatriPalette(t: TimeOfDay): Palette {
  return PALETTES[t];
}

/* ------------------------------------------------------------------ */
/* Palettes — cantonment morning, sandstone gold, floodlit dusk        */
/* ------------------------------------------------------------------ */

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#1c3a62",
    skyBottom: "#f3d2b0",
    sun: "#ffd4a4",
    sunIntensity: 2.2,
    hemiSky: "#b4c8de",
    hemiGround: "#5a4a32",
    ambient: 0.78,
    fog: "#e8d2b4",
    waterDeep: "#2a4a52",
    waterShallow: "#6e9aa0",
    lantern: 0.22,
    sunAzimuth: 2.05,
    sunElevation: 0.3,
    exposure: 1.05,
  },
  golden: {
    skyTop: "#3e2c52",
    skyBottom: "#ffc07a",
    sun: "#ffb45c",
    sunIntensity: 2.95,
    hemiSky: "#d0b8c4",
    hemiGround: "#6a5030",
    ambient: 0.82,
    fog: "#f0c890",
    waterDeep: "#2a4a48",
    waterShallow: "#7eae9a",
    lantern: 0.38,
    sunAzimuth: -0.68,
    sunElevation: 0.34,
    exposure: 1.02,
  },
  dusk: {
    skyTop: "#080a18",
    skyBottom: "#2a1830",
    sun: "#6a5cb0",
    sunIntensity: 0.24,
    hemiSky: "#242848",
    hemiGround: "#141018",
    ambient: 0.3,
    fog: "#181224",
    waterDeep: "#0a1224",
    waterShallow: "#1e3858",
    lantern: 1,
    sunAzimuth: -1.28,
    sunElevation: 0.05,
    exposure: 1.16,
  },
};

/* ------------------------------------------------------------------ */
/* Runtime anchors                                                     */
/* ------------------------------------------------------------------ */

type Anchor = { target: THREE.Vector3; dir: THREE.Vector3; distance: number };

function buildAnchors(): Record<FeatureId, Anchor> {
  const raw = getChhatriAnchors();
  const out = {} as Record<FeatureId, Anchor>;
  for (const id of FEATURE_ORDER) {
    out[id] = {
      target: new THREE.Vector3(...raw[id].target),
      dir: new THREE.Vector3(...raw[id].dir),
      distance: raw[id].distance,
    };
  }
  return out;
}

const ANCHORS: Record<FeatureId, Anchor> = buildAnchors();

const homeRaw = getChhatriHomeView();
const HOME = {
  target: new THREE.Vector3(...homeRaw.target),
  radius: homeRaw.radius,
  phi: homeRaw.phi,
  theta: homeRaw.theta,
};

function onionPoints(r: number): THREE.Vector2[] {
  return [
    new THREE.Vector2(r * 0.92, 0),
    new THREE.Vector2(r * 1.08, r * 0.28),
    new THREE.Vector2(r * 0.96, r * 0.72),
    new THREE.Vector2(r * 0.48, r * 1.18),
    new THREE.Vector2(r * 0.14, r * 1.46),
    new THREE.Vector2(0.02, r * 1.58),
  ];
}

function makeStainedGlassTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#2a1810";
    ctx.fillRect(0, 0, size, size);
    const panes = ["#8b1e2d", "#1c3f8a", "#c48a18", "#1f6b3a", "#6b1f7a", "#c45a18"];
    const cols = 4;
    const rows = 6;
    const pad = 8;
    const gw = (size - pad * 2) / cols;
    const gh = (size - pad * 2) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = panes[(r * cols + c) % panes.length];
        ctx.fillRect(pad + c * gw + 2, pad + r * gh + 2, gw - 4, gh - 4);
      }
    }
    ctx.strokeStyle = "#3a2414";
    ctx.lineWidth = 4;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(pad + c * gw, pad);
      ctx.lineTo(pad + c * gw, size - pad);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(pad, pad + r * gh);
      ctx.lineTo(size - pad, pad + r * gh);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------ */
/* The world                                                           */
/* ------------------------------------------------------------------ */

export function createChhatriWorld(
  container: HTMLElement,
  options: ChhatriWorldOptions,
): ChhatriWorld {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const layout = buildChhatriLayout();

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth || 1, container.clientHeight || 1, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.touchAction = "pan-y";
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    42,
    (container.clientWidth || 1) / (container.clientHeight || 1),
    0.4,
    900,
  );
  const fog = new THREE.Fog("#f0c890", 150, 500);
  scene.fog = fog;

  let paletteTarget = PALETTES.golden;
  const cur = {
    skyTop: new THREE.Color(paletteTarget.skyTop),
    skyBottom: new THREE.Color(paletteTarget.skyBottom),
    sun: new THREE.Color(paletteTarget.sun),
    hemiSky: new THREE.Color(paletteTarget.hemiSky),
    hemiGround: new THREE.Color(paletteTarget.hemiGround),
    fog: new THREE.Color(paletteTarget.fog),
    sunIntensity: paletteTarget.sunIntensity,
    ambient: paletteTarget.ambient,
    lantern: paletteTarget.lantern,
    azimuth: paletteTarget.sunAzimuth,
    elevation: paletteTarget.sunElevation,
    exposure: paletteTarget.exposure,
    fest: 0,
  };

  const sunDir = new THREE.Vector3();
  const updateSunDir = () => {
    const ce = Math.cos(cur.elevation * Math.PI * 0.5);
    sunDir
      .set(
        Math.cos(cur.azimuth) * ce,
        Math.sin(cur.elevation * Math.PI * 0.5),
        Math.sin(cur.azimuth) * ce,
      )
      .normalize();
  };
  updateSunDir();

  const skyMat = track(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: cur.skyTop },
        bottomColor: { value: cur.skyBottom },
        sunDir: { value: sunDir },
        sunColor: { value: cur.sun },
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
    }),
  );
  scene.add(new THREE.Mesh(track(new THREE.SphereGeometry(420, 32, 20)), skyMat));

  const hemi = new THREE.HemisphereLight(cur.hemiSky, cur.hemiGround, cur.ambient);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(cur.sun, cur.sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 8;
  sun.shadow.camera.far = 420;
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.05;
  scene.add(sun);
  scene.add(sun.target);

  const hallWash = new THREE.SpotLight("#ffe2b0", 0, 70, 0.32, 0.5, 1.2);
  hallWash.position.set(0, 10, 28);
  hallWash.target.position.set(HALL.x, hallRoofY() * 0.5, HALL.z);
  scene.add(hallWash);
  scene.add(hallWash.target);

  const templeGlow = new THREE.PointLight("#ffb45e", 6, 22, 1.6);
  templeGlow.position.set(TEMPLE.x, TEMPLE.baseH + 2.4, TEMPLE.z + 2);
  scene.add(templeGlow);

  const sandstoneMat = track(
    new THREE.MeshStandardMaterial({ color: HALL_STONE.hex, roughness: 0.88, metalness: 0.04 }),
  );
  const sandstoneDarkMat = track(
    new THREE.MeshStandardMaterial({ color: "#b8944a", roughness: 0.9 }),
  );
  const sandstoneDeepMat = track(
    new THREE.MeshStandardMaterial({ color: "#9a7838", roughness: 0.86 }),
  );
  const steepleMat = track(
    new THREE.MeshStandardMaterial({ color: STEEPLE.hex, roughness: 0.86, metalness: 0.05 }),
  );
  const sanctumMat = track(
    new THREE.MeshStandardMaterial({ color: SANCTUM.hex, roughness: 0.92, metalness: 0.08 }),
  );
  const baseMat = track(
    new THREE.MeshStandardMaterial({ color: BASE.hex, roughness: 0.94 }),
  );
  const brassMat = track(
    new THREE.MeshStandardMaterial({ color: "#c9973f", roughness: 0.32, metalness: 0.82 }),
  );
  const woodMat = track(
    new THREE.MeshStandardMaterial({ color: "#4a3220", roughness: 0.82 }),
  );
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: "#54402f", roughness: 0.95 }));
  const leafMat = track(
    new THREE.MeshStandardMaterial({ color: "#4f7a3a", roughness: 0.95, flatShading: true }),
  );
  const hedgeMat = track(
    new THREE.MeshStandardMaterial({ color: "#3d6a32", roughness: 0.95, flatShading: true }),
  );
  const pathMat = track(new THREE.MeshStandardMaterial({ color: "#b5a88f", roughness: 0.95 }));
  const glassTex = track(makeStainedGlassTexture());
  const glassMat = track(
    new THREE.MeshStandardMaterial({
      map: glassTex,
      roughness: 0.18,
      metalness: 0.12,
      emissive: "#402010",
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.92,
    }),
  );

  /* --- terrain --- */

  const groundGeo = track(new THREE.PlaneGeometry(118, 118, 100, 100));
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  groundGeo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const lawnA = new THREE.Color("#5f8a42");
  const lawnB = new THREE.Color("#4a7034");
  const courtCol = new THREE.Color("#cfc3ae");
  const pathCol = new THREE.Color("#b3a68d");
  const tmp = new THREE.Color();
  const colorRnd = mulberry32(47);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (inHallFootprint(x, z) || inTempleFootprint(x, z)) {
      tmp.copy(courtCol).lerp(pathCol, colorRnd() * 0.35);
    } else if (Math.abs(x) < 4.6 && z > hallFrontZ() && z < GATE.z + 2) {
      tmp.copy(pathCol);
    } else if (Math.hypot(x - SAMADHI.x, z - SAMADHI.z) < 5) {
      tmp.copy(pathCol);
    } else {
      tmp.copy(lawnA).lerp(lawnB, colorRnd());
    }
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  groundGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const ground = new THREE.Mesh(
    groundGeo,
    track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 })),
  );
  ground.receiveShadow = true;
  scene.add(ground);

  const slab = new THREE.Mesh(
    track(new THREE.BoxGeometry(114, 16, 114)),
    track(new THREE.MeshStandardMaterial({ color: "#4a4034", roughness: 1 })),
  );
  slab.position.y = -9.2;
  scene.add(slab);

  /* --- approach path + compound wall + gate --- */

  {
    const path = new THREE.Mesh(track(new THREE.BoxGeometry(8.2, 0.08, 20)), pathMat);
    path.position.set(0, 0.06, 25);
    path.receiveShadow = true;
    scene.add(path);

    const wallH = 2.4;
    const wallMat = sandstoneDarkMat;
    const north = new THREE.Mesh(track(new THREE.BoxGeometry(56, wallH, 0.55)), wallMat);
    north.position.set(0, wallH / 2, -38);
    north.castShadow = true;
    scene.add(north);
    for (const side of [-1, 1]) {
      const long = new THREE.Mesh(track(new THREE.BoxGeometry(0.55, wallH, 76)), wallMat);
      long.position.set(side * 28, wallH / 2, -2);
      long.castShadow = true;
      scene.add(long);
    }
    for (const side of [-1, 1]) {
      const south = new THREE.Mesh(track(new THREE.BoxGeometry(22, wallH, 0.55)), wallMat);
      south.position.set(side * 17, wallH / 2, 36);
      south.castShadow = true;
      scene.add(south);
    }

    const postGeo = track(new THREE.BoxGeometry(1.15, GATE.h, 1.15));
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, sandstoneMat);
      post.position.set(side * (GATE.w / 2), GATE.h / 2, GATE.z);
      post.castShadow = true;
      scene.add(post);
      const cap = new THREE.Mesh(track(new THREE.BoxGeometry(1.4, 0.28, 1.4)), sandstoneDeepMat);
      cap.position.set(side * (GATE.w / 2), GATE.h + 0.14, GATE.z);
      scene.add(cap);
    }
    const lintel = new THREE.Mesh(track(new THREE.BoxGeometry(GATE.w + 1.4, 0.7, 1.05)), sandstoneMat);
    lintel.position.set(0, GATE.h - 0.15, GATE.z);
    lintel.castShadow = true;
    scene.add(lintel);
    const gateDome = new THREE.Mesh(
      track(new THREE.SphereGeometry(1.15, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2)),
      sandstoneDarkMat,
    );
    gateDome.position.set(0, GATE.h + 0.35, GATE.z);
    scene.add(gateDome);
    const gateKalash = new THREE.Mesh(track(new THREE.SphereGeometry(0.22, 10, 8)), brassMat);
    gateKalash.position.set(0, GATE.h + 1.55, GATE.z);
    scene.add(gateKalash);
  }

  /* --- chhatri hall --- */

  const roofY = hallRoofY();
  {
    const plinth = new THREE.Mesh(
      track(new THREE.BoxGeometry(HALL.w + 1.8, HALL.plinth, HALL.d + 1.8)),
      sandstoneDarkMat,
    );
    plinth.position.set(HALL.x, HALL.plinth / 2, HALL.z);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    scene.add(plinth);

    const steps = new THREE.Mesh(track(new THREE.BoxGeometry(12, 0.42, 3.2)), sandstoneDeepMat);
    steps.position.set(0, 0.28, hallFrontZ() + 1.8);
    steps.receiveShadow = true;
    scene.add(steps);

    const bodyH = HALL.storeyH * HALL.storeys;
    const body = new THREE.Mesh(track(new THREE.BoxGeometry(HALL.w, bodyH, HALL.d)), sandstoneMat);
    body.position.set(HALL.x, HALL.plinth + bodyH / 2, HALL.z);
    body.castShadow = true;
    body.receiveShadow = true;
    scene.add(body);

    // Central projecting bay.
    const bay = new THREE.Mesh(track(new THREE.BoxGeometry(9.2, bodyH + 0.4, 2.6)), sandstoneMat);
    bay.position.set(0, HALL.plinth + bodyH / 2 + 0.15, hallFrontZ() + 0.7);
    bay.castShadow = true;
    scene.add(bay);

    // String courses between storeys.
    const band = new THREE.Mesh(track(new THREE.BoxGeometry(HALL.w + 0.35, 0.22, HALL.d + 0.35)), sandstoneDeepMat);
    band.position.set(HALL.x, HALL.plinth + HALL.storeyH, HALL.z);
    scene.add(band);

    const parapet = new THREE.Mesh(
      track(new THREE.BoxGeometry(HALL.w + 0.5, 0.85, HALL.d + 0.5)),
      sandstoneDarkMat,
    );
    parapet.position.set(HALL.x, roofY + 0.35, HALL.z);
    parapet.castShadow = true;
    scene.add(parapet);

    // Merlons along the front parapet.
    const merlonGeo = track(new THREE.BoxGeometry(0.55, 0.7, 0.4));
    for (let i = 0; i < 18; i++) {
      const merlon = new THREE.Mesh(merlonGeo, sandstoneDeepMat);
      merlon.position.set(-HALL.w / 2 + 1 + i * 1.55, roofY + 0.95, hallFrontZ() + 0.15);
      merlon.castShadow = true;
      scene.add(merlon);
    }

    // Ground-floor arcade — six cusped openings.
    const voidMat = track(new THREE.MeshStandardMaterial({ color: "#3a2818", roughness: 0.9 }));
    const archGeo = track(new THREE.BoxGeometry(2.6, 3.15, 0.55));
    const archTopGeo = track(new THREE.CylinderGeometry(1.3, 1.3, 0.55, 12, 1, false, 0, Math.PI));
    for (const ax of ARCADE_ARCHES) {
      const opening = new THREE.Mesh(archGeo, voidMat);
      opening.position.set(ax, HALL.plinth + 1.65, hallFrontZ() + 0.12);
      scene.add(opening);
      const top = new THREE.Mesh(archTopGeo, voidMat);
      top.rotation.x = Math.PI / 2;
      top.rotation.z = Math.PI;
      top.position.set(ax, HALL.plinth + 3.2, hallFrontZ() + 0.12);
      scene.add(top);
    }

    // Arcade piers.
    const pierGeo = track(new THREE.BoxGeometry(0.85, HALL.storeyH - 0.3, 1.15));
    for (const p of layout.props.filter((item) => item.kind === "arcade-pier")) {
      const pier = new THREE.Mesh(pierGeo, sandstoneDarkMat);
      pier.position.set(p.x + (p.x < 0 ? -1.9 : 1.9) * 0, HALL.plinth + (HALL.storeyH - 0.3) / 2, p.z + 0.2);
      pier.castShadow = true;
      scene.add(pier);
    }
    // Explicit piers between arches.
    const pierXs = [-12.6, -8.4, -4.2, 0, 4.2, 8.4, 12.6];
    for (const px of pierXs) {
      const pier = new THREE.Mesh(pierGeo, sandstoneDarkMat);
      pier.position.set(px, HALL.plinth + (HALL.storeyH - 0.3) / 2, hallFrontZ() + 0.25);
      pier.castShadow = true;
      scene.add(pier);
    }

    // Interior gallery hint through the arcade.
    const floor = new THREE.Mesh(track(new THREE.BoxGeometry(HALL.w - 2, 0.12, HALL.d - 2)), woodMat);
    floor.position.set(HALL.x, HALL.plinth + 0.08, HALL.z);
    scene.add(floor);
    const gallery = new THREE.Mesh(track(new THREE.BoxGeometry(HALL.w - 4, 0.18, 3.2)), woodMat);
    gallery.position.set(0, HALL.plinth + HALL.storeyH - 0.2, HALL.z);
    scene.add(gallery);
  }

  /* --- onion domes --- */

  {
    const centralGeo = track(new THREE.LatheGeometry(onionPoints(4.4), 24));
    const smallGeo = track(new THREE.LatheGeometry(onionPoints(1.7), 18));
    const ridgeGeo = track(new THREE.LatheGeometry(onionPoints(1.35), 16));
    for (const dome of DOMES) {
      const geo = dome.kind === "central" ? centralGeo : dome.kind === "ridge" ? ridgeGeo : smallGeo;
      const mesh = new THREE.Mesh(geo, sandstoneDarkMat);
      mesh.position.set(dome.x, roofY + 0.4, dome.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const drumR = dome.r * 0.72;
      const drum = new THREE.Mesh(
        track(new THREE.CylinderGeometry(drumR, drumR + 0.12, dome.kind === "central" ? 1.4 : 0.7, 16)),
        sandstoneMat,
      );
      drum.position.set(dome.x, roofY + (dome.kind === "central" ? 0.2 : 0.1), dome.z);
      drum.castShadow = true;
      scene.add(drum);

      const finialY = roofY + 0.4 + dome.r * 1.58;
      const ball = new THREE.Mesh(
        track(new THREE.SphereGeometry(dome.kind === "central" ? 0.38 : 0.16, 10, 8)),
        brassMat,
      );
      ball.position.set(dome.x, finialY + 0.15, dome.z);
      ball.castShadow = true;
      scene.add(ball);
      const tip = new THREE.Mesh(
        track(new THREE.ConeGeometry(dome.kind === "central" ? 0.18 : 0.08, dome.kind === "central" ? 0.7 : 0.32, 8)),
        brassMat,
      );
      tip.position.set(dome.x, finialY + (dome.kind === "central" ? 0.62 : 0.34), dome.z);
      scene.add(tip);
    }
  }

  /* --- jharokha balconies --- */

  {
    for (const j of JHAROKHAS) {
      const y = HALL.plinth + HALL.storeyH + 1.35;
      const box = new THREE.Mesh(track(new THREE.BoxGeometry(2.7, 2.35, 1.7)), sandstoneMat);
      box.position.set(j.x, y, hallFrontZ() + 1.15);
      box.castShadow = true;
      scene.add(box);
      const base = new THREE.Mesh(track(new THREE.BoxGeometry(3.05, 0.28, 1.95)), sandstoneDeepMat);
      base.position.set(j.x, y - 1.25, hallFrontZ() + 1.15);
      scene.add(base);
      const roof = new THREE.Mesh(
        track(new THREE.SphereGeometry(1.45, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
        sandstoneDarkMat,
      );
      roof.position.set(j.x, y + 1.15, hallFrontZ() + 1.15);
      roof.castShadow = true;
      scene.add(roof);
      const voidOpening = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.7, 1.45, 0.2)),
        track(new THREE.MeshStandardMaterial({ color: "#2a1c12", roughness: 0.88 })),
      );
      voidOpening.position.set(j.x, y - 0.1, hallFrontZ() + 1.95);
      scene.add(voidOpening);
      const pane = new THREE.Mesh(track(new THREE.BoxGeometry(1.5, 1.25, 0.08)), glassMat);
      pane.position.set(j.x, y - 0.1, hallFrontZ() + 2.02);
      scene.add(pane);
      const kalash = new THREE.Mesh(track(new THREE.SphereGeometry(0.14, 8, 6)), brassMat);
      kalash.position.set(j.x, y + 2.55, hallFrontZ() + 1.15);
      scene.add(kalash);
    }
  }

  /* --- English stained-glass windows --- */

  {
    for (const w of STAINED_WINDOWS) {
      const isSide = w.face !== "front";
      const frame = new THREE.Mesh(
        track(new THREE.BoxGeometry(isSide ? 0.16 : 1.55, 2.05, isSide ? 1.55 : 0.16)),
        sandstoneDeepMat,
      );
      frame.position.set(w.x, w.y, w.z);
      scene.add(frame);
      const pane = new THREE.Mesh(
        track(new THREE.BoxGeometry(isSide ? 0.08 : 1.28, 1.78, isSide ? 1.28 : 0.08)),
        glassMat,
      );
      pane.position.set(w.x + (w.face === "east" ? 0.06 : w.face === "west" ? -0.06 : 0), w.y, w.z + (w.face === "front" ? 0.06 : 0));
      scene.add(pane);
    }
  }

  /* --- Shiva temple (behind the hall) --- */

  {
    const base = new THREE.Mesh(
      track(new THREE.BoxGeometry(TEMPLE.w + 1.6, TEMPLE.baseH, TEMPLE.d + 1.6)),
      baseMat,
    );
    base.position.set(TEMPLE.x, TEMPLE.baseH / 2, TEMPLE.z);
    base.castShadow = true;
    base.receiveShadow = true;
    scene.add(base);

    // Black-stone sanctum — open toward the samadhi / hall (+Z).
    const wall = 0.85;
    const openW = 3.2;
    const sanctumY = TEMPLE.baseH + TEMPLE.sanctumH / 2;
    const back = new THREE.Mesh(track(new THREE.BoxGeometry(TEMPLE.w, TEMPLE.sanctumH, wall)), sanctumMat);
    back.position.set(TEMPLE.x, sanctumY, TEMPLE.z - TEMPLE.d / 2 + wall / 2);
    back.castShadow = true;
    scene.add(back);
    for (const side of [-1, 1]) {
      const sideWall = new THREE.Mesh(
        track(new THREE.BoxGeometry(wall, TEMPLE.sanctumH, TEMPLE.d)),
        sanctumMat,
      );
      sideWall.position.set(TEMPLE.x + side * (TEMPLE.w / 2 - wall / 2), sanctumY, TEMPLE.z);
      sideWall.castShadow = true;
      scene.add(sideWall);
      const stubW = (TEMPLE.w - openW) / 2;
      const stub = new THREE.Mesh(track(new THREE.BoxGeometry(stubW, TEMPLE.sanctumH, wall)), sanctumMat);
      stub.position.set(
        TEMPLE.x + side * (openW / 2 + stubW / 2),
        sanctumY,
        TEMPLE.z + TEMPLE.d / 2 - wall / 2,
      );
      stub.castShadow = true;
      scene.add(stub);
    }

    const slabTop = new THREE.Mesh(
      track(new THREE.BoxGeometry(TEMPLE.w + 0.7, 0.45, TEMPLE.d + 0.7)),
      baseMat,
    );
    slabTop.position.set(TEMPLE.x, TEMPLE.baseH + TEMPLE.sanctumH + 0.2, TEMPLE.z);
    slabTop.castShadow = true;
    scene.add(slabTop);

    // Yellow-stone carved steeple.
    const sanctumTop = TEMPLE.baseH + TEMPLE.sanctumH + 0.4;
    const profile: [number, number][] = [
      [4.6, 0],
      [4.3, 1.4],
      [3.7, 3.4],
      [3.05, 5.4],
      [2.35, 7.2],
      [1.6, 8.8],
      [0.95, 10.2],
      [0.4, 11.2],
    ];
    const latheGeo = track(
      new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 20),
    );
    const shikhara = new THREE.Mesh(latheGeo, steepleMat);
    shikhara.position.set(TEMPLE.x, sanctumTop, TEMPLE.z);
    shikhara.castShadow = true;
    shikhara.receiveShadow = true;
    scene.add(shikhara);

    const amalaka = new THREE.Mesh(track(new THREE.CylinderGeometry(1.15, 1.3, 0.42, 16)), sandstoneDarkMat);
    amalaka.position.set(TEMPLE.x, sanctumTop + 11.35, TEMPLE.z);
    amalaka.castShadow = true;
    scene.add(amalaka);
    const kalash = new THREE.Mesh(track(new THREE.SphereGeometry(0.42, 12, 10)), brassMat);
    kalash.position.set(TEMPLE.x, sanctumTop + 12.05, TEMPLE.z);
    kalash.castShadow = true;
    scene.add(kalash);
    const tip = new THREE.Mesh(track(new THREE.ConeGeometry(0.22, 0.9, 10)), brassMat);
    tip.position.set(TEMPLE.x, sanctumTop + 12.7, TEMPLE.z);
    scene.add(tip);

    // Carved saint figures on the yellow steeple.
    const figGeo = track(new THREE.BoxGeometry(0.38, 0.7, 0.22));
    const figMat = track(
      new THREE.MeshStandardMaterial({ color: "#c9a24a", roughness: 0.78 }),
    );
    for (const p of layout.props.filter((item) => item.kind === "temple-figure")) {
      const fig = new THREE.Mesh(figGeo, figMat);
      fig.position.set(p.x, p.y, p.z);
      fig.lookAt(TEMPLE.x, p.y, TEMPLE.z);
      fig.castShadow = true;
      scene.add(fig);
    }

    // Linga glow inside the black sanctum.
    const linga = new THREE.Mesh(track(new THREE.SphereGeometry(0.42, 12, 10)), brassMat);
    linga.position.set(TEMPLE.x, TEMPLE.baseH + 1.15, TEMPLE.z);
    scene.add(linga);
    const pindi = new THREE.Mesh(track(new THREE.CylinderGeometry(0.7, 0.85, 0.45, 16)), baseMat);
    pindi.position.set(TEMPLE.x, TEMPLE.baseH + 0.55, TEMPLE.z);
    scene.add(pindi);
  }

  /* --- Mahadji's samadhi at the cremation spot --- */

  {
    const platform = new THREE.Mesh(
      track(new THREE.BoxGeometry(SAMADHI.w, 0.45, SAMADHI.d)),
      baseMat,
    );
    platform.position.set(SAMADHI.x, 0.28, SAMADHI.z);
    platform.castShadow = true;
    platform.receiveShadow = true;
    scene.add(platform);

    const shrine = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.4, SAMADHI.h, 2.1)),
      sandstoneDarkMat,
    );
    shrine.position.set(SAMADHI.x, 0.45 + SAMADHI.h / 2, SAMADHI.z);
    shrine.castShadow = true;
    scene.add(shrine);

    const roof = new THREE.Mesh(
      track(new THREE.SphereGeometry(1.25, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2)),
      sandstoneMat,
    );
    roof.position.set(SAMADHI.x, 0.45 + SAMADHI.h, SAMADHI.z);
    roof.castShadow = true;
    scene.add(roof);

    const ball = new THREE.Mesh(track(new THREE.SphereGeometry(0.18, 10, 8)), brassMat);
    ball.position.set(SAMADHI.x, 0.45 + SAMADHI.h + 1.35, SAMADHI.z);
    scene.add(ball);

    const plaque = new THREE.Mesh(track(new THREE.BoxGeometry(1.15, 0.55, 0.08)), brassMat);
    plaque.position.set(SAMADHI.x, 1.15, SAMADHI.z + 1.1);
    scene.add(plaque);
  }

  /* --- lamps --- */

  const flameTex = track(radialSprite("rgba(255,230,170,0.95)", "rgba(255,120,30,0.45)"));
  const flameMat = track(
    new THREE.SpriteMaterial({
      map: flameTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.7,
    }),
  );
  const lamps: THREE.Sprite[] = [];
  {
    const poleGeo = track(new THREE.CylinderGeometry(0.07, 0.1, 3.6, 6));
    const cupGeo = track(new THREE.CylinderGeometry(0.22, 0.14, 0.22, 8));
    for (const p of layout.props.filter((item) => item.kind === "lamp")) {
      const pole = new THREE.Mesh(poleGeo, brassMat);
      pole.position.set(p.x, 1.8, p.z);
      pole.castShadow = true;
      scene.add(pole);
      const cup = new THREE.Mesh(cupGeo, brassMat);
      cup.position.set(p.x, 3.7, p.z);
      scene.add(cup);
      const sprite = new THREE.Sprite(flameMat);
      sprite.scale.setScalar(0.95);
      sprite.position.set(p.x, 4.05, p.z);
      scene.add(sprite);
      lamps.push(sprite);
    }
  }

  /* --- hedges and trees --- */

  {
    const hedges = layout.props.filter((p) => p.kind === "hedge");
    const hedgeGeo = track(new THREE.BoxGeometry(1.4, 1.1, 1.8));
    const hedgeMesh = new THREE.InstancedMesh(hedgeGeo, hedgeMat, hedges.length);
    hedgeMesh.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    hedges.forEach((h, i) => {
      m.compose(new THREE.Vector3(h.x, 0.55, h.z), q, new THREE.Vector3(1, 1, 1));
      hedgeMesh.setMatrixAt(i, m);
    });
    hedgeMesh.instanceMatrix.needsUpdate = true;
    scene.add(hedgeMesh);
  }

  {
    const trees = layout.props.filter((p) => p.kind === "tree");
    const trunkGeo = track(new THREE.CylinderGeometry(0.26, 0.42, 3.2, 6));
    const canopyGeo = track(new THREE.IcosahedronGeometry(1, 1));
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    const canopies = new THREE.InstancedMesh(canopyGeo, leafMat, trees.length * 2);
    trunks.castShadow = true;
    canopies.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const rnd = mulberry32(777);
    let ci = 0;
    trees.forEach((t, i) => {
      m.compose(
        new THREE.Vector3(t.x, t.y + 1.6 * t.scale, t.z),
        q,
        new THREE.Vector3(t.scale, t.scale, t.scale),
      );
      trunks.setMatrixAt(i, m);
      for (let k = 0; k < 2; k++) {
        const sc = (2.8 - k * 0.7) * t.scale;
        e.set(rnd() * 0.5, rnd() * Math.PI, rnd() * 0.5);
        q.setFromEuler(e);
        m.compose(
          new THREE.Vector3(
            t.x + (rnd() - 0.5) * 1.3,
            t.y + (3.8 + k * 1.3) * t.scale,
            t.z + (rnd() - 0.5) * 1.3,
          ),
          q,
          new THREE.Vector3(sc, sc * 0.78, sc),
        );
        canopies.setMatrixAt(ci++, m);
      }
      q.identity();
    });
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    scene.add(trunks);
    scene.add(canopies);
  }

  /* --- evening string lights on the hall front --- */

  const stringLightMat = track(
    new THREE.PointsMaterial({
      size: 0.5,
      map: track(radialSprite("rgba(255,255,255,0.95)", "rgba(255,190,90,0.5)")),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      opacity: 0,
    }),
  );
  {
    const bulbPositions: number[] = [];
    const bulbCols: number[] = [];
    const bulbColors = ["#ffd27a", "#ff9d5c", "#c48a18", "#fff4d0"];
    const c = new THREE.Color();
    for (let i = 0; i < 28; i++) {
      const x = -13 + (i / 27) * 26;
      bulbPositions.push(x, roofY + 0.4, hallFrontZ() + 0.8);
      c.set(bulbColors[i % bulbColors.length]);
      bulbCols.push(c.r, c.g, c.b);
    }
    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(bulbPositions), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(bulbCols), 3));
    scene.add(new THREE.Points(geo, stringLightMat));
  }

  /* --- hotspot markers --- */

  type Marker = {
    id: FeatureId;
    sprite: THREE.Sprite;
    ring: THREE.Mesh;
    idleTex: THREE.Texture;
    activeTex: THREE.Texture;
    hit: THREE.Mesh;
    base: THREE.Vector3;
  };
  const markers: Marker[] = [];
  const hitMat = track(new THREE.MeshBasicMaterial({ visible: false }));
  const ringGeo = track(new THREE.RingGeometry(2.2, 2.8, 40));
  const hitGeo = track(new THREE.SphereGeometry(3.2, 10, 8));

  FEATURE_ORDER.forEach((id, i) => {
    const raw = layout.markerBases[id];
    const base = new THREE.Vector3(raw.x, raw.y, raw.z);
    const idleTex = track(markerSprite(String(i + 1), false));
    const activeTex = track(markerSprite(String(i + 1), true));
    const sprite = new THREE.Sprite(
      track(
        new THREE.SpriteMaterial({
          map: idleTex,
          depthTest: false,
          transparent: true,
          sizeAttenuation: false,
        }),
      ),
    );
    sprite.scale.setScalar(0.055);
    sprite.position.copy(base).add(new THREE.Vector3(0, 4, 0));
    sprite.renderOrder = 20;
    scene.add(sprite);

    const ring = new THREE.Mesh(
      ringGeo,
      track(
        new THREE.MeshBasicMaterial({
          color: "#f7e3c8",
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(base).add(new THREE.Vector3(0, 0.25, 0));
    ring.renderOrder = 19;
    scene.add(ring);

    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.copy(sprite.position);
    hit.userData.featureId = id;
    scene.add(hit);

    markers.push({ id, sprite, ring, idleTex, activeTex, hit, base });
  });

  /* --- camera rig --- */

  const spherical = { radius: HOME.radius + 22, phi: HOME.phi - 0.16, theta: HOME.theta - 0.28 };
  const desired = { radius: HOME.radius, phi: HOME.phi, theta: HOME.theta };
  const target = HOME.target.clone();
  const desiredTarget = HOME.target.clone();
  let intro = options.reducedMotion ? 1 : 0;
  let autoRotate = true;
  let idleTimer = 0;
  let activeId: FeatureId | null = null;

  const applyCamera = () => {
    const sinPhi = Math.sin(spherical.phi);
    camera.position.set(
      target.x + spherical.radius * sinPhi * Math.sin(spherical.theta),
      target.y + spherical.radius * Math.cos(spherical.phi),
      target.z + spherical.radius * sinPhi * Math.cos(spherical.theta),
    );
    camera.lookAt(target);
  };
  if (options.reducedMotion) {
    spherical.radius = HOME.radius;
    spherical.phi = HOME.phi;
    spherical.theta = HOME.theta;
  }
  applyCamera();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let dragging = false;
  let dragMoved = 0;
  let lastX = 0;
  let lastY = 0;
  let hovered: FeatureId | null = null;
  const canvas = renderer.domElement;

  const setPointerFromEvent = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  const pickFeature = (): FeatureId | null => {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(
      markers.map((m) => m.hit),
      false,
    );
    return hits.length ? (hits[0].object.userData.featureId as FeatureId) : null;
  };

  const onPointerDown = (event: PointerEvent) => {
    dragging = true;
    dragMoved = 0;
    lastX = event.clientX;
    lastY = event.clientY;
    autoRotate = false;
    idleTimer = 0;
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (dragging) {
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      dragMoved += Math.abs(dx) + Math.abs(dy);
      desired.theta -= dx * 0.005;
      desired.phi = clamp(desired.phi - dy * 0.004, 0.22, 1.36);
      return;
    }
    setPointerFromEvent(event);
    const next = pickFeature();
    if (next !== hovered) {
      hovered = next;
      canvas.style.cursor = next ? "pointer" : "grab";
      options.onHover(next);
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (dragging && dragMoved < 6) {
      setPointerFromEvent(event);
      const picked = pickFeature();
      if (picked) options.onSelect(picked === activeId ? null : picked);
    }
    dragging = false;
    idleTimer = 0;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };

  const onPointerLeave = () => {
    dragging = false;
    if (hovered) {
      hovered = null;
      options.onHover(null);
    }
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    desired.radius = clamp(desired.radius * (1 + Math.sign(event.deltaY) * 0.12), 12, 160);
    autoRotate = false;
    idleTimer = 0;
  };

  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  const onContextLost = (event: Event) => event.preventDefault();
  canvas.addEventListener("webglcontextlost", onContextLost);

  const clock = new THREE.Clock();
  let paused = false;
  let ready = false;
  let festTarget = 0;
  const tmpColor = new THREE.Color();
  const introFrom = new THREE.Vector3(0, 10, 22);

  const lerpColor = (current: THREE.Color, hex: string, t: number) => {
    tmpColor.set(hex);
    current.lerp(tmpColor, t);
  };

  const tick = () => {
    if (paused) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.getElapsedTime();
    const motion = options.reducedMotion ? 0 : 1;

    const k = 1 - Math.exp(-3.2 * dt);
    lerpColor(cur.skyTop, paletteTarget.skyTop, k);
    lerpColor(cur.skyBottom, paletteTarget.skyBottom, k);
    lerpColor(cur.sun, paletteTarget.sun, k);
    lerpColor(cur.hemiSky, paletteTarget.hemiSky, k);
    lerpColor(cur.hemiGround, paletteTarget.hemiGround, k);
    lerpColor(cur.fog, paletteTarget.fog, k);
    cur.sunIntensity = damp(cur.sunIntensity, paletteTarget.sunIntensity, 3.2, dt);
    cur.ambient = damp(cur.ambient, paletteTarget.ambient, 3.2, dt);
    cur.lantern = damp(cur.lantern, paletteTarget.lantern, 3.2, dt);
    cur.azimuth = damp(cur.azimuth, paletteTarget.sunAzimuth, 3.2, dt);
    cur.elevation = damp(cur.elevation, paletteTarget.sunElevation, 3.2, dt);
    cur.exposure = damp(cur.exposure, paletteTarget.exposure, 3.2, dt);
    cur.fest = damp(cur.fest, festTarget, 2.4, dt);
    updateSunDir();

    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.ambient * 1.7 + cur.fest * 0.22;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunIntensity;
    sun.position.copy(sunDir).multiplyScalar(180);
    fog.color.copy(cur.fog);
    renderer.setClearColor(cur.fog);
    renderer.toneMappingExposure = cur.exposure;

    const lampLevel = clamp(cur.lantern + cur.fest * 0.45, 0, 1.25);
    flameMat.opacity = 0.4 + lampLevel * 0.55;
    glassMat.emissiveIntensity = 0.12 + lampLevel * 0.85 + cur.fest * 0.4;
    for (let i = 0; i < lamps.length; i++) {
      lamps[i].scale.setScalar(0.85 * (0.85 + Math.sin(elapsed * 6 + i) * 0.16 * motion + 0.15));
    }
    hallWash.intensity = lampLevel * 16 + cur.fest * 26;
    templeGlow.intensity = 4 + lampLevel * 8 + cur.fest * 6;
    stringLightMat.opacity = cur.fest * (0.3 + lampLevel * 0.7);

    for (const marker of markers) {
      const isActive = marker.id === activeId;
      const isHover = marker.id === hovered;
      const pulse = 1 + Math.sin(elapsed * 2.2 + marker.base.x) * 0.08 * motion;
      marker.ring.scale.setScalar((isActive ? 1.5 : 1) * pulse);
      const ringMat = marker.ring.material as THREE.MeshBasicMaterial;
      ringMat.opacity = isActive ? 0.85 : 0.4;
      ringMat.color.set(isActive ? "#e0703a" : "#f7e3c8");
      const spriteMat = marker.sprite.material as THREE.SpriteMaterial;
      const wantTex = isActive ? marker.activeTex : marker.idleTex;
      if (spriteMat.map !== wantTex) spriteMat.map = wantTex;
      const scale = isActive ? 0.075 : isHover ? 0.063 : 0.055;
      marker.sprite.scale.setScalar(damp(marker.sprite.scale.x, scale, 8, dt));
      marker.sprite.position.y =
        marker.base.y + 4 + Math.sin(elapsed * 1.6 + marker.base.x) * 0.28 * motion;
      marker.hit.position.copy(marker.sprite.position);
    }

    if (intro < 1) {
      intro = Math.min(1, intro + dt / 2.6);
      const e = 1 - Math.pow(1 - intro, 3);
      spherical.radius = THREE.MathUtils.lerp(HOME.radius + 22, desired.radius, e);
      spherical.phi = THREE.MathUtils.lerp(HOME.phi - 0.16, desired.phi, e);
      spherical.theta = THREE.MathUtils.lerp(HOME.theta - 0.28, desired.theta, e);
      target.lerpVectors(introFrom, desiredTarget, e);
    } else {
      if (!dragging) {
        idleTimer += dt;
        if (idleTimer > 6 && !activeId) autoRotate = true;
      }
      if (autoRotate && motion) desired.theta += dt * 0.035;
      spherical.radius = damp(spherical.radius, desired.radius, 3.4, dt);
      spherical.phi = damp(spherical.phi, desired.phi, 4.5, dt);
      spherical.theta = damp(spherical.theta, desired.theta, 4.5, dt);
      target.x = damp(target.x, desiredTarget.x, 3.4, dt);
      target.y = damp(target.y, desiredTarget.y, 3.4, dt);
      target.z = damp(target.z, desiredTarget.z, 3.4, dt);
    }
    applyCamera();
    sun.target.position.copy(target);
    sun.target.updateMatrixWorld();

    renderer.render(scene, camera);

    if (!ready) {
      ready = true;
      options.onReady();
    }
  };

  renderer.setAnimationLoop(tick);

  return {
    setTimeOfDay(t) {
      paletteTarget = PALETTES[t];
    },
    setMode(m) {
      festTarget = m === "evening" ? 1 : 0;
    },
    setActive(id) {
      activeId = id;
      autoRotate = false;
      idleTimer = 0;
      if (!id) {
        desired.radius = HOME.radius;
        desired.phi = HOME.phi;
        desiredTarget.copy(HOME.target);
        return;
      }
      const anchor = ANCHORS[id];
      desiredTarget.copy(anchor.target);
      desired.radius = anchor.distance;
      const dir = anchor.dir.clone().normalize();
      desired.phi = clamp(Math.acos(clamp(dir.y, -1, 1)), 0.24, 1.32);
      desired.theta = Math.atan2(dir.x, dir.z);
    },
    resetView() {
      activeId = null;
      desired.radius = HOME.radius;
      desired.phi = HOME.phi;
      desired.theta = HOME.theta;
      desiredTarget.copy(HOME.target);
      autoRotate = true;
      idleTimer = 0;
    },
    setPaused(next) {
      paused = next;
      if (!next) clock.getDelta();
    },
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      });
      for (const item of disposables) item.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) container.removeChild(canvas);
    },
  };
}
