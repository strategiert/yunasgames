# Zauber-Maler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kreativ-Studio in der Yunas-Games-App: Kind malt, KI (fal `nano-banana/edit`) interpretiert die Zeichnung und rendert sie in Pixar-, Comic- und Anime-Stil; Ergebnisse in lokaler IndexedDB-Galerie.

**Architecture:** Neue Fullscreen-Overlay-Komponente `MagicPainter.jsx` (Muster wie alle Spiele in `PetGame.jsx`), eine Vercel-Function `api/paint.js` als fal-Proxy (Key bleibt serverseitig), IndexedDB-Wrapper für Blob-Persistenz.

**Tech Stack:** React 18, Vite, Tailwind (bestehend); Vercel Serverless Function (Node, ESM); fal.ai REST (`https://fal.run/fal-ai/nano-banana/edit`).

## Global Constraints

- Kein neues npm-Package.
- Repo hat keine Test-Infrastruktur; Verifikation über `npm run build`, Node-Smoke-Test gegen fal und Live-Check nach Deploy.
- `FAL_API_KEY` niemals in Client-Code / `VITE_`-Variablen; nur `process.env.FAL_API_KEY` in der Function.
- Deutsch in der UI, kindgerecht.
- Unrelated geänderte Dateien (`src/JigsawGame.jsx`, `.claude/settings.local.json`, `tmpclaude-*`) NICHT committen.

---

### Task 1: fal-Proxy `api/paint.js` + `vercel.json` + Smoke-Test

**Files:**
- Create: `api/paint.js`
- Create: `vercel.json`
- Create (temporär, danach löschen oder behalten unter scripts/): `scripts/smoke-paint.mjs`

**Interfaces:**
- Produces: `POST /api/paint` mit JSON `{ image: string (data-URI PNG), style: "pixar"|"comic"|"anime" }` → `200 { url: string }` | `4xx/5xx { error: string }`

- [ ] **Step 1: Function schreiben**

```js
// api/paint.js
export const config = { maxDuration: 60 };

const BASE =
  "Look at this child's drawing. Interpret it generously and with imagination - " +
  "even rough scribbles depict something: a creature, a person, an animal, a vehicle, " +
  "a house or a landscape. Repaint the recognized subject as a beautiful, cheerful, " +
  "child-friendly picture. Keep the main elements and rough composition of the drawing. ";

const STYLE_PROMPTS = {
  pixar:
    BASE +
    "Style: high-quality 3D animated movie still (Pixar-like): soft cinematic lighting, " +
    "expressive characters, vibrant colors, gentle depth of field.",
  comic:
    BASE +
    "Style: colorful comic book illustration: bold clean outlines, flat vivid colors, " +
    "halftone shading, dynamic and fun.",
  anime:
    BASE +
    "Style: anime illustration: cel shading, expressive eyes on characters, " +
    "detailed painted background, bright and cheerful.",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { image, style } = req.body || {};
  if (!STYLE_PROMPTS[style]) {
    return res.status(400).json({ error: "Unknown style" });
  }
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return res.status(400).json({ error: "Invalid image" });
  }
  if (!process.env.FAL_API_KEY) {
    return res.status(500).json({ error: "FAL_API_KEY not configured" });
  }

  const falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${process.env.FAL_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: STYLE_PROMPTS[style],
      image_urls: [image],
      num_images: 1,
      output_format: "jpeg",
    }),
  });

  if (!falRes.ok) {
    const detail = (await falRes.text().catch(() => "")).slice(0, 300);
    return res.status(502).json({ error: "Generation failed", detail });
  }
  const data = await falRes.json();
  const url = data.images?.[0]?.url;
  if (!url) {
    return res.status(502).json({ error: "No image returned" });
  }
  return res.status(200).json({ url });
}
```

- [ ] **Step 2: `vercel.json` anlegen**

```json
{
  "functions": {
    "api/paint.js": {
      "maxDuration": 60
    }
  }
}
```

- [ ] **Step 3: Smoke-Test-Skript schreiben** (ruft fal DIREKT, validiert Key + Modell + Prompt-Qualität, bevor UI existiert)

```js
// scripts/smoke-paint.mjs
// Aufruf: node scripts/smoke-paint.mjs <pfad-zu-test-png> [style]
// Liest FAL_API_KEY aus C:\Users\karent\.env
import { readFileSync, writeFileSync } from "node:fs";

const envText = readFileSync("C:/Users/karent/.env", "utf8");
const key = envText.match(/^FAL_API_KEY=(.+)$/m)?.[1]?.trim();
if (!key) throw new Error("FAL_API_KEY nicht in .env gefunden");

const [, , pngPath, style = "pixar"] = process.argv;
const b64 = readFileSync(pngPath).toString("base64");
const dataUri = `data:image/png;base64,${b64}`;

process.env.FAL_API_KEY = key;
const { default: handler } = await import("../api/paint.js");

// Mini-Mocks für Vercel req/res
const req = { method: "POST", body: { image: dataUri, style } };
const res = {
  code: 200,
  status(c) { this.code = c; return this; },
  json(obj) {
    console.log("HTTP", this.code, JSON.stringify(obj, null, 2));
    if (obj.url) writeFileSync("scripts/smoke-result-url.txt", obj.url);
    return this;
  },
};
await handler(req, res);
```

