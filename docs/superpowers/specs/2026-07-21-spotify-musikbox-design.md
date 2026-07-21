# Spotify-Musikbox — Design

Datum: 2026-07-21
Status: von Klaus freigegeben (Ansatz A: Spotify Connect API)

## Ziel

Die Kinder nutzen Yunas Games auf Klaus' Handy. Sie sollen Musik anmachen können,
ohne die App zu wechseln. Musik läuft über die Spotify-App auf demselben Gerät
(Klaus' Premium-Konto), gesteuert aus Yunas Games heraus.

## Rahmenbedingungen

- Klaus hat Spotify Premium (Pflicht für Playback-Steuerung via Web API).
- Spotify-Developer-App im Development Mode, nur Klaus' Konto. Formal verstößt
  Kinder-Nutzung gegen die Spotify Developer Policy („not targeted to children");
  private Einzelkonto-Nutzung, Risiko bewusst akzeptiert (Klaus, 21.07.2026).
- Kein Spotify-Login in der App selbst. OAuth passiert einmalig per lokalem Skript.
- Tokens erreichen nie den Client.

## Konzept

Neuer Eintrag „🎵 Musikbox" im GameSelect-Karussell (14. Kachel, wie Zauber-Maler
als Nicht-Spiel-Kachel etabliert). Öffnet Vollbild-Overlay `MusicBox.jsx`:

- Große Playlist-Cover-Tiles (Cover-Art von Spotify, Name darunter).
- Tap auf Tile → Playback startet auf dem Handy-Device (Spotify-App im Hintergrund).
- Mini-Player: Play/Pause, ⏭ Nächster Song, Lautstärke (− / +), aktueller Songtitel.
- Kindgroße Buttons, keine Suche, kein Browsing, keine Song-Verwaltung.

## Playlist-Kuratierung

Namenskonvention: Jede Playlist in Klaus' Spotify-Konto, deren Name mit `Yuna`
beginnt (case-insensitive), erscheint automatisch in der Musikbox. Neue
Kinder-Playlist = in Spotify anlegen, kein Deploy nötig.

## Architektur

### Server: `api/spotify.js` (Vercel Serverless, Muster wie `api/paint.js`)

Ein Endpoint, Action-basiert (`POST /api/spotify` mit `{ action, ...params }`):

| Action      | Spotify-Call                                | Rückgabe |
|-------------|---------------------------------------------|----------|
| `playlists` | `GET /me/playlists` (gefiltert auf `Yuna*`) | `[{id, name, image, uri}]` |
| `status`    | `GET /me/player`                            | `{playing, track, artist, device}` oder `{device: null}` |
| `play`      | `PUT /me/player/play` (`context_uri`, `device_id`) | ok/Fehler |
| `pause`     | `PUT /me/player/pause`                      | ok |
| `next`      | `POST /me/player/next`                      | ok |
| `volume`    | `PUT /me/player/volume` (`volume_percent`)  | ok |

Token-Handling im Server:
- Env: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`.
- Access Token via Refresh-Grant holen, in Modul-Scope cachen (Vercel hält warme
  Instanzen; bei Cold Start neu holen). Bei 401 einmal refreshen + retry.
- Fehler an Client als `{ error, detail }` (Detail = Spotify-Fehlertext, gekürzt),
  gleiche Konvention wie `api/paint.js`.

Device-Logik bei `play`:
1. `GET /me/player/devices` → Smartphone-Device suchen (Typ `Smartphone` bevorzugt,
   sonst erstes verfügbares).
2. Device da → `play` mit `device_id`.
3. Kein Device → `{ error: "no_device" }` an Client.

### Client: `src/MusicBox.jsx`

- Beim Öffnen: `playlists` + `status` laden.
- `no_device`-Fall: freundlicher Hinweis + Button „Spotify kurz öffnen"
  (Deep Link `spotify://` bzw. `https://open.spotify.com`), danach „Nochmal
  versuchen"-Button.
- Status-Polling nur bei geöffneter Musikbox (alle 5 s), kein Hintergrund-Polling.
- Debug: 🐞-Zeile wie im Zauber-Maler (Server-Fehlertext sichtbar, Versions-Marke).
- Musik läuft weiter, wenn Overlay geschlossen wird (bewusst: Hintergrundmusik
  beim Spielen). Stopp jederzeit über Musikbox → Pause.

### Einmal-Setup: `tools/spotify_auth.py` (oder .mjs)

Lokales Skript, Muster wie die `gen_*`-Skripte:
1. Öffnet Authorize-URL (Scopes: `user-modify-playback-state`,
   `user-read-playback-state`, `playlist-read-private`), Redirect auf
   `http://127.0.0.1:8888/callback`, lokaler Mini-Server fängt Code.
2. Tauscht Code gegen Refresh Token, druckt ihn.
3. Refresh Token + Client-Creds als Env in BEIDE Vercel-Projekte
   (`yunasgames` UND `yunas-pet-game`, bekannte Falle) — alle Environments.

## Fehlerbehandlung

- 401 → Server-seitiger Token-Refresh + 1 Retry.
- 404 „NO_ACTIVE_DEVICE" / leere Device-Liste → `no_device`-Flow im Client.
- 429 (Rate Limit) → Client zeigt „Kurz warten…", kein Auto-Retry-Sturm.
- Netzwerkfehler → 🐞-Zeile + „Nochmal"-Button.

## Nicht im Scope

- Suche, Einzelsong-Auswahl, Playlist-Bearbeitung in der App.
- Spotify-Login-Flow in der App.
- Mehrere Spotify-Konten / Profile-Kopplung.
- Precaching der Cover (Netz nötig, ist ok — Spotify braucht eh Netz).

## Testen

- Lokal: `vercel dev` mit Env aus `.env`, Desktop-Spotify als Device.
- Auf dem Handy: yunasgames.vercel.app nach Deploy, Spotify-App offen,
  Playlist `Yuna Test` anlegen. SW-Falle beachten (skipWaiting ist drin,
  App einmal neu starten).
- Kein Device-Test: Spotify-App force-stoppen → `no_device`-Flow prüfen.
