/**
 * PWA build validation script.
 * Checks that a production build of pwm-generator-pwa is correct:
 *  - required files exist
 *  - manifest has 192x192 and 512x512 icons
 *  - service worker precaches index.html and the main JS bundle
 *
 * Usage (from workspace root):
 *   PORT=3000 BASE_PATH=/ pnpm --filter @workspace/pwm-generator-pwa run build
 *   node artifacts/pwm-generator-pwa/scripts/test-pwa-build.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist/public");

let pass = 0;
let fail = 0;

function ok(label) {
  console.log(`  ✓ ${label}`);
  pass++;
}

function err(label, detail = "") {
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  fail++;
}

function check(label, condition, detail = "") {
  condition ? ok(label) : err(label, detail);
}

function readFile(rel) {
  const p = path.join(DIST, rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}

// ── 1. Required files ──────────────────────────────────────────────────────
console.log("\n[1] Required output files");
const required = [
  "index.html",
  "sw.js",
  "manifest.webmanifest",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
];
for (const f of required) {
  const exists = fs.existsSync(path.join(DIST, f));
  check(`${f} exists`, exists, "file not found");
}

// ── 2. Manifest content ────────────────────────────────────────────────────
console.log("\n[2] manifest.webmanifest");
const manifestRaw = readFile("manifest.webmanifest");
if (!manifestRaw) {
  err("manifest.webmanifest readable");
} else {
  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
    ok("manifest.webmanifest is valid JSON");
  } catch (e) {
    err("manifest.webmanifest is valid JSON", String(e));
    manifest = null;
  }

  if (manifest) {
    check(
      'name is "Lars Lentz\'s PWM Generator"',
      manifest.name === "Lars Lentz's PWM Generator",
      `got: ${manifest.name}`
    );
    check('display is "standalone"', manifest.display === "standalone", `got: ${manifest.display}`);
    check('orientation is "portrait"', manifest.orientation === "portrait", `got: ${manifest.orientation}`);

    const icons = manifest.icons ?? [];
    const has192 = icons.some((i) => i.sizes === "192x192" && i.type === "image/png");
    const has512 = icons.some((i) => i.sizes === "512x512" && i.type === "image/png");
    const hasMaskable = icons.some((i) => (i.purpose ?? "").includes("maskable"));
    check("192x192 PNG icon present", has192, "missing 192x192 png icon");
    check("512x512 PNG icon present", has512, "missing 512x512 png icon");
    check("maskable icon present", hasMaskable, "no icon with purpose maskable");
  }
}

// ── 3. Service worker ──────────────────────────────────────────────────────
console.log("\n[3] sw.js (service worker)");
const swRaw = readFile("sw.js");
if (!swRaw) {
  err("sw.js readable");
} else {
  ok("sw.js readable");
  check(
    "sw.js references index.html in precache",
    swRaw.includes("index.html"),
    "no index.html entry in sw.js"
  );
  check(
    "sw.js uses workbox precaching",
    swRaw.includes("precacheAndRoute") || swRaw.includes("precache"),
    "no workbox precache call found"
  );

  // Count precache entries — minified sw.js uses unquoted keys: url:"..."
  const entries = [...swRaw.matchAll(/url:"([^"]+)"/g)];
  check(
    `precache has ≥ 8 entries (found ${entries.length})`,
    entries.length >= 8,
    `only ${entries.length} entries`
  );
}

// ── 4. Icon file sizes ─────────────────────────────────────────────────────
console.log("\n[4] Icon PNG file integrity");
for (const [name, minBytes] of [["icon-192.png", 400], ["icon-512.png", 2000]]) {
  const p = path.join(DIST, name);
  if (fs.existsSync(p)) {
    const stat = fs.statSync(p);
    check(`${name} ≥ ${minBytes} bytes (${stat.size})`, stat.size >= minBytes);
    // Validate PNG magic bytes
    const buf = fs.readFileSync(p);
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    check(`${name} is valid PNG`, isPng, "bad magic bytes");
  }
}

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(48)}`);
if (fail === 0) {
  console.log(`✓ All ${pass} checks passed — PWA build is valid.\n`);
  process.exit(0);
} else {
  console.log(`✗ ${fail} check(s) failed, ${pass} passed.\n`);
  process.exit(1);
}
