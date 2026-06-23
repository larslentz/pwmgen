/**
 * Builds the Vite app, then inlines all JS and CSS into a single
 * self-contained HTML file that works from file:// with no server.
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir   = join(__dirname, "dist", "public");
const outFile   = join(__dirname, "dist", "AudioPWMGenerator.html");

// 1. Build
console.log("Building…");
execSync("pnpm --filter @workspace/pwm-generator run build", {
  stdio: "inherit",
  cwd: join(__dirname, "..", ".."),
  env: { ...process.env, NODE_ENV: "production" },
});
console.log("Build done. Inlining assets…");

// 2. Read index.html
let html = readFileSync(join(distDir, "index.html"), "utf8");

// 3. Inline <link rel="stylesheet" href="...">
html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*\/?>/g, (_, href) => {
  const filePath = join(distDir, href.replace(/^\//, ""));
  try {
    const css = readFileSync(filePath, "utf8");
    return `<style>${css}</style>`;
  } catch {
    console.warn(`Could not inline CSS: ${filePath}`);
    return "";
  }
});

// 4. Inline <script type="module" src="..."> and <script src="...">
html = html.replace(/<script([^>]*?)src="([^"]+)"([^>]*?)><\/script>/g, (_, pre, src, post) => {
  const filePath = join(distDir, src.replace(/^\//, ""));
  try {
    const js = readFileSync(filePath, "utf8");
    // Keep type="module" so ES module syntax works, strip src
    const attrs = (pre + post).replace(/\bsrc="[^"]*"/, "").trim();
    return `<script ${attrs}>${js}</script>`;
  } catch {
    console.warn(`Could not inline JS: ${filePath}`);
    return "";
  }
});

// 5. Write single-file HTML
writeFileSync(outFile, html, "utf8");
const kb = (readFileSync(outFile).length / 1024).toFixed(1);
console.log(`\nDone! Single-file HTML written to:\n  ${outFile}\n  Size: ${kb} KB`);
console.log("\nOpen AudioPWMGenerator.html in Chrome or Edge — no internet needed.");
