"""Generate non-destructive single-frame candidates from target-animal references."""

import argparse
from pathlib import Path

from regen_frames import edit, fal_key, rembg_save


ASSETS = Path(r"C:\Users\karent\Documents\Software\personal\yuna-pet-game\src\assets")
CANDIDATES = Path(__file__).resolve().parent / "candidates"

JOBS = {
    "wolfwelpe_sleep_A": {
        "anchor": "wolfwelpe_idle_A.png",
        "prompt": (
            "Show this same exact young wolf pup sleeping peacefully, curled up in a compact ball "
            "on the ground with eyes closed and its fluffy tail wrapped naturally beside its body. "
            "FULL BODY visible, wide shot, generous padding. Preserve the silver-grey fur, amber-eye "
            "character identity, pointed wolf ears, muzzle shape, proportions and high-quality 3D "
            "animated-film style from the reference. It must remain a grey wolf pup, absolutely not "
            "a brown-and-white husky or dog. Plain pure white background, no prop, no text, no "
            "watermark, no extra animal."
        ),
    },
}

parser = argparse.ArgumentParser()
parser.add_argument("job", choices=JOBS)
args = parser.parse_args()

job = JOBS[args.job]
CANDIDATES.mkdir(exist_ok=True)
key = fal_key()
url = edit(key, job["prompt"], [str(ASSETS / job["anchor"])])
output = CANDIDATES / f"{args.job}.png"
rembg_save(key, url, str(output))
print(f"OK {output}")
print(f"PROMPT {job['prompt']}")
