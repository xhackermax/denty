import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mainStyles = readFileSync("src/styles/visual-personalization.css", "utf8");
const previews = readFileSync("src/features/parity/modules/visual-personalization-panel.module.css", "utf8");
const catalogs = readFileSync("src/domain/visual-personalization.ts", "utf8");
const assets = {
  aurora: "aurora-luxury.svg",
  silk: "silk-3d.svg",
  mesh: "mesh-network.svg",
};

for (const [id, filename] of Object.entries(assets)) {
  const assetPath = `public/wallpapers/${filename}`;
  const content = readFileSync(assetPath, "utf8");
  assert.match(content, /^<svg\s/);
  assert.match(content, /viewBox="0 0 1600 900"/);
  assert.match(content, /<title>[^<]+<\/title>/);
  assert.match(content, /<\/svg>\s*$/);
  assert.ok(content.length > 2600, `Wallpaper ${id} is not detailed enough`);
  assert.ok(mainStyles.includes(`url("/wallpapers/${filename}")`), `Missing full-scale wallpaper ${id}`);
  assert.ok(previews.includes(`url("/wallpapers/${filename}")`), `The preview differs from background ${id}`);
  assert.ok(catalogs.includes(`id: "${id}"`), `Missing saved wallpaper ID ${id}`);
}

const mesh = readFileSync("public/wallpapers/mesh-network.svg", "utf8");
assert.ok((mesh.match(/<path /g) ?? []).length > 350, "Mesh should be a perspective network, not diagonal stripes");
assert.ok((mesh.match(/<circle /g) ?? []).length > 80, "Mesh should have glowing nodes");

const silk = readFileSync("public/wallpapers/silk-3d.svg", "utf8");
assert.ok((silk.match(/<linearGradient /g) ?? []).length >= 4, "Silk needs layered shading");
assert.ok((silk.match(/ C/g) ?? []).length >= 12, "Silk needs curved ribbons");

assert.ok(mainStyles.includes("body::before"), "Wallpaper must render behind the app content");
assert.ok(mainStyles.includes("opacity: 1"), "Wallpaper should not be dimmed");
console.log("Wallpaper artwork contract OK (3 assets, true previews, perspective mesh, 3D ribbon and fixed canvas)");
