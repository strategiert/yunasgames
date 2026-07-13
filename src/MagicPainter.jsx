import React, { useState, useRef, useEffect, useCallback } from 'react';
import { saveSession, listSessions, deleteSession } from './lib/galleryDb';

const CANVAS_SIZE = 1024;

const COLORS = [
  '#000000', '#ef4444', '#f97316', '#facc15', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#92400e', '#64748b',
];

const SIZES = [
  { id: 'small', px: 6, label: 'Dünn' },
  { id: 'medium', px: 14, label: 'Mittel' },
  { id: 'large', px: 28, label: 'Dick' },
];

const STYLES = [
  { key: 'pixar', label: 'Pixar', emoji: '🎬' },
  { key: 'comic', label: 'Comic', emoji: '💥' },
  { key: 'anime', label: 'Anime', emoji: '🌸' },
];

// Außerhalb von MagicPainter definiert: PetGame re-rendert periodisch (Stats-Intervall),
// innere Komponenten-Definitionen würden bei jedem Render remounten (Scroll-Reset, Bild-Flackern).
const StyleCard = ({ styleDef, state, onRetry, onFullscreen, onDownload }) => {
  const status = state?.status || 'loading';
  return (
    <div className="bg-white/20 rounded-2xl p-3">
      <div className="text-white font-bold mb-2 text-center">
        {styleDef.emoji} {styleDef.label}
      </div>
      {status === 'done' && (
        <div className="relative">
          <img
            src={state.url}
            alt={styleDef.label}
            className="w-full rounded-xl cursor-pointer"
            onClick={() => onFullscreen({ url: state.url, label: styleDef.label })}
          />
          <button
            onClick={() => onDownload(state.url, styleDef.label)}
            className="absolute bottom-2 right-2 bg-white/80 hover:bg-white rounded-full w-10 h-10 text-xl shadow"
          >
            ⬇
          </button>
        </div>
      )}
      {status === 'loading' && (
        <div className="aspect-square flex flex-col items-center justify-center gap-2">
          <div className="text-5xl animate-pulse">✨</div>
          <div className="text-white/80 text-sm">Zaubert…</div>
        </div>
      )}
      {status === 'error' && (
        <div className="aspect-square flex flex-col items-center justify-center gap-3 text-center px-2">
          <div className="text-4xl">😵‍💫</div>
          <div className="text-white text-sm">Der Zauber hat nicht geklappt!</div>
          <button
            onClick={onRetry}
            className="bg-white/30 hover:bg-white/50 text-white font-bold py-2 px-4 rounded-full"
          >
            🔁 Nochmal
          </button>
        </div>
      )}
      {status === 'missing' && (
        <div className="aspect-square flex items-center justify-center text-white/60 text-sm">
          Kein Bild gespeichert
        </div>
      )}
    </div>
  );
};

const Header = ({ title, onGallery, onClose, backTo }) => (
  <div className="flex items-center justify-between mb-3">
    {backTo ? (
      <button onClick={backTo} className="text-white text-2xl hover:scale-110 transition-transform">
        ←
      </button>
    ) : (
      <div className="w-8" />
    )}
    <h2 className="text-xl font-bold text-white drop-shadow-lg">{title}</h2>
    <div className="flex gap-2 items-center">
      {onGallery && (
        <button onClick={onGallery} className="text-2xl hover:scale-110 transition-transform">
          📚
        </button>
      )}
      <button onClick={onClose} className="text-white text-2xl hover:scale-110 transition-transform">
        ✕
      </button>
    </div>
  </div>
);

