import { mkdir, writeFile } from "node:fs/promises";
import { godotWorldState } from "../src/data/godotWorldState";

const targets = ["public/godot/world_state.json", "godot/data/world_state.json"];
const payload = `${JSON.stringify(godotWorldState, null, 2)}\n`;

for (const target of targets) {
  const dir = target.split("/").slice(0, -1).join("/");
  await mkdir(dir, { recursive: true });
  await writeFile(target, payload, "utf-8");
}

console.log(`Exported Godot world state to ${targets.join(" and ")}`);
