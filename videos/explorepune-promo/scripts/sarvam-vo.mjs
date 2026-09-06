#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.sarvam.ai/text-to-speech";

function loadKey() {
  if (process.env.SARVAM_API_KEY) return process.env.SARVAM_API_KEY;
  const home = process.env.USERPROFILE || "";
  const candidates = [
    join(root, ".env"),
    join(root, "..", "..", ".env"),
    join(home, "AppData", "Local", "hermes", ".env"),
    join(home, ".hermes", ".env"),
    join(home, ".sarvam", "key"),
    join(home, ".config", "sarvam", "key"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, "utf8").trim();
    const m = raw.match(/SARVAM_API_KEY\s*=\s*["']?([^"'\r\n]+)/);
    if (m) return m[1].trim();
    if (raw && !raw.includes("\n") && raw.length > 12) return raw;
  }
  return null;
}

function spokenLines(md) {
  const lines = [];
  for (const block of md.split(/^## Line /m).slice(1)) {
    const frame = Number((block.match(/\(Frame (\d+)\)/) || [])[1]);
    const spoken = (block.match(/\n    (.+(?:\n    .+)*)/) || [])[1];
    if (!frame || !spoken) continue;
    lines.push({ frame, text: spoken.replace(/\n    /g, " ").trim() });
  }
  return lines;
}

const key = loadKey();
if (!key) {
  console.error("SARVAM_API_KEY missing");
  process.exit(2);
}

const script = readFileSync(join(root, "SCRIPT.md"), "utf8");
const lines = spokenLines(script);
if (!lines.length) {
  console.error("No spoken lines in SCRIPT.md");
  process.exit(1);
}

const outDir = join(root, "assets", "voice");
mkdirSync(outDir, { recursive: true });

function wavDurationSeconds(buf) {
  const rate = buf.readUInt32LE(24);
  const byteRate = buf.readUInt32LE(28);
  if (!rate || !byteRate) return null;
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "data") return Math.round((size / byteRate) * 1000) / 1000;
    offset += 8 + size + (size % 2);
  }
  return Math.round(((buf.length - 44) / byteRate) * 1000) / 1000;
}

const SPEAKER = "anushka";
const PACE = 0.95;
const voices = [];
for (const line of lines) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "api-subscription-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: line.text,
      target_language_code: "en-IN",
      speaker: SPEAKER,
      pitch: 0,
      pace: PACE,
      loudness: 1.05,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: "bulbul:v2",
    }),
  });
  if (!res.ok) {
    console.error(`Sarvam ${res.status} on frame ${line.frame}: ${await res.text()}`);
    process.exit(1);
  }
  const json = await res.json();
  const b64 = (json.audios || []).join("");
  const buf = Buffer.from(b64, "base64");
  const rel = `assets/voice/${String(line.frame).padStart(2, "0")}.wav`;
  writeFileSync(join(root, rel), buf);
  const duration_s = wavDurationSeconds(buf);
  voices.push({ frame: line.frame, path: rel, duration_s });
  console.log(`wrote ${rel} (${buf.length} bytes, ${duration_s}s)`);
}

writeFileSync(
  join(root, "audio_meta.json"),
  JSON.stringify(
    { bgm: null, voices, sfx: [], provider: "sarvam-bulbul-v2", speaker: SPEAKER, pace: PACE },
    null,
    2,
  ),
);
console.log("audio_meta.json written");
