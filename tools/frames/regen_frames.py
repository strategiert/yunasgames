# Kaputte Frames neu generieren (Sichtung 19.07.: falsches Tier / Flat-Stil / deformiert).
# Phase A: tom_toilet_A + tom_sleep_A (Flat -> 3D), da Quellposen fuer alle Tiere.
# Phase B: alle uebrigen; Quelle = tom(-welpe)-Frame gleicher Pose, Stil-Anker = guter Frame des Zieltiers.
import base64, json, os, sys, time, urllib.request
from PIL import Image

ENV = r"C:\Users\karent\.env"
ASSETS = r"C:\Users\karent\Documents\Software\personal\yuna-pet-game\src\assets"
SCRATCH = r"C:\Users\karent\AppData\Local\Temp\claude\C--Users-karent\fff351c4-d121-4862-a72a-b5bac2c4fb2b\scratchpad"
OLD = os.path.join(SCRATCH, "old_frames")
os.makedirs(OLD, exist_ok=True)

DESCS = {
    "tom": "cute Jack Russell terrier dog with white fur and brown patches",
    "cat": "cute domestic cat with soft grey-and-white tabby fur and bright green eyes",
    "meerkat": "cute meerkat with sandy tan fur, dark eye patches, slim upright posture standing on two legs",
    "otter": "cute river otter with sleek brown fur, a lighter belly and tiny round ears",
    "wolf": "cute young wolf with fluffy silver-grey fur, amber eyes and pointy ears",
}
# Stil-Anker: nachweislich guter Frame je Prefix (Sichtung Contact-Sheets)
ANCHOR = {
    "tom": "idle_A", "tomwelpe": "idle_A",
    "cat": "idle_A", "catwelpe": "idle_A",
    "meerkat": "idle_B", "meerkatwelpe": "idle_A",
    "otter": "idle_A", "otterwelpe": "idle_A",
    "wolf": "idle_A", "wolfwelpe": "idle_A",
}
REGEN = {
    "tom": ["toilet_A", "sleep_A"],
    "cat": ["toilet_A", "sleep_A", "drink_A", "drink_B"],
    "meerkat": ["toilet_A", "toilet_B", "sleep_A", "idle_A", "sad_A", "sad_B", "happy_A", "eat_B", "drink_B"],
    "otter": ["toilet_A", "sleep_A", "sad_A"],
    "wolf": ["toilet_A", "sleep_A"],
    "tomwelpe": ["drink_B", "eat_A"],
    "catwelpe": ["sad_A", "drink_B"],
    "meerkatwelpe": ["happy_B"],
    "otterwelpe": ["sleep_A", "drink_B"],
    "wolfwelpe": ["sleep_A", "drink_B"],
}

def fal_key():
    with open(ENV, encoding="utf-8", errors="ignore") as f:
        for line in f:
            if line.startswith("FAL_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("kein FAL_API_KEY")

def data_uri(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()

def post_json(key, url, payload, timeout=240):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Key {key}"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)

def edit(key, prompt, image_paths):
    d = post_json(key, "https://fal.run/fal-ai/nano-banana/edit", {
        "prompt": prompt, "image_urls": [data_uri(p) for p in image_paths],
        "num_images": 1, "output_format": "jpeg"})
    return d["images"][0]["url"]

def rembg_save(key, url, dst, width=375):
    d2 = post_json(key, "https://fal.run/fal-ai/imageutils/rembg", {"image_url": url})
    with urllib.request.urlopen(d2["image"]["url"], timeout=120) as r:
        img = r.read()
    with open(dst, "wb") as f:
        f.write(img)
    im = Image.open(dst)
    im.resize((width, round(im.height * width / im.width)), Image.LANCZOS).save(dst, optimize=True)

def backup(path):
    b = os.path.join(OLD, os.path.basename(path))
    if os.path.exists(path) and not os.path.exists(b):
        os.replace(path, b)  # Original weg, damit Neugenerierung Pflicht ist

def gen_one(key, prefix, pose):
    animal = prefix.replace("welpe", "")
    desc = DESCS[animal]
    dst = os.path.join(ASSETS, f"{prefix}_{pose}.png")
    anchor = os.path.join(ASSETS, f"{prefix}_{ANCHOR[prefix]}.png")
    if os.path.exists(dst):
        print(f"skip {prefix}_{pose}", flush=True); return
    if prefix == "tom" and pose in ("toilet_A", "sleep_A"):
        # Phase A: Pose-Quelle = altes Flat-Bild aus Backup, Stil = tom idle
        src = os.path.join(OLD, f"tom_{pose}.png")
        prompt = ("Redraw the scene from the first image (a rough flat cartoon) as a "
                  "high-quality 3D animated movie render. The dog character must look exactly "
                  "like the dog in the second image: same 3D style, fur colors, face, big glossy "
                  "eyes, soft detailed fur. Keep the pose, activity and props of the first image. "
                  "Plain pure white background, no text, no watermark.")
    else:
        stage = "welpe" in prefix
        src_prefix = "tomwelpe" if stage else "tom"
        src = os.path.join(ASSETS, f"{src_prefix}_{pose}.png")
        # Quelle fehlt oder waere die eigene Datei -> Adult-Hund als Pose-Quelle
        if prefix == src_prefix or not os.path.exists(src):
            src = os.path.join(ASSETS, f"tom_{pose}.png")
        baby = (" It is a baby animal: smaller, rounder, proportionally bigger head."
                if stage else "")
        prompt = (f"Replace the dog in the first image with EXACTLY the {animal} character shown "
                  f"in the second image ({desc}). The output must show a {animal}, absolutely NOT "
                  "a dog. Copy the species, face, fur colors, body shape and 3D art style from the "
                  "second image. Keep only the pose, activity, expression, props and viewing "
                  "direction of the first image. Plain pure white background, no text, no "
                  f"watermark.{baby}")
    t0 = time.time()
    for attempt in (1, 2, 3):
        try:
            rembg_save(key, edit(key, prompt, [src, anchor]), dst)
            print(f"ok {prefix}_{pose}: {os.path.getsize(dst)//1024} KB in {time.time()-t0:.0f}s", flush=True)
            return
        except Exception as e:
            detail = getattr(e, "read", lambda: b"")()
            print(f"Versuch {attempt} {prefix}_{pose}: {e} {detail[:150]}", flush=True)
            time.sleep(3)
    print(f"FEHLER {prefix}_{pose}: aufgegeben", flush=True)

if __name__ == "__main__":
    key = fal_key()
    only = sys.argv[1] if len(sys.argv) > 1 else None
    # Backups zuerst (Originale rausnehmen; Anker-Frames bleiben unberuehrt)
    for prefix, poses in REGEN.items():
        for pose in poses:
            if only and f"{prefix}_{pose}" != only:
                continue
            backup(os.path.join(ASSETS, f"{prefix}_{pose}.png"))
    # Phase A zuerst
    for pose in REGEN["tom"]:
        if not only or only == f"tom_{pose}":
            gen_one(key, "tom", pose)
    for prefix, poses in REGEN.items():
        if prefix == "tom":
            continue
        for pose in poses:
            if only and f"{prefix}_{pose}" != only:
                continue
            gen_one(key, prefix, pose)
    print("FERTIG", flush=True)
