/**
 * A hand-built, procedural 3D model of Rajiv Gandhi Zoological Park
 * (Katraj Zoo Park) in south Pune.
 *
 * What defines this campus: a large on-site lake (Katraj Lake), a
 * distinct snake-park hall, a wooded enclosure trail, a white-tiger /
 * large-cat paddock, and an animal-orphanage cluster. Not a flower
 * garden, not a dam reservoir, not a memorial plaza.
 *
 * Mode: dry = receded lake edge; monsoon = brim-full Katraj Lake.
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
  | "katraj-lake"
  | "snake-park"
  | "enclosure-trail"
  | "white-tiger"
  | "orphanage";

export type ZooMode = "dry" | "monsoon";

export type ZooWorldOptions = {
  onSelect: (id: FeatureId | null) => void;
  onHover: (id: FeatureId | null) => void;
  onReady: () => void;
  reducedMotion: boolean;
};

export type ZooWorld = {
  setTimeOfDay: (t: TimeOfDay) => void;
  setMode: (m: ZooMode) => void;
  setActive: (id: FeatureId | null) => void;
  resetView: () => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

export const FEATURE_ORDER: FeatureId[] = [
  "katraj-lake",
  "snake-park",
  "enclosure-trail",
  "white-tiger",
  "orphanage",
];

/* ------------------------------------------------------------------ */
/* Pure layout helpers (testable without WebGL)                        */
/* ------------------------------------------------------------------ */

/** Katraj Lake — large ellipse on the rear of the campus (−Z). */
export const LAKE = { x: 6, z: -26, rx: 30, rz: 16, yDry: 0.28, yMonsoon: 0.7 };

/** Snake park hall + pits, gate-east. Compact built volume. */
export const SNAKE = { x: 24, z: 16, w: 15, d: 11, h: 4.4 };

/** Wooded enclosure trail — a loop through the zoo proper. */
export const TRAIL = { x: 0, z: 2, rInner: 6.5, rOuter: 16 };

/** White-tiger / large-cat paddock, west of the trail. */
export const TIGER = { x: -22, z: -4, w: 18, d: 14, fenceH: 3.2 };

/** Animal orphanage pens, gate-west. */
export const ORPHANAGE = { x: -24, z: 18, w: 13, d: 10, h: 3.2 };

/** Satara Road gate (+Z). */
export const GATE = { x: 0, z: 36, w: 8.4, h: 5.2 };

export function lakeArea(): number {
  return Math.PI * LAKE.rx * LAKE.rz;
}

export function snakeArea(): number {
  return SNAKE.w * SNAKE.d;
}

export function tigerArea(): number {
  return TIGER.w * TIGER.d;
}

export function getLakeLevel(mode: ZooMode): number {
  return mode === "monsoon" ? LAKE.yMonsoon : LAKE.yDry;
}

export function inLake(x: number, z: number): boolean {
  const nx = (x - LAKE.x) / LAKE.rx;
  const nz = (z - LAKE.z) / LAKE.rz;
  return nx * nx + nz * nz < 1;
}

export function inSnakePark(x: number, z: number): boolean {
  return Math.abs(x - SNAKE.x) < SNAKE.w / 2 && Math.abs(z - SNAKE.z) < SNAKE.d / 2;
}

export function inTigerPaddock(x: number, z: number): boolean {
  return Math.abs(x - TIGER.x) < TIGER.w / 2 && Math.abs(z - TIGER.z) < TIGER.d / 2;
}

export function inOrphanage(x: number, z: number): boolean {
  return (
    Math.abs(x - ORPHANAGE.x) < ORPHANAGE.w / 2 && Math.abs(z - ORPHANAGE.z) < ORPHANAGE.d / 2
  );
}

export function inTrailRing(x: number, z: number): boolean {
  const r = Math.hypot(x - TRAIL.x, z - TRAIL.z);
  return r >= TRAIL.rInner && r <= TRAIL.rOuter;
}

export function snakeDistanceToTiger(): number {
  return Math.hypot(SNAKE.x - TIGER.x, SNAKE.z - TIGER.z);
}

