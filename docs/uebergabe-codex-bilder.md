# Übergabe an Codex: Tier-Frames (Bild-Qualität & Konsistenz)

Stand: 19.07.2026, nach Commit 84d93d1. Autor: Claude Code (Fable).
Auftrag von Klaus: Die Bild-Seite (Frame-Qualität, Stil-Konsistenz, Animations-Ruhe)
übernimmt ab jetzt Codex.

## Projekt in 5 Zeilen

- Kinder-Haustier-PWA (React 18 + Vite + vite-plugin-pwa), Repo `strategiert/yunasgames`,
  lokal `C:\Users\karent\Documents\Software\personal\yuna-pet-game`.
- Live: https://yunasgames.vercel.app UND https://yunasgames.klaus-arent.de
  (ein Vercel-Projekt `yunasgames`, beide Domains identisch; Deploy = git push auf main).
- 5 wählbare Tiere: Hund/Katze/Erdmännchen/Otter/Wolf (`PET_TYPES` in `src/PetGame.jsx`).
- Pro Tier 2 Wachstumsstufen: Welpe (`<tier>welpe_*`, Level 1–3) und ausgewachsen
  (`<tier>_*`, ab Level 4). Hund heißt historisch `tom`/`tomwelpe`.
- Pro Stufe 15 Posen-Frames: `idle_A/B, happy_A/B, sad_A/B, eat_A/B, drink_A/B,
  toilet_A/B, sleep_A, play_A, clean_A` → 150 PNGs in `src/assets/`, 600×600,
  transparenter Hintergrund, 256-Farben-quantisiert.

## Wie die Animation funktioniert (wichtig für Konsistenz-Anforderungen)

`src/PetGame.jsx` → `getPetImage()`: Die Stimmung wählt ein A/B-Paar, ein
500-ms-Tick flippt A↔B (idle blinzelt nur jeden 7. Tick, `animTick % 7 === 6`).
Konsequenz: **A und B einer Pose müssen dasselbe Tier in fast derselben Pose
zeigen** (gleiche Größe, gleiche Bodenlinie, gleicher Stil) — sonst „springt"
das Tier sichtbar. Genau das war der Kinder-Bugreport vom 19.07.

## Werkzeuge (alle in `tools/frames/`, Python + PIL, kein npm nötig)

| Skript | Zweck |
|---|---|
| `contact_sheets.py` | Baut pro Tier-Stufe ein 5×3-Übersichtsbild aller 15 Frames. **Pflicht-QA: nach JEDER Generierung Sheets bauen und jedes Bild ansehen.** |
| `normalize_frames.py` | Alpha-BBox-Crop, A/B-Paare auf gleichen Maßstab, 600×600 unten-mittig, Quantisierung auf 256 Farben. **Nach jeder Neugenerierung über alles laufen lassen** (idempotent). Skaliert auch HOCH — nicht entfernen, sonst kommen Größensprünge zurück. |
| `regen_frames.py` | Batch-Neugenerierung mit Pose-Quellbild (tom-Frame) + Stil-Anker (guter Frame des Zieltiers). Defekt-Liste im `REGEN`-Dict. |
| `regen_retry.py` | Retry-Strategie für hartnäckige Fälle: NUR ein Bild des Zieltiers als Referenz, Pose ausschließlich als Textanweisung. |
| `gen_animals.py` | Ursprüngliches Batch-Skript (historisch, mit den bekannten Fehlern gelaufen). |
| `gen_sounds.py` | Tierstimmen-mp3s (ElevenLabs SFX via fal) — nicht Teil der Bild-Baustelle. |
| `tom_ref.jpeg`, `ref_*.jpeg` | Stil-Referenzen der 5 Tiere. |

Skripte enthalten absolute Pfade auf den Assets-Ordner — laufen von überall.
Vor Commit von Frame-Änderungen: `npm run build` (Precache-Größe im Log prüfen,
aktuell ~13 MB, `maximumFileSizeToCacheInBytes` ist 4 MB pro Datei).