- [ ] **Step 4: Test-Gekritzel erzeugen + Smoke-Test laufen lassen**

Test-PNG: simples Strichmännchen/Gekritzel per Node-Canvas gibt es nicht ohne Package — stattdessen ein winziges handgemaltes PNG aus Paint ODER ein per Skript erzeugtes SVG→PNG entfällt; einfachste Lösung: 1-Minuten-Gekritzel in MS Paint speichern als `scripts/test-scribble.png`. Alternativ vorhandenes Bild aus `src/assets/screenshots` nehmen (nur Format-Check, keine Gekritzel-Interpretation).

Run: `node scripts/smoke-paint.mjs scripts/test-scribble.png pixar`
Expected: `HTTP 200 { "url": "https://…fal.media/…" }` — URL im Browser öffnen, Bild ansehen.

- [ ] **Step 5: Commit**

```bash
git add api/paint.js vercel.json scripts/smoke-paint.mjs
git commit -m "Add fal paint proxy function for Zauber-Maler"
```

---

### Task 2: IndexedDB-Wrapper `src/lib/galleryDb.js`

**Files:**
- Create: `src/lib/galleryDb.js`

**Interfaces:**
- Produces:
  - `saveSession(session)` — `session = { id: string, createdAt: number, drawing: Blob, results: { pixar: Blob|null, comic: Blob|null, anime: Blob|null } }` → `Promise<void>`
  - `listSessions()` → `Promise<session[]>` (neueste zuerst)
  - `deleteSession(id: string)` → `Promise<void>`

- [ ] **Step 1: Wrapper schreiben**

```js
// src/lib/galleryDb.js
const DB_NAME = "zauber-maler";
const STORE = "sessions";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const out = fn(store);
    t.oncomplete = () => resolve(out?.result);
    t.onerror = () => reject(t.error);
  });
}

export async function saveSession(session) {
  const db = await openDb();
  await tx(db, "readwrite", (s) => s.put(session));
  db.close();
}

export async function listSessions() {
  const db = await openDb();
  const result = await tx(db, "readonly", (s) => s.getAll());
  db.close();
  return (result || []).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteSession(id) {
  const db = await openDb();
  await tx(db, "readwrite", (s) => s.delete(id));
  db.close();
}
```

- [ ] **Step 2: Build-Check** — Run: `npm run build`, Expected: kein Fehler.

- [ ] **Step 3: Commit**

```bash
git add src/lib/galleryDb.js
git commit -m "Add IndexedDB gallery storage for Zauber-Maler"
```

---

### Task 3: `src/MagicPainter.jsx` — Mal-UI, Generierung, Ergebnis, Galerie

**Files:**
- Create: `src/MagicPainter.jsx`

**Interfaces:**
- Consumes: `saveSession/listSessions/deleteSession` aus `./lib/galleryDb`; `POST /api/paint` aus Task 1.
- Produces: `<MagicPainter onClose={fn} />` — Fullscreen-Overlay wie alle Spiele.

**Aufbau (ein File, drei Views über `view`-State `"draw" | "result" | "gallery"`):**

- [ ] **Step 1: Mal-View**
  - `<canvas>` intern 1024×1024, CSS-responsiv quadratisch; weißer Grund (beim Init `fillRect` weiß — wichtig fürs PNG).
  - Zeichnen über Pointer-Events (`pointerdown/move/up`, `setPointerCapture`), Koordinaten über `getBoundingClientRect` auf interne Auflösung skaliert; `line` mit `lineCap/lineJoin: "round"`.
  - Strokes-Array `{ color, size, points[] }` als Datenquelle; Canvas wird bei Undo komplett aus Strokes neu gezeichnet (weiß füllen → alle Strokes zeichnen). Radierer = Stroke mit `color: "#ffffff"`.
  - Werkzeuge: 10 Farben (`#000000, #ef4444, #f97316, #facc15, #22c55e, #3b82f6, #8b5cf6, #ec4899, #92400e, #ffffff` als Radierer separat), 3 Pinselgrößen (6/14/28), Undo-Button, Papierkorb (alles löschen mit kurzer Bestätigung), Galerie-Button (📚), Schließen-X (`onClose`).
  - „Fertig ✨"-Button: deaktiviert solange `strokes.length === 0`.

