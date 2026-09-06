/**
 * One-off asset generator for place imagery.
 *
 *   node scripts/capture-covers.mjs covers   # clean <canvas> stills -> public/covers/<slug>.webp
 *   node scripts/capture-covers.mjs docs      # full-page shots -> docs/screenshots/<slug>{,-mobile}.png
 *   node scripts/capture-covers.mjs all       # both
 *
 * Builds the app if needed and runs its own `next start` for the duration, so it
 * does not depend on a separately-managed dev server. Set CAPTURE_BASE to point
 * at an already-running server and the built-in one is skipped. CAPTURE_ONLY=
 * <slug,slug> limits the run; CAPTURE_FORCE=1 re-does shots that already exist.
 *
 * Needs a Playwright Chromium/Chrome (resolved from the user-level playwright
 * install). Not part of the build — checked in so covers can be regenerated
 * when the 3D scenes change.
 */
import { mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = path.resolve(import.meta.dirname, "..");
const COVERS_DIR = path.join(ROOT, "public", "covers");
const DOCS_DIR = path.join(ROOT, "docs", "screenshots");
const TMP = path.join(ROOT, "node_modules", ".cache", "capture");
const PORT = Number(process.env.CAPTURE_PORT ?? 3100);
const EXTERNAL_BASE = process.env.CAPTURE_BASE;
const BASE = EXTERNAL_BASE ?? `http://localhost:${PORT}`;

/** All seed places, in catalogue order. `threeD: false` => no interactive model. */
const PLACES = [
  { slug: "shaniwar-wada", threeD: true },
  { slug: "lal-mahal", threeD: true },
  { slug: "sinhagad-fort", threeD: true },
  { slug: "aga-khan-palace", threeD: true },
  { slug: "raja-dinkar-kelkar-museum", threeD: true },
  { slug: "national-war-memorial", threeD: true },
  { slug: "shinde-chhatri", threeD: true },
  { slug: "dagdusheth-halwai-ganapati", threeD: true },
  { slug: "pataleshwar-cave-temple", threeD: true },
  { slug: "parvati-hill-temple", threeD: true },
  { slug: "osho-meditation-resort", threeD: true },
  { slug: "okayama-friendship-garden", threeD: true },
  { slug: "saras-baug", threeD: true },
  { slug: "empress-garden", threeD: true },
  { slug: "vetal-tekdi", threeD: true },
  { slug: "khadakwasla-dam", threeD: true },
  { slug: "katraj-zoo-park", threeD: false },
];

const mode = process.argv[2] ?? "all";
const doCovers = mode === "covers" || mode === "all";
const doDocs = mode === "docs" || mode === "all";
const force = process.env.CAPTURE_FORCE === "1";
const only = process.env.CAPTURE_ONLY?.split(",").map((s) => s.trim()).filter(Boolean);
const places = only?.length ? PLACES.filter((p) => only.includes(p.slug)) : PLACES;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

async function waitForServer(url, tries = 120) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  throw new Error(`server never became ready at ${url}`);
}

/** Build once, then run `next start` as our own child for the whole run. */
async function startServer() {
  if (EXTERNAL_BASE) {
    console.log(`using external server ${EXTERNAL_BASE}`);
    await waitForServer(EXTERNAL_BASE);
    return null;
  }
  if (!existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
    console.log("building (no .next/BUILD_ID)…");
    await new Promise((res, rej) => {
      const b = spawn(npx, ["next", "build"], { cwd: ROOT, stdio: "inherit", shell: true });
      b.on("exit", (c) => (c === 0 ? res() : rej(new Error(`next build exited ${c}`))));
    });
  }
  console.log(`starting next on :${PORT}…`);
  const srv = spawn(npx, ["next", "start", "-p", String(PORT)], {
    cwd: ROOT,
    stdio: "ignore",
    shell: true,
  });
  srv.on("exit", (c) => console.log(`[next start exited ${c}]`));
  await waitForServer(BASE);
  console.log("server ready.");
  return srv;
}

/**
 * Hide every DOM overlay on top of the diorama (mode chip, light / season
 * controls, title, rating, feature rail, dark scrims) so an element screenshot
 * of the <canvas> region is just the rendered model. `visibility` keeps layout.
 */
