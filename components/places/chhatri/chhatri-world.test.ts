import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { CHHATRI_FEATURES } from "@/lib/data/shinde-chhatri";
import { FEATURE_ORDER as MEMORIAL_FEATURES_ORDER } from "@/components/places/memorial/memorial-world";
import { FEATURE_ORDER as PALACE_FEATURES_ORDER } from "@/components/places/agakhan/palace-world";
import { FEATURE_ORDER as TEMPLE_FEATURES_ORDER } from "@/components/places/temple/temple-world";
import {
  FEATURE_ORDER,
  HALL,
  TEMPLE,
  SAMADHI,
  DOMES,
  JHAROKHAS,
  STAINED_WINDOWS,
  HALL_STONE,
  STEEPLE,
  SANCTUM,
  BASE,
  buildChhatriLayout,
  getChhatriAnchors,
  getChhatriHomeView,
  getChhatriPalette,
  hallInFrontOfTemple,
  hallRearZ,
  templeFrontZ,
  samadhiAtTempleCremationSpot,
  samadhiDistanceToTemple,
  samadhiDistanceToHall,
  type FeatureId,
  type ChhatriMode,
  type TimeOfDay,
} from "@/components/places/chhatri/chhatri-world";

/** Pure view-state helper mirroring setActive / resetView camera targets. */
function resolveView(active: FeatureId | null) {
  if (!active) {
    const home = getChhatriHomeView();
    return {
      target: home.target,
      distance: home.radius,
      phi: home.phi,
      theta: home.theta,
    };
  }
  const anchor = getChhatriAnchors()[active];
  return {
    target: anchor.target,
    distance: anchor.distance,
    dir: anchor.dir,
  };
}

/** Pure atmosphere helper mirroring setTimeOfDay + setMode. */
function resolveAtmosphere(timeOfDay: TimeOfDay, mode: ChhatriMode) {
  const palette = getChhatriPalette(timeOfDay);
  return {
    skyTop: palette.skyTop,
    lantern: palette.lantern,
    sunIntensity: palette.sunIntensity,
    fest: mode === "evening" ? 1 : 0,
  };
}

function parseHex(hex: string) {
  const n = hex.replace("#", "");
  return {
    r: parseInt(n.slice(0, 2), 16) / 255,
    g: parseInt(n.slice(2, 4), 16) / 255,
    b: parseInt(n.slice(4, 6), 16) / 255,
  };
}

describe("FEATURE_ORDER", () => {
  it("has exactly six stable hotspot ids", () => {
    expect(FEATURE_ORDER).toHaveLength(6);
    expect(FEATURE_ORDER).toEqual([
      "chhatri-hall",
      "domes",
      "jharokhas",
      "stained-glass",
      "shiva-temple",
      "samadhi",
    ]);
  });

  it("is not a reused fort / palace / temple / war-memorial feature set", () => {
    expect(FEATURE_ORDER).not.toEqual(MEMORIAL_FEATURES_ORDER);
    expect(FEATURE_ORDER).not.toEqual(PALACE_FEATURES_ORDER);
    expect(FEATURE_ORDER).not.toEqual(TEMPLE_FEATURES_ORDER);
  });

  it("aligns 1:1 with CHHATRI_FEATURES content ids (same set, same order)", () => {
    const contentIds = CHHATRI_FEATURES.map((f) => f.id);
    expect(contentIds).toEqual([...FEATURE_ORDER]);
    for (const id of FEATURE_ORDER) {
      const feature = CHHATRI_FEATURES.find((f) => f.id === id);
      expect(feature, `missing editorial feature for ${id}`).toBeDefined();
      expect(feature!.title.length).toBeGreaterThan(0);
      expect(feature!.blurb.length).toBeGreaterThan(0);
      expect(feature!.detail.length).toBeGreaterThan(0);
    }
  });
});

