# Contact-Sheets: pro Tier-Prefix ein 5x3-Grid mit Frame-Labels
import os
from PIL import Image, ImageDraw

ASSETS = r"C:\Users\karent\Documents\Software\personal\yuna-pet-game\src\assets"
OUT = os.path.dirname(os.path.abspath(__file__))

POSES = ["idle_A","idle_B","happy_A","happy_B","sad_A","sad_B","eat_A","eat_B",
         "drink_A","drink_B","toilet_A","toilet_B","sleep_A","play_A","clean_A"]
PREFIXES = ["tom","tomwelpe","cat","catwelpe","meerkat","meerkatwelpe",
            "otter","otterwelpe","wolf","wolfwelpe"]

CELL = 220
COLS, ROWS = 5, 3

for prefix in PREFIXES:
    sheet = Image.new("RGB", (COLS*CELL, ROWS*CELL+24), "white")
    draw = ImageDraw.Draw(sheet)
    for i, pose in enumerate(POSES):
        col, row = i % COLS, i // COLS
        x, y = col*CELL, row*CELL
        p = os.path.join(ASSETS, f"{prefix}_{pose}.png")
        if os.path.exists(p):
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
    out = os.path.join(OUT, f"sheet_{prefix}.png")
    sheet.save(out)
    print("OK", out)
