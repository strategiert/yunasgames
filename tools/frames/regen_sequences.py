"""Generate non-destructive A->B animation candidates from one target-animal anchor."""

import argparse
import urllib.request
from pathlib import Path

from pair_frames import build_sequence_prompts
from regen_frames import edit, fal_key, rembg_save


ASSETS = Path(r"C:\Users\karent\Documents\Software\personal\yuna-pet-game\src\assets")
CANDIDATES = Path(__file__).resolve().parent / "candidates"

JOBS = {
    "meerkat_drink": {
        "anchor": "meerkat_idle_B.png",
        "species": "meerkat with sandy tan fur and dark eye patches",
        "posture": "standing upright on two legs and leaning its upper body slightly forward",
        "activity": "drinking neatly from a small pale-blue ceramic cup on the floor",
        "constraint": "No visible tongue; do not crouch; do not become four-legged",
    },
    "tomwelpe_drink": {
        "anchor": "tomwelpe_idle_A.png",
        "species": "Jack Russell terrier puppy with white fur and brown patches",
        "posture": "standing on all four paws in a three-quarter side view with its head lowered",
        "activity": "drinking neatly from a small pale-blue ceramic cup on the floor",
        "constraint": "No visible tongue; no close-up; keep puppy proportions",
    },
    "catwelpe_drink": {
        "anchor": "catwelpe_idle_A.png",
        "species": "grey-and-white tabby kitten with bright green eyes",
        "posture": "standing on all four paws in a three-quarter side view with its head lowered",
        "activity": "drinking neatly from a small pale-blue ceramic cup on the floor",
        "constraint": "No visible tongue; no close-up; keep kitten proportions",
    },
    "otterwelpe_drink": {
        "anchor": "otterwelpe_idle_A.png",
        "species": "river otter pup with brown fur, lighter belly and tiny round ears",
        "posture": "standing semi-upright with its upper body leaning slightly forward",
        "activity": "drinking neatly from a small pale-blue ceramic cup on the floor",
        "constraint": "No visible tongue; no close-up; keep otter proportions",
    },
    "wolfwelpe_drink": {
        "anchor": "wolfwelpe_idle_A.png",
        "species": "young wolf pup with fluffy silver-grey fur, amber eyes and pointy ears",
        "posture": "standing on all four paws in a three-quarter side view with its head lowered",
        "activity": "drinking neatly from a small pale-blue ceramic cup on the floor",
        "constraint": "No visible tongue; no close-up; remain a grey wolf, not a husky or dog",
    },
}

parser = argparse.ArgumentParser()
parser.add_argument("job", choices=JOBS)
args = parser.parse_args()

job = JOBS[args.job]
CANDIDATES.mkdir(exist_ok=True)
prompt_a, prompt_b = build_sequence_prompts(
    job["species"], job["posture"], job["activity"], job["constraint"]
)
key = fal_key()

url_a = edit(key, prompt_a, [str(ASSETS / job["anchor"])])
raw_a = CANDIDATES / f"{args.job}_sequence_A_raw.jpg"
with urllib.request.urlopen(url_a, timeout=120) as response:
    raw_a.write_bytes(response.read())

url_b = edit(key, prompt_b, [str(raw_a)])
raw_b = CANDIDATES / f"{args.job}_sequence_B_raw.jpg"
with urllib.request.urlopen(url_b, timeout=120) as response:
    raw_b.write_bytes(response.read())

for suffix, url in (("A", url_a), ("B", url_b)):
    output = CANDIDATES / f"{args.job}_sequence_{suffix}.png"
    rembg_save(key, url, str(output))
    print(f"OK {output}")

print(f"PROMPT_A {prompt_a}")
print(f"PROMPT_B {prompt_b}")