describe("chhatri layout geometry", () => {
  it("places the yellow hall in front of, and distinct from, the Shiva temple", () => {
    expect(hallInFrontOfTemple()).toBe(true);
    expect(HALL.z).toBeGreaterThan(TEMPLE.z);
    expect(hallRearZ()).toBeGreaterThan(templeFrontZ());
    expect(inSeparateVolumes()).toBe(true);
  });

  it("encodes a yellow-stone steeple over a black-stone sanctum and base", () => {
    expect(STEEPLE.stone).toBe("yellow-sandstone");
    expect(SANCTUM.stone).toBe("black-stone");
    expect(BASE.stone).toBe("black-stone");
    expect(HALL_STONE.stone).toBe("yellow-sandstone");

    const steeple = parseHex(STEEPLE.hex);
    const sanctum = parseHex(SANCTUM.hex);
    const base = parseHex(BASE.hex);
    expect(steeple.r).toBeGreaterThan(steeple.b);
    expect(steeple.g).toBeGreaterThan(steeple.b);
    expect(sanctum.r + sanctum.g + sanctum.b).toBeLessThan(0.35);
    expect(base.r + base.g + base.b).toBeLessThan(0.4);
    expect(STEEPLE.hex.toLowerCase()).not.toBe(SANCTUM.hex.toLowerCase());
  });

  it("sits the samadhi at the temple cremation spot, not a plaza column", () => {
    expect(samadhiAtTempleCremationSpot()).toBe(true);
    expect(samadhiDistanceToTemple()).toBeLessThan(samadhiDistanceToHall());
    expect(samadhiDistanceToTemple()).toBeLessThan(10);
    expect(SAMADHI.h).toBeLessThan(TEMPLE.steepleH);
    expect(SAMADHI.h).toBeLessThan(4);
    expect(Math.abs(SAMADHI.x - TEMPLE.x)).toBeLessThan(4);
    expect(SAMADHI.z).toBeLessThan(hallRearZ());
    expect(SAMADHI.z).toBeGreaterThan(TEMPLE.z - TEMPLE.d);
  });

  it("has multiple domes plus jharokha and stained-glass elements", () => {
    expect(DOMES.length).toBeGreaterThanOrEqual(3);
    expect(DOMES.filter((d) => d.kind === "central")).toHaveLength(1);
    expect(DOMES.filter((d) => d.kind === "corner").length).toBeGreaterThanOrEqual(4);
    expect(JHAROKHAS.length).toBeGreaterThanOrEqual(2);
    expect(STAINED_WINDOWS.length).toBeGreaterThanOrEqual(4);
    expect(JHAROKHAS.every((j) => j.storey === 1)).toBe(true);
    expect(STAINED_WINDOWS.some((w) => w.face === "front")).toBe(true);
  });
});

function inSeparateVolumes() {
  const hallMinZ = HALL.z - HALL.d / 2;
  const hallMaxZ = HALL.z + HALL.d / 2;
  const templeMinZ = TEMPLE.z - TEMPLE.d / 2;
  const templeMaxZ = TEMPLE.z + TEMPLE.d / 2;
  return hallMinZ >= templeMaxZ || templeMinZ >= hallMaxZ;
}

describe("buildChhatriLayout", () => {
  it("returns a full prop set with dome, jharokha and window counts", () => {
    const layout = buildChhatriLayout(1794);
    expect(layout.domeCount).toBe(DOMES.length);
    expect(layout.jharokhaCount).toBe(JHAROKHAS.length);
    expect(layout.windowCount).toBe(STAINED_WINDOWS.length);
    expect(layout.propCount).toBeGreaterThanOrEqual(30);
    expect(layout.props.length).toBe(layout.propCount);
  });

  it("places props for every signature feature", () => {
    const layout = buildChhatriLayout();
    for (const id of FEATURE_ORDER) {
      const count = layout.props.filter((p) => p.feature === id).length;
      expect(count, `no props tagged ${id}`).toBeGreaterThan(0);
    }
  });

  it("exposes marker bases for every feature", () => {
    const layout = buildChhatriLayout();
    for (const id of FEATURE_ORDER) {
      const base = layout.markerBases[id];
      expect(base).toBeDefined();
      expect(Number.isFinite(base.x)).toBe(true);
      expect(Number.isFinite(base.y)).toBe(true);
      expect(Number.isFinite(base.z)).toBe(true);
    }
    expect(layout.markerBases.domes.y).toBeGreaterThan(layout.markerBases["chhatri-hall"].y);
    expect(layout.markerBases["shiva-temple"].z).toBeLessThan(layout.markerBases["chhatri-hall"].z);
    expect(layout.markerBases.samadhi.z).toBeLessThan(layout.markerBases["chhatri-hall"].z);
  });

  it("is deterministic for a fixed seed", () => {
    const a = buildChhatriLayout(42);
    const b = buildChhatriLayout(42);
    expect(a.propCount).toBe(b.propCount);
    expect(a.props[0]).toEqual(b.props[0]);
    expect(a.props.at(-1)).toEqual(b.props.at(-1));
  });
});

