import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const projectRoot = process.cwd();
const godotBin = process.env.GODOT_BIN ?? "/Applications/Godot.app/Contents/MacOS/Godot";
const exportDir = path.join(projectRoot, "public", "godot-web");
const exportTarget = "../public/godot-web/index.html";
const sourceAssetRoot = path.join(projectRoot, "public", "assets", "generated", "v2");
const godotAssetRoot = path.join(projectRoot, "godot", "assets", "generated", "v2");
const godotDataRoot = path.join(projectRoot, "godot", "data");

if (!existsSync(godotBin)) {
  console.error(`Godot binary not found: ${godotBin}`);
  console.error("Set GODOT_BIN to your Godot executable path and run this script again.");
  process.exit(1);
}

syncFrontendPixelIslandAssets();
rmSync(exportDir, { recursive: true, force: true });
mkdirSync(exportDir, { recursive: true });

const result = spawnSync(
  godotBin,
  ["--headless", "--path", "godot", "--export-release", "Web", exportTarget],
  { cwd: projectRoot, stdio: "inherit" }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const requiredFiles = ["index.html", "index.js", "index.wasm", "index.pck"];
const missingFiles = requiredFiles.filter((fileName) => !existsSync(path.join(exportDir, fileName)));

if (missingFiles.length > 0) {
  console.error(`Godot Web export is missing: ${missingFiles.join(", ")}`);
  process.exit(1);
}

console.log(`Godot Web export ready: ${exportDir}`);

function syncFrontendPixelIslandAssets() {
  const requiredSources = [
    path.join(sourceAssetRoot, "hangzhou-background.png"),
    path.join(sourceAssetRoot, "hangzhou-pack.json"),
    path.join(sourceAssetRoot, "hangzhou-sprites")
  ];
  const missingSources = requiredSources.filter((source) => !existsSync(source));

  if (missingSources.length > 0) {
    console.error(`Missing frontend pixel-island assets: ${missingSources.join(", ")}`);
    process.exit(1);
  }

  mkdirSync(godotAssetRoot, { recursive: true });
  mkdirSync(godotDataRoot, { recursive: true });
  copyFileSync(
    path.join(sourceAssetRoot, "hangzhou-background.png"),
    path.join(godotAssetRoot, "hangzhou-background.png")
  );
  rmSync(path.join(godotAssetRoot, "hangzhou-sprites"), { recursive: true, force: true });
  cpSync(
    path.join(sourceAssetRoot, "hangzhou-sprites"),
    path.join(godotAssetRoot, "hangzhou-sprites"),
    { recursive: true }
  );
  copyFileSync(
    path.join(sourceAssetRoot, "hangzhou-pack.json"),
    path.join(godotDataRoot, "hangzhou_pack.json")
  );
}
