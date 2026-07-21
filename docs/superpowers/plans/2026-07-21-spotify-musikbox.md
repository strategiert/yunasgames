# Spotify-Musikbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kinder starten/steuern Musik (Klaus' Spotify, Premium) aus Yunas Games heraus, ohne App-Wechsel — Playback läuft in der Spotify-App auf demselben Handy.

**Architecture:** Ein Vercel-Serverless-Proxy (`api/spotify.js`) hält Refresh-Token serverseitig und spricht die Spotify Web API (Connect). Client-Overlay `MusicBox.jsx` zeigt kuratierte Playlists (Namenspräfix `Yuna`) als Cover-Tiles + Mini-Player. Einmal-OAuth per lokalem Node-Skript.

**Tech Stack:** React 18 + Vite (bestehend), Vercel Serverless (ESM, `type: module`), Spotify Web API, `node --test` für Unit-Tests.

**Spec:** `docs/superpowers/specs/2026-07-21-spotify-musikbox-design.md`

## Global Constraints

- Repo: `C:\Users\karent\Documents\Software\personal\yuna-pet-game`, Branch `main`, direkt committen (Projektkonvention).
- ESM überall (`package.json` hat `"type": "module"`).
- Keine neuen npm-Dependencies.
- Tokens erreichen NIE den Client. Env-Namen exakt: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`.
- Env in BEIDE Vercel-Projekte (`yunasgames` UND `yunas-pet-game`), alle 3 Environments. Live-Domain zum Testen: https://yunasgames.vercel.app bzw. https://yunasgames.klaus-arent.de.
- UI-Texte Deutsch, kindgerecht, große Touch-Ziele. Stil wie GameSelect/MagicPainter (Tailwind, fixed-Overlay, Gradients).
- Nach Deploy: live verifizieren, erst dann Vollzug melden.

## Voraussetzung (manuell, vor Task 3)

Spotify-Developer-App anlegen: https://developer.spotify.com/dashboard → Create app.
- Name egal (z. B. `yuna-musicbox`), Redirect URI exakt: `http://127.0.0.1:8888/callback`, Web API angehakt.
- Client ID + Client Secret in `C:\Users\karent\.env` als `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` eintragen.
- App bleibt im Development Mode (kein Extended Access nötig — nur Klaus' eigenes Konto).

---

### Task 1: Pure Server-Helpers `api/_spotifyLib.js`

Vercel routet Dateien in `api/`, die mit `_` beginnen, NICHT als Endpoint — sicher für Shared Code.

**Files:**
- Create: `api/_spotifyLib.js`
- Test: `api/_spotifyLib.test.js`

**Interfaces:**
- Produces: `filterYunaPlaylists(items) → [{id, name, image, uri}]`, `pickDevice(devices) → deviceObj|null`, `mapStatus(player) → {device, playing, track, artist, volume}`

- [ ] **Step 1: Failing Tests schreiben** — `api/_spotifyLib.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import { filterYunaPlaylists, pickDevice, mapStatus } from './_spotifyLib.js';

test('filterYunaPlaylists nimmt nur Yuna*-Playlists, case-insensitive', () => {
  const items = [
    { id: '1', name: 'Yuna Kinderlieder', uri: 'spotify:playlist:1', images: [{ url: 'http://img/1' }] },
    { id: '2', name: 'yuna disco', uri: 'spotify:playlist:2', images: [] },
    { id: '3', name: 'Workout', uri: 'spotify:playlist:3', images: [{ url: 'http://img/3' }] },
    null,
  ];
  const out = filterYunaPlaylists(items);
  assert.deepEqual(out, [
    { id: '1', name: 'Yuna Kinderlieder', image: 'http://img/1', uri: 'spotify:playlist:1' },
    { id: '2', name: 'yuna disco', image: null, uri: 'spotify:playlist:2' },
  ]);
});

test('filterYunaPlaylists übersteht leere/fehlende Liste', () => {
  assert.deepEqual(filterYunaPlaylists(undefined), []);
  assert.deepEqual(filterYunaPlaylists([]), []);
});

test('pickDevice bevorzugt aktives Smartphone, dann Smartphone, dann aktiv, dann erstes', () => {
  const phoneActive = { id: 'a', type: 'Smartphone', is_active: true };
  const phone = { id: 'b', type: 'Smartphone', is_active: false };
  const pcActive = { id: 'c', type: 'Computer', is_active: true };
  const pc = { id: 'd', type: 'Computer', is_active: false };
  assert.equal(pickDevice([pc, pcActive, phone, phoneActive]).id, 'a');
  assert.equal(pickDevice([pc, pcActive, phone]).id, 'b');
  assert.equal(pickDevice([pc, pcActive]).id, 'c');
  assert.equal(pickDevice([pc]).id, 'd');
  assert.equal(pickDevice([]), null);
  assert.equal(pickDevice(undefined), null);
});

test('pickDevice ignoriert restricted Devices', () => {
  const restricted = { id: 'r', type: 'Smartphone', is_active: true, is_restricted: true };
  assert.equal(pickDevice([restricted]), null);
});

test('mapStatus mappt Player-Objekt', () => {
  const player = {
    is_playing: true,
    device: { name: 'Pixel 8', volume_percent: 60 },
    item: { name: 'Song A', artists: [{ name: 'X' }, { name: 'Y' }] },
  };
  assert.deepEqual(mapStatus(player), {
    device: 'Pixel 8', playing: true, track: 'Song A', artist: 'X, Y', volume: 60,
  });
});

test('mapStatus ohne Player/Device → device null', () => {
  assert.deepEqual(mapStatus(null), { device: null, playing: false, track: null, artist: null, volume: null });
  assert.deepEqual(mapStatus({}), { device: null, playing: false, track: null, artist: null, volume: null });
});
```

- [ ] **Step 2: Fehlschlag verifizieren**

Run: `node --test api/_spotifyLib.test.js`
Expected: FAIL (`ERR_MODULE_NOT_FOUND` für `./_spotifyLib.js`)

- [ ] **Step 3: Implementierung** — `api/_spotifyLib.js`:

```js
export function filterYunaPlaylists(items) {
  return (items || [])
    .filter((p) => p && typeof p.name === 'string' && p.name.trim().toLowerCase().startsWith('yuna'))
    .map((p) => ({
      id: p.id,
      name: p.name,
      image: p.images?.[0]?.url || null,
      uri: p.uri,
    }));
}

export function pickDevice(devices) {
  const list = (devices || []).filter((d) => d && !d.is_restricted);
  return (
    list.find((d) => d.type === 'Smartphone' && d.is_active) ||
    list.find((d) => d.type === 'Smartphone') ||
    list.find((d) => d.is_active) ||
    list[0] ||
    null
  );
}

export function mapStatus(player) {
  if (!player || !player.device) {
    return { device: null, playing: false, track: null, artist: null, volume: null };
  }
  return {
    device: player.device.name,
    playing: !!player.is_playing,
    track: player.item?.name || null,
    artist: player.item?.artists?.map((a) => a.name).join(', ') || null,
    volume: player.device.volume_percent ?? null,
  };
}
```

- [ ] **Step 4: Tests grün**

Run: `node --test api/_spotifyLib.test.js`
Expected: PASS (6 Tests)

- [ ] **Step 5: Commit**

```bash
git add api/_spotifyLib.js api/_spotifyLib.test.js
git commit -m "feat: Spotify-Helper (Playlist-Filter, Device-Wahl, Status-Mapping) mit Tests"
```

---

### Task 2: OAuth-Einmal-Skript `tools/spotify_auth.mjs`

**Files:**
- Create: `tools/spotify_auth.mjs`

**Interfaces:**
- Consumes: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` aus Umgebung (aus `C:\Users\karent\.env` laden/übergeben)
- Produces: druckt `SPOTIFY_REFRESH_TOKEN=...` auf stdout (für Vercel-Env)

- [ ] **Step 1: Skript schreiben** — `tools/spotify_auth.mjs`:

```js
// Einmal-Setup: holt Spotify-Refresh-Token für die Musikbox.
// Aufruf (PowerShell):
//   $env:SPOTIFY_CLIENT_ID="..."; $env:SPOTIFY_CLIENT_SECRET="..."; node tools/spotify_auth.mjs
// Öffnet Browser → Spotify-Login/Consent → druckt SPOTIFY_REFRESH_TOKEN.
import http from 'node:http';
import { exec } from 'node:child_process';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET fehlen in der Umgebung.');
  process.exit(1);
}
const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const SCOPES = 'user-modify-playback-state user-read-playback-state playlist-read-private';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8888');
  if (url.pathname !== '/callback') { res.writeHead(404); res.end(); return; }
  const code = url.searchParams.get('code');
  if (!code) { res.end('Kein Code erhalten.'); return; }
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
  });
  const data = await tokenRes.json();
  if (!data.refresh_token) {
    console.error('Fehler beim Token-Tausch:', JSON.stringify(data).slice(0, 300));
    res.end('Fehler - siehe Konsole.');
    process.exit(1);
  }
  console.log('\nSPOTIFY_REFRESH_TOKEN=' + data.refresh_token + '\n');
  res.end('Fertig! Fenster kann zu.');
  server.close(() => process.exit(0));
});