export function snakeDistanceToLake(): number {
  return Math.hypot(SNAKE.x - LAKE.x, SNAKE.z - LAKE.z);
}

/** Three campus parts sit in different volumes. */
export function campusPartsDistinct(): boolean {
  return (
    !inLake(SNAKE.x, SNAKE.z) &&
    !inLake(TIGER.x, TIGER.z) &&
    !inLake(ORPHANAGE.x, ORPHANAGE.z) &&
    !inSnakePark(TIGER.x, TIGER.z) &&
    !inSnakePark(ORPHANAGE.x, ORPHANAGE.z) &&
    !inTigerPaddock(ORPHANAGE.x, ORPHANAGE.z) &&
    !inTigerPaddock(SNAKE.x, SNAKE.z)
  );
}

export function terrainHeight(x: number, z: number): number {
  let h = 0.06 * Math.sin(x * 0.1) * Math.cos(z * 0.09);
  if (inLake(x, z)) {
    const nx = (x - LAKE.x) / LAKE.rx;
    const nz = (z - LAKE.z) / LAKE.rz;
    const r = Math.hypot(nx, nz);
    const bed = -1.4 + 0.2 * Math.sin(x * 0.2) * Math.cos(z * 0.18);
    if (r > 0.78) return THREE_LERP(bed, 0.12, (r - 0.78) / 0.22);
    return bed;
  }
  if (inSnakePark(x, z) || inOrphanage(x, z)) h = Math.max(h, 0.22);
  if (inTigerPaddock(x, z)) h = Math.max(h, 0.08);
  if (inTrailRing(x, z) && !inTigerPaddock(x, z)) h = Math.max(h, 0.05);
  const outside = Math.max(Math.abs(x), Math.abs(z)) - 54;
  if (outside > -1) h -= 16 * smoothstep(-1, 6, outside);
  return h;
}

function THREE_LERP(a: number, b: number, t: number) {
  return a + (b - a) * clamp(t, 0, 1);
}

export type ZooPropKind =
  | "tree"
  | "lamp"
  | "fence"
  | "snake-case"
  | "tiger"
  | "pen"
  | "trail-post";

export type ZooPropSpec = {
  kind: ZooPropKind;
  x: number;
  y: number;
  z: number;
  scale: number;
  feature: FeatureId | null;
};

