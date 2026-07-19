import tempfile
import unittest
from pathlib import Path

from PIL import Image

from tools.frames.pair_frames import (
    build_pair_prompt,
    build_sequence_prompts,
    split_storyboard,
)


class SplitStoryboardTests(unittest.TestCase):
    def test_splits_equal_halves_and_discards_center_gutter(self):
        source = Image.new("RGB", (210, 100), "white")
        source.paste(Image.new("RGB", (100, 100), "red"), (0, 0))
        source.paste(Image.new("RGB", (100, 100), "blue"), (110, 0))

        with tempfile.TemporaryDirectory() as tmp:
            left_path = Path(tmp) / "left.png"
            right_path = Path(tmp) / "right.png"
            split_storyboard(source, left_path, right_path, gutter=10)

            with Image.open(left_path) as opened_left:
                left = opened_left.copy()
            with Image.open(right_path) as opened_right:
                right = opened_right.copy()

        self.assertEqual((100, 100), left.size)
        self.assertEqual((100, 100), right.size)
        self.assertEqual((255, 0, 0), left.getpixel((99, 50)))
        self.assertEqual((0, 0, 255), right.getpixel((0, 50)))

    def test_pair_prompt_locks_identity_framing_and_small_motion(self):
        prompt = build_pair_prompt(
            "meerkat",
            "sandy tan fur and dark eye patches",
            "drinking from a small white cup",
            "head lowers slightly toward the cup",
            "no visible tongue",
        )

        self.assertIn("same exact meerkat", prompt)
        self.assertIn("FULL BODY", prompt)
        self.assertIn("only movement", prompt)
        self.assertIn("no visible tongue", prompt)

    def test_sequence_prompt_makes_b_a_single_change_from_a(self):
        prompt_a, prompt_b = build_sequence_prompts(
            "meerkat",
            "standing upright on two legs",
            "drinking from a cup on the floor",
            "no visible tongue",
        )

        self.assertIn("same exact meerkat", prompt_a)
        self.assertIn("eyes open", prompt_a)
        self.assertIn("Change only the eyelids", prompt_b)
        self.assertIn("Do not change", prompt_b)


if __name__ == "__main__":
    unittest.main()
