import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const framesDir = join(root, "compositions", "frames");
const shots = [
  "shaniwar-wada.png",
  "sinhagad-fort.png",
  "aga-khan-palace.png",
  "pataleshwar-cave-temple.png",
  "national-war-memorial.png",
  "dagdusheth-halwai-ganapati.png",
  "osho-meditation-resort.png",
  "khadakwasla-dam.png",
  "lal-mahal.png",
  "okayama-friendship-garden.png",
  "parvati-hill-temple.png",
  "raja-dinkar-kelkar-museum.png",
  "saras-baug.png",
  "empress-garden.png",
  "vetal-tekdi.png",
];

test("every 3D screenshot is referenced by a shipped frame", () => {
  const html = readdirSync(framesDir)
    .filter((f) => f.endsWith(".html"))
    .map((f) => readFileSync(join(framesDir, f), "utf8"))
    .join("\n");
  for (const shot of shots) {
    assert.match(html, new RegExp(`assets/3d/${shot.replace(".", "\\.")}`), `missing 3D still ${shot}`);
    assert.ok(existsSync(join(root, "assets", "3d", shot)), `asset file missing ${shot}`);
  }
});

test("script commits spoken lines for Sarvam voiceover", () => {
  const script = readFileSync(join(root, "SCRIPT.md"), "utf8");
  assert.match(script, /Sarvam/i);
  assert.match(script, /walk through Pune before you even land/);
  assert.match(script, /explorepune\.vercel\.app/);
});
