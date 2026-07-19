# Frames geometrisch vereinheitlichen, damit der A/B-Flip nicht springt:
# 1. Alpha-BBox croppen
# 2. A/B-Paare: B auf Höhe von A skalieren (gleiche Pose, gleicher Maßstab)
# 3. Alle auf 600x600-Canvas, unten mittig (einheitliche Standfläche)
# 4. Auf 256 Farben requantisieren (Precache klein halten)
import os
from PIL import Image

ASSETS = r"C:\Users\karent\Documents\Software\personal\yuna-pet-game\src\assets"
PREFIXES = ["tom", "tomwelpe", "cat", "catwelpe", "meerkat", "meerkatwelpe",
            "otter", "otterwelpe", "wolf", "wolfwelpe"]
PAIRS = [("idle_A", "idle_B"), ("happy_A", "happy_B"), ("sad_A", "sad_B"),
         ("eat_A", "eat_B"), ("drink_A", "drink_B"), ("toilet_A", "toilet_B")]
SINGLES = ["sleep_A", "play_A", "clean_A"]
CANVAS = 600
MAX_DIM = 560
BOTTOM_PAD = 24

def load_cropped(path):
    im = Image.open(path).convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    return im.crop(bbox) if bbox else im

def place(im):
    # Auf Canvas einpassen: skaliert (auch HOCH — sonst bleiben klein generierte
    # Posen halb so gross wie idle und das Tier springt beim Stimmungswechsel)
    scale = min(MAX_DIM / im.width, MAX_DIM / im.height)
    w, h = round(im.width * scale), round(im.height * scale)
    im = im.resize((w, h), Image.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.paste(im, ((CANVAS - w) // 2, CANVAS - BOTTOM_PAD - h), im)
    return canvas

def save_quant(im, path):
    im.quantize(colors=256, method=Image.FASTOCTREE).save(path, optimize=True)

count = 0
for prefix in PREFIXES:
    for a, b in PAIRS:
        pa, pb = (os.path.join(ASSETS, f"{prefix}_{p}.png") for p in (a, b))
        if not (os.path.exists(pa) and os.path.exists(pb)):
            continue
        ia, ib = load_cropped(pa), load_cropped(pb)
        # B auf Maßstab von A bringen (gleiche Pose → Höhe als Anker)
        f = ia.height / ib.height
        ib = ib.resize((round(ib.width * f), ia.height), Image.LANCZOS)
        save_quant(place(ia), pa)
        save_quant(place(ib), pb)
        count += 2
    for s in SINGLES:
        ps = os.path.join(ASSETS, f"{prefix}_{s}.png")
        if not os.path.exists(ps):
            continue
        save_quant(place(load_cropped(ps)), ps)
        count += 1
print(f"normalisiert: {count} Frames")