const MagicPainter = ({ onClose }) => {
  const [view, setView] = useState('draw'); // draw | result | gallery | session
  const [strokes, setStrokes] = useState([]);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(SIZES[1].px);
  const [eraser, setEraser] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [results, setResults] = useState({}); // key -> {status, url}
  const [drawingPreview, setDrawingPreview] = useState(null);
  const [fullscreen, setFullscreen] = useState(null); // {url, label}
  const [sessions, setSessions] = useState(null);
  const [viewingSession, setViewingSession] = useState(null); // {id, drawingUrl, items}
  const [confirmDelete, setConfirmDelete] = useState(null);

  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef(null);
  const dataUriRef = useRef(null);
  const sessionRef = useRef(null); // { id, createdAt, drawing: Blob, results: {} }
  const objectUrlsRef = useRef(new Set());

  const trackUrl = useCallback((blob) => {
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  // Alle Object-URLs beim Schließen freigeben
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  // --- Canvas ---

  const drawStroke = (ctx, stroke) => {
    if (stroke.points.length === 0) return;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    if (stroke.points.length === 1) {
      // Punkt: winzige Linie, damit ein Tupfer sichtbar ist
      ctx.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y + 0.1);
    } else {
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
    }
    ctx.stroke();
  };

  const redraw = useCallback((strokeList) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    strokeList.forEach((s) => drawStroke(ctx, s));
  }, []);

  // Weißen Grund initial malen (wichtig fürs exportierte PNG)
  useEffect(() => {
    if (view === 'draw') redraw(strokes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const canvasPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const stroke = {
      color: eraser ? '#ffffff' : color,
      size: eraser ? size * 2.5 : size,
      points: [canvasPoint(e)],
    };
    currentStrokeRef.current = stroke;
    drawStroke(canvasRef.current.getContext('2d'), stroke);
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    const stroke = currentStrokeRef.current;
    const p = canvasPoint(e);
    const last = stroke.points[stroke.points.length - 1];
    stroke.points.push(p);
    // Nur das neue Segment zeichnen (schnell), kein Voll-Redraw
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    if (stroke) setStrokes((prev) => [...prev, stroke]);
  };

  const undo = () => {
    setStrokes((prev) => {
      const next = prev.slice(0, -1);
      redraw(next);
      return next;
    });
  };

  const clearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 2500);
      return;
    }
    setConfirmClear(false);
    setStrokes([]);
    redraw([]);
  };

  // --- Generierung ---

  const runStyle = async (styleKey, dataUri) => {
    setResults((prev) => ({ ...prev, [styleKey]: { status: 'loading' } }));
    try {
      const res = await fetch('/api/paint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUri, style: styleKey }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const { url } = await res.json();
      const imgRes = await fetch(url);
      if (!imgRes.ok) throw new Error('Bild-Download fehlgeschlagen');
      const blob = await imgRes.blob();
      const objUrl = trackUrl(blob);
      setResults((prev) => ({ ...prev, [styleKey]: { status: 'done', url: objUrl } }));
      if (sessionRef.current) {
        sessionRef.current.results[styleKey] = blob;
        await saveSession({ ...sessionRef.current, results: { ...sessionRef.current.results } });
      }
    } catch (err) {
      console.error(`Zauber-Maler ${styleKey}:`, err);
      setResults((prev) => ({ ...prev, [styleKey]: { status: 'error' } }));
    }
  };

  const generate = async () => {
    const canvas = canvasRef.current;
    const dataUri = canvas.toDataURL('image/png');
    dataUriRef.current = dataUri;
    const drawingBlob = await new Promise((r) => canvas.toBlob(r, 'image/png'));

    sessionRef.current = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      drawing: drawingBlob,
      results: { pixar: null, comic: null, anime: null },
    };
    setDrawingPreview(trackUrl(drawingBlob));
    setResults({});
    setView('result');
    STYLES.forEach((s) => runStyle(s.key, dataUri));
  };

  const retryStyle = (styleKey) => {
    if (dataUriRef.current) runStyle(styleKey, dataUriRef.current);
  };

  const startOver = () => {
    setStrokes([]);
    setResults({});
    sessionRef.current = null;
    dataUriRef.current = null;
    setView('draw');
  };

  // --- Galerie ---

  const openGallery = async () => {
    const list = await listSessions();
    setSessions(
      list.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        thumbUrl: trackUrl(s.drawing),
        raw: s,
      }))
    );
    setConfirmDelete(null);
    setView('gallery');
  };

  const openSession = (entry) => {
    const items = STYLES.map((st) => {
      const blob = entry.raw.results?.[st.key];
      return {
        ...st,
        status: blob ? 'done' : 'missing',
        url: blob ? trackUrl(blob) : null,
      };
    });
    setViewingSession({
      id: entry.id,
      drawingUrl: entry.thumbUrl,
      items,
    });
    setView('session');
  };

  const handleDelete = async (id) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 2500);
      return;
    }
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setConfirmDelete(null);
  };

  const download = (url, label) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `zauberbild-${label.toLowerCase()}.jpg`;
    a.click();
  };

  const formatDate = (ts) =>
    new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

  // --- Views ---

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-violet-400 to-fuchsia-500 z-50 overflow-y-auto">
      <div className="max-w-md mx-auto p-4 min-h-full">
        {view === 'draw' && (
          <>
            <Header title="🎨 Zauber-Maler" onGallery={openGallery} onClose={onClose} />
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="w-full aspect-square block"
                style={{ touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />
            </div>

            {/* Farben */}
            <div className="flex justify-between mt-3 px-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c);
                    setEraser(false);
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    color === c && !eraser ? 'border-white scale-125' : 'border-white/40'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Pinselgrößen + Werkzeuge */}
            <div className="flex items-center justify-between mt-3 px-1">
              <div className="flex items-center gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSize(s.px)}
                    className={`rounded-full bg-white/30 flex items-center justify-center transition-transform w-10 h-10 ${
                      size === s.px ? 'ring-2 ring-white scale-110' : ''
                    }`}
                    title={s.label}
                  >
                    <span
                      className="rounded-full bg-white block"
                      style={{ width: s.px / 2 + 4, height: s.px / 2 + 4 }}
                    />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEraser(!eraser)}
                  className={`w-10 h-10 rounded-full bg-white/30 text-xl ${
                    eraser ? 'ring-2 ring-white scale-110' : ''
                  }`}
                  title="Radierer"
                >
                  🧽
                </button>
                <button
                  onClick={undo}
                  disabled={strokes.length === 0}
                  className="w-10 h-10 rounded-full bg-white/30 text-xl disabled:opacity-40"
                  title="Rückgängig"
                >
                  ↩️
                </button>
                <button
                  onClick={clearAll}
                  disabled={strokes.length === 0}
                  className={`h-10 rounded-full bg-white/30 text-xl disabled:opacity-40 px-2 ${
                    confirmClear ? 'ring-2 ring-red-400' : 'w-10'
                  }`}
                  title="Alles löschen"
                >
                  {confirmClear ? 'Wirklich? 🗑️' : '🗑️'}
                </button>
              </div>
            </div>

            <button
              onClick={generate}
              disabled={strokes.length === 0}
              className="w-full mt-4 bg-gradient-to-r from-amber-400 to-orange-500 disabled:opacity-40
                         text-white text-xl font-bold py-4 rounded-2xl shadow-lg
                         hover:scale-[1.02] transition-transform"
            >
              Fertig ✨
            </button>
          </>
        )}

        {view === 'result' && (
          <>
            <Header title="✨ Deine Zauberbilder" onGallery={openGallery} onClose={onClose} />
            {drawingPreview && (
              <div className="flex justify-center mb-3">
                <img
                  src={drawingPreview}
                  alt="Deine Zeichnung"
                  className="w-24 h-24 rounded-xl bg-white shadow object-cover"
                />
              </div>
            )}
            <div className="space-y-3">
              {STYLES.map((st) => (
                <StyleCard
                  key={st.key}
                  styleDef={st}
                  state={results[st.key]}
                  onRetry={() => retryStyle(st.key)}
                  onFullscreen={setFullscreen}
                  onDownload={download}
                />
              ))}
            </div>
            <button
              onClick={startOver}
              className="w-full mt-4 bg-white/30 hover:bg-white/40 text-white text-lg font-bold py-3 rounded-2xl"
            >
              🖌 Nochmal malen
            </button>
          </>
        )}

        {view === 'gallery' && (
          <>
            <Header
              title="📚 Galerie"
              onClose={onClose}
              backTo={() => setView(sessionRef.current ? 'result' : 'draw')}
            />
            {sessions && sessions.length === 0 && (
              <div className="text-center text-white/80 mt-12 text-lg">
                Noch keine Zauberbilder —<br />mal was! 🖌
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {(sessions || []).map((s) => (
                <div key={s.id} className="bg-white/20 rounded-2xl p-2 relative">
                  <img
                    src={s.thumbUrl}
                    alt="Zeichnung"
                    className="w-full aspect-square object-cover rounded-xl bg-white cursor-pointer"
                    onClick={() => openSession(s)}
                  />
                  <div className="flex items-center justify-between mt-1 px-1">
                    <span className="text-white/80 text-xs">{formatDate(s.createdAt)}</span>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className={`text-sm ${confirmDelete === s.id ? 'text-red-200 font-bold' : 'text-white/70'}`}
                    >
                      {confirmDelete === s.id ? 'Wirklich?' : '🗑️'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'session' && viewingSession && (
          <>
            <Header title="✨ Zauberbilder" onClose={onClose} backTo={() => setView('gallery')} />
            <div className="flex justify-center mb-3">
              <img
                src={viewingSession.drawingUrl}
                alt="Zeichnung"
                className="w-24 h-24 rounded-xl bg-white shadow object-cover"
              />
            </div>
            <div className="space-y-3">
              {viewingSession.items.map((item) => (
                <StyleCard
                  key={item.key}
                  styleDef={item}
                  state={item}
                  onFullscreen={setFullscreen}
                  onDownload={download}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Vollbild-Modal */}
      {fullscreen && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-4"
          onClick={() => setFullscreen(null)}
        >
          <img src={fullscreen.url} alt={fullscreen.label} className="max-w-full max-h-[80vh] rounded-xl" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              download(fullscreen.url, fullscreen.label);
            }}
            className="mt-4 bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-6 rounded-full"
          >
            ⬇ Speichern
          </button>
        </div>
      )}
    </div>
  );
};

export default MagicPainter;