export function buildZooLayout(seed = 1999): {
  props: ZooPropSpec[];
  propCount: number;
  markerBases: Record<FeatureId, { x: number; y: number; z: number }>;
  treeCount: number;
  snakeCaseCount: number;
  tigerCount: number;
} {
  const rnd = mulberry32(seed);
  const props: ZooPropSpec[] = [];
  const push = (p: ZooPropSpec) => props.push(p);

  for (let i = 0; i < 8; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    push({
      kind: "snake-case",
      x: SNAKE.x - 4.5 + col * 3,
      y: 1.1,
      z: SNAKE.z - 2 + row * 3.4,
      scale: 1,
      feature: "snake-park",
    });
  }

  const tigers = [
    { x: TIGER.x - 3.2, z: TIGER.z + 1.4 },
    { x: TIGER.x + 2.6, z: TIGER.z - 2.2 },
  ];
  for (const t of tigers) {
    push({ kind: "tiger", x: t.x, y: 0.15, z: t.z, scale: 1, feature: "white-tiger" });
  }

  for (let i = 0; i < 4; i++) {
    push({
      kind: "pen",
      x: ORPHANAGE.x - 3.6 + (i % 2) * 7.2,
      y: 0.2,
      z: ORPHANAGE.z - 2.2 + Math.floor(i / 2) * 4.4,
      scale: 1,
      feature: "orphanage",
    });
  }

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = (TRAIL.rInner + TRAIL.rOuter) / 2;
    push({
      kind: "trail-post",
      x: TRAIL.x + Math.cos(a) * r,
      y: 0,
      z: TRAIL.z + Math.sin(a) * r,
      scale: 1,
      feature: "enclosure-trail",
    });
  }

  for (const side of [-1, 1]) {
    push({ kind: "lamp", x: side * 5.2, y: 0, z: 28, scale: 1, feature: "enclosure-trail" });
    push({ kind: "lamp", x: SNAKE.x + side * 6, y: 0, z: SNAKE.z + 7, scale: 1, feature: "snake-park" });
  }

  let guard = 0;
  const trees: { x: number; z: number; s: number }[] = [];
  while (trees.length < 34 && guard < 5000) {
    guard++;
    const x = (rnd() - 0.5) * 96;
    const z = (rnd() - 0.5) * 92;
    if (inLake(x, z)) continue;
    if (inSnakePark(x, z)) continue;
    if (inOrphanage(x, z)) continue;
    if (Math.abs(x) < 7 && z > 22 && z < 40) continue;
    if (Math.max(Math.abs(x), Math.abs(z)) > 46) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 6.2)) continue;
    trees.push({ x, z, s: 0.85 + rnd() * 0.65 });
  }
  for (const t of trees) {
    const onTrail = inTrailRing(t.x, t.z) && !inTigerPaddock(t.x, t.z);
    push({
      kind: "tree",
      x: t.x,
      y: Math.max(terrainHeight(t.x, t.z), 0),
      z: t.z,
      scale: t.s,
      feature: onTrail ? "enclosure-trail" : "katraj-lake",
    });
  }

  const markerBases: Record<FeatureId, { x: number; y: number; z: number }> = {
    "katraj-lake": { x: LAKE.x, y: 1.4, z: LAKE.z + 4 },
    "snake-park": { x: SNAKE.x, y: SNAKE.h + 0.6, z: SNAKE.z },
    "enclosure-trail": { x: TRAIL.x, y: 2.2, z: TRAIL.z + TRAIL.rOuter - 1 },
    "white-tiger": { x: TIGER.x, y: 2.4, z: TIGER.z },
    orphanage: { x: ORPHANAGE.x, y: ORPHANAGE.h + 0.5, z: ORPHANAGE.z },
  };

  return {
    props,
    propCount: props.length,
    markerBases,
    treeCount: trees.length,
    snakeCaseCount: 8,
    tigerCount: tigers.length,
  };
}

export function getZooAnchors(): Record<
  FeatureId,
  { target: [number, number, number]; dir: [number, number, number]; distance: number }
> {
  return {
    "katraj-lake": {
      target: [LAKE.x, 0.8, LAKE.z + 2],
      dir: [0.2, 0.48, -0.85],
      distance: 34,
    },
    "snake-park": {
      target: [SNAKE.x, 1.8, SNAKE.z],
      dir: [0.72, 0.36, 0.58],
      distance: 20,
    },
    "enclosure-trail": {
      target: [TRAIL.x, 1.2, TRAIL.z + 6],
      dir: [0.12, 0.4, 0.9],
      distance: 24,
    },
    "white-tiger": {
      target: [TIGER.x, 1.4, TIGER.z],
      dir: [-0.68, 0.38, 0.62],
      distance: 22,
    },
    orphanage: {
      target: [ORPHANAGE.x, 1.5, ORPHANAGE.z],
      dir: [-0.7, 0.36, 0.62],
      distance: 18,
    },
  };
}

export function getZooHomeView() {
  return {
    // Gate-side approach: trail in the middle, snake park east,
    // orphanage west, lake opening beyond the woods.
    target: [0, 3.2, 6] as [number, number, number],
    radius: 42,
    phi: 1.18,
    theta: 0.26,
  };
}

export function getZooPalette(t: TimeOfDay): Palette {
  return PALETTES[t];
}

