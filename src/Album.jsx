import React, { useEffect, useRef, useState } from 'react';
import { listSessions } from './lib/galleryDb';

// Sticker-Bedingungen laufen gegen { level, stats } — alles ableitbar, nichts extra speichern
const STICKERS = [
  { id: 'lvl2', emoji: '⭐', name: 'Aufsteiger', hint: 'Erreiche Level 2', cond: (c) => c.level >= 2 },
  { id: 'lvl5', emoji: '🌟', name: 'Superstar', hint: 'Erreiche Level 5', cond: (c) => c.level >= 5 },
  { id: 'lvl10', emoji: '💫', name: 'Legende', hint: 'Erreiche Level 10', cond: (c) => c.level >= 10 },
  { id: 'game1', emoji: '🎮', name: 'Erstes Spiel', hint: 'Spiel ein Minispiel', cond: (c) => (c.stats.games || 0) >= 1 },
  { id: 'game10', emoji: '🕹️', name: 'Spielprofi', hint: 'Spiel 10 Minispiele', cond: (c) => (c.stats.games || 0) >= 10 },
  { id: 'game50', emoji: '🏆', name: 'Spielmeister', hint: 'Spiel 50 Minispiele', cond: (c) => (c.stats.games || 0) >= 50 },
  { id: 'feed10', emoji: '🍖', name: 'Leckerli-Chef', hint: 'Fütter 10×', cond: (c) => (c.stats.feeds || 0) >= 10 },
  { id: 'feed100', emoji: '🍗', name: 'Futter-König', hint: 'Fütter 100×', cond: (c) => (c.stats.feeds || 0) >= 100 },
  { id: 'draw1', emoji: '🎨', name: 'Erstes Zauberbild', hint: 'Mal im Zauber-Maler', cond: (c) => (c.stats.drawings || 0) >= 1 },
  { id: 'draw10', emoji: '🖌️', name: 'Zauber-Künstler', hint: 'Mal 10 Zauberbilder', cond: (c) => (c.stats.drawings || 0) >= 10 },
  { id: 'streak3', emoji: '🔥', name: '3-Tage-Serie', hint: 'Schaff 3 Tage alle Aufgaben', cond: (c) => (c.stats.bestStreak || 0) >= 3 },
  { id: 'streak7', emoji: '🚀', name: 'Wochen-Serie', hint: 'Schaff 7 Tage alle Aufgaben', cond: (c) => (c.stats.bestStreak || 0) >= 7 },
];

const STYLE_LABELS = { pixar: '🎬 Pixar', comic: '💥 Comic', anime: '🌸 Anime' };

const Album = ({ level, stats, poster, onSetPoster, onClose }) => {
  const [picking, setPicking] = useState(false);
  const [sessions, setSessions] = useState(null);
  const [pickedSession, setPickedSession] = useState(null);
  const urlsRef = useRef(new Set());

  const trackUrl = (blob) => {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    return url;
  };

  useEffect(() => {
    const urls = urlsRef.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const openPicker = async () => {
    const list = await listSessions();
    setSessions(
      list.map((s) => ({
        id: s.id,
        thumbUrl: trackUrl(s.drawing),
        styles: Object.entries(s.results || {})
          .filter(([, blob]) => blob)
          .map(([key, blob]) => ({ key, url: trackUrl(blob) })),
      }))
    );
    setPickedSession(null);
    setPicking(true);
  };

  const ctx = { level, stats };
  const unlockedCount = STICKERS.filter((s) => s.cond(ctx)).length;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-amber-200 to-orange-300 z-50 overflow-y-auto">
      <div className="max-w-md mx-auto p-4 min-h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="w-8" />
          <h2 className="text-xl font-bold text-amber-900 drop-shadow">📖 Sammelalbum</h2>
          <button onClick={onClose} className="text-amber-900 text-2xl hover:scale-110 transition-transform">
            ✕
          </button>
        </div>

        {/* Poster fürs Zimmer */}
        <div className="bg-white/70 rounded-2xl p-4 mb-4 shadow">
          <h3 className="font-bold mb-2">🖼️ Poster im Zimmer</h3>
          <div className="flex items-center gap-3">
            {poster ? (
              <span className="text-sm text-gray-700">Ein Zauberbild hängt an der Wand rechts ✓</span>
            ) : (
              <span className="text-sm text-gray-500">Noch kein Poster aufgehängt</span>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={openPicker}
              className="bg-violet-500 hover:bg-violet-600 text-white font-bold px-4 py-2 rounded-full text-sm"
            >
              Zauberbild aussuchen
            </button>
            {poster && (
              <button
                onClick={() => onSetPoster(null)}
                className="bg-gray-200 text-gray-600 font-bold px-4 py-2 rounded-full text-sm"
              >
                Abhängen
              </button>
            )}
          </div>
        </div>

        {/* Sticker */}
        <h3 className="font-bold text-amber-900 mb-2">
          Sticker {unlockedCount}/{STICKERS.length}
        </h3>
        <div className="grid grid-cols-3 gap-3 pb-8">
          {STICKERS.map((s) => {
            const unlocked = s.cond(ctx);
            return (
              <div
                key={s.id}
                className={`rounded-2xl p-3 text-center shadow ${
                  unlocked ? 'bg-white' : 'bg-white/40'
                }`}
              >
                <div className={`text-4xl mb-1 ${unlocked ? '' : 'grayscale opacity-40'}`}>
                  {unlocked ? s.emoji : '❓'}
                </div>
                <div className="text-xs font-bold text-gray-700">{unlocked ? s.name : '???'}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{s.hint}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Poster-Picker */}
      {picking && (
        <div
          className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4"
          onClick={() => setPicking(false)}
        >
          <div
            className="bg-white rounded-3xl p-4 w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {!pickedSession ? (
              <>
                <h3 className="font-bold text-center mb-3">Welche Zeichnung?</h3>
                {sessions && sessions.length === 0 && (
                  <p className="text-center text-gray-500 text-sm">
                    Noch keine Zauberbilder — mal erst eins! 🖌
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {(sessions || []).map((s) => (
                    <img
                      key={s.id}
                      src={s.thumbUrl}
                      alt="Zeichnung"
                      className="w-full aspect-square object-cover rounded-xl bg-gray-100 cursor-pointer"
                      onClick={() => setPickedSession(s)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold text-center mb-3">Welcher Stil?</h3>
                {pickedSession.styles.length === 0 && (
                  <p className="text-center text-gray-500 text-sm">
                    Zu dieser Zeichnung sind keine Zauberbilder gespeichert.
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {pickedSession.styles.map((st) => (
                    <button key={st.key} onClick={() => {
                      onSetPoster({ sessionId: pickedSession.id, styleKey: st.key });
                      setPicking(false);
                    }}>
                      <img src={st.url} alt={st.key} className="w-full aspect-square object-cover rounded-xl" />
                      <div className="text-xs mt-1">{STYLE_LABELS[st.key] || st.key}</div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPickedSession(null)}
                  className="mt-3 text-sm text-gray-500 underline"
                >
                  ← andere Zeichnung
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Album;
