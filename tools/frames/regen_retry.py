# Retry hartnaeckiger Frames: Quelle = gutes Bild des ZIELTIERS, Pose nur per Text.
import base64, json, os, sys, time, urllib.request
from PIL import Image

ENV = r"C:\Users\karent\.env"
ASSETS = r"C:\Users\karent\Documents\Software\personal\yuna-pet-game\src\assets"

# dst -> (Quelle im Assets-Ordner, Edit-Anweisung)
JOBS = {
    "meerkat_sad_A": ("meerkat_idle_A",
        "Make this meerkat look sad: droopy shoulders, sad glossy teary eyes, corners of the "
        "mouth down, head hanging slightly. Keep it standing upright on two legs, same slim "
        "body, same 3D style."),
    "meerkat_sad_B": ("meerkat_idle_B",
        "Make this meerkat look sad: droopy shoulders, sad glossy teary eyes, corners of the "
        "mouth down, head hanging a bit lower. Keep it standing upright on two legs, same slim "
        "body, same 3D style."),
    "meerkat_sleep_A": ("meerkat_idle_B",
        "Show this exact meerkat sleeping: curled up in a ball on the ground, eyes closed, "
        "peaceful expression, tail wrapped around its body. Same fur colors, same 3D style. "
        "The animal must remain a meerkat with sandy tan fur and dark eye patches."),
    "tomwelpe_eat_A": ("tomwelpe_idle_A",
        "Show this exact Jack Russell terrier puppy eating: FULL BODY visible from the side, all "
        "four legs on the floor, head lowered towards a small brown bowl of kibble on the floor. "
        "Wide shot, the whole puppy fits in frame. Same white fur with brown patches, same 3D "
        "style. It must stay a dog."),
    "tomwelpe_drink_B": ("tomwelpe_idle_A",
        "Show this exact Jack Russell terrier puppy drinking: FULL BODY visible from the side, all "
        "four legs on the floor, lapping with its tongue from a small cup of milk on the floor. "
        "Wide shot, the whole puppy fits in frame. Same white fur with brown patches, same 3D "
        "style. It must stay a dog."),
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

key = fal_key()
only = sys.argv[1] if len(sys.argv) > 1 else None
for name, (src_name, instr) in JOBS.items():
    if only and name != only:
        continue
    src = os.path.join(ASSETS, f"{src_name}.png")
    dst = os.path.join(ASSETS, f"{name}.png")
    prompt = instr + " Plain pure white background, no text, no watermark."
    t0 = time.time()
    for attempt in (1, 2, 3):
        try:
            d = post_json(key, "https://fal.run/fal-ai/nano-banana/edit", {
                "prompt": prompt, "image_urls": [data_uri(src)],
                "num_images": 1, "output_format": "jpeg"})
            d2 = post_json(key, "https://fal.run/fal-ai/imageutils/rembg",
                           {"image_url": d["images"][0]["url"]})
            with urllib.request.urlopen(d2["image"]["url"], timeout=120) as r:
                open(dst, "wb").write(r.read())
            im = Image.open(dst)
            im.resize((375, round(im.height * 375 / im.width)), Image.LANCZOS).save(dst, optimize=True)
            print(f"ok {name} in {time.time()-t0:.0f}s", flush=True)
            break
        except Exception as e:
            detail = getattr(e, "read", lambda: b"")()
            print(f"Versuch {attempt} {name}: {e} {detail[:150]}", flush=True)
            time.sleep(3)
print("FERTIG", flush=True)