const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    skyTop: "#163a58",
    skyBottom: "#e8d4b0",
    sun: "#ffd2a0",
    sunIntensity: 2.1,
    hemiSky: "#b0c8d8",
    hemiGround: "#3a4a30",
    ambient: 0.76,
    fog: "#dce6c8",
    waterDeep: "#1a4a48",
    waterShallow: "#5a9a88",
    lantern: 0.2,
    sunAzimuth: 2.08,
    sunElevation: 0.28,
    exposure: 1.04,
  },
  golden: {
    skyTop: "#3a2a46",
    skyBottom: "#ffc078",
    sun: "#ffb058",
    sunIntensity: 2.75,
    hemiSky: "#c8c0c4",
    hemiGround: "#4a5030",
    ambient: 0.8,
    fog: "#e8d0a0",
    waterDeep: "#1e5248",
    waterShallow: "#6aaa90",
    lantern: 0.38,
    sunAzimuth: -0.66,
    sunElevation: 0.32,
    exposure: 1.0,
  },
  dusk: {
    skyTop: "#060814",
    skyBottom: "#24182c",
    sun: "#6460b0",
    sunIntensity: 0.26,
    hemiSky: "#202848",
    hemiGround: "#121418",
    ambient: 0.3,
    fog: "#141220",
    waterDeep: "#0a1824",
    waterShallow: "#1a3848",
    lantern: 1,
    sunAzimuth: -1.26,
    sunElevation: 0.05,
    exposure: 1.14,
  },
};

type Anchor = { target: THREE.Vector3; dir: THREE.Vector3; distance: number };

