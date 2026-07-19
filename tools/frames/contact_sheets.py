# Contact-Sheets: pro Tier-Prefix ein 4x9-Grid mit Frame-Labels
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "src" / "assets"
OUT = Path(__file__).resolve().parent

MOODS = ["idle", "happy", "sad", "eat", "drink", "toilet", "sleep", "play", "clean"]
POSES = [f"{mood}_{frame}" for mood in MOODS for frame in "ABCD"]
PREFIXES = ["tom","tomwelpe","cat","catwelpe","meerkat","meerkatwelpe",
            "otter","otterwelpe","wolf","wolfwelpe"]

CELL = 220
COLS, ROWS = 4, 9

for prefix in PREFIXES:
    sheet = Image.new("RGB", (COLS*CELL, ROWS*CELL+24), "white")
    draw = ImageDraw.Draw(sheet)
    for i, pose in enumerate(POSES):
        col, row = i % COLS, i // COLS
        x, y = col*CELL, row*CELL
        p = ASSETS / f"{prefix}_{pose}.png"
        if p.exists():
            im = Image.open(p).convert("RGBA")
            im.thumbnail((CELL-10, CELL-26))
            bg = Image.new("RGBA", (CELL, CELL), "white")
            bg.paste(im, ((CELL-im.width)//2, CELL-26-im.height), im)
            sheet.paste(bg.convert("RGB"), (x, y))
        else:
            draw.text((x+10, y+CELL//2), "FEHLT", fill="red")
        draw.text((x+6, y+CELL-20), pose, fill="black")
        draw.rectangle([x, y, x+CELL-1, y+CELL-1], outline="#ccc")
    draw.text((4, ROWS*CELL+4), prefix, fill="black")
    out = OUT / f"sheet_{prefix}.png"
    sheet.save(out)
    print("OK", out)
