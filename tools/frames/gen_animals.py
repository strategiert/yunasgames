# Neue Tierarten im selben 3D-Look wie der Tom-Hund.
# Modus "ref":   je Tier 1 Referenzbild aus tom_ref (Stil-Anker)
# Modus <tier>:  30 Posen (15 adult aus tom_*, 15 welpe aus tomwelpe_*)
import base64, json, os, sys, time, urllib.request
from PIL import Image

ENV = r"C:\Users\karent\.env"
ASSETS = r"C:\Users\karent\Documents\Software\personal\yuna-pet-game\src\assets"
SCRATCH = r"C:\Users\karent\AppData\Local\Temp\claude\C--Users-karent\fff351c4-d121-4862-a72a-b5bac2c4fb2b\scratchpad"
TOM_REF = os.path.join(SCRATCH, "tom_ref.jpeg")

POSES = ["idle_A", "idle_B", "happy_A", "happy_B", "sad_A", "sad_B", "eat_A", "eat_B",
         "drink_A", "drink_B", "sleep_A", "play_A", "toilet_A", "toilet_B", "clean_A"]

ANIMALS = {
    "cat": "a cute domestic cat with soft grey-and-white tabby fur and bright green eyes",
    "meerkat": "a cute meerkat with sandy tan fur, dark eye patches and an upright curious posture",
    "otter": "a cute river otter with sleek brown fur, a lighter belly and tiny round ears",
    "wolf": "a cute young wolf with fluffy silver-grey fur, amber eyes and pointy ears",
}

def fal_key():
    with open(ENV, encoding="utf-8", errors="ignore") as f:
        for line in f:
            if line.startswith("FAL_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("kein FAL_API_KEY")

def data_uri(path):
    mime = "image/jpeg" if path.endswith(".jpeg") else "image/png"
    with open(path, "rb") as f:
        return f"data:{mime};base64," + base64.b64encode(f.read()).decode()

def post_json(key, url, payload, timeout=180):
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

def gen_refs(key):
    for animal, desc in ANIMALS.items():
        dst = os.path.join(SCRATCH, f"ref_{animal}.jpeg")
        if os.path.exists(dst):
            print(f"skip ref_{animal}"); continue
        prompt = (f"Create {desc} as a game character in the exact same art style, pose, "
                  "proportions, lighting and camera angle as this dog character (high-quality "
                  "3D animated movie render, big glossy expressive eyes, soft detailed fur). "
                  "Plain pure white background, no text, no watermark.")
        url = edit(key, prompt, [TOM_REF])
        with urllib.request.urlopen(url, timeout=120) as r:
            open(dst, "wb").write(r.read())
        print(f"ok ref_{animal}")

def gen_animal(key, animal):
    ref = os.path.join(SCRATCH, f"ref_{animal}.jpeg")
    desc = ANIMALS[animal]
    for pose in POSES:
        for stage, src_prefix, dst_prefix, extra in [
            ("adult", "tom_", f"{animal}_", ""),
            ("welpe", "tomwelpe_", f"{animal}welpe_", " Make it the baby version: smaller, rounder, proportionally bigger head."),
        ]:
            src_ext = ".png"
            src = os.path.join(ASSETS, f"{src_prefix}{pose}{src_ext}")
            dst = os.path.join(ASSETS, f"{dst_prefix}{pose}.png")
            name = os.path.basename(dst)
            if os.path.exists(dst):
                print(f"skip {name}"); continue
            prompt = (f"Replace the dog in the first image with the {animal} character from the "
                      f"second image ({desc}): same art style, and keep exactly the pose, activity, "
                      "expression, props and viewing direction of the first image. Plain pure white "
                      f"background, no text, no watermark.{extra}")
            t0 = time.time()
            for attempt in (1, 2):
                try:
                    rembg_save(key, edit(key, prompt, [src, ref]), dst)
                    print(f"ok {name}: {os.path.getsize(dst)//1024} KB in {time.time()-t0:.0f}s", flush=True)
                    break
                except Exception as e:
                    detail = getattr(e, "read", lambda: b"")()
                    print(f"Versuch {attempt} {name}: {e} {detail[:150]}", flush=True)

if __name__ == "__main__":
    key = fal_key()
    mode = sys.argv[1]
    if mode == "ref":
        gen_refs(key)
    else:
        gen_animal(key, mode)
