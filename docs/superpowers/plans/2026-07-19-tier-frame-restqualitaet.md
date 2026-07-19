# Tier-Frame-Restqualität Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die verbleibenden sichtbaren Sprünge in drink/eat-A/B-Paaren beseitigen und den Wolfwelpen-Schlafkopf artgerecht korrigieren, ohne Spezies-, Stil-, Alpha- oder Precache-Regressions.

**Architecture:** Die vorhandenen fal-Generatoren bleiben der einzige Erzeugungspfad. Zunächst wird der Ist-Stand vollständig gesichtet, dann wird die Paar-Generierung an einem drink-Paar erprobt; nur bei besserer Flip-Ruhe wird sie auf die priorisierten drink/eat-Paare übertragen. Jeder akzeptierte Frame durchläuft rembg, geometrische Normalisierung, Quantisierung und visuelle Contact-Sheet-Abnahme.

**Tech Stack:** Python 3, Pillow, fal `nano-banana/edit`, fal `imageutils/rembg`, React/Vite/PWA-Build.

---

### Task 1: Ist-Stand und Zielauswahl

**Files:**
- Inspect: `src/assets/*_{drink,eat,sleep}_*.png`
- Generate: `tools/frames/sheet_*.png` (nicht committen)

- [ ] **Step 1:** `python tools/frames/contact_sheets.py` ausführen; erwartet werden zehn `OK ...sheet_<prefix>.png`-Zeilen.
- [ ] **Step 2:** Alle zehn Sheets visuell ansehen und die Restliste aus `docs/uebergabe-codex-bilder.md` gegen den realen Stand bestätigen.
- [ ] **Step 3:** Für die priorisierten Paare Größe, Bodenlinie, Blickrichtung, Körperhaltung, Spezies und Stil als Abnahmekriterien notieren.

### Task 2: Paar-Generierung als kontrolliertes Experiment

**Files:**
- Modify: `tools/frames/regen_retry.py`
- Create: temporäre Paarbilder außerhalb von `src/assets/`

- [ ] **Step 1:** Einen Job ergänzen, der nur das gute Zieltier als Referenz verwendet und ein zweigeteiltes A/B-Mini-Storyboard derselben Trinkbewegung erzeugt; beide Tiere müssen vollständig sichtbar und gleich skaliert sein.
- [ ] **Step 2:** Den Job für ein auffälliges drink-Paar ausführen und das Ergebnis zunächst außerhalb der produktiven Assets sichern.
- [ ] **Step 3:** Das Paar mittig in zwei Frames teilen, beide Frames per fal-rembg freistellen und als Kandidaten normalisieren.
- [ ] **Step 4:** Kandidat und Ist-Stand als Flip/Side-by-side prüfen. Paar-Ansatz nur übernehmen, wenn Spezies, Körperform, Requisit und zeitliche Ruhe klar besser sind.
- [ ] **Step 5:** Bei unbrauchbarer Teilung den Paar-Ansatz verwerfen und auf zwei Einzel-Edits mit identischem Anker und minimaler Bewegungsdifferenz zurückfallen.

### Task 3: Priorisierte drink/eat-Paare und Wolfwelpen-Schlafkopf

**Files:**
- Modify: `tools/frames/regen_retry.py`
- Modify: `src/assets/meerkat_drink_A.png`
- Modify: `src/assets/meerkat_drink_B.png`
- Modify: `src/assets/tomwelpe_drink_A.png`
- Modify: `src/assets/tomwelpe_drink_B.png`
- Modify: `src/assets/otterwelpe_drink_A.png`
- Modify: `src/assets/otterwelpe_drink_B.png`
- Modify: `src/assets/wolfwelpe_drink_A.png`
- Modify: `src/assets/wolfwelpe_drink_B.png`
- Modify: `src/assets/catwelpe_drink_A.png`
- Modify: `src/assets/catwelpe_drink_B.png`
- Modify: ausgewählte `src/assets/*_eat_A.png` und `src/assets/*_eat_B.png` nur bei bestätigtem sichtbarem Sprung
- Modify: `src/assets/wolfwelpe_sleep_A.png`

- [ ] **Step 1:** Pro Zielpaar denselben Zieltier-Anker und eine Full-body-Wide-shot-Anweisung verwenden; keine Hund-Pose als Bildreferenz einsetzen.
- [ ] **Step 2:** Nur Kandidaten übernehmen, deren A/B-Frames dieselbe Spezies, Fellzeichnung, Blickrichtung, Bodenlinie und fast dieselbe Körperhaltung zeigen.
- [ ] **Step 3:** Beim Erdmännchen keine herausgestreckte Zunge akzeptieren.
- [ ] **Step 4:** `wolfwelpe_sleep_A` nur aus einem grauen Wolfwelpen-Anker erzeugen; braun-weiße Husky-Zeichnung ablehnen.
- [ ] **Step 5:** Ersetzte Frames unmittelbar per `python tools/frames/normalize_frames.py` auf 600×600, gemeinsame Paar-Skalierung und 256 Farben bringen.

### Task 4: Vollständige Bild-QA

**Files:**
- Inspect: alle 150 `src/assets/<prefix>_<pose>.png`
- Generate: `tools/frames/sheet_*.png` (nicht committen)

- [ ] **Step 1:** `python tools/frames/contact_sheets.py` erneut ausführen.
- [ ] **Step 2:** Alle zehn Sheets vollständig ansehen; falsche Spezies, Close-ups, Stilbruch, Zungenfehler, Bodenlinien- und Größensprünge führen zur Nacharbeit.
- [ ] **Step 3:** Per Pillow prüfen: exakt 150 erwartete Frames, jeweils 600×600, Alpha/Transparenz vorhanden und Palette auf höchstens 256 Farben quantisiert.
- [ ] **Step 4:** Geänderte A/B-Paare als schnelle Flip-GIFs ansehen; sichtbares Springen führt zur Nacharbeit oder Rücknahme des schlechteren Kandidaten.

### Task 5: Build, Commit, Deploy und Live-Abnahme

**Files:**
- Verify: `dist/`
- Commit: ausschließlich freigegebene Generator-, Doku- und Asset-Änderungen

- [ ] **Step 1:** `npm run build` ausführen; erwartet wird ein erfolgreicher Vite/PWA-Build ohne Precache-Datei über dem konfigurierten 4-MB-Limit.
- [ ] **Step 2:** `git diff --stat` und `git diff --check` prüfen; Contact-Sheets und temporäre Kandidaten nicht committen.
- [ ] **Step 3:** Änderungen auf `main` committen und pushen, damit Vercel beide Domains aktualisiert.
- [ ] **Step 4:** Auf `https://yunasgames.vercel.app` und `https://yunasgames.klaus-arent.de` denselben neuen Bundle-Hash bestätigen.
- [ ] **Step 5:** Mehrere geänderte Assets von beiden Domains herunterladen und binär mit den lokalen Dateien vergleichen.