describe("getChhatriAnchors / getChhatriHomeView", () => {
  it("provides a camera anchor for every feature", () => {
    const anchors = getChhatriAnchors();
    for (const id of FEATURE_ORDER) {
      const a = anchors[id];
      expect(a.target).toHaveLength(3);
      expect(a.dir).toHaveLength(3);
      expect(a.distance).toBeGreaterThan(8);
      expect(a.distance).toBeLessThan(240);
    }
  });

  it("home view frames the hall from the gate side", () => {
    const home = getChhatriHomeView();
    expect(home.radius).toBeGreaterThan(24);
    expect(home.phi).toBeGreaterThan(0.5);
    expect(home.phi).toBeLessThan(Math.PI / 2);
    expect(home.target[2]).toBeGreaterThan(0);
  });
});

describe("atmosphere setters (pure equivalents of setTimeOfDay / setMode)", () => {
  const times: TimeOfDay[] = ["dawn", "golden", "dusk"];

  it("returns distinct palettes for dawn / golden hour / dusk", () => {
    const palettes = times.map((t) => getChhatriPalette(t));
    expect(new Set(palettes.map((p) => p.skyTop)).size).toBe(3);
    expect(getChhatriPalette("dusk").lantern).toBeGreaterThan(getChhatriPalette("dawn").lantern);
    expect(getChhatriPalette("golden").sunIntensity).toBeGreaterThan(
      getChhatriPalette("dusk").sunIntensity,
    );
  });

  it("evening mode sets the floodlight flag over a daylight visit", () => {
    const day = resolveAtmosphere("golden", "daylight");
    const night = resolveAtmosphere("dusk", "evening");
    expect(night.fest).toBe(1);
    expect(day.fest).toBe(0);
    expect(night.lantern).toBeGreaterThan(day.lantern);
  });
});

describe("setActive / resetView (pure camera resolution)", () => {
  it("reset clears to home overview", () => {
    const home = resolveView(null);
    const overview = getChhatriHomeView();
    expect(home.target).toEqual(overview.target);
    expect(home.distance).toBe(overview.radius);
  });

  it("selecting each feature focuses a different target than home", () => {
    const home = resolveView(null);
    for (const id of FEATURE_ORDER) {
      const view = resolveView(id);
      const same =
        view.target[0] === home.target[0] &&
        view.target[1] === home.target[1] &&
        view.target[2] === home.target[2];
      expect(same, `${id} should not reuse home target`).toBe(false);
    }
  });
});

describe("detail page wiring", () => {
  it("mounts the bespoke 3D hero on the shinde-chhatri slug", () => {
    const src = readFileSync(resolve("components/places/place-detail.tsx"), "utf8");
    expect(src).toContain('const CHHATRI_SLUG = "shinde-chhatri"');
    expect(src).toContain("ChhatriExperience");
    expect(src).toContain("ChhatriStory");
    expect(src).toContain("ChhatriEtiquette");
    expect(src).toContain("ChhatriFaqs");
    expect(src).toContain("CHHATRI_FAQS");
    expect(src).toContain("isChhatri");
    expect(src).toMatch(/isChhatri/);
  });

  it("ships a unique chhatri world, not a copied memorial column scene", () => {
    const src = readFileSync(resolve("components/places/chhatri/chhatri-world.ts"), "utf8");
    expect(src).toContain("yellow-sandstone");
    expect(src).toContain("stained");
    expect(src).toContain("jharokha");
    expect(src).toContain("onion");
    expect(src).not.toContain("MiG-23");
    expect(src).not.toContain("INS Trishul");
    expect(src).not.toContain("createMemorialWorld");
    expect(src).not.toContain("createPalaceWorld");
  });
});

describe("setActive / resetView samadhi framing", () => {
  it("the samadhi target sits lower and closer to the temple than the hall", () => {
    const samadhi = resolveView("samadhi");
    const hall = resolveView("chhatri-hall");
    const temple = resolveView("shiva-temple");
    expect(samadhi.target[1]).toBeLessThan(hall.target[1]);
    expect(samadhi.target[2]).toBeLessThan(hall.target[2]);
    expect(Math.abs(samadhi.target[2] - temple.target[2])).toBeLessThan(
      Math.abs(samadhi.target[2] - hall.target[2]),
    );
  });
});
