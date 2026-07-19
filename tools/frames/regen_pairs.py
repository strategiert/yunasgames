"""Generate non-destructive A/B storyboard candidates with one target-animal reference."""

import argparse
import urllib.request
from pathlib import Path

from PIL import Image

from pair_frames import build_pair_prompt, split_storyboard
from regen_frames import data_uri, edit, fal_key, post_json


ASSETS = Path(r"C:\Users\karent\Documents\Software\personal\yuna-pet-game\src\assets")
CANDIDATES = Path(__file__).resolve().parent / "candidates"

JOBS = {
    "meerkat_drink": {
        "anchor": "meerkat_idle_B.png",
        "species": "meerkat",
        "identity": "sandy tan fur, dark eye patches, slim upright two-legged body",
        "activity": "standing upright and drinking neatly from a small white cup on the floor",
        "motion": "the head and upper body lower only slightly closer to the same cup",
        "constraint": "no visible tongue; do not crouch; do not become four-legged",
    },
}

parser = argparse.ArgumentParser()
parser.add_argument("job", choices=JOBS)
parser.add_argument("--gutter", type=int, default=12)
args = parser.parse_args()

job = JOBS[args.job]
CANDIDATES.mkdir(exist_ok=True)
anchor = ASSETS / job["anchor"]
prompt = build_pair_prompt(
    job["species"],
    job["identity"],
    job["activity"],
    job["motion"],
    job["constraint"],
)

key = fal_key()
storyboard_url = edit(key, prompt, [str(anchor)])
with urllib.request.urlopen(storyboard_url, timeout=120) as response:
    storyboard = Image.open(response).convert("RGB")

storyboard_path = CANDIDATES / f"{args.job}_storyboard.jpg"
storyboard.save(storyboard_path, quality=95)
raw_a = CANDIDATES / f"{args.job}_A_raw.png"
raw_b = CANDIDATES / f"{args.job}_B_raw.png"
split_storyboard(storyboard, raw_a, raw_b, gutter=args.gutter)

for suffix, raw_path in (("A", raw_a), ("B", raw_b)):
    result = post_json(
        key,
        "https://fal.run/fal-ai/imageutils/rembg",
        {"image_url": data_uri(str(raw_path))},
    )
    output = CANDIDATES / f"{args.job}_{suffix}.png"
    with urllib.request.urlopen(result["image"]["url"], timeout=120) as response:
        output.write_bytes(response.read())
    with Image.open(output) as opened:
        image = opened.convert("RGBA")
    width = 375
    image.resize((width, round(image.height * width / image.width)), Image.LANCZOS).save(
        output, optimize=True
    )
    print(f"OK {output}")

print(f"PROMPT {prompt}")
