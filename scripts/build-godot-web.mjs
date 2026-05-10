import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
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

const mainPackFileName = createVersionedPackCopy();
patchGodotHtmlForUrlArgs(mainPackFileName);
writeGodotWebBuildMetadata(mainPackFileName);
console.log(`Godot Web export ready: ${exportDir}`);

function syncFrontendPixelIslandAssets() {
  const requiredSources = [
    path.join(sourceAssetRoot, "hangzhou-background.png"),
    path.join(sourceAssetRoot, "hangzhou-pack.json"),
    path.join(sourceAssetRoot, "hangzhou-sprites"),
    path.join(sourceAssetRoot, "memory-room-background.png"),
    path.join(sourceAssetRoot, "memory-room-map.json"),
    path.join(sourceAssetRoot, "memory-room-pack.json"),
    path.join(sourceAssetRoot, "memory-room-interactions.json"),
    path.join(sourceAssetRoot, "memory-room-tool-flow.json"),
    path.join(sourceAssetRoot, "memory-room-sprites")
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

  for (const fileName of [
    "memory-room-atlas-raw.png",
    "memory-room-atlas.png",
    "memory-room-background.png",
    "memory-room-background.prompt.txt",
    "memory-room-interactions.json",
    "memory-room-map.json",
    "memory-room-pack.json",
    "memory-room-scene-preview.png",
    "memory-room-sprites-preview.png",
    "memory-room-tool-flow.json"
  ]) {
    const source = path.join(sourceAssetRoot, fileName);
    if (existsSync(source)) {
      copyFileSync(source, path.join(godotAssetRoot, fileName));
    }
  }
  rmSync(path.join(godotAssetRoot, "memory-room-sprites"), { recursive: true, force: true });
  cpSync(
    path.join(sourceAssetRoot, "memory-room-sprites"),
    path.join(godotAssetRoot, "memory-room-sprites"),
    { recursive: true }
  );
}

function createVersionedPackCopy() {
  const packPath = path.join(exportDir, "index.pck");
  const stat = statSync(packPath);
  const buildId = `${stat.size}-${Math.floor(stat.mtimeMs)}`;
  const fileName = `index.${buildId}.pck`;
  copyFileSync(packPath, path.join(exportDir, fileName));
  return fileName;
}

function writeGodotWebBuildMetadata(mainPackFileName) {
  writeFileSync(
    path.join(exportDir, "build.json"),
    `${JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        mainPack: mainPackFileName
      },
      null,
      2
    )}\n`
  );
}

function patchGodotHtmlForUrlArgs(mainPackFileName) {
  const indexPath = path.join(exportDir, "index.html");
  const html = readFileSync(indexPath, "utf8");

  const marker = /^const GODOT_CONFIG = (.+);$/m;
  const match = html.match(marker);
  if (!match) {
    console.error("Unable to patch Godot Web export: missing GODOT_CONFIG.");
    process.exit(1);
  }

  const config = JSON.parse(match[1]);
  config.mainPack = mainPackFileName;
  config.fileSizes = {
    ...(config.fileSizes ?? {}),
    [mainPackFileName]: statSync(path.join(exportDir, mainPackFileName)).size
  };
  const configLine = `const GODOT_CONFIG = ${JSON.stringify(config)};`;
  const patchedHtml = html.replace(match[0], configLine);
  if (patchedHtml.includes("GODOT_URL_PARAMS")) {
    writeFileSync(indexPath, patchedHtml);
    return;
  }

  const urlArgPatch = `${configLine}
const GODOT_URL_PARAMS = new URLSearchParams(window.location.search);
const GODOT_ROOM = GODOT_URL_PARAMS.get('room');
if (GODOT_ROOM) {
\tGODOT_CONFIG.args = [...(GODOT_CONFIG.args || []), '--room', GODOT_ROOM];
\tif (GODOT_ROOM === 'memory') {
\t\tGODOT_CONFIG.args.push('--world-slug', 'memory-room');
\t}
}`;
  writeFileSync(indexPath, patchedHtml.replace(configLine, urlArgPatch));
}
