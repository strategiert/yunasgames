"""Recolor wolf frames to Wolwi's markings without touching production assets."""

import argparse
import time
from pathlib import Path

from pair_frames import build_recolor_prompt, build_sequence_prompts
from regen_frames import edit, fal_key, rembg_save


ASSETS = Path(r"C:\Users\karent\Documents\Software\personal\yuna-pet-game\src\assets")
CANDIDATES = Path(__file__).resolve().parent / "candidates" / "wolwi"
POSES = [
    "idle_A", "idle_B", "happy_A", "happy_B", "sad_A", "sad_B",
    "eat_A", "eat_B", "drink_A", "drink_B", "toilet_A", "toilet_B",
    "sleep_A", "play_A", "clean_A",
]
VALID_NAMES = [f"{prefix}_{pose}" for prefix in ("wolf", "wolfwelpe") for pose in POSES]
EXTRA_CONSTRAINTS = {
    "wolf_idle_B": "Keep both eyes fully closed with no iris or pupil visible.",
    "wolf_happy_B": (
        "Keep both eyes fully closed with no iris or pupil visible. Keep both red floating "
        "hearts complete and in their exact original positions."
    ),
    "wolf_drink_A": (
        "Keep the small solid-black drinking cup at the mouth and the lifted paw exactly as in "
        "the source; do not remove it, recolor it or turn it into a paw."
    ),
    "wolfwelpe_eat_B": (
        "Keep the entire brown food bowl full of kibble at the lower right, fully visible in its "
        "exact original position."
    ),
    "wolfwelpe_sleep_A": "Keep both sleeping eyes fully closed with no iris or pupil visible.",
}
BLINK_FROM = {"wolf_idle_B": "wolf_idle_A.png"}

parser = argparse.ArgumentParser()
parser.add_argument("name", nargs="?", choices=VALID_NAMES)
parser.add_argument("--all", action="store_true")
args = parser.parse_args()
if not args.all and not args.name:
    parser.error("name oder --all erforderlich")

names = VALID_NAMES if args.all else [args.name]
CANDIDATES.mkdir(parents=True, exist_ok=True)
key = fal_key()

for name in names:
    output = CANDIDATES / f"{name}.png"
    if args.all and output.exists():
        print(f"SKIP {output}", flush=True)
        continue
    source = CANDIDATES / BLINK_FROM[name] if name in BLINK_FROM else ASSETS / f"{name}.png"
    stage = "wolf pup" if name.startswith("wolfwelpe_") else "adult wolf"
    if name in BLINK_FROM:
        prompt = build_sequence_prompts(stage, "", "")[1]
    else:
        prompt = build_recolor_prompt(stage, EXTRA_CONSTRAINTS.get(name, ""))
    started = time.time()
    for attempt in (1, 2, 3):
        try:
            url = edit(key, prompt, [str(source)])
            rembg_save(key, url, str(output))
            print(f"OK {name} in {time.time() - started:.0f}s", flush=True)
            break
        except Exception as error:
            detail = getattr(error, "read", lambda: b"")()
            print(f"Versuch {attempt} {name}: {error} {detail[:150]}", flush=True)
            if attempt == 3:
                raise
            time.sleep(3)

print("FERTIG", flush=True)
