import React, { useState, useEffect, useRef, useCallback } from 'react';

const VERSION = 'musicbox-2';

const SpeechRec =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // null = keine Suche aktiv
  const [searching, setSearching] = useState(false);
  const [listening, setListening] = useState(false);
  const pollRef = useRef(null);
  const recRef = useRef(null);

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

  const doSearch = async (text) => {
    const qq = (text ?? query).trim();
    if (!qq) return;
    setSearching(true);
    setDebug('');
    try {
      const d = await api('search', { q: qq });
      setResults(d.results);
    } catch (e) {
      setDebug(`search: ${e.message} ${e.detail || ''}`);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const startVoice = () => {
    if (!SpeechRec) {
      setDebug('Spracheingabe wird von diesem Browser nicht unterstützt.');
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
        setDebug(`mikro: ${ev.error}`);
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
          <div className="w-8" />
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">🎶 Musikbox</h2>
          <button onClick={onClose} className="text-white text-2xl hover:scale-110 transition-transform">✕</button>
        </div>

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
