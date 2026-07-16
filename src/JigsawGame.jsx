import React, { useState, useEffect, useRef } from 'react';

// Configuration
const DIFFICULTY_SETTINGS = {
    easy: { rows: 4, cols: 3, label: 'Easy (12)' },    // 9:16 approx
    medium: { rows: 6, cols: 4, label: 'Medium (24)' },
    hard: { rows: 8, cols: 5, label: 'Hard (40)' },
};

const BOARD_WIDTH = 300;
const BOARD_HEIGHT = 533;
const SNAP_TOLERANCE = 25;

// Arbeitsfläche rund um den Ziel-Rahmen: Teile dort parken, ohne dass sie verschwinden
const WORK_MARGIN = 70;
const VIEW_W = BOARD_WIDTH + 2 * WORK_MARGIN;
const VIEW_H = BOARD_HEIGHT + 2 * WORK_MARGIN;

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const bestTimeFor = (difficulty) => {
    const v = parseInt(localStorage.getItem(`jigsaw-best-${difficulty}`), 10);
    return Number.isFinite(v) ? v : null;
};

// --- SOUNDS (WebAudio, keine Assets) ---
let audioCtx = null;

const tone = (freq, delay, dur, vol = 0.2) => {
    const t = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur);
};

const playSnapSound = () => {
    try {
        audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
        tone(660, 0, 0.12);
        tone(990, 0.06, 0.15);
    } catch { /* Audio nicht verfügbar — egal */ }
};

const playWinSound = () => {
    try {
        audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
        [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3));
    } catch { /* Audio nicht verfügbar — egal */ }
};

