/**
 * Packages dist/public/ into LarsLentzPWMGeneratorPWA.zip,
 * inserting README.txt from scripts/readme-github-pages.txt.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist/public");
const OUT  = path.resolve(__dirname, "../dist/LarsLentzPWMGeneratorPWA.zip");
const README = path.resolve(__dirname, "readme-github-pages.txt");

// Minimal pure-JS ZIP writer (DEFLATE via zlib)
import zlib from "zlib";

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16le(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
function u32le(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; }
function str(s)   { return Buffer.from(s, "utf8"); }

const parts = [];     // local file entries
const central = [];   // central directory entries
let offset = 0;

function addFile(name, data) {
  const nameBytes  = str(name);
  const compressed = zlib.deflateRawSync(data, { level: 9 });
  const crc        = crc32(data);
  const mod = { date: 0x5AC0, time: 0x0000 }; // 2026-06-00 00:00

  // Local file header
  const local = Buffer.concat([
    Buffer.from([0x50,0x4b,0x03,0x04]),  // signature
    u16le(20),          // version needed
    u16le(0),           // flags
    u16le(8),           // compression: DEFLATE
    u16le(mod.time), u16le(mod.date),
    u32le(crc),
    u32le(compressed.length),
    u32le(data.length),
    u16le(nameBytes.length),
    u16le(0),           // extra field length
    nameBytes,
    compressed,
  ]);

  parts.push(local);

  // Central directory record
  central.push(Buffer.concat([
    Buffer.from([0x50,0x4b,0x01,0x02]),
    u16le(20), u16le(20),
    u16le(0),
    u16le(8),
    u16le(mod.time), u16le(mod.date),
    u32le(crc),
    u32le(compressed.length),
    u32le(data.length),
    u16le(nameBytes.length),
    u16le(0), u16le(0), u16le(0), u16le(0),
    u32le(0),
    u32le(offset),
    nameBytes,
  ]));

  offset += local.length;
}

// README first
addFile("README.txt", fs.readFileSync(README));

// All files from dist/public, sorted for reproducibility
function walk(dir, base = "") {
  for (const entry of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, entry);
    const rel  = base ? `${base}/${entry}` : entry;
    if (fs.statSync(full).isDirectory()) walk(full, rel);
    else addFile(rel, fs.readFileSync(full));
  }
}
walk(DIST);

// Central directory + end record
const centralBuf = Buffer.concat(central);
const eocd = Buffer.concat([
  Buffer.from([0x50,0x4b,0x05,0x06]),
  u16le(0), u16le(0),
  u16le(central.length), u16le(central.length),
  u32le(centralBuf.length),
  u32le(offset),
  u16le(0),
]);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat([...parts, centralBuf, eocd]));

const sizeKB = Math.round(fs.statSync(OUT).size / 1024);
console.log(`Created ${OUT}  (${sizeKB} KB, ${parts.length} entries)`);
