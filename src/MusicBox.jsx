import React, { useState, useEffect, useRef, useCallback } from 'react';

const VERSION = 'musicbox-3';
const DEVICE_KEY = 'musicboxDevice-v1'; // {id, name} oder leer = nur Handy

const SpeechRec =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const DEVICE_ICONS = {
  Smartphone: '📱',
  Computer: '💻',
  Speaker: '🔊',
  TV: '📺',
  CastVideo: '📺',
  CastAudio: '🔊',
  AVR: '🔊',
};

function loadDevice() {
  try {
    return JSON.parse(localStorage.getItem(DEVICE_KEY)) || null;
  } catch {
    return null;
  }
}

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
  const [errors, setErrors] = useState([]); // sticky, bis ✕
  const [activeUri, setActiveUri] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [listening, setListening] = useState(false);
  const [target, setTarget] = useState(loadDevice); // null = nur Handy
  const [showDevices, setShowDevices] = useState(false);
  const [devices, setDevices] = useState(null);
  const pollRef = useRef(null);
  const recRef = useRef(null);

  const pushError = useCallback((msg) => {
    const time = new Date().toLocaleTimeString('de-DE');
    setErrors((prev) => [...prev.slice(-4), `${time} ${msg}`]);
  }, []);

  const dev = useCallback(
    () => (target?.id ? { deviceId: target.id } : {}),
    [target]
  );

  const refreshStatus = useCallback(async () => {
    try {
      const s = await api('status', dev());
      setStatus(s);
    } catch (e) {
      pushError(`status: ${e.message} ${e.detail || ''}`);
    }
  }, [dev, pushError]);

  useEffect(() => {
    api('playlists')
      .then((d) => setPlaylists(d.playlists))
      .catch((e) => {
        setPlaylists([]);
        pushError(`playlists: ${e.message} ${e.detail || ''}`);
      });
  }, [pushError]);

  useEffect(() => {
    refreshStatus();
    pollRef.current = setInterval(refreshStatus, 5000);
    return () => clearInterval(pollRef.current);
  }, [refreshStatus]);

  const run = async (action, params) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api(action, { ...dev(), ...params });
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
        pushError(`${action}: ${e.message} ${e.detail || ''}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const openDevicePicker = async () => {
    setShowDevices(true);
    setDevices(null);
    try {
      const d = await api('devices');
      setDevices(d.devices);
    } catch (e) {
      setDevices([]);
      pushError(`devices: ${e.message} ${e.detail || ''}`);
    }
  };

  const chooseDevice = (d) => {
    // d = null → Kinder-Default "nur Handy"
    setTarget(d);
    try {
      if (d) localStorage.setItem(DEVICE_KEY, JSON.stringify(d));
      else localStorage.removeItem(DEVICE_KEY);
    } catch { /* Speicher voll/privat — egal, gilt dann nur für diese Sitzung */ }
    setShowDevices(false);
    setNoDevice(false);
  };

  const doSearch = async (text) => {
    const qq = (text ?? query).trim();
    if (!qq) return;
    setSearching(true);
    try {
      const d = await api('search', { q: qq });
      setResults(d.results);
    } catch (e) {
      pushError(`search: ${e.message} ${e.detail || ''}`);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const startVoice = () => {
    if (!SpeechRec) {
      pushError('Spracheingabe wird von diesem Browser nicht unterstützt.');
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SpeechRec();
    recRef.current = rec;
    rec.lang = 'de-DE';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const text = ev.results[0]?.[0]?.transcript || '';
      setQuery(text);
      if (text) doSearch(text);
    };
    rec.onerror = (ev) => {
      setListening(false);
      if (ev.error !== 'aborted' && ev.error !== 'no-speech') {
        pushError(`mikro: ${ev.error}`);
      }
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
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
          <button
            onClick={openDevicePicker}
            title="Gerät wählen"
            className="text-white text-xl bg-white/20 rounded-full px-2.5 py-1.5 hover:scale-110 transition-transform"
          >
            {target ? DEVICE_ICONS[target.type] || '📻' : '📱'}
          </button>
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">🎶 Musikbox</h2>
          <button onClick={onClose} className="text-white text-2xl hover:scale-110 transition-transform">✕</button>
        </div>

        {/* Geräte-Auswahl */}
        {showDevices && (
          <div className="bg-white/20 rounded-2xl p-3 mb-4 text-white">
            <div className="font-bold text-sm mb-2">Wo soll die Musik spielen?</div>
            <button
              onClick={() => chooseDevice(null)}
              className={`w-full flex items-center gap-2 rounded-xl p-2 text-left mb-1
                         ${!target ? 'bg-yellow-300/30 ring-2 ring-yellow-300' : 'bg-white/15 hover:bg-white/25'}`}
            >
              <span className="text-xl">📱</span>
              <span className="font-bold text-sm">Nur Handy (Standard)</span>
            </button>
            {devices === null && <p className="text-white/80 text-xs text-center py-2">Suche Geräte…</p>}
            {devices?.length === 0 && (
              <p className="text-white/80 text-xs text-center py-2">
                Keine Geräte gefunden — Spotify irgendwo öffnen.
              </p>
            )}
            {devices?.map((d) => (
              <button
                key={d.id}
                onClick={() => chooseDevice(d)}
                className={`w-full flex items-center gap-2 rounded-xl p-2 text-left mb-1
                           ${target?.id === d.id ? 'bg-yellow-300/30 ring-2 ring-yellow-300' : 'bg-white/15 hover:bg-white/25'}`}
              >
                <span className="text-xl">{DEVICE_ICONS[d.type] || '📻'}</span>
                <span className="font-bold text-sm truncate">{d.name}</span>
                {d.active && <span className="ml-auto text-xs text-white/70">spielt</span>}
              </button>
            ))}
            <button onClick={() => setShowDevices(false)} className="w-full text-white/70 text-xs py-1 mt-1">
              Schließen
            </button>
          </div>
        )}

        {/* Suche: Mikro groß, Textfeld als Fallback */}
        <div className="mb-4">
          <div className="flex gap-2 items-center">
            <button
              onClick={startVoice}
              className={`shrink-0 rounded-full w-14 h-14 text-2xl shadow-lg transition-all
                         ${listening ? 'bg-red-500 animate-pulse scale-110' : 'bg-white/25'}`}
              title="Sprich den Namen von Lied oder Hörspiel"
            >
              🎤
            </button>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              placeholder={listening ? 'Ich höre zu…' : 'Was willst du hören?'}
              className="flex-1 min-w-0 rounded-full px-4 py-3 bg-white/90 text-teal-900 placeholder-teal-700/50 font-bold outline-none"
            />
            <button
              onClick={() => doSearch()}
              disabled={searching || !query.trim()}
              className="shrink-0 bg-white/25 rounded-full w-12 h-12 text-xl disabled:opacity-40"
            >
              🔍
            </button>
          </div>

          {searching && <p className="text-white/80 text-center text-sm mt-3">Suche…</p>}
          {results?.length === 0 && !searching && (
            <p className="text-white/80 text-center text-sm mt-3">Nichts gefunden — sag es nochmal!</p>
          )}
          {results?.length > 0 && (
            <div className="mt-3 space-y-2">
              {results.map((r) => (
                <button
                  key={r.uri}
                  onClick={() => run('play', { uri: r.uri })}
                  disabled={busy}
                  className={`w-full flex items-center gap-3 bg-white/15 rounded-xl p-2 text-left
                             hover:bg-white/25 transition-colors disabled:opacity-60
                             ${activeUri === r.uri ? 'ring-2 ring-yellow-300' : ''}`}
                >
                  {r.image ? (
                    <img src={r.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-xl shrink-0">🎵</div>
                  )}
                  <div className="min-w-0">
                    <div className="text-white font-bold text-sm truncate">{r.name}</div>
                    <div className="text-white/70 text-xs truncate">
                      {r.type === 'album' ? '💿 ' : '🎵 '}{r.artist}
                    </div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => { setResults(null); setQuery(''); }}
                className="w-full text-white/70 text-xs py-1"
              >
                Suche schließen
              </button>
            </div>
          )}
        </div>

        {/* Kein Device */}
        {noDevice && (
          <div className="bg-white/20 rounded-2xl p-4 mb-4 text-center text-white space-y-3">
            <div className="text-4xl">📻</div>
            <p className="font-bold">Spotify schläft noch!</p>
            <p className="text-sm text-white/80">
              {target ? `${target.name} ist nicht erreichbar.` : 'Einmal kurz Spotify öffnen, dann klappt es.'}
            </p>
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
            {status?.track
              ? `${status.track} — ${status.artist}`
              : status?.elsewhere
                ? `Musik läuft woanders (${status.elsewhere})`
                : 'Gerade keine Musik'}
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

        {/* Fehler-Log: sticky, bis ✕ gedrückt */}
        {errors.length > 0 && (
          <div className="mt-3 bg-black/40 rounded-lg p-2 text-[10px] text-white/70">
            <div className="flex justify-between items-center mb-1">
              <span>🐞 {VERSION}</span>
              <button onClick={() => setErrors([])} className="text-white/70 px-1">✕</button>
            </div>
            {errors.map((e, i) => (
              <div key={i} className="break-all">{e}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicBox;
