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
