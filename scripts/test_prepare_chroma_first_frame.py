import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw


REPO_ROOT = Path(__file__).resolve().parents[1]
TOOL_PATH = REPO_ROOT / "tools" / "prepare_chroma_first_frame.py"


def load_tool():
    spec = importlib.util.spec_from_file_location("prepare_chroma_first_frame", TOOL_PATH)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class PrepareChromaFirstFrameTest(unittest.TestCase):
    def test_composites_transparent_png_over_exact_green_background(self) -> None:
        tool = load_tool()

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp = Path(tmp_dir)
            source = tmp / "door.png"
            output = tmp / "door-first-frame.png"

            image = Image.new("RGBA", (4, 4), (0, 0, 0, 0))
            draw = ImageDraw.Draw(image)
            draw.rectangle((1, 1, 2, 2), fill=(120, 72, 48, 255))
            image.save(source)

            report = tool.prepare_chroma_first_frame(source, output)

            with Image.open(output) as prepared:
                self.assertEqual(prepared.mode, "RGB")
                self.assertEqual(prepared.size, (4, 4))
                self.assertEqual(prepared.getpixel((0, 0)), (0, 255, 0))
                self.assertEqual(prepared.getpixel((1, 1)), (120, 72, 48))
            self.assertEqual(report["background_color"], "#00FF00")
            self.assertEqual(report["source_size"], [4, 4])
            self.assertEqual(report["output_size"], [4, 4])

    def test_fit_foreground_scales_alpha_bbox_with_padding(self) -> None:
        tool = load_tool()

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp = Path(tmp_dir)
            source = tmp / "small-door.png"
            output = tmp / "small-door-first-frame.png"

            image = Image.new("RGBA", (20, 20), (0, 0, 0, 0))
            draw = ImageDraw.Draw(image)
            draw.rectangle((8, 8, 11, 11), fill=(172, 96, 54, 255))
            image.save(source)

            report = tool.prepare_chroma_first_frame(
                source,
                output,
                canvas_size=(10, 10),
                layout_mode="fit-foreground",
                padding=2,
            )

            with Image.open(output) as prepared:
                self.assertEqual(prepared.mode, "RGB")
                self.assertEqual(prepared.size, (10, 10))
                self.assertEqual(prepared.getpixel((0, 0)), (0, 255, 0))
                center = prepared.getpixel((5, 5))
                self.assertGreater(center[0], 120)
                self.assertLess(center[1], 140)
                self.assertLess(center[2], 100)
            self.assertEqual(report["foreground_bbox"], [6, 6, 14, 14])
            self.assertEqual(report["paste_location"], [0, 0])


if __name__ == "__main__":
    unittest.main()
