# Yunas Games als PWA — Design-Spec

Datum: 2026-07-13
Status: direkter Auftrag von Klaus („Bau mir daraus eine pwa"), Umsetzung ohne Review-Gate

## Ziel

Die Yunas-Games-App (yunas-pet-game.vercel.app) wird installierbar: Homescreen-Icon
auf Android/iOS/Desktop, Standalone-Fenster ohne Browser-UI, App-Shell inkl. aller
12 Spiele offline nutzbar. Zauber-Maler braucht weiterhin Netz (fal-API) und zeigt
offline seine bestehenden Fehlerkarten.

## Ausgangslage

- Vite 6 + React 18, kein PWA-Setup, `public/` leer, `index.html` verweist auf
  nicht existierendes `/favicon.svg`
- Deploy: Vercel Auto-Deploy bei Push auf main

## Bausteine

### 1. vite-plugin-pwa (devDependency)
- `registerType: 'autoUpdate'` — neue Deploys ersetzen den Service Worker still
- Workbox-Precache aller Build-Assets (JS/CSS/HTML/Bilder, ~10 MB mit Zimmer-PNGs)
  → komplette App offline
- `navigateFallback: '/index.html'`, `/api/*` vom Fallback ausgenommen
  (NetworkOnly — kein Caching von Generierungs-Antworten)
- `maximumFileSizeToCacheInBytes` hoch genug für die 1,8-MB-Zimmer-PNGs

### 2. Icons (fal-generiert, ~4 Cent)
- Ein 1024²-Basisbild: freundlicher Cartoon-Hund, App-Icon-Look, kräftige Farben
- Daraus per System.Drawing: `pwa-512.png`, `pwa-192.png`, `apple-touch-icon.png`
  (180², mit Rand), `pwa-maskable-512.png` (Motiv auf ~70 % mit Safe-Zone-Padding),
  `favicon.png` (64²)
- Ablage in `public/`

### 3. Manifest (via Plugin)
- name/short_name „Yunas Games", `lang: de`, `display: standalone`,
  `orientation: portrait`, `start_url: /`
- `theme_color: #ec4899` (Pink des Start-Buttons), `background_color: #cffafe`
  (Himmelblau des Startscreens)
- Icons 192/512 + maskable

### 4. index.html
- `apple-touch-icon`, `theme-color`-Meta, `apple-mobile-web-app-capable`,
  Favicon-Verweis auf existierende Datei

## Verifikation

- `npm run build`: dist enthält `sw.js`, `manifest.webmanifest`, Icons
- Live nach Deploy: Manifest + SW laden (HTTP 200), Chrome meldet Installierbarkeit
  (getInstalledRelatedApps/DevTools), Reload mit aktivem SW

## Nicht im Scope

- Kein Offline-Caching der fal-Bilder über die bestehende IndexedDB-Galerie hinaus
- Keine Push-Notifications, kein Background-Sync
