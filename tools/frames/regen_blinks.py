"""Generate non-destructive B-frame blink candidates from an accepted A frame."""

import argparse
from pathlib import Path

from regen_frames import edit, fal_key, rembg_save


ASSETS = Path(r"C:\Users\karent\Documents\Software\personal\yuna-pet-game\src\assets")
CANDIDATES = Path(__file__).resolve().parent / "candidates"
JOBS = {
    "tomwelpe_eat_B": "tomwelpe_eat_A.png",
    "catwelpe_eat_B": "catwelpe_eat_A.png",
    "otterwelpe_eat_B": "otterwelpe_eat_A.png",
}
PROMPT = (
    "Change only the eyelids so both eyes are gently closed in a natural blink. Do not change "
    "the animal identity, species, fur pattern, head position, body pose, paws, tail, food bowl, "
    "camera, framing, scale, lighting, ground line or background. Keep the full body and entire "
    "food bowl visible. Plain pure white background, no text, no watermark, no extra animal."
)

parser = argparse.ArgumentParser()
parser.add_argument("job", choices=JOBS)
args = parser.parse_args()

CANDIDATES.mkdir(exist_ok=True)
key = fal_key()
url = edit(key, PROMPT, [str(ASSETS / JOBS[args.job])])
output = CANDIDATES / f"{args.job}.png"
rembg_save(key, url, str(output))
print(f"OK {output}")
print(f"PROMPT {PROMPT}")