const JigsawGame = ({ onClose, onWin }) => {
    const [screen, setScreen] = useState('menu'); // menu, playing, won
    const [image, setImage] = useState(null);
    const [difficulty, setDifficulty] = useState('easy');
    const [pieces, setPieces] = useState([]);
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [score, setScore] = useState(0);

    // Drag state
    const [draggedPiece, setDraggedPiece] = useState(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const svgRef = useRef(null);

    // QoL state
    const [showPreview, setShowPreview] = useState(false);
    const [justPlacedId, setJustPlacedId] = useState(null);

    // Timer / Highscore
    const [elapsed, setElapsed] = useState(0);
    const [finalTime, setFinalTime] = useState(null);
    const [bestTime, setBestTime] = useState(null);
    const [isNewRecord, setIsNewRecord] = useState(false);
    const startRef = useRef(null);

    useEffect(() => {
        if (screen !== 'playing') return;
        const iv = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        }, 500);
        return () => clearInterval(iv);
    }, [screen]);

    // --- JIGSAW ENGINE ---

    // Edge with a tab/slot. `travel` (+1/-1) is the direction along the edge,
    // `bump` (+1/-1) is the absolute direction of the tab so both neighbouring
    // pieces produce complementary outie/innie shapes.
    const renderEdge = (length, type, isVertical, isBackwards = false) => {
        const tabSize = length * 0.25;
        const base = length * 0.35;
        const mid = (length - 2 * base) / 2;
        const travel = isBackwards ? -1 : 1;
        const bump = type;

        if (isVertical) {
            return ` l 0 ${travel * base} q ${bump * tabSize} 0 ${bump * tabSize} ${travel * mid} q 0 ${travel * mid} ${-bump * tabSize} ${travel * mid} l 0 ${travel * base}`;
        }
        return ` l ${travel * base} 0 q 0 ${bump * tabSize} ${travel * mid} ${bump * tabSize} q ${travel * mid} 0 ${travel * mid} ${-bump * tabSize} l ${travel * base} 0`;
    };

    const generateJigsawPaths = (rows, cols, width, height) => {
        const pieceWidth = width / cols;
        const pieceHeight = height / rows;
        const generatedPieces = [];

        // 0: flat, 1: bump in +x/+y, -1: bump in -x/-y (absolute directions)
        const vEdges = Array(rows).fill().map(() => Array(cols + 1).fill(0).map(() => Math.random() < 0.5 ? 1 : -1));
        const hEdges = Array(rows + 1).fill().map(() => Array(cols).fill(0).map(() => Math.random() < 0.5 ? 1 : -1));

        // Fix borders to be flat (0)
        for (let r = 0; r < rows; r++) { vEdges[r][0] = 0; vEdges[r][cols] = 0; }
        for (let c = 0; c < cols; c++) { hEdges[0][c] = 0; hEdges[rows][c] = 0; }

        // Ablage-Reihenfolge mischen
        const trayOrder = Array.from({ length: rows * cols }, (_, i) => i);
        for (let i = trayOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [trayOrder[i], trayOrder[j]] = [trayOrder[j], trayOrder[i]];
        }

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const top = hEdges[r][c];
                const right = vEdges[r][c + 1];
                const bottom = hEdges[r + 1][c];
                const left = vEdges[r][c];

                // Absolute path, clockwise from top-left corner
                let d = `M ${c * pieceWidth} ${r * pieceHeight}`;

                if (top === 0) d += ` l ${pieceWidth} 0`;
                else d += renderEdge(pieceWidth, top, false);

                if (right === 0) d += ` l 0 ${pieceHeight}`;
                else d += renderEdge(pieceHeight, right, true);

                if (bottom === 0) d += ` l ${-pieceWidth} 0`;
                else d += renderEdge(pieceWidth, bottom, false, true);

                if (left === 0) d += ` l 0 ${-pieceHeight}`;
                else d += renderEdge(pieceHeight, left, true, true);

                d += ' Z';

                generatedPieces.push({
                    id: `${r}-${c}`,
                    r, c,
                    correctX: c * pieceWidth,
                    correctY: r * pieceHeight,
                    currentX: 0,
                    currentY: 0,
                    width: pieceWidth,
                    height: pieceHeight,
                    path: d,
                    isPlaced: false,
                    inTray: true,
                    trayIndex: trayOrder[r * cols + c],
                });
            }
        }
        return generatedPieces;
    };

    // --- GAME LOGIC ---

    const initGame = () => {
        const { rows, cols } = DIFFICULTY_SETTINGS[difficulty];
        setPieces(generateJigsawPaths(rows, cols, BOARD_WIDTH, BOARD_HEIGHT));
        startRef.current = Date.now();
        setElapsed(0);
        setFinalTime(null);
        setIsNewRecord(false);
        setScreen('playing');
    };

    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

    const toSvgCoords = (e) => {
        const svgRect = svgRef.current.getBoundingClientRect();
        return {
            x: -WORK_MARGIN + (e.clientX - svgRect.left) * (VIEW_W / svgRect.width),
            y: -WORK_MARGIN + (e.clientY - svgRect.top) * (VIEW_H / svgRect.height),
        };
    };

    const clampX = (v, w) => clamp(v, -WORK_MARGIN, BOARD_WIDTH + WORK_MARGIN - w);
    const clampY = (v, h) => clamp(v, -WORK_MARGIN, BOARD_HEIGHT + WORK_MARGIN - h);

    // Teil aus der Ablage aufnehmen: erscheint zentriert unterm Finger
    const handleTrayPick = (e, piece) => {
        if (piece.isPlaced || draggedPiece) return;
        e.preventDefault();
        const { x, y } = toSvgCoords(e);
        setOffset({ x: piece.width / 2, y: piece.height / 2 });
        setPieces(prev => prev.map(p => p.id === piece.id ? {
            ...p,
            inTray: false,
            currentX: clampX(x - piece.width / 2, p.width),
            currentY: clampY(y - piece.height / 2, p.height),
        } : p));
        setDraggedPiece(piece);
    };

    // Geparktes Teil auf der Arbeitsfläche wieder aufnehmen
    const handleBoardPick = (e, piece) => {
        if (piece.isPlaced || draggedPiece) return;
        e.preventDefault();
        const { x, y } = toSvgCoords(e);
        setOffset({ x: x - piece.currentX, y: y - piece.currentY });
        setDraggedPiece(piece);
    };

    const handleDragEnd = () => {
        if (!draggedPiece) return;

        // draggedPiece holds the position from drag START — read the live one
        const piece = pieces.find(p => p.id === draggedPiece.id);
        if (!piece) { setDraggedPiece(null); return; }

        const dist = Math.hypot(piece.currentX - piece.correctX, piece.currentY - piece.correctY);

        if (dist < SNAP_TOLERANCE) {
            setPieces(prev => prev.map(p =>
                p.id === piece.id ? { ...p, currentX: p.correctX, currentY: p.correctY, isPlaced: true } : p
            ));

            // Snap-Feedback: Blitz + Sound + Vibration
            setJustPlacedId(piece.id);
            setTimeout(() => setJustPlacedId(null), 600);
            playSnapSound();
            navigator.vibrate?.(40);

            const allPlaced = pieces.every(p => p.id === piece.id || p.isPlaced);
            if (allPlaced) {
                const time = Math.floor((Date.now() - startRef.current) / 1000);
                setFinalTime(time);
                const key = `jigsaw-best-${difficulty}`;
                const prev = bestTimeFor(difficulty);
                if (prev === null || time < prev) {
                    localStorage.setItem(key, String(time));
                    setBestTime(time);
                    setIsNewRecord(true);
                } else {
                    setBestTime(prev);
                    setIsNewRecord(false);
                }
                setTimeout(() => {
                    setScreen('won');
                    playWinSound();
                    const reward = difficulty === 'hard' ? 30 : difficulty === 'medium' ? 20 : 10;
                    setScore(reward);
                }, 500);
            }
        }
        // Nicht getroffen → Teil bleibt liegen, wo es ist (Arbeitsfläche = Parkplatz)

        setDraggedPiece(null);
    };

    // Drag läuft über Window-Listener: startet in der Ablage, endet auf dem Board
    useEffect(() => {
        if (!draggedPiece) return;

        const move = (e) => {
            e.preventDefault();
            if (!svgRef.current) return;
            const { x, y } = toSvgCoords(e);
            setPieces(prev => prev.map(p =>
                p.id === draggedPiece.id ? {
                    ...p,
                    currentX: clampX(x - offset.x, p.width),
                    currentY: clampY(y - offset.y, p.height),
                } : p
            ));
        };
        const up = () => handleDragEnd();

        window.addEventListener('pointermove', move, { passive: false });
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', up);
        };
    });

    // --- API ---

    const generateImage = async () => {
        if (!prompt) return;
        setIsGenerating(true);

        try {
            // Immer über die Serverless-Function (fal) — kein Client-API-Key mehr
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error("Generate Error:", errorData);
                throw new Error(errorData.error || 'Bildgenerierung fehlgeschlagen');
            }

            const data = await response.json();

            // Build data URL from response
            if (data.image && data.mimeType) {
                const imgUrl = `data:${data.mimeType};base64,${data.image}`;
                setImage(imgUrl);
                initGame();
            } else {
                throw new Error("No image returned");
            }

        } catch (err) {
            console.error("Generation error:", err);
            alert("Bild konnte nicht erstellt werden: " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                setImage(evt.target.result);
                initGame();
            };
            reader.readAsDataURL(file);
        }
    };

    // --- RENDER ---

    // SVG has no z-index: paint order = document order.
    // Placed pieces at the bottom, dragged piece on top.
    // Frisch eingerastetes Teil kurz oben lassen, damit der Blitz sichtbar ist.
    const pieceLayer = (p) => p.isPlaced ? (p.id === justPlacedId ? 1.5 : 0) : (draggedPiece && p.id === draggedPiece.id ? 2 : 1);
    const boardPieces = pieces.filter(p => !p.inTray).sort((a, b) => pieceLayer(a) - pieceLayer(b));
    const trayPieces = pieces.filter(p => p.inTray && !p.isPlaced).sort((a, b) => a.trayIndex - b.trayIndex);
    const placedCount = pieces.filter(p => p.isPlaced).length;
    // Tab kann bis zu 25% der längeren Kante über den Teil-Rand hinausragen
    const trayMargin = pieces.length ? Math.max(pieces[0].width, pieces[0].height) * 0.25 + 2 : 0;

    return (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 overflow-hidden">

            {/* Header / Controls */}
            <div className="absolute top-0 w-full p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={() => onClose(score ? Math.floor(score / 2) : 0)} className="text-white text-3xl">✕</button>
                <h2 className="text-white font-bold text-xl drop-shadow-md">🧩 Jigsaw Fantasy</h2>
                {screen === 'playing' ? (
                    <div className="flex gap-1.5">
                        <div data-testid="piece-counter" className="bg-white/20 text-white font-bold text-sm px-2.5 py-1 rounded-full">
                            {placedCount}/{pieces.length}
                        </div>
                        <div data-testid="timer" className="bg-white/20 text-white font-bold text-sm px-2.5 py-1 rounded-full">
                            ⏱ {fmtTime(elapsed)}
                        </div>
                    </div>
                ) : (
                    <div className="w-8"></div>
                )}
            </div>

            {screen === 'menu' && (
                <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl w-full max-w-sm space-y-6 animate-in slide-in-from-bottom">
                    <div className="text-center">
                        <div className="text-6xl mb-2">🧩</div>
                        <p className="text-white/80">Choose an image</p>
                    </div>

                    {/* Difficulty */}
                    <div className="grid grid-cols-3 gap-2">
                        {Object.keys(DIFFICULTY_SETTINGS).map(d => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className={`p-2 rounded-xl text-xs font-bold transition-all ${difficulty === d ? 'bg-pink-500 text-white' : 'bg-white/20 text-white/70'}`}
                            >
                                {DIFFICULTY_SETTINGS[d].label}
                                {bestTimeFor(d) !== null && (
                                    <div className="text-[10px] font-normal mt-0.5 opacity-80">🏆 {fmtTime(bestTimeFor(d))}</div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Generate */}
                    <div className="space-y-2">
                        <label className="text-white text-sm font-bold">✨ AI Generator (9:16)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                placeholder="e.g. Cute robot cat"
                                className="flex-1 bg-white/20 rounded-xl px-3 py-2 text-white placeholder-white/50 outline-none focus:ring-2 ring-pink-400"
                            />
                            <button
                                onClick={generateImage}
                                disabled={isGenerating || !prompt}
                                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-2 rounded-xl disabled:opacity-50"
                            >
                                {isGenerating ? '⏳' : '🎨'}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-white/50 text-xs">
                        <div className="h-[1px] bg-white/20 flex-1"></div>
                        OR
                        <div className="h-[1px] bg-white/20 flex-1"></div>
                    </div>

                    {/* Upload */}
                    <label className="block w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-xl text-center cursor-pointer transition-colors font-bold">
                        📁 Upload Photo
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                </div>
            )}

            {screen === 'playing' && image && (
                <div className="flex flex-col items-center gap-2 mt-10">
                <div
                    className="relative bg-white/5 shadow-2xl rounded-lg overflow-hidden border border-white/10"
                    style={{
                        height: `min(calc(100vh - 240px), calc(92vw * ${VIEW_H} / ${VIEW_W}), 700px)`,
                        aspectRatio: `${VIEW_W} / ${VIEW_H}`,
                    }}
                >
                    <svg
                        ref={svgRef}
                        viewBox={`${-WORK_MARGIN} ${-WORK_MARGIN} ${VIEW_W} ${VIEW_H}`}
                        className="w-full h-full touch-none"
                    >
                        <defs>
                            {/* Paths are in board coordinates; the clip travels with the
                                group transform, so image chunk and outline stay aligned. */}
                            {pieces.map(piece => (
                                <clipPath key={piece.id} id={`jig-clip-${piece.id}`}>
                                    <path d={piece.path} />
                                </clipPath>
                            ))}
                        </defs>

                        {/* Ziel-Rahmen mit blasser Vorlage, Arbeitsfläche drum herum */}
                        <image
                            href={image}
                            x="0" y="0"
                            width={BOARD_WIDTH}
                            height={BOARD_HEIGHT}
                            preserveAspectRatio="none"
                            opacity="0.15"
                            style={{ pointerEvents: 'none' }}
                        />
                        <rect
                            x="0" y="0"
                            width={BOARD_WIDTH}
                            height={BOARD_HEIGHT}
                            fill="none"
                            stroke="rgba(255,255,255,0.45)"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                        />

                        {boardPieces.map(piece => (
                            <g
                                key={piece.id}
                                transform={`translate(${piece.currentX - piece.correctX}, ${piece.currentY - piece.correctY})`}
                                onPointerDown={(e) => handleBoardPick(e, piece)}
                                style={{ cursor: piece.isPlaced ? 'default' : 'grab' }}
                            >
                                <image
                                    href={image}
                                    width={BOARD_WIDTH}
                                    height={BOARD_HEIGHT}
                                    preserveAspectRatio="none"
                                    clipPath={`url(#jig-clip-${piece.id})`}
                                    style={{ pointerEvents: 'none' }}
                                />
                                {/* Border / Hit Area */}
                                <path
                                    d={piece.path}
                                    fill="transparent"
                                    stroke={piece.id === justPlacedId ? '#ffffff' : 'rgba(0,0,0,0.5)'}
                                    strokeWidth={piece.id === justPlacedId ? 3 : piece.isPlaced ? 0.5 : 1}
                                    vectorEffect="non-scaling-stroke"
                                />
                            </g>
                        ))}

                        {/* Vergleichsbild: solange der Vorschau-Button gehalten wird */}
                        {showPreview && (
                            <image
                                href={image}
                                x="0" y="0"
                                width={BOARD_WIDTH}
                                height={BOARD_HEIGHT}
                                preserveAspectRatio="none"
                                data-testid="preview-overlay"
                                style={{ pointerEvents: 'none' }}
                            />
                        )}
                    </svg>
                </div>

                {/* Ablage: hier liegen die Teile, per Ziehen aufs Board setzen */}
                <div
                    data-testid="tray"
                    className="w-[440px] max-w-[92vw] flex gap-2 overflow-x-auto py-2 px-2 bg-white/10 rounded-xl items-center select-none"
                    style={{ minHeight: '68px' }}
                >
                    {trayPieces.length === 0 && !draggedPiece ? (
                        <span className="text-white/50 text-xs mx-auto">Alle Teile auf dem Board! 🎉</span>
                    ) : trayPieces.map(piece => (
                        <svg
                            key={piece.id}
                            data-testid={`tray-piece-${piece.id}`}
                            viewBox={`${piece.correctX - trayMargin} ${piece.correctY - trayMargin} ${piece.width + 2 * trayMargin} ${piece.height + 2 * trayMargin}`}
                            className="w-14 h-14 shrink-0 cursor-grab"
                            style={{ touchAction: 'pan-x' }}
                            onPointerDown={(e) => handleTrayPick(e, piece)}
                        >
                            <defs>
                                <clipPath id={`tray-clip-${piece.id}`}>
                                    <path d={piece.path} />
                                </clipPath>
                            </defs>
                            <image
                                href={image}
                                width={BOARD_WIDTH}
                                height={BOARD_HEIGHT}
                                preserveAspectRatio="none"
                                clipPath={`url(#tray-clip-${piece.id})`}
                                style={{ pointerEvents: 'none' }}
                            />
                            <path d={piece.path} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                        </svg>
                    ))}
                </div>

                {/* Gedrückt halten → fertiges Bild als Orientierung */}
                <button
                    data-testid="preview-button"
                    onPointerDown={(e) => { e.preventDefault(); setShowPreview(true); }}
                    onPointerUp={() => setShowPreview(false)}
                    onPointerLeave={() => setShowPreview(false)}
                    onPointerCancel={() => setShowPreview(false)}
                    onContextMenu={(e) => e.preventDefault()}
                    className="bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-bold px-6 py-2.5 rounded-full select-none touch-none"
                    style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                >
                    👀 Halten für Vorschau
                </button>
                </div>
            )}

            {/* WIN SCREEN */}
            {screen === 'won' && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6 animate-in zoom-in">
                    <div className="bg-gradient-to-br from-yellow-300 to-orange-500 rounded-3xl p-8 text-center shadow-2xl max-w-sm w-full">
                        <div className="text-6xl mb-4 animate-bounce">🏆</div>
                        <h2 className="text-3xl font-bold text-white mb-2">Puzzle Complete!</h2>
                        <p className="text-white/80 mb-6">That was amazing!</p>

                        <div className="bg-white/20 rounded-xl p-4 mb-4">
                            <div className="text-sm uppercase font-bold text-white/70">Reward</div>
                            <div className="text-4xl font-bold text-white">+{score} 💰</div>
                        </div>

                        {finalTime !== null && (
                            <div className="bg-white/20 rounded-xl p-3 mb-6" data-testid="win-time">
                                <div className="text-white font-bold">⏱ {fmtTime(finalTime)}</div>
                                {isNewRecord ? (
                                    <div className="text-white text-sm mt-1">✨ Neuer Rekord!</div>
                                ) : bestTime !== null && (
                                    <div className="text-white/80 text-sm mt-1">🏆 Bestzeit: {fmtTime(bestTime)}</div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => onWin(score)}
                            className="bg-white text-orange-500 font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition-transform"
                        >
                            Collect & Exit
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default JigsawGame;
