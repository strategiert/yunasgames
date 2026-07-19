# Echte Tierlaute via fal (ElevenLabs Sound Effects V2) -> src/assets/sounds/<tier>.mp3
import json, os, urllib.request

ENV = r"C:\Users\karent\.env"
OUT = r"C:\Users\karent\Documents\Software\personal\yuna-pet-game\src\assets\sounds"
os.makedirs(OUT, exist_ok=True)

SOUNDS = {
    "dog":     ("a cute small puppy barking twice, happy and friendly, clean recording, no background noise", 2),
    "cat":     ("a cute kitten meowing once, sweet and friendly, clean recording, no background noise", 2),
    "meerkat": ("a cute meerkat making high-pitched chirpy squeaking calls, small animal, clean recording, no background noise", 2),
    "otter":   ("a playful otter squeaking and chirping happily, cute small animal, clean recording, no background noise", 2),
    "wolf":    ("a cute young wolf puppy howling once, short and friendly, not scary, clean recording, no background noise", 3),
}

def fal_key():
    with open(ENV, encoding="utf-8", errors="ignore") as f:
        for line in f:
            if line.startswith("FAL_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("kein FAL_API_KEY")

key = fal_key()
for name, (text, dur) in SOUNDS.items():
    dst = os.path.join(OUT, f"{name}.mp3")
    if os.path.exists(dst):
        print("skip", name); continue
    payload = {"text": text, "duration_seconds": dur, "output_format": "mp3_44100_128"}
    req = urllib.request.Request("https://fal.run/fal-ai/elevenlabs/sound-effects/v2",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Key {key}"})
    with urllib.request.urlopen(req, timeout=180) as r:
        d = json.load(r)
    url = d.get("audio", {}).get("url") or d.get("audio_file", {}).get("url")
    if not url:
        print("FEHLER", name, json.dumps(d)[:300]); continue
    with urllib.request.urlopen(url, timeout=120) as r:
        open(dst, "wb").write(r.read())
    print("ok", name, os.path.getsize(dst) // 1024, "KB")
