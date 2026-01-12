import React, { useState, useEffect, useRef } from 'react';

// Configuration
const DIFFICULTY_SETTINGS = {
    easy: { rows: 4, cols: 3, label: 'Easy (12)' },    // 9:16 approx
    medium: { rows: 6, cols: 4, label: 'Medium (24)' },
    hard: { rows: 8, cols: 5, label: 'Hard (40)' },
};

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

    const generateJigsawPaths = (rows, cols, width, height) => {
        const pieceWidth = width / cols;
        const pieceHeight = height / rows;
        const generatedPieces = [];

        // 0: flat, 1: outie, -1: innie
        // vertical edges: rows x (cols+1)
        // horizontal edges: (rows+1) x cols
        const vEdges = Array(rows).fill().map(() => Array(cols + 1).fill(0).map(() => Math.random() < 0.5 ? 1 : -1));
        const hEdges = Array(rows + 1).fill().map(() => Array(cols).fill(0).map(() => Math.random() < 0.5 ? 1 : -1));

        // Fix borders to be flat (0)
        for (let r = 0; r < rows; r++) { vEdges[r][0] = 0; vEdges[r][cols] = 0; }
        for (let c = 0; c < cols; c++) { hEdges[0][c] = 0; hEdges[rows][c] = 0; }

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Define edges for this piece
                const top = hEdges[r][c];
                const right = vEdges[r][c + 1];
                const bottom = hEdges[r + 1][c];
                const left = vEdges[r][c];

                // Generate Path string
                // Start top-left
                let d = `M ${c * pieceWidth} ${r * pieceHeight}`;

                // Top edge
                if (top === 0) d += ` l ${pieceWidth} 0`;
                else d += renderEdge(pieceWidth, top, false);

                // Right edge
                if (right === 0) d += ` l 0 ${pieceHeight}`;
                else d += renderEdge(pieceHeight, right, true);

                // Bottom edge (backwards)
                if (bottom === 0) d += ` l ${-pieceWidth} 0`;
                else d += renderEdge(pieceWidth, bottom, false, true);

                // Left edge (backwards)
                if (left === 0) d += ` l 0 ${-pieceHeight}`;
                else d += renderEdge(pieceHeight, left, true, true);

                // Randomize initial position for gameplay
                const maxScatter = 50;
                const randomX = Math.random() * (width - pieceWidth);
                const randomY = Math.random() * (height - pieceHeight);

                generatedPieces.push({
                    id: `${r}-${c}`,
                    r, c,
                    correctX: c * pieceWidth,
                    correctY: r * pieceHeight,
                    currentX: randomX,
                    currentY: randomY,
                    width: pieceWidth,
                    height: pieceHeight,
                    path: d,
                    isPlaced: false,
                    zIndex: 1, // Bring to front when dragging
                });
            }
        }
        return generatedPieces;
    };

    const renderEdge = (length, type, isVertical, isBackwards = false) => {
        // Basic curve for tab/slot
        // Using relative coordinates for simplicity
        const tabSize = length * 0.25; // Size of the bump
        const base = length * 0.35; // Shoulder width

        // Flip for innie vs outie
        const direction = type * (isBackwards ? -1 : 1);

        if (isVertical) {
            // Vertical Tab
            // p1: start shoulder, p2: curve out, p3: tip, p4: curve back, p5: end shoulder
            const sign = direction === 1 ? 1 : -1;
            // Simplified bezier for a puzzle tab
            return ` l 0 ${base} 
                 q ${sign * tabSize} 0 ${sign * tabSize} ${(length - 2 * base) / 2} 
                 q 0 ${(length - 2 * base) / 2} ${-sign * tabSize} ${(length - 2 * base) / 2}
                 l 0 ${base}`;
        } else {
            // Horizontal Tab
            const sign = direction === 1 ? 1 : -1;
            return ` l ${base} 0 
                 q 0 ${sign * tabSize} ${(length - 2 * base) / 2} ${sign * tabSize} 
                 q ${(length - 2 * base) / 2} 0 ${(length - 2 * base) / 2} ${-sign * tabSize}
                 l ${base} 0`;
        }
    };


    // --- GAME LOGIC ---

    const initGame = (imgUrl) => {
        const { rows, cols } = DIFFICULTY_SETTINGS[difficulty];
        // Assuming container is roughly 300x533 (9:16 ratio aprox)
        // We will scale everything to fit a coordinate system, e.g., 300x533
        const boardWidth = 300;
        const boardHeight = 533;

        setPieces(generateJigsawPaths(rows, cols, boardWidth, boardHeight));
        setScreen('playing');
    };

    const handleDragStart = (e, piece) => {
        if (piece.isPlaced) return;

        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const svgRect = svgRef.current.getBoundingClientRect();

        // Bring piece to front
        setPieces(prev => prev.map(p => p.id === piece.id ? { ...p, zIndex: 100 } : { ...p, zIndex: 1 }));

        setDraggedPiece(piece);
        // Calculate offset from piece top-left
        // touch.clientX is screen coord. We need converting to SVG user space.
        // Simple scaling if SVG is responsive:
        const scaleX = 300 / svgRect.width;
        const scaleY = 533 / svgRect.height;

        setOffset({
            x: (touch.clientX - svgRect.left) * scaleX - piece.currentX,
            y: (touch.clientY - svgRect.top) * scaleY - piece.currentY
        });
    };

    const handleDragMove = (e) => {
        if (!draggedPiece) return;
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const svgRect = svgRef.current.getBoundingClientRect();
        const scaleX = 300 / svgRect.width;
        const scaleY = 533 / svgRect.height;

        const rawX = (touch.clientX - svgRect.left) * scaleX;
        const rawY = (touch.clientY - svgRect.top) * scaleY;

        const newX = rawX - offset.x;
        const newY = rawY - offset.y;

        setPieces(prev => prev.map(p =>
            p.id === draggedPiece.id ? { ...p, currentX: newX, currentY: newY } : p
        ));
    };

    const handleDragEnd = () => {
        if (!draggedPiece) return;

        // Check for snap
        // Tolerance: 20 units
        const tolerance = 20;
        const dist = Math.hypot(draggedPiece.currentX - draggedPiece.correctX, draggedPiece.currentY - draggedPiece.correctY);

        if (dist < tolerance) {
            // Snap!
            setPieces(prev => prev.map(p =>
                p.id === draggedPiece.id ? { ...p, currentX: p.correctX, currentY: p.correctY, isPlaced: true, zIndex: 0 } : p
            ));

            // Check Win
            const allPlaced = pieces.every(p => p.id === draggedPiece.id ? true : p.isPlaced);
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
            // Use Vercel Serverless Function to avoid CORS issues
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to generate image');
            }

            const data = await response.json();

            // Build data URL from response
            if (data.image && data.mimeType) {
                const imgUrl = `data:${data.mimeType};base64,${data.image}`;
                setImage(imgUrl);
                initGame(imgUrl);
            } else {
                throw new Error("No image returned");
            }

        } catch (err) {
            alert("Failed to generate: " + err.message);
            // Fallback for demo if API fails
            // setImage('https://picsum.photos/300/533'); // Only for testing
            // initGame('https://picsum.photos/300/533');
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
                initGame(evt.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // --- RENDER ---

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
                <div
                    className="relative w-[300px] h-[533px] bg-white/5 shadow-2xl rounded-lg overflow-hidden border border-white/10"
                    style={{}}
                >
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
                        viewBox="0 0 300 533"
                        className="w-full h-full touch-none"
                        onTouchStart={(e) => {
                            // Prevent scrolling
                            if (e.target.tagName !== 'button') e.preventDefault();
                        }}
                        onMouseMove={draggedPiece ? handleDragMove : undefined}
                        onMouseUp={handleDragEnd}
                        onTouchMove={handleDragMove}
                        onTouchEnd={handleDragEnd}
                    >
                        <defs>
                            {/* Define the image pattern */}
                            <pattern id="puzzImg" patternUnits="userSpaceOnUse" width="300" height="533">
                                <image href={image} x="0" y="0" width="300" height="533" preserveAspectRatio="none" />
                            </pattern>
                            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                                <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="black" floodOpacity="0.5" />
                            </filter>
                        </defs>

                        {pieces.map(piece => (
                            <g
                                key={piece.id}
                                transform={`translate(${piece.currentX}, ${piece.currentY})`}
                                style={{ cursor: piece.isPlaced ? 'default' : 'grab' }}
                            >
                                {/* The Path acting as a mask/fill */}
                                {/* To make the image stick to the piece, we translate the pattern fill OPPOSITE to the piece position 
                        Alternatively, use clipPath. Let's use clipPath on an Image element for better quality, 
                        or simpler: Path with fill=url(#puzzImg).
                        If we use fill=url(#puzzImg), the pattern is fixed to the SVG origin. 
                        So if we translate the group, the "window" into the image moves. 
                        But we want the "chunk" of image to move WITH the piece.
                        So we need to translate the coords in the path? Or use a separate pattern for each piece?
                        
                        Better approach: 
                        Piece Group Translation (T)
                        Inside Group: 
                           Path with ClipPath
                           Image translated by (- piece.correctX, - piece.correctY)
                           
                        Wait, if I simply translate the group, and I want the texture to stay "fixed" relative to the PIECE,
                        I need the texture definition to be relative to the piece?
                        
                        Standard SVG Jigsaw Approach:
                        <path d={...} fill="url(#image)" /> 
                        If I move the path, the fill stays static relative to the svg viewport (userSpaceOnUse).
                        So moving the path = revealing different parts of the image = WRONG.
                        
                        Correct approach:
                        <g transform={`translate(${currentX}, ${currentY})`}>
                            <defs>
                                <clipPath id={`clip-${piece.id}`}>
                                    <path d={piece.path} />
                                </clipPath>
                            </defs>
                            
                            <!-- The image chunk. It needs to be the WHOLE image, shifted so the correct part shows through the hole -->
                            <image 
                                href={image} 
                                width="300" height="533" 
                                x={-piece.correctX} y={-piece.correctY} // Counter-shift to align image to piece origin (0,0 of the group) -> actually piece.path starts at r*h, c*w.
                                // My path generation code: d starts at `c*width, r*height`.
                                // So the path itself is offset. 
                                // Ideally, I generated paths in absolute coords (0..300).
                                // So if I put them in a group at (0,0), they are in correct place.
                                // If I move the group to (currX, currY), I need to shift the drawing inside back?
                                
                                // Let's adjust path generation to be local (0,0) based?
                                // No, path is absolute. 
                                // If path is `M 100 100 ...`, and I wrap in <g transform="translate(10,10)">, piece draws at 110,110.
                                // If I use fill=url(#pattern), pattern is at 0,0. At 110,110 I see the image at 110,110.
                                // If I drag piece to 200,200. I see image at 200,200 (the eye of the cat). 
                                // But I want to see the EAR (which was at 110,110) moved to 200,200.
                                
                                // Solution:
                                // 1. Path coordinates should be relative to Piece Top-Left (0,0).
                                // 2. When generating path `M x y`, subtract `c*w` and `r*h`.
                            />
                        </g>
                    */}
                            </g>
                        ))}

                        {/* Corrected Render Loop */}
                        {pieces.map((piece) => {
                            // Adjust path to be local to the piece (normalize to 0,0)
                            // My generator made absolute paths.
                            // Im lazy: I will just subtract correctX/Y in the render if possible, OR
                            // Modify the generator.
                            // Let's rely on `piece.path` being absolute for now and use a trick or re-generate.
                            // Re-generating local paths is cleaner.

                            // Let's do the "clipPath" trick on the fly.
                            // Actually, standard way:
                            // <image> with clip-path="url(#path)"
                            // If I move the wrapper <g>, the visual content moves.
                            // I need the <image> inside the <g> to be positioned such that the Correct part of the image aligns with the path.
                            // If path is absolute (e.g. starts at 100,100), and I translate G by (deltaX, deltaY).
                            // I want the image to be at (0,0) relative to the BOARD (absolute).
                            // So inside the group: <image x={-currentX} y={-currentY} ... /> ?? No.

                            // Let's restart the mental model.
                            // PIECE VISUAL = A cutout of the image.
                            // This cutout should move around.
                            // So I want to create a "sprite" for each piece.
                            // Sprite = Image clipped by Path.
                            // This sprite is then positioned at currentX, currentY.

                            // Construction:
                            // <defs><clipPath id={id}><path d={Absolute_Path} /></clipPath></defs>

                            // <g transform={`translate(${currentX - correctX}, ${currentY - correctY})`}> 
                            //    <image href={img} clip-path={`url(#${id})`} width="300" height="533" />
                            //    <path d={Absolute_Path} stroke="black" fill="none" />
                            // </g>

                            // Explanation:
                            // The image and path are defined in "Solved Position" (Absolute).
                            // The Group moves them by the delta (Current - Correct).
                            // Perfect.

                            return (
                                <g
                                    key={piece.id}
                                    transform={`translate(${piece.currentX - piece.correctX}, ${piece.currentY - piece.correctY})`}
                                    onMouseDown={(e) => handleDragStart(e, piece)}
                                    onTouchStart={(e) => handleDragStart(e, piece)}
                                    style={{ zIndex: piece.zIndex }}
                                >
                                    <image
                                        href={image}
                                        width="300"
                                        height="533"
                                        clipPath={`path('${piece.path}')`} // Modern CSS clip-path supports path string!
                                        // Fallback: use <clipPath> in defs if compatibility issues. 
                                        // React specific: use style={{ clipPath: `path('${piece.path}')` }}
                                        style={{
                                            clipPath: `path('${piece.path}')`,
                                            pointerEvents: 'none' // Click passes to the overlay path maybe?
                                        }}
                                    />
                                    {/* Border / Hit Area */}
                                    <path
                                        d={piece.path}
                                        fill="transparent"
                                        stroke="rgba(0,0,0,0.5)"
                                        strokeWidth={piece.isPlaced ? 0.5 : 1}
                                        vectorEffect="non-scaling-stroke"
                                        style={{ cursor: 'grab' }}
                                    />
                                </g>
                            );
                        })}
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