function buildAnchors(): Record<FeatureId, Anchor> {
  const raw = getZooAnchors();
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

const ANCHORS = buildAnchors();
const homeRaw = getZooHomeView();
const HOME = {
  target: new THREE.Vector3(...homeRaw.target),
  radius: homeRaw.radius,
  phi: homeRaw.phi,
  theta: homeRaw.theta,
};

export function createZooWorld(container: HTMLElement, options: ZooWorldOptions): ZooWorld {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };
  const layout = buildZooLayout();

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
  const fog = new THREE.Fog("#e8d0a0", 150, 500);
  scene.fog = fog;

  let paletteTarget = PALETTES.golden;
  const cur = {
    skyTop: new THREE.Color(paletteTarget.skyTop),
    skyBottom: new THREE.Color(paletteTarget.skyBottom),
    sun: new THREE.Color(paletteTarget.sun),
    hemiSky: new THREE.Color(paletteTarget.hemiSky),
    hemiGround: new THREE.Color(paletteTarget.hemiGround),
    fog: new THREE.Color(paletteTarget.fog),
    waterDeep: new THREE.Color(paletteTarget.waterDeep),
    waterShallow: new THREE.Color(paletteTarget.waterShallow),
    sunIntensity: paletteTarget.sunIntensity,
    ambient: paletteTarget.ambient,
    lantern: paletteTarget.lantern,
    azimuth: paletteTarget.sunAzimuth,
    elevation: paletteTarget.sunElevation,
    exposure: paletteTarget.exposure,
    fest: 0,
    waterY: LAKE.yDry,
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

  const stoneMat = track(
    new THREE.MeshStandardMaterial({ color: "#b8a888", roughness: 0.92 }),
  );
  const stoneDarkMat = track(
    new THREE.MeshStandardMaterial({ color: "#7a6a52", roughness: 0.9 }),
  );
  const plasterMat = track(
    new THREE.MeshStandardMaterial({ color: "#d8c8a8", roughness: 0.88 }),
  );
  const roofMat = track(new THREE.MeshStandardMaterial({ color: "#6a4030", roughness: 0.88 }));
  const woodMat = track(new THREE.MeshStandardMaterial({ color: "#4a3220", roughness: 0.86 }));
  const glassMat = track(
    new THREE.MeshStandardMaterial({
      color: "#7ec8b0",
      roughness: 0.18,
      metalness: 0.12,
      transparent: true,
      opacity: 0.42,
      emissive: "#204030",
      emissiveIntensity: 0.12,
    }),
  );
  const waterMat = track(
    new THREE.MeshStandardMaterial({
      color: paletteTarget.waterDeep,
      roughness: 0.22,
      metalness: 0.18,
      transparent: true,
      opacity: 0.78,
    }),
  );
  const creamMat = track(
    new THREE.MeshStandardMaterial({ color: "#f0ead8", roughness: 0.72 }),
  );
  const stripeMat = track(
    new THREE.MeshStandardMaterial({ color: "#2a2218", roughness: 0.8 }),
  );
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: "#4a3828", roughness: 0.95 }));
  const leafMat = track(
    new THREE.MeshStandardMaterial({ color: "#3d6a30", roughness: 0.95, flatShading: true }),
  );
  const leafWetMat = track(
    new THREE.MeshStandardMaterial({ color: "#2a5a28", roughness: 0.92, flatShading: true }),
  );
  const pathMat = track(new THREE.MeshStandardMaterial({ color: "#b5a88a", roughness: 0.95 }));
  const fenceMat = track(
    new THREE.MeshStandardMaterial({ color: "#3a3a38", roughness: 0.55, metalness: 0.35 }),
  );

  /* --- terrain --- */

  const groundGeo = track(new THREE.PlaneGeometry(124, 124, 110, 110));
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  groundGeo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  const lawnA = new THREE.Color("#4f7a38");
  const lawnB = new THREE.Color("#3a6230");
  const pathCol = new THREE.Color("#b3a68d");
  const mudCol = new THREE.Color("#7a6a48");
  const shoreCol = new THREE.Color("#c2b48e");
  const tmp = new THREE.Color();
  const colorRnd = mulberry32(99);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (inLake(x, z)) {
      tmp.copy(shoreCol);
    } else if (inTrailRing(x, z) && !inTigerPaddock(x, z)) {
      tmp.copy(pathCol);
    } else if (inTigerPaddock(x, z)) {
      tmp.copy(mudCol);
    } else if (inSnakePark(x, z) || inOrphanage(x, z)) {
      tmp.copy(pathCol);
    } else if (Math.abs(x) < 5 && z > 18 && z < 38) {
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
    track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 })),
  );
  ground.receiveShadow = true;
  scene.add(ground);

  const slab = new THREE.Mesh(
    track(new THREE.BoxGeometry(118, 16, 118)),
    track(new THREE.MeshStandardMaterial({ color: "#3a4030", roughness: 1 })),
  );
  slab.position.y = -9.2;
  scene.add(slab);

  /* --- approach + gate --- */

  {
    const path = new THREE.Mesh(track(new THREE.BoxGeometry(8.4, 0.08, 20)), pathMat);
    path.position.set(0, 0.06, 27);
    path.receiveShadow = true;
    scene.add(path);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(track(new THREE.BoxGeometry(1.1, GATE.h, 1.1)), stoneMat);
      post.position.set(side * (GATE.w / 2), GATE.h / 2, GATE.z);
      post.castShadow = true;
      scene.add(post);
    }
    const lintel = new THREE.Mesh(track(new THREE.BoxGeometry(GATE.w + 1.4, 0.7, 1.05)), stoneDarkMat);
    lintel.position.set(0, GATE.h - 0.2, GATE.z);
    lintel.castShadow = true;
    scene.add(lintel);
    const sign = new THREE.Mesh(track(new THREE.BoxGeometry(5.4, 0.9, 0.12)), plasterMat);
    sign.position.set(0, GATE.h + 0.55, GATE.z);
    scene.add(sign);
  }

  /* --- Katraj Lake --- */

  const lakeMesh = new THREE.Mesh(track(new THREE.CircleGeometry(1, 48)), waterMat);
  lakeMesh.scale.set(LAKE.rx, LAKE.rz, 1);
  lakeMesh.rotation.x = -Math.PI / 2;
  lakeMesh.position.set(LAKE.x, LAKE.yDry, LAKE.z);
  lakeMesh.renderOrder = 2;
  scene.add(lakeMesh);

  /* --- snake park hall --- */

  {
    const hall = new THREE.Mesh(
      track(new THREE.BoxGeometry(SNAKE.w, SNAKE.h, SNAKE.d)),
      plasterMat,
    );
    hall.position.set(SNAKE.x, SNAKE.h / 2, SNAKE.z);
    hall.castShadow = true;
    hall.receiveShadow = true;
    scene.add(hall);
    const roof = new THREE.Mesh(
      track(new THREE.BoxGeometry(SNAKE.w + 0.8, 0.45, SNAKE.d + 0.8)),
      roofMat,
    );
    roof.position.set(SNAKE.x, SNAKE.h + 0.2, SNAKE.z);
    roof.castShadow = true;
    scene.add(roof);
    const door = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 2.6, 0.2)), woodMat);
    door.position.set(SNAKE.x, 1.4, SNAKE.z + SNAKE.d / 2 + 0.05);
    scene.add(door);
    const caseGeo = track(new THREE.BoxGeometry(2.2, 1.4, 1.1));
    const coilGeo = track(new THREE.TorusGeometry(0.32, 0.1, 8, 16));
    for (const p of layout.props.filter((item) => item.kind === "snake-case")) {
      const box = new THREE.Mesh(caseGeo, glassMat);
      box.position.set(p.x, p.y + 0.7, p.z);
      scene.add(box);
      const coil = new THREE.Mesh(coilGeo, stripeMat);
      coil.rotation.x = Math.PI / 2;
      coil.position.set(p.x, p.y + 0.45, p.z);
      scene.add(coil);
    }
  }

  /* --- enclosure trail ring --- */

  {
    const ring = new THREE.Mesh(
      track(new THREE.RingGeometry(TRAIL.rInner - 0.6, TRAIL.rOuter + 0.4, 48)),
      pathMat,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(TRAIL.x, 0.07, TRAIL.z);
    ring.receiveShadow = true;
    scene.add(ring);
    const postGeo = track(new THREE.CylinderGeometry(0.08, 0.1, 1.8, 6));
    const railGeo = track(new THREE.BoxGeometry(3.4, 0.08, 0.08));
    for (const p of layout.props.filter((item) => item.kind === "trail-post")) {
      const post = new THREE.Mesh(postGeo, fenceMat);
      post.position.set(p.x, 0.9, p.z);
      post.castShadow = true;
      scene.add(post);
      const rail = new THREE.Mesh(railGeo, fenceMat);
      rail.position.set(p.x, 1.35, p.z);
      rail.lookAt(TRAIL.x, 1.35, TRAIL.z);
      scene.add(rail);
    }
  }

  /* --- white-tiger paddock --- */

  {
    const pad = new THREE.Mesh(
      track(new THREE.BoxGeometry(TIGER.w - 0.6, 0.12, TIGER.d - 0.6)),
      track(new THREE.MeshStandardMaterial({ color: "#8a7848", roughness: 0.96 })),
    );
    pad.position.set(TIGER.x, 0.1, TIGER.z);
    pad.receiveShadow = true;
    scene.add(pad);

    const postGeo = track(new THREE.CylinderGeometry(0.09, 0.11, TIGER.fenceH, 6));
    const railGeo = track(new THREE.BoxGeometry(1, 0.07, 0.07));
    const halfW = TIGER.w / 2;
    const halfD = TIGER.d / 2;
    const posts: [number, number][] = [];
    for (let i = -halfW; i <= halfW; i += 2.2) {
      posts.push([TIGER.x + i, TIGER.z - halfD], [TIGER.x + i, TIGER.z + halfD]);
    }
    for (let j = -halfD + 2.2; j < halfD; j += 2.2) {
      posts.push([TIGER.x - halfW, TIGER.z + j], [TIGER.x + halfW, TIGER.z + j]);
    }
    for (const [px, pz] of posts) {
      const post = new THREE.Mesh(postGeo, fenceMat);
      post.position.set(px, TIGER.fenceH / 2, pz);
      post.castShadow = true;
      scene.add(post);
    }
    for (const y of [1.1, 2.1, 3.0]) {
      const longA = new THREE.Mesh(
        track(new THREE.BoxGeometry(TIGER.w, 0.07, 0.07)),
        fenceMat,
      );
      longA.position.set(TIGER.x, y, TIGER.z - halfD);
      scene.add(longA);
      const longB = longA.clone();
      longB.position.z = TIGER.z + halfD;
      scene.add(longB);
      const shortA = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.07, 0.07, TIGER.d)),
        fenceMat,
      );
      shortA.position.set(TIGER.x - halfW, y, TIGER.z);
      scene.add(shortA);
      const shortB = shortA.clone();
      shortB.position.x = TIGER.x + halfW;
      scene.add(shortB);
    }
    void railGeo;

    const addTiger = (x: number, z: number, yaw: number) => {
      const g = new THREE.Group();
      g.position.set(x, 0.55, z);
      g.rotation.y = yaw;
      const body = new THREE.Mesh(track(new THREE.BoxGeometry(1.15, 0.7, 2.4)), creamMat);
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(track(new THREE.BoxGeometry(0.7, 0.58, 0.7)), creamMat);
      head.position.set(0, 0.22, -1.35);
      head.castShadow = true;
      g.add(head);
      const stripeGeo = track(new THREE.BoxGeometry(1.18, 0.12, 0.12));
      for (const sz of [-0.6, 0, 0.6]) {
        const s = new THREE.Mesh(stripeGeo, stripeMat);
        s.position.set(0, 0.28, sz);
        g.add(s);
      }
      for (const side of [-1, 1]) {
        for (const fz of [-0.7, 0.7]) {
          const leg = new THREE.Mesh(track(new THREE.BoxGeometry(0.22, 0.55, 0.22)), creamMat);
          leg.position.set(side * 0.38, -0.55, fz);
          g.add(leg);
        }
      }
      const tail = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.05, 1.4, 6)), creamMat);
      tail.rotation.x = 0.9;
      tail.position.set(0, 0.15, 1.5);
      g.add(tail);
      scene.add(g);
    };
    addTiger(TIGER.x - 3.2, TIGER.z + 1.4, 0.4);
    addTiger(TIGER.x + 2.6, TIGER.z - 2.2, -0.8);

    const rock = new THREE.Mesh(track(new THREE.DodecahedronGeometry(1.1, 0)), stoneDarkMat);
    rock.position.set(TIGER.x + 4.5, 0.7, TIGER.z + 3.2);
    rock.castShadow = true;
    scene.add(rock);
  }

  /* --- orphanage --- */

  {
    const shed = new THREE.Mesh(
      track(new THREE.BoxGeometry(ORPHANAGE.w, ORPHANAGE.h, ORPHANAGE.d)),
      plasterMat,
    );
    shed.position.set(ORPHANAGE.x, ORPHANAGE.h / 2, ORPHANAGE.z);
    shed.castShadow = true;
    shed.receiveShadow = true;
    scene.add(shed);
    const roof = new THREE.Mesh(
      track(new THREE.BoxGeometry(ORPHANAGE.w + 0.6, 0.35, ORPHANAGE.d + 0.6)),
      roofMat,
    );
    roof.position.set(ORPHANAGE.x, ORPHANAGE.h + 0.15, ORPHANAGE.z);
    roof.castShadow = true;
    scene.add(roof);
    const penGeo = track(new THREE.BoxGeometry(3.2, 1.1, 2.6));
    for (const p of layout.props.filter((item) => item.kind === "pen")) {
      const pen = new THREE.Mesh(penGeo, stoneMat);
      pen.position.set(p.x, 0.55, p.z);
      pen.castShadow = true;
      scene.add(pen);
    }
  }

  /* --- lamps --- */

  const flameTex = track(radialSprite("rgba(255,230,170,0.95)", "rgba(255,140,40,0.4)"));
  const flameMat = track(
    new THREE.SpriteMaterial({
      map: flameTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.65,
    }),
  );
  const lamps: THREE.Sprite[] = [];
  {
    const poleGeo = track(new THREE.CylinderGeometry(0.07, 0.1, 3.4, 6));
    for (const p of layout.props.filter((item) => item.kind === "lamp")) {
      const pole = new THREE.Mesh(poleGeo, stoneDarkMat);
      pole.position.set(p.x, 1.7, p.z);
      pole.castShadow = true;
      scene.add(pole);
      const sprite = new THREE.Sprite(flameMat);
      sprite.scale.setScalar(0.9);
      sprite.position.set(p.x, 3.6, p.z);
      scene.add(sprite);
      lamps.push(sprite);
    }
  }

  /* --- trees --- */

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
    const rnd = mulberry32(501);
    let ci = 0;
    trees.forEach((t, i) => {
      m.compose(
        new THREE.Vector3(t.x, t.y + 1.6 * t.scale, t.z),
        q,
        new THREE.Vector3(t.scale, t.scale, t.scale),
      );
      trunks.setMatrixAt(i, m);
      for (let k = 0; k < 2; k++) {
        const sc = (2.7 - k * 0.65) * t.scale;
        e.set(rnd() * 0.5, rnd() * Math.PI, rnd() * 0.5);
        q.setFromEuler(e);
        m.compose(
          new THREE.Vector3(
            t.x + (rnd() - 0.5) * 1.2,
            t.y + (3.7 + k * 1.25) * t.scale,
            t.z + (rnd() - 0.5) * 1.2,
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

  /* --- markers --- */

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

  /* --- camera --- */

  const spherical = { radius: HOME.radius + 20, phi: HOME.phi - 0.14, theta: HOME.theta - 0.24 };
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
    desired.radius = clamp(desired.radius * (1 + Math.sign(event.deltaY) * 0.12), 14, 160);
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
  let waterTarget = LAKE.yDry;
  const tmpColor = new THREE.Color();
  const introFrom = new THREE.Vector3(0, 12, 24);

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
    lerpColor(cur.waterDeep, paletteTarget.waterDeep, k);
    lerpColor(cur.waterShallow, paletteTarget.waterShallow, k);
    cur.sunIntensity = damp(cur.sunIntensity, paletteTarget.sunIntensity, 3.2, dt);
    cur.ambient = damp(cur.ambient, paletteTarget.ambient, 3.2, dt);
    cur.lantern = damp(cur.lantern, paletteTarget.lantern, 3.2, dt);
    cur.azimuth = damp(cur.azimuth, paletteTarget.sunAzimuth, 3.2, dt);
    cur.elevation = damp(cur.elevation, paletteTarget.sunElevation, 3.2, dt);
    cur.exposure = damp(cur.exposure, paletteTarget.exposure, 3.2, dt);
    cur.fest = damp(cur.fest, festTarget, 2.2, dt);
    cur.waterY = damp(cur.waterY, waterTarget, 1.6, dt);
    updateSunDir();

    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = cur.ambient * 1.7;
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunIntensity;
    sun.position.copy(sunDir).multiplyScalar(180);
    fog.color.copy(cur.fog);
    renderer.setClearColor(cur.fog);
    renderer.toneMappingExposure = cur.exposure;
    waterMat.color.copy(cur.waterDeep).lerp(cur.waterShallow, 0.35);
    lakeMesh.position.y = cur.waterY;
    leafMat.color.lerp(leafWetMat.color, cur.fest * 0.08);
    glassMat.emissiveIntensity = 0.1 + cur.lantern * 0.55;
    flameMat.opacity = 0.35 + cur.lantern * 0.55;
    for (let i = 0; i < lamps.length; i++) {
      lamps[i].scale.setScalar(0.8 * (0.85 + Math.sin(elapsed * 5 + i) * 0.14 * motion));
    }

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
      spherical.radius = THREE.MathUtils.lerp(HOME.radius + 20, desired.radius, e);
      spherical.phi = THREE.MathUtils.lerp(HOME.phi - 0.14, desired.phi, e);
      spherical.theta = THREE.MathUtils.lerp(HOME.theta - 0.24, desired.theta, e);
      target.lerpVectors(introFrom, desiredTarget, e);
    } else {
      if (!dragging) {
        idleTimer += dt;
        if (idleTimer > 6 && !activeId) autoRotate = true;
      }
      if (autoRotate && motion) desired.theta += dt * 0.032;
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
      waterTarget = getLakeLevel(m);
      festTarget = m === "monsoon" ? 1 : 0;
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
