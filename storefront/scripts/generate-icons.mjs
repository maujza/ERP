// Rasterizes the square-framed AURORA favicon (src/app/icon.svg) into the PNG
// and ICO assets that Next.js App Router and the PWA manifest reference.
//
// Outputs:
//   src/app/apple-icon.png   180x180  -> Apple touch icon (App Router convention)
//   src/app/favicon.ico      16/32/48 -> legacy favicon (PNG-embedded ICO)
//   public/icon-192.png      192x192  -> PWA manifest icon
//   public/icon-512.png      512x512  -> PWA manifest icon
//
// Run from storefront/:  node scripts/generate-icons.mjs
//
// Mirrors the sharp usage and throw-on-failure style of
// backend/src/modules/image-upload. No new dependency: the ICO is assembled by
// embedding PNG entries (supported by all browsers since Windows Vista).

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = join(__dirname, "..");
const sourceSvgPath = join(storefrontRoot, "src", "app", "icon.svg");

const appDir = join(storefrontRoot, "src", "app");
const publicDir = join(storefrontRoot, "public");

/** Render the source SVG to a square PNG buffer at the given pixel size. */
async function renderPng(svg, size) {
  return sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 242, g: 230, b: 247, alpha: 1 } })
    .png()
    .toBuffer();
}

/** Assemble a PNG-based .ico from rendered entries (one ICONDIRENTRY per size). */
function buildIco(entries) {
  const HEADER_SIZE = 6;
  const ENTRY_SIZE = 16;
  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(entries.length, 4); // image count

  const directory = Buffer.alloc(ENTRY_SIZE * entries.length);
  let offset = HEADER_SIZE + ENTRY_SIZE * entries.length;

  entries.forEach((entry, index) => {
    const base = index * ENTRY_SIZE;
    // width/height: 0 means 256; all our sizes are < 256 so a direct byte is fine.
    directory.writeUInt8(entry.size >= 256 ? 0 : entry.size, base + 0);
    directory.writeUInt8(entry.size >= 256 ? 0 : entry.size, base + 1);
    directory.writeUInt8(0, base + 2); // color palette
    directory.writeUInt8(0, base + 3); // reserved
    directory.writeUInt16LE(1, base + 4); // color planes
    directory.writeUInt16LE(32, base + 6); // bits per pixel
    directory.writeUInt32LE(entry.data.length, base + 8); // size of PNG data
    directory.writeUInt32LE(offset, base + 12); // offset of PNG data
    offset += entry.data.length;
  });

  return Buffer.concat([header, directory, ...entries.map((entry) => entry.data)]);
}

async function main() {
  const svg = await readFile(sourceSvgPath);

  // Apple touch icon + PWA manifest icons.
  await writeFile(join(appDir, "apple-icon.png"), await renderPng(svg, 180));
  await writeFile(join(publicDir, "icon-192.png"), await renderPng(svg, 192));
  await writeFile(join(publicDir, "icon-512.png"), await renderPng(svg, 512));

  // Multi-size legacy favicon.
  const icoSizes = [16, 32, 48];
  const icoEntries = await Promise.all(
    icoSizes.map(async (size) => ({ size, data: await renderPng(svg, size) })),
  );
  await writeFile(join(appDir, "favicon.ico"), buildIco(icoEntries));

  console.log("Generated: apple-icon.png, favicon.ico, public/icon-192.png, public/icon-512.png");
}

main().catch((error) => {
  console.error("Icon generation failed:", error);
  process.exit(1);
});
