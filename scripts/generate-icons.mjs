/**
 * Icon generation script for LifeRise PWA
 * Generates all required icon sizes from liferise_logo.png
 *
 * Output:
 *   public/icon-192.png       — PWA manifest 192×192
 *   public/icon-512.png       — PWA manifest 512×512
 *   public/apple-touch-icon.png — Apple home-screen 180×180
 *   public/liferise_icon.ico  — Favicon with 16, 32, 48 px frames
 */

import sharp from "sharp";
import toIco from "to-ico";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC  = resolve(ROOT, "public/liferise_logo.png");

/** Resize source to an exact square, letterboxing with the app background color */
async function square(size) {
  return sharp(SRC)
    .resize(size, size, {
      fit: "contain",
      background: { r: 10, g: 15, b: 30, alpha: 1 }, // #0A0F1E — midnight
    })
    .png()
    .toBuffer();
}

async function main() {
  console.log("🖼  Generating icons from", SRC);

  // ── PNG icons ────────────────────────────────────────────────────
  const sizes = [
    { size: 192, name: "icon-192.png" },
    { size: 512, name: "icon-512.png" },
    { size: 180, name: "apple-touch-icon.png" },
  ];

  for (const { size, name } of sizes) {
    const buf = await square(size);
    const dest = resolve(ROOT, "public", name);
    writeFileSync(dest, buf);
    console.log(`  ✓ ${name}  (${size}×${size})`);
  }

  // ── ICO favicon (16 + 32 + 48 px frames) ─────────────────────────
  const icoFrames = await Promise.all([16, 32, 48].map(square));
  const ico = await toIco(icoFrames);
  const icoDest = resolve(ROOT, "public/liferise_icon.ico");
  writeFileSync(icoDest, ico);
  console.log("  ✓ liferise_icon.ico  (16 + 32 + 48 px frames)");

  console.log("\n✅ All icons generated successfully.");
}

main().catch((err) => {
  console.error("❌ Icon generation failed:", err);
  process.exit(1);
});