server.listen(8888, '127.0.0.1', () => {
  const authUrl =
    'https://accounts.spotify.com/authorize' +
    `?client_id=${CLIENT_ID}` +
    '&response_type=code' +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}`;
  console.log('Öffne im Browser:\n' + authUrl + '\n');
  exec(`start "" "${authUrl}"`);
});
```

- [ ] **Step 2: Syntax-Check (ohne Creds)**

Run: `node tools/spotify_auth.mjs`
Expected: exit 1 mit `SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET fehlen in der Umgebung.`

- [ ] **Step 3: Echt durchlaufen (braucht Developer-App aus Voraussetzung)**

Run (PowerShell, Creds aus `C:\Users\karent\.env`): `node tools/spotify_auth.mjs`
Expected: Browser öffnet Spotify-Consent → nach Zustimmung steht `SPOTIFY_REFRESH_TOKEN=...` in der Konsole. Token in `C:\Users\karent\.env` UND (Task 6) in Vercel eintragen.

- [ ] **Step 4: Commit**

```bash
git add tools/spotify_auth.mjs
git commit -m "feat: Einmal-OAuth-Skript für Spotify-Refresh-Token"
```

---

### Task 3: Serverless-Proxy `api/spotify.js`

**Files:**
- Create: `api/spotify.js`

**Interfaces:**
- Consumes: `filterYunaPlaylists`, `pickDevice`, `mapStatus` aus `api/_spotifyLib.js`; Env `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`
- Produces (für `MusicBox.jsx`): `POST /api/spotify` mit Body `{action}`:
  - `{action:'playlists'}` → `{playlists: [{id,name,image,uri}]}`
  - `{action:'status'}` → `{device, playing, track, artist, volume}` (device `null` = keins)
  - `{action:'play', uri?}` → `{ok:true, device}` oder Status 409 `{error:'no_device'}`
  - `{action:'pause'|'next'}` → `{ok:true}`
  - `{action:'volume', volume:0..100}` → `{ok:true}`
  - Fehler: Status 4xx/5xx mit `{error, detail?}`

- [ ] **Step 1: Implementierung** — `api/spotify.js`:

```js
export const config = { maxDuration: 15 };

import { filterYunaPlaylists, pickDevice, mapStatus } from './_spotifyLib.js';

let cachedToken = null; // { token, expiresAt } — überlebt in warmer Instanz

async function fetchAccessToken() {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
    }),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    throw new Error(`token_refresh_failed: ${detail}`);
  }
  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return cachedToken.token;
}

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30000) return cachedToken.token;
  return fetchAccessToken();
}

// Spotify-Call mit einmaligem Retry bei 401 (abgelaufener/kaputter Cache-Token)
async function sp(path, { method = 'GET', body } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getAccessToken();
    const res = await fetch(`https://api.spotify.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401 && attempt === 0) {
      cachedToken = null;
      continue;
    }
    return res;
  }
}

