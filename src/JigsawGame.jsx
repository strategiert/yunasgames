import React, { useState, useRef } from 'react';

// Configuration
const DIFFICULTY_SETTINGS = {
    easy: { rows: 4, cols: 3, label: 'Easy (12)' },    // 9:16 approx
    medium: { rows: 6, cols: 4, label: 'Medium (24)' },
    hard: { rows: 8, cols: 5, label: 'Hard (40)' },
};

const BOARD_WIDTH = 300;
const BOARD_HEIGHT = 533;

const JigsawGame = ({ onClose, onWin }) => {
    const [screen, setScreen] = useState('menu'); // menu, generating, playing, won
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
                    currentX: Math.random() * (width - pieceWidth),
                    currentY: Math.random() * (height - pieceHeight),
                    width: pieceWidth,
                    height: pieceHeight,
                    path: d,
                    isPlaced: false,
                });
            }
        }
        return generatedPieces;
    };

    // --- GAME LOGIC ---

    const initGame = () => {
        const { rows, cols } = DIFFICULTY_SETTINGS[difficulty];
        setPieces(generateJigsawPaths(rows, cols, BOARD_WIDTH, BOARD_HEIGHT));
        setScreen('playing');
    };

    const toSvgCoords = (e) => {
        const touch = e.touches ? e.touches[0] : e;
        const svgRect = svgRef.current.getBoundingClientRect();
        return {
            x: (touch.clientX - svgRect.left) * (BOARD_WIDTH / svgRect.width),
            y: (touch.clientY - svgRect.top) * (BOARD_HEIGHT / svgRect.height),
        };
    };

    const handleDragStart = (e, piece) => {
        if (piece.isPlaced) return;

        const { x, y } = toSvgCoords(e);
        setDraggedPiece(piece);
        setOffset({ x: x - piece.currentX, y: y - piece.currentY });
    };

    const handleDragMove = (e) => {
        if (!draggedPiece) return;
        const { x, y } = toSvgCoords(e);

        setPieces(prev => prev.map(p =>
            p.id === draggedPiece.id ? { ...p, currentX: x - offset.x, currentY: y - offset.y } : p
        ));
    };

    const handleDragEnd = () => {
        if (!draggedPiece) return;

        // draggedPiece holds the position from drag START — read the live one
        const piece = pieces.find(p => p.id === draggedPiece.id);
        if (!piece) { setDraggedPiece(null); return; }

        const tolerance = 20;
        const dist = Math.hypot(piece.currentX - piece.correctX, piece.currentY - piece.correctY);

        if (dist < tolerance) {
            setPieces(prev => prev.map(p =>
                p.id === piece.id ? { ...p, currentX: p.correctX, currentY: p.correctY, isPlaced: true } : p
            ));

            const allPlaced = pieces.every(p => p.id === piece.id || p.isPlaced);
            if (allPlaced) {
                setTimeout(() => {
                    setScreen('won');
                    const reward = difficulty === 'hard' ? 30 : difficulty === 'medium' ? 20 : 10;
                    setScore(reward);
                }, 500);
            }
        }

        setDraggedPiece(null);
    };

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
    const pieceLayer = (p) => p.isPlaced ? 0 : (draggedPiece && p.id === draggedPiece.id ? 2 : 1);
    const orderedPieces = [...pieces].sort((a, b) => pieceLayer(a) - pieceLayer(b));

    return (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 overflow-hidden">

            {/* Header / Controls */}
            <div className="absolute top-0 w-full p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={() => onClose(score ? Math.floor(score / 2) : 0)} className="text-white text-3xl">✕</button>
                <h2 className="text-white font-bold text-xl drop-shadow-md">🧩 Jigsaw Fantasy</h2>
                <div className="w-8"></div>
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
                <div className="relative w-[300px] h-[533px] bg-white/5 shadow-2xl rounded-lg overflow-hidden border border-white/10">
                    {/* Preview Helper (Faint background) */}
                    <div
                        className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{
                            backgroundImage: `url(${image})`,
                            backgroundSize: '100% 100%'
                        }}
                    />

                    <svg
                        ref={svgRef}
                        viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
                        className="w-full h-full touch-none"
                        onMouseMove={draggedPiece ? handleDragMove : undefined}
                        onMouseUp={handleDragEnd}
                        onMouseLeave={handleDragEnd}
                        onTouchMove={handleDragMove}
                        onTouchEnd={handleDragEnd}
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

                        {orderedPieces.map(piece => (
                            <g
                                key={piece.id}
                                transform={`translate(${piece.currentX - piece.correctX}, ${piece.currentY - piece.correctY})`}
                                onMouseDown={(e) => handleDragStart(e, piece)}
                                onTouchStart={(e) => handleDragStart(e, piece)}
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
                                    stroke="rgba(0,0,0,0.5)"
                                    strokeWidth={piece.isPlaced ? 0.5 : 1}
                                    vectorEffect="non-scaling-stroke"
                                    style={{ cursor: piece.isPlaced ? 'default' : 'grab' }}
                                />
                            </g>
                        ))}
                    </svg>
                </div>
            )}

            {/* WIN SCREEN */}
            {screen === 'won' && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6 animate-in zoom-in">
                    <div className="bg-gradient-to-br from-yellow-300 to-orange-500 rounded-3xl p-8 text-center shadow-2xl max-w-sm w-full">
                        <div className="text-6xl mb-4 animate-bounce">🏆</div>
                        <h2 className="text-3xl font-bold text-white mb-2">Puzzle Complete!</h2>
                        <p className="text-white/80 mb-6">That was amazing!</p>

                        <div className="bg-white/20 rounded-xl p-4 mb-6">
                            <div className="text-sm uppercase font-bold text-white/70">Reward</div>
                            <div className="text-4xl font-bold text-white">+{score} 💰</div>
                        </div>

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
