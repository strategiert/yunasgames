# Zauber-Maler 🎨 — Design-Spec

Datum: 2026-07-13
Status: von Klaus freigegeben (Chat), Modellwahl auf günstig geändert

## Ziel

Kreativ-Studio (kein Spiel) in der Yunas-Games-App: Kind malt frei auf einer
Leinwand. Eine KI interpretiert die Zeichnung wohlwollend — auch Gekritzel wird
als Figur, Tier, Landschaft o. Ä. gedeutet — und malt das erkannte Motiv in drei
Stilen: **Pixar-3D, Comic, Anime**. Ergebnisse landen in einer lokalen Galerie.

## Rahmenbedingungen

- App: `yunas-pet-game` (React 18 + Vite + Tailwind, deployed auf Vercel,
  Repo `github.com/strategiert/yunasgames`)
- Bisher rein clientseitig; Gemini-Key aus Jigsaw ist tot
- KI-Modell: **`fal-ai/nano-banana/edit`** (Gemini Flash Image via fal.ai),
  $0,039/Bild → ~12 Cent pro Malvorgang (3 Stile); bewusst die günstige
  Variante statt nano-banana-2 ($0,08)
- `FAL_API_KEY` existiert in `C:\Users\karent\.env`, darf NICHT ins Client-Bundle

## Architektur

### 1. `src/MagicPainter.jsx` — neue Komponente
- **Mal-Ansicht:** quadratisches Canvas (1:1), Pointer-Events (Touch + Maus)
  - Werkzeuge: ~10 Kinderfarben, 3 Pinselgrößen, Radierer, Rückgängig
    (Stroke-Stack), Alles-löschen
  - Großer „Fertig ✨"-Button startet die Generierung
- **Ergebnis-Ansicht:** Original-Zeichnung klein + 3 Stil-Karten
  (Pixar / Comic / Anime), je eigener Ladezustand mit Funkel-Animation,
  je eigener Retry bei Fehler (kindgerecht: „Der Zauber hat nicht geklappt —
  nochmal probieren!"). Tap auf Karte = Vollbild. Download-Button pro Bild.
  „Nochmal malen"-Button.
- **Galerie-Ansicht:** Grid gespeicherter Sessions, Eintrag öffnen/löschen.

### 2. `api/paint.js` — Vercel Serverless Function (Proxy)
- Input (POST JSON): `{ image: <data-URI PNG>, style: "pixar" | "comic" | "anime" }`
- Ruft `https://fal.run/fal-ai/nano-banana/edit` synchron auf
  (Header `Authorization: Key ${FAL_API_KEY}`), Body:
  `{ prompt: <Stil-Prompt>, image_urls: [<data-URI>] }`
  (fal akzeptiert Base64-data-URIs direkt)
- Output: `{ url: <fal-Bild-URL> }` bzw. Fehler-JSON
- Stil-Prompts liegen serverseitig (Client schickt nur den Stil-Schlüssel)
- Prompt-Kern: Kinderzeichnung wohlwollend interpretieren, erkanntes Motiv
  kindgerecht und fröhlich im jeweiligen Stil neu malen
- `maxDuration: 60` (Fluid Compute, Hobby erlaubt bis 300 s)
- `FAL_API_KEY` als Vercel-Env-Var

### 3. Galerie-Persistenz — IndexedDB
- localStorage zu klein (5 MB) für 1–2-MB-Bilder → IndexedDB, eigener
  Wrapper (~40 Zeilen, keine neue Dependency), z. B. `src/lib/galleryDb.js`
- fal-URLs sind nicht dauerhaft garantiert → Client lädt Ergebnis sofort
  herunter und speichert **Blobs** (Zeichnung + 3 Ergebnisse pro Session)

### 4. Registrierung
- `GameSelect.jsx`: 13. Karussell-Eintrag (id `magicpainter`, 🎨,
  „Male etwas und die KI zaubert Bilder daraus!")
- `PetGame.jsx`: Render-Case für `magicpainter`
- Keine Münzen, keine Schwierigkeitsstufen

## Datenfluss

Kind malt → „Fertig ✨" → Canvas → PNG-data-URI → 3 parallele
`POST /api/paint` (je Stil) → Function ruft fal → Client erhält 3 URLs →
lädt Bilder als Blobs → zeigt Karten → speichert Session in IndexedDB.

## Fehlerbehandlung

- Pro Stil unabhängig: Fehler auf einer Karte blockiert die anderen nicht
- Retry-Button pro Karte, kindgerechte Fehlermeldung
- Leeres Canvas: „Fertig"-Button deaktiviert bis mindestens ein Strich da ist
- Function validiert: image vorhanden, data-URI-Format, style im Whitelist-Set

## Testen

- `npm run build` muss durchlaufen
- Lokal: `vercel dev` (Function + Vite zusammen) oder Function-Logik separat
  gegen fal testen
- Live-Check nach Deploy: ein Malvorgang mit allen 3 Stilen auf der
  Produktions-URL

## Nicht im Scope

- Kein Backend-Speicher / keine Accounts
- Kein Teilen/Social
- Keine Münzen-Belohnung