async function fail(res, spRes) {
  const detail = (await spRes.text().catch(() => '')).slice(0, 300);
  return res.status(502).json({ error: 'spotify_error', status: spRes.status, detail });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  for (const k of ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REFRESH_TOKEN']) {
    if (!process.env[k]) return res.status(500).json({ error: `${k} not configured` });
  }
  const { action, uri, volume } = req.body || {};
  try {
    switch (action) {
      case 'playlists': {
        const r = await sp('/me/playlists?limit=50');
        if (!r.ok) return fail(res, r);
        const data = await r.json();
        return res.json({ playlists: filterYunaPlaylists(data.items) });
      }
      case 'status': {
        const r = await sp('/me/player');
        if (r.status === 204) return res.json(mapStatus(null));
        if (!r.ok) return fail(res, r);
        return res.json(mapStatus(await r.json()));
      }
      case 'play': {
        const dr = await sp('/me/player/devices');
        if (!dr.ok) return fail(res, dr);
        const device = pickDevice((await dr.json()).devices);
        if (!device) return res.status(409).json({ error: 'no_device' });
        const r = await sp(`/me/player/play?device_id=${encodeURIComponent(device.id)}`, {
          method: 'PUT',
          body: uri ? { context_uri: uri } : undefined,
        });
        if (!r.ok && r.status !== 204) return fail(res, r);
        return res.json({ ok: true, device: device.name });
      }
      case 'pause': {
        const r = await sp('/me/player/pause', { method: 'PUT' });
        if (!r.ok && r.status !== 204) return fail(res, r);
        return res.json({ ok: true });
      }
      case 'next': {
        const r = await sp('/me/player/next', { method: 'POST' });
        if (!r.ok && r.status !== 204) return fail(res, r);
        return res.json({ ok: true });
      }
      case 'volume': {
        const v = Math.max(0, Math.min(100, Number(volume) || 0));
        const r = await sp(`/me/player/volume?volume_percent=${v}`, { method: 'PUT' });
        if (!r.ok && r.status !== 204) return fail(res, r);
        return res.json({ ok: true });
      }
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (e) {
    return res.status(502).json({ error: 'spotify_failed', detail: String(e).slice(0, 300) });
  }
}
```

- [ ] **Step 2: Lokal gegen echte API testen**

Vorbedingung: Task 2 Step 3 erledigt (Refresh-Token in `.env`), Spotify irgendwo offen (Desktop reicht).

Run (Repo-Root, PowerShell):
```powershell
vercel dev --listen 3000
# zweites Terminal:
curl.exe -s -X POST http://localhost:3000/api/spotify -H "Content-Type: application/json" -d '{\"action\":\"playlists\"}'
curl.exe -s -X POST http://localhost:3000/api/spotify -H "Content-Type: application/json" -d '{\"action\":\"status\"}'
```
Expected: `playlists` liefert JSON-Array (leer, falls noch keine `Yuna*`-Playlist existiert — dann eine in Spotify anlegen), `status` liefert Device oder `{"device":null,...}`. Danach `play` mit einer echten Playlist-URI testen: Musik startet am Desktop-Spotify.

- [ ] **Step 3: Commit**

```bash
git add api/spotify.js
git commit -m "feat: Spotify-Connect-Proxy (playlists/status/play/pause/next/volume)"
```

---

### Task 4: UI `src/MusicBox.jsx`

**Files:**
- Create: `src/MusicBox.jsx`

**Interfaces:**
- Consumes: `POST /api/spotify` (Vertrag aus Task 3)
- Produces: `<MusicBox onClose={fn} />` — Vollbild-Overlay, schließt via ✕/Backdrop; Musik läuft nach Schließen weiter (gewollt)

- [ ] **Step 1: Komponente schreiben** — `src/MusicBox.jsx`:

```jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

const VERSION = 'musicbox-1';

async function api(action, params = {}) {
  const res = await fetch('/api/spotify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.code = data.error;
    err.detail = data.detail;
    throw err;
  }
  return data;
}

const MusicBox = ({ onClose }) => {
  const [playlists, setPlaylists] = useState(null); // null = lädt
  const [status, setStatus] = useState(null);
  const [noDevice, setNoDevice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [debug, setDebug] = useState('');
  const [activeUri, setActiveUri] = useState(null);
  const pollRef = useRef(null);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await api('status');
      setStatus(s);
    } catch (e) {
      setDebug(`status: ${e.message} ${e.detail || ''}`);
    }
  }, []);

  useEffect(() => {
    api('playlists')
      .then((d) => setPlaylists(d.playlists))
      .catch((e) => {
        setPlaylists([]);
        setDebug(`playlists: ${e.message} ${e.detail || ''}`);
      });
    refreshStatus();
    pollRef.current = setInterval(refreshStatus, 5000);
    return () => clearInterval(pollRef.current);
  }, [refreshStatus]);

  const run = async (action, params) => {
    if (busy) return;
    setBusy(true);
    setDebug('');
    try {
      const r = await api(action, params);
      if (action === 'play') {
        setNoDevice(false);
        setActiveUri(params?.uri || activeUri);
      }
      await refreshStatus();
      return r;
    } catch (e) {
      if (e.code === 'no_device') {
        setNoDevice(true);
      } else {
        setDebug(`${action}: ${e.message} ${e.detail || ''}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const changeVolume = (delta) => {
    const current = status?.volume ?? 50;
    run('volume', { volume: Math.max(0, Math.min(100, current + delta)) });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gradient-to-b from-emerald-400 to-teal-600 rounded-3xl p-5 max-w-sm w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-8" />
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">🎶 Musikbox</h2>
          <button onClick={onClose} className="text-white text-2xl hover:scale-110 transition-transform">✕</button>
        </div>

        {/* Kein Device */}
        {noDevice && (
          <div className="bg-white/20 rounded-2xl p-4 mb-4 text-center text-white space-y-3">
            <div className="text-4xl">📻</div>
            <p className="font-bold">Spotify schläft noch!</p>
            <p className="text-sm text-white/80">Einmal kurz Spotify öffnen, dann klappt es.</p>
            <a
              href="spotify://"
              className="block bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-full"
            >
              Spotify öffnen
            </a>
            <button
              onClick={() => setNoDevice(false)}
              className="block w-full bg-white/30 text-white font-bold py-2 rounded-full"
            >
              Nochmal versuchen
            </button>
          </div>
        )}

        {/* Playlist-Grid */}
        {playlists === null && <p className="text-white text-center py-8">Lade Playlists…</p>}
        {playlists?.length === 0 && (
          <p className="text-white/90 text-center py-8 text-sm">
            Keine Playlists gefunden. Papa muss in Spotify eine Playlist anlegen, deren Name mit „Yuna" beginnt.
          </p>
        )}
        {playlists?.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {playlists.map((p) => (
              <button
                key={p.id}
                onClick={() => run('play', { uri: p.uri })}
                disabled={busy}
                className={`rounded-2xl overflow-hidden shadow-lg text-left bg-white/15
                           hover:scale-[1.03] transition-transform disabled:opacity-60
                           ${activeUri === p.uri ? 'ring-4 ring-yellow-300' : ''}`}
              >
                {p.image ? (
                  <img src={p.image} alt="" className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center text-5xl bg-white/10">🎵</div>
                )}
                <div className="p-2 text-white font-bold text-sm truncate">
                  {p.name.replace(/^yuna\s*/i, '') || p.name}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Mini-Player */}
        <div className="mt-4 bg-white/20 rounded-2xl p-3 text-white">
          <div className="text-center text-sm mb-2 min-h-[1.25rem] truncate">
            {status?.track ? `${status.track} — ${status.artist}` : 'Gerade keine Musik'}
          </div>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => changeVolume(-10)} disabled={busy}
              className="bg-white/25 rounded-full w-12 h-12 text-xl font-bold">🔉</button>
            <button
              onClick={() => (status?.playing ? run('pause') : run('play'))}
              disabled={busy}
              className="bg-white text-teal-600 rounded-full w-16 h-16 text-3xl font-bold shadow-lg"
            >
              {status?.playing ? '⏸' : '▶️'}
            </button>
            <button onClick={() => run('next')} disabled={busy}
              className="bg-white/25 rounded-full w-12 h-12 text-xl">⏭</button>
            <button onClick={() => changeVolume(10)} disabled={busy}
              className="bg-white/25 rounded-full w-12 h-12 text-xl font-bold">🔊</button>
          </div>
        </div>

        {/* Debug */}
        {debug && (
          <div className="mt-3 bg-black/40 rounded-lg p-2 text-[10px] text-white/70 break-all">
            🐞 {VERSION} · {debug}
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicBox;
```

- [ ] **Step 2: Build-Check**

Run: `npm run build`
Expected: Build ok, keine Fehler (Komponente noch nicht eingebunden — nur Syntax/Import-Sicherheit).

- [ ] **Step 3: Commit**

```bash
git add src/MusicBox.jsx
git commit -m "feat: Musikbox-Overlay (Playlist-Tiles, Mini-Player, no_device-Fallback)"
```

---

### Task 5: Einbindung in GameSelect + PetGame

**Files:**
- Modify: `src/GameSelect.jsx` (games-Array, nach `magicpainter`-Eintrag ~Zeile 108-115)
- Modify: `src/PetGame.jsx` (Import oben bei `import MagicPainter from './MagicPainter';` ~Zeile 16; Render-Block nach dem magicpainter-Block ~Zeile 1014)

**Interfaces:**
- Consumes: `MusicBox` aus Task 4
- Produces: Kachel `musicbox` im Spiele-Karussell, öffnet Overlay

- [ ] **Step 1: GameSelect-Eintrag** — in `src/GameSelect.jsx` im `games`-Array direkt nach dem `magicpainter`-Objekt einfügen:

```js
    {
      id: 'musicbox',
      name: 'Musikbox',
      emoji: '🎶',
      description: 'Mach deine Lieblingsmusik an!',
      color: 'from-emerald-400 to-teal-600',
      hasDifficulty: false,
    },
```

- [ ] **Step 2: PetGame-Wiring** — in `src/PetGame.jsx`:

Import ergänzen (neben MagicPainter-Import):
```js
import MusicBox from './MusicBox';
```

Render-Block direkt nach dem `magicpainter`-Block einfügen:
```jsx
      {/* Musikbox: kein Minispiel, keine Münzen — steuert Spotify */}
      {currentGame === 'musicbox' && (
        <MusicBox onClose={() => handleGameEnd(0, false)} />
      )}
```

- [ ] **Step 3: Build + lokaler Smoke-Test**

Run: `npm run build && vercel dev --listen 3000`
Expected: Musikbox-Kachel als 14. Karussell-Karte, Overlay öffnet, Playlists laden (mit `.env`-Creds), Play startet Desktop-Spotify. FALLE beim lokalen Testen: alter Workbox-SW — SW deregistrieren + Caches leeren.

- [ ] **Step 4: Commit**

```bash
git add src/GameSelect.jsx src/PetGame.jsx
git commit -m "feat: Musikbox-Kachel im Spiele-Karussell"
```

---

### Task 6: Vercel-Env, Deploy, Live-Verifikation

**Files:** keine (Ops)

- [ ] **Step 1: Env in BEIDE Vercel-Projekte setzen** (bekannte Falle: `FAL_API_KEY` saß mal nur im falschen Projekt)

```powershell
# im Repo-Root (an yunasgames gelinkt); je Var 3x (production/preview/development)
vercel env add SPOTIFY_CLIENT_ID production
vercel env add SPOTIFY_CLIENT_SECRET production
vercel env add SPOTIFY_REFRESH_TOKEN production
# ... dito preview + development, danach dasselbe für Projekt yunas-pet-game
```
Expected: `vercel env ls` zeigt alle 3 Vars in allen Environments, in beiden Projekten.

- [ ] **Step 2: Push + Deploy**

```bash
git push
```
Expected: Vercel-Auto-Deploy. Deploy-Status abwarten (`vercel ls` oder Dashboard), nicht vorab Vollzug melden.

- [ ] **Step 3: Live-Verifikation**

- `curl.exe -s -X POST https://yunasgames.vercel.app/api/spotify -H "Content-Type: application/json" -d '{\"action\":\"playlists\"}'` → JSON mit Playlists (nicht `SPOTIFY_... not configured`).
- Am Handy: App öffnen (SW zieht neue Version beim nächsten Start), Musikbox-Kachel → Playlist antippen → Musik läuft über Spotify-App, Yunas Games bleibt vorn.
- Spotify-App force-stoppen → Play → „Spotify schläft noch!"-Flow erscheint, „Spotify öffnen"-Link startet die App.

- [ ] **Step 4: Memory aktualisieren**

`project_yunasgames.md`: Musikbox-Absatz ergänzen (Env-Namen, Yuna*-Namenskonvention, no_device-Falle, Dev-Mode-App).