- [ ] **Step 2: Generierungs-Flow**
  - Bei „Fertig ✨": `canvas.toDataURL("image/png")`, `view = "result"`, für alle 3 Stile parallel:
    `POST /api/paint {image, style}` → bei 200: `fetch(url)` → `blob()` → `URL.createObjectURL` in State; Status je Stil `"loading" | "done" | "error"`.
  - Retry-Button pro fehlgeschlagenem Stil (wiederholt nur diesen Call).
  - Wenn alle 3 fertig (Promise.allSettled) und mindestens 1 Erfolg: Session in IndexedDB speichern (`crypto.randomUUID()`, `Date.now()`, Zeichnung als Blob via `canvas.toBlob`, Ergebnis-Blobs; Fehl-Stile als `null`).

- [ ] **Step 3: Ergebnis-View**
  - Oben Original-Zeichnung klein, darunter 3 Karten (Pixar 🎬 / Comic 💥 / Anime 🌸) mit Bild oder Lade-Funkeln (pulsierendes ✨) oder Fehlerkarte („Der Zauber hat nicht geklappt — nochmal probieren!" + 🔁).
  - Tap auf fertige Karte → Vollbild-Modal (Tap schließt), Download-Button (⬇, `<a download>` mit Object-URL).
  - Buttons: „Nochmal malen 🖌" (zurück zu draw, Canvas leeren), Galerie, Schließen.

- [ ] **Step 4: Galerie-View**
  - `listSessions()` beim Öffnen; Grid aus Vorschaukacheln (Zeichnung als Thumbnail, Object-URLs aus Blobs).
  - Tap → Ergebnis-Ansicht der Session (readonly, gleiche Karten-UI). Löschen-Button pro Eintrag (Bestätigung). Leer-Zustand: „Noch keine Zauberbilder — mal was!"
  - Object-URLs bei Unmount/Wechsel mit `URL.revokeObjectURL` freigeben.

- [ ] **Step 5: Styling** — Tailwind, Look wie restliche App (Gradient-Hintergrund `from-violet-400 to-fuchsia-500`, runde Karten, große Touch-Targets, `z-50` Fullscreen-Overlay wie `GameSelect`).

- [ ] **Step 6: Build-Check** — Run: `npm run build`, Expected: kein Fehler.

- [ ] **Step 7: Commit**

```bash
git add src/MagicPainter.jsx
git commit -m "Add Zauber-Maler drawing studio with AI style generation"
```

---

### Task 4: Registrierung in `GameSelect.jsx` + `PetGame.jsx`

**Files:**
- Modify: `src/GameSelect.jsx` (games-Array, nach `jigsaw`-Eintrag ~Zeile 107)
- Modify: `src/PetGame.jsx` (Import oben; Render-Block nach Jigsaw ~Zeile 579)

- [ ] **Step 1: Karussell-Eintrag**

```js
{
  id: 'magicpainter',
  name: 'Zauber-Maler',
  emoji: '🎨',
  description: 'Male etwas und die KI zaubert 3 Bilder daraus!',
  color: 'from-violet-400 to-fuchsia-500',
  hasDifficulty: false,
},
```

- [ ] **Step 2: PetGame-Integration**

```jsx
import MagicPainter from './MagicPainter';
// …
{/* Zauber-Maler (Kreativ-Studio, keine Münzen) */}
{currentGame === 'magicpainter' && (
  <MagicPainter onClose={() => handleGameEnd(0)} />
)}
```

- [ ] **Step 3: Build-Check** — Run: `npm run build`, Expected: kein Fehler.

- [ ] **Step 4: Commit**

```bash
git add src/GameSelect.jsx src/PetGame.jsx
git commit -m "Register Zauber-Maler in game carousel"
```

---

### Task 5: Env-Var, Deploy, Live-Verifikation

- [ ] **Step 1: `FAL_API_KEY` als Vercel-Env setzen** (Wert aus `C:\Users\karent\.env`)

Run: `vercel env add FAL_API_KEY production` (Projekt `yunas-pet-game`, ist per `.vercel/project.json` gelinkt)

- [ ] **Step 2: Push + Deploy**

`git push` (falls GitHub-Integration deployt) — sonst `vercel --prod`. Deploy-URL notieren.

- [ ] **Step 3: Live-Check (Pflicht laut Memory `feedback_deploy_live_verifizieren`)**
  - Produktions-URL öffnen, Zauber-Maler aus Karussell starten
  - Gekritzel malen → „Fertig ✨" → alle 3 Stile kommen an
  - Galerie: Session gespeichert, nach Reload noch da
  - Download eines Bildes funktioniert

- [ ] **Step 4: Mission Control dokumentieren** (7-Block-Doku laut Skill)
