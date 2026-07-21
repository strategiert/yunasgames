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
