import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw


REPO_ROOT = Path(__file__).resolve().parents[1]


class MemoryRoomPipelineTest(unittest.TestCase):
    def test_memory_room_tool_flow_builds_map_metadata_and_mirror_outputs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp = Path(tmp_dir)
            background = tmp / "background.png"
            atlas = tmp / "atlas.png"
            output_root = tmp / "public-assets"
            mirror_root = tmp / "godot-assets"

            Image.new("RGB", (800, 450), (238, 229, 210)).save(background)

            atlas_image = Image.new("RGB", (1200, 220), (255, 0, 255))
            draw = ImageDraw.Draw(atlas_image)
            colors = [
                (118, 77, 42),
                (190, 143, 85),
                (90, 155, 175),
                (220, 190, 135),
                (80, 95, 110),
                (160, 120, 70),
            ]
            for index, color in enumerate(colors):
                left = 40 + index * 190
                draw.rectangle((left, 50, left + 95, 165), fill=color)
                draw.rectangle((left + 30, 25, left + 125, 95), fill=tuple(min(255, value + 35) for value in color))
            atlas_image.save(atlas)

            result = subprocess.run(
                [
                    sys.executable,
                    "scripts/pixel_island_pipeline.py",
                    "--memory-room",
                    "--validate",
                    "--slug",
                    "memory-room-test",
                    "--raw-background",
                    str(background),
                    "--raw-atlas",
                    str(atlas),
                    "--output-root",
                    str(output_root),
                    "--mirror-root",
                    str(mirror_root),
                ],
                cwd=REPO_ROOT,
                capture_output=True,
                text=True,
            )

            self.assertEqual(result.returncode, 0, result.stderr + result.stdout)

            pack = json.loads((output_root / "memory-room-test-pack.json").read_text())
            room_map = json.loads((output_root / "memory-room-test-map.json").read_text())
            tool_flow = json.loads((output_root / "memory-room-test-tool-flow.json").read_text())

            self.assertEqual(pack["spriteCount"], 6)
            self.assertEqual(room_map["visualModel"], "layered_raster")
            self.assertEqual(room_map["runtimeObjectModel"], "interactive_entities")
            self.assertEqual(room_map["collisionModel"], "trigger_zones")
            self.assertEqual(len(room_map["layers"]), 7)
            self.assertEqual([layer["key"] for layer in room_map["layers"][1:]], [
                "bookshelf",
                "map-wall",
                "notes-desk",
                "photo-album",
                "audio-machine",
                "timeline-table",
            ])
            self.assertTrue(all(layer["hitArea"]["shape"] == "rect" for layer in room_map["layers"][1:]))

            self.assertEqual(tool_flow["entrypoint"], "scripts/pixel_island_pipeline.py --memory-room")
            self.assertEqual(tool_flow["map"], "/assets/generated/v2/memory-room-test-map.json")
            self.assertIn("compose-layered-map", [step["id"] for step in tool_flow["steps"]])
            self.assertIn("validate-output-contract", [step["id"] for step in tool_flow["steps"]])

            self.assertTrue((mirror_root / "memory-room-test-map.json").exists())
            self.assertTrue((mirror_root / "memory-room-test-tool-flow.json").exists())


if __name__ == "__main__":
    unittest.main()