async function stripSceneChrome(page) {
  await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const section = canvas.closest("section") ?? document.body;
    const keep = new Set();
    for (let n = canvas; n && n !== section.parentElement; n = n.parentElement) keep.add(n);
    section.querySelectorAll("*").forEach((el) => {
      if (!keep.has(el) && !el.contains(canvas)) {
        el.style.setProperty("visibility", "hidden", "important");
      }
    });
  });
}

/** Wait for the diorama to have painted and its intro camera move to settle. */
async function settleScene(page, threeD) {
  if (!threeD) {
    await page.waitForLoadState("networkidle").catch(() => {});
    await sleep(1500);
    return;
  }
  await page.waitForSelector("canvas", { timeout: 45_000 });
  await page
    .waitForFunction(
      () => {
        const c = document.querySelector("canvas");
        return c instanceof HTMLCanvasElement && c.width > 100 && c.height > 100;
      },
      { timeout: 45_000 },
    )
    .catch(() => {});
  // Loading veil fades over 700ms; intro orbit runs a couple of seconds.
  await sleep(7000);
}

async function launchBrowser() {
  const opts = { args: ["--ignore-gpu-blocklist", "--enable-gpu", "--use-angle=default"] };
  try {
    return await chromium.launch({ ...opts, channel: "chrome" });
  } catch {
    return await chromium.launch(opts); // bundled chromium (SwiftShader WebGL)
  }
}

async function captureCovers(browser) {
  await mkdir(COVERS_DIR, { recursive: true });
  await mkdir(TMP, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  for (const { slug, threeD } of places) {
    if (!threeD) {
      console.log(`covers: skip ${slug} (no 3D scene — keeps gradient)`);
      continue;
    }
    const out = path.join(COVERS_DIR, `${slug}.webp`);
    if (!force && existsSync(out)) {
      console.log(`covers: have ${slug}.webp`);
      continue;
    }
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/places/${slug}`, { waitUntil: "load", timeout: 60_000 });
      await settleScene(page, true);
      await stripSceneChrome(page);
      const raw = path.join(TMP, `${slug}.png`);
      await page.locator("canvas").first().screenshot({ path: raw });
      await sharp(raw)
        .resize(1280, 800, { fit: "cover", position: "centre" })
        .webp({ quality: 82 })
        .toFile(out);
      console.log(`covers: ${slug} -> public/covers/${slug}.webp`);
    } catch (err) {
      console.error(`covers: FAILED ${slug}: ${err.message}`);
    } finally {
      await page.close();
    }
  }
  await ctx.close();
}

async function captureDocs(browser) {
  await mkdir(DOCS_DIR, { recursive: true });
  // One viewport per shot — the hero as a visitor first meets it, desktop and
  // mobile. Matches the existing 1440x900 stills; mobile is retina (780px wide).
  const shots = [
    { suffix: "", viewport: { width: 1440, height: 900 }, dpr: 1 },
    { suffix: "-mobile", viewport: { width: 390, height: 844 }, dpr: 2 },
  ];
  for (const { suffix, viewport, dpr } of shots) {
    const ctx = await browser.newContext({
      viewport,
      deviceScaleFactor: dpr,
      colorScheme: "light",
      isMobile: suffix === "-mobile",
    });
    for (const { slug, threeD } of places) {
      const out = path.join(DOCS_DIR, `${slug}${suffix}.png`);
      if (!force && existsSync(out)) {
        console.log(`docs: have ${slug}${suffix}.png`);
        continue;
      }
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}/places/${slug}`, { waitUntil: "load", timeout: 60_000 });
        await settleScene(page, threeD);
        await page.screenshot({ path: out });
        console.log(`docs: ${slug}${suffix}.png`);
      } catch (err) {
        console.error(`docs: FAILED ${slug}${suffix}: ${err.message}`);
      } finally {
        await page.close();
      }
    }
    await ctx.close();
  }
}

const server = await startServer();
const browser = await launchBrowser();
try {
  if (doCovers) await captureCovers(browser);
  if (doDocs) await captureDocs(browser);
} finally {
  await browser.close();
  if (server) server.kill();
  if (existsSync(TMP)) await rm(TMP, { recursive: true, force: true });
}
console.log("done.");