## API-Zugang

fal-Key: `FAL_API_KEY` in `C:\Users\karent\.env` (von Klaus für dieses Projekt
genehmigt). Modelle: `fal-ai/nano-banana/edit` (Bild-Edit mit Referenzen,
~4 Cent/Bild) + `fal-ai/imageutils/rembg` (Freisteller). OpenAI-Key ist am
Billing-Limit — nicht verwenden.

## Fallen, die uns Stunden gekostet haben

1. **nano-banana behält die Spezies des Pose-Quellbilds.** Prompt „Replace the
   dog in image 1 with the meerkat from image 2" liefert regelmäßig wieder einen
   Hund — besonders bei sleep (zusammengerollt) und sad. Lösung, die funktioniert:
   `regen_retry.py`-Muster — Zieltier-Bild als EINZIGE Referenz, Pose nur als Text
   („Show this exact meerkat sleeping: curled up …").
2. **Close-up-Falle:** Bei eat/drink liefert das Modell gern Kopf-Nahaufnahmen.
   Immer „FULL BODY visible from the side, wide shot, the whole animal fits in
   frame" in den Prompt.
3. **rembg ist Pflicht** — nano-banana liefert JPEG ohne Alpha. Original-„.jpeg"-
   Altdateien im Repo sind in Wahrheit PNGs mit Alpha (Signatur prüfen).
4. **Quantisierung ist Pflicht** (macht `normalize_frames.py` mit): ohne sie
   explodiert der PWA-Precache (17 MB → 3 MB allein durch die ersten 150 Frames).
5. **Visuelle Sichtung ist nicht optional.** Der ursprüngliche Batch lief „grün"
   durch und hatte trotzdem 29 defekte Frames (9× falsches Tier). Ein „ok" im
   Skript-Log sagt nichts über den Bildinhalt. Contact-Sheets ansehen, jedes Bild.
6. **Nach Deploy:** Beide Domains pollen (Bundle-Hash), Stichproben-Assets per
   `cmp` gegen lokale Dateien. Minifier-Falle: Zahlen wie 30000 werden zu `3e4` —
   nur String-Marker greppen.

## Aktueller Qualitätsstand (nach 84d93d1)

Alle 150 Frames zeigen das richtige Tier im 3D-Look, Größen normalisiert.
Bekannte Rest-Schwächen (= sinnvolle nächste Arbeitspakete):

- **drink_B mehrerer Tiere** (meerkat, tomwelpe, otterwelpe, wolfwelpe, catwelpe):
  gebückt-kompakte Trink-Pose, flippt gegen aufrechtes drink_A — als „Animation"
  lesbar, aber der größte verbliebene Konsistenzbruch.
- **eat_A vs eat_B** teils unterschiedliche Körperhaltung (aufrecht vs. vierbeinig).
- **meerkat drink_B**: heraushängende Zunge, wirkt leicht deplatziert.
- **wolfwelpe sleep_A**: Kopf wirkt eher Husky-braun-weiß statt grau.
- **A/B-Paare sind nachträglich zusammengesetzt**, nicht als echtes Paar generiert.
  Ideal wäre pro Pose EIN Generierungsaufruf, der A und B als Mini-Sequenz erzeugt
  (z. B. „two frames of the same animation, side by side" und dann splitten) —
  nie ausprobiert, könnte die Flip-Ruhe deutlich verbessern.

## Spielregeln

- Nicht gleichzeitig mit anderen Agenten schreibend im Working Tree (Klaus-Regel).
- Commits auf main, push = Deploy auf beide Domains. Nach Push live verifizieren.
- Alte Originale der ersetzten Frames liegen als Backup im (flüchtigen) Scratchpad
  `old_frames/` der Claude-Session — im Zweifel: git history hat alles.
