# Wolwi-Farbgebung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle Wolf- und Wolfwelpen-Frames erhalten Wolwis schwarz-weiße Fellzeichnung und eisblaue Augen, ohne Posen, Requisiten oder A/B-Ruhe zu verändern.

**Architecture:** Jeder vorhandene Wolf-Frame bleibt die primäre Editierquelle; die drei Wolwi-Fotos dienen ausschließlich als Farb- und Zeichnungsreferenz. Generierungen landen zuerst in `tools/frames/candidates/wolwi/`. Erst visuell akzeptierte und normalisierte Frames ersetzen die 30 Produktivbilder.

**Tech Stack:** Python 3, Pillow, fal `nano-banana/edit`, fal `imageutils/rembg`, React/Vite/PWA.

---

### Task 1: Farb-Pilot

**Files:**
- Modify: `tools/frames/pair_frames.py`
- Modify: `tools/frames/test_pair_frames.py`
- Create: `tools/frames/regen_wolwi_colors.py`
- Generate: `tools/frames/candidates/wolwi/wolfwelpe_idle_A.png`

- [ ] **Step 1:** Einen fehlschlagenden Test für einen Prompt schreiben, der ausschließlich Fellzeichnung und Augenfarbe ändern darf.
- [ ] **Step 2:** Den Test ausführen und den erwarteten Import-/Assertion-Fehler bestätigen.
- [ ] **Step 3:** Prompt-Helfer und nicht-destruktiven Generator implementieren: Zielframe zuerst, Wolwi-Fotos danach; Posen, Form, Ausdruck, Requisiten, Kamera und Hintergrund sperren.
- [ ] **Step 4:** `wolfwelpe_idle_A` als Pilot erzeugen, freistellen und visuell gegen die Fotos sowie den Originalframe prüfen.
- [ ] **Step 5:** Nur fortfahren, wenn Oberkopf/Rücken/Schultern anthrazit-schwarz, Gesicht/Schnauze/Brust/Bauch/Pfoten cremeweiß und die Augen eisblau sind.

### Task 2: Alle Wolf-Frames umfärben

**Files:**
- Modify: 15 `src/assets/wolf_*.png`
- Modify: 15 `src/assets/wolfwelpe_*.png`

- [ ] **Step 1:** Alle 30 Frames einzeln aus dem jeweiligen Originalframe plus denselben drei Wolwi-Farbreferenzen erzeugen.
- [ ] **Step 2:** Jeden Kandidaten auf richtige Spezies, unveränderte Pose, vollständiges Requisit, gleiche Blickrichtung und konsistente Wolwi-Zeichnung prüfen.
- [ ] **Step 3:** A/B-Paare nebeneinander prüfen; unruhige oder formveränderte Kandidaten gezielt erneut erzeugen.
- [ ] **Step 4:** Nur akzeptierte Kandidaten nach `src/assets/` übernehmen.
- [ ] **Step 5:** `python tools/frames/normalize_frames.py` ausführen und anschließend ausschließlich die 30 Wolf-Dateien als beabsichtigten Diff behalten.

### Task 3: Bild-QA und Veröffentlichung

**Files:**
- Inspect: `tools/frames/sheet_wolf.png`
- Inspect: `tools/frames/sheet_wolfwelpe.png`

- [ ] **Step 1:** Beide Contact-Sheets neu erzeugen und vollständig visuell prüfen.
- [ ] **Step 2:** Automatisch prüfen: 150/150 Frames vorhanden; Wolf-Frames 600×600, transparent, palettiert und höchstens 256 Farben.
- [ ] **Step 3:** Unit-Tests, `py_compile`, `git diff --check` und `npm run build` erfolgreich ausführen.
- [ ] **Step 4:** Commit auf `main` pushen und auf beiden Domains denselben neuen Bundle-Stand bestätigen.
- [ ] **Step 5:** Mindestens vier geänderte Wolf-Assets pro Domain SHA-256-genau mit lokal vergleichen.
