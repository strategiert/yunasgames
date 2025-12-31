import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 7;
const CANDY_TYPES = ['🍬', '🍭', '🍫', '🍪', '🧁'];
const MOVES_LIMIT = 20;

// Spezialstein-Typen
const SPECIAL = {
  LINE_H: '➖',
  LINE_V: '➕',
  BOMB: '💣',
  MEGA_BOMB: '💥',
  RAINBOW: '🌈',
};

// Animations-Phasen
const PHASE = {
  IDLE: 'idle',
  SWAPPING: 'swapping',
  HIGHLIGHTING: 'highlighting',
  EXPLODING: 'exploding',
  FALLING: 'falling',
  CASCADING: 'cascading',
};

// Timing-Konstanten (in ms)
const TIMING = {
  SWAP: 200,
  HIGHLIGHT: 250,
  EXPLODE: 350,
  FALL: 250,
  CASCADE_PAUSE: 150,
};

const MiniGame = ({ onClose, onWin }) => {
  const [grid, setGrid] = useState([]);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(MOVES_LIMIT);
  const [combo, setCombo] = useState(0);
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [animatingCells, setAnimatingCells] = useState({});
  const [particles, setParticles] = useState([]);
  const [message, setMessage] = useState(null);
  const gridRef = useRef(null);

  // Hilfsfunktion: Zufälliges Candy
  const randomCandy = () => CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)];

  // Prüft ob ein Candy ein Spezialstein ist
  const isSpecial = (candy) => Object.values(SPECIAL).includes(candy);

  // Erstellt initiales Grid ohne Matches
  const createGrid = useCallback(() => {
    const newGrid = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      const rowArray = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        let candy;
        do {
          candy = randomCandy();
        } while (
          (col >= 2 && rowArray[col - 1] === candy && rowArray[col - 2] === candy) ||
          (row >= 2 && newGrid[row - 1]?.[col] === candy && newGrid[row - 2]?.[col] === candy)
        );
        rowArray.push(candy);
      }
      newGrid.push(rowArray);
    }
    return newGrid;
  }, []);

  useEffect(() => {
    setGrid(createGrid());
  }, [createGrid]);

  // Zeigt temporäre Nachricht
  const showMessage = (text, duration = 800) => {
    setMessage(text);
    setTimeout(() => setMessage(null), duration);
  };

  // Erstellt Partikel-Effekt
  const createParticles = (row, col, count = 6) => {
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: `${Date.now()}-${row}-${col}-${i}`,
        row,
        col,
        angle: (360 / count) * i,
        color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3', '#DDA0DD'][Math.floor(Math.random() * 5)],
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 500);
  };

  // Findet alle Matches und erkennt Spezial-Patterns
  const findMatchesWithPatterns = useCallback((currentGrid) => {
    const matches = new Map(); // pos -> { cells: Set, pattern: string, color: string }
    const allMatched = new Set();

    // Horizontale Matches finden
    for (let row = 0; row < GRID_SIZE; row++) {
      let col = 0;
      while (col < GRID_SIZE) {
        const candy = currentGrid[row][col];
        if (!candy || isSpecial(candy)) {
          col++;
          continue;
        }

        let matchLength = 1;
        while (col + matchLength < GRID_SIZE && currentGrid[row][col + matchLength] === candy) {
          matchLength++;
        }

        if (matchLength >= 3) {
          const cells = new Set();
          for (let i = 0; i < matchLength; i++) {
            cells.add(`${row}-${col + i}`);
            allMatched.add(`${row}-${col + i}`);
          }

          let pattern = 'normal';
          if (matchLength === 4) pattern = 'line_h';
          if (matchLength >= 5) pattern = 'rainbow';

          matches.set(`h-${row}-${col}`, { cells, pattern, color: candy, centerCol: col + Math.floor(matchLength / 2), centerRow: row });
        }

        col += Math.max(matchLength, 1);
      }
    }

    // Vertikale Matches finden
    for (let col = 0; col < GRID_SIZE; col++) {
      let row = 0;
      while (row < GRID_SIZE) {
        const candy = currentGrid[row][col];
        if (!candy || isSpecial(candy)) {
          row++;
          continue;
        }

        let matchLength = 1;
        while (row + matchLength < GRID_SIZE && currentGrid[row + matchLength][col] === candy) {
          matchLength++;
        }

        if (matchLength >= 3) {
          const cells = new Set();
          for (let i = 0; i < matchLength; i++) {
            cells.add(`${row + i}-${col}`);
            allMatched.add(`${row + i}-${col}`);
          }

          let pattern = 'normal';
          if (matchLength === 4) pattern = 'line_v';
          if (matchLength >= 5) pattern = 'rainbow';

          matches.set(`v-${row}-${col}`, { cells, pattern, color: candy, centerCol: col, centerRow: row + Math.floor(matchLength / 2) });
        }

        row += Math.max(matchLength, 1);
      }
    }

    // L-Form und T-Form erkennen
    for (const [key1, match1] of matches) {
      for (const [key2, match2] of matches) {
        if (key1 >= key2) continue;
        if (match1.color !== match2.color) continue;

        // Prüfe Überschneidung
        const intersection = [...match1.cells].filter(c => match2.cells.has(c));
        if (intersection.length > 0) {
          // L oder T Form gefunden
          const combined = new Set([...match1.cells, ...match2.cells]);
          if (combined.size >= 5) {
            match1.pattern = 'mega_bomb';
            match2.pattern = 'merged';
          } else {
            match1.pattern = 'bomb';
            match2.pattern = 'merged';
          }
        }
      }
    }

    // 2x2 Quadrat erkennen
    for (let row = 0; row < GRID_SIZE - 1; row++) {
      for (let col = 0; col < GRID_SIZE - 1; col++) {
        const candy = currentGrid[row][col];
        if (!candy || isSpecial(candy)) continue;

        if (
          currentGrid[row][col + 1] === candy &&
          currentGrid[row + 1][col] === candy &&
          currentGrid[row + 1][col + 1] === candy
        ) {
          const squareCells = new Set([
            `${row}-${col}`,
            `${row}-${col + 1}`,
            `${row + 1}-${col}`,
            `${row + 1}-${col + 1}`,
          ]);

          // Prüfe ob nicht schon Teil eines größeren Matches
          let alreadyMatched = false;
          for (const match of matches.values()) {
            const overlap = [...squareCells].filter(c => match.cells.has(c)).length;
            if (overlap >= 2) {
              alreadyMatched = true;
              break;
            }
          }

          if (!alreadyMatched) {
            squareCells.forEach(c => allMatched.add(c));
            matches.set(`sq-${row}-${col}`, {
              cells: squareCells,
              pattern: 'bomb',
              color: candy,
              centerRow: row,
              centerCol: col,
            });
          }
        }
      }
    }

    return { matches, allMatched };
  }, []);

  // Spezialstein-Effekte ausführen
  const executeSpecialEffect = useCallback((currentGrid, row, col, specialType) => {
    const affected = new Set();

    switch (specialType) {
      case SPECIAL.LINE_H:
        for (let c = 0; c < GRID_SIZE; c++) {
          affected.add(`${row}-${c}`);
        }
        break;

      case SPECIAL.LINE_V:
        for (let r = 0; r < GRID_SIZE; r++) {
          affected.add(`${r}-${col}`);
        }
        break;

      case SPECIAL.BOMB:
        for (let r = Math.max(0, row - 1); r <= Math.min(GRID_SIZE - 1, row + 1); r++) {
          for (let c = Math.max(0, col - 1); c <= Math.min(GRID_SIZE - 1, col + 1); c++) {
            affected.add(`${r}-${c}`);
          }
        }
        break;

      case SPECIAL.MEGA_BOMB:
        for (let r = Math.max(0, row - 2); r <= Math.min(GRID_SIZE - 1, row + 2); r++) {
          for (let c = Math.max(0, col - 2); c <= Math.min(GRID_SIZE - 1, col + 2); c++) {
            affected.add(`${r}-${c}`);
          }
        }
        break;

      case SPECIAL.RAINBOW:
        // Entferne alle einer zufälligen Farbe
        const targetColor = CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)];
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (currentGrid[r][c] === targetColor) {
              affected.add(`${r}-${c}`);
            }
          }
        }
        break;
    }

    return affected;
  }, []);

  // Verarbeitet Matches und erstellt Spezialsteine
  const processMatches = useCallback((currentGrid, matchData) => {
    const newGrid = currentGrid.map(row => [...row]);
    const { matches, allMatched } = matchData;

    // Spezialsteine an den richtigen Stellen erstellen
    for (const [key, match] of matches) {
      if (match.pattern === 'merged') continue;

      const centerRow = match.centerRow;
      const centerCol = match.centerCol;

      let specialToCreate = null;
      switch (match.pattern) {
        case 'line_h':
          specialToCreate = SPECIAL.LINE_H;
          break;
        case 'line_v':
          specialToCreate = SPECIAL.LINE_V;
          break;
        case 'bomb':
          specialToCreate = SPECIAL.BOMB;
          break;
        case 'mega_bomb':
          specialToCreate = SPECIAL.MEGA_BOMB;
          break;
        case 'rainbow':
          specialToCreate = SPECIAL.RAINBOW;
          break;
      }

      if (specialToCreate && centerRow !== undefined && centerCol !== undefined) {
        // Entferne die Mitte aus den zu löschenden Zellen
        allMatched.delete(`${centerRow}-${centerCol}`);
        newGrid[centerRow][centerCol] = specialToCreate;
      }
    }

    // Prüfe ob gematchte Zellen Spezialsteine enthalten
    const additionalAffected = new Set();
    allMatched.forEach(pos => {
      const [r, c] = pos.split('-').map(Number);
      const cell = newGrid[r][c];
      if (isSpecial(cell)) {
        const affected = executeSpecialEffect(newGrid, r, c, cell);
        affected.forEach(a => additionalAffected.add(a));
      }
    });

    // Kombiniere alle betroffenen Zellen
    additionalAffected.forEach(a => allMatched.add(a));

    // Entferne gematchte Zellen
    allMatched.forEach(pos => {
      const [r, c] = pos.split('-').map(Number);
      newGrid[r][c] = null;
    });

    return { newGrid, matchedCount: allMatched.size };
  }, [executeSpecialEffect]);

  // Lässt Candies fallen und füllt leere Stellen
  const applyGravity = useCallback((currentGrid) => {
    const newGrid = currentGrid.map(row => [...row]);
    const fallingCells = {};

    for (let col = 0; col < GRID_SIZE; col++) {
      let emptyRow = GRID_SIZE - 1;

      // Von unten nach oben durchgehen
      for (let row = GRID_SIZE - 1; row >= 0; row--) {
        if (newGrid[row][col] !== null) {
          if (row !== emptyRow) {
            newGrid[emptyRow][col] = newGrid[row][col];
            newGrid[row][col] = null;
            fallingCells[`${emptyRow}-${col}`] = { from: row, to: emptyRow };
          }
          emptyRow--;
        }
      }

      // Neue Candies von oben einfüllen
      for (let row = emptyRow; row >= 0; row--) {
        newGrid[row][col] = randomCandy();
        fallingCells[`${row}-${col}`] = { from: -1 - (emptyRow - row), to: row, isNew: true };
      }
    }

    return { newGrid, fallingCells };
  }, []);

  // Prüft ob zwei Zellen benachbart sind
  const areAdjacent = (pos1, pos2) => {
    const [row1, col1] = pos1.split('-').map(Number);
    const [row2, col2] = pos2.split('-').map(Number);
    return (
      (Math.abs(row1 - row2) === 1 && col1 === col2) ||
      (Math.abs(col1 - col2) === 1 && row1 === row2)
    );
  };

  // Tauscht zwei Candies
  const swapCandies = (currentGrid, pos1, pos2) => {
    const [row1, col1] = pos1.split('-').map(Number);
    const [row2, col2] = pos2.split('-').map(Number);
    const newGrid = currentGrid.map(row => [...row]);
    [newGrid[row1][col1], newGrid[row2][col2]] = [newGrid[row2][col2], newGrid[row1][col1]];
    return newGrid;
  };

  // Hauptspiel-Logik bei Klick
  const handleCellClick = async (row, col) => {
    if (phase !== PHASE.IDLE || moves <= 0) return;

    const pos = `${row}-${col}`;

    if (!selected) {
      setSelected(pos);
      return;
    }

    if (selected === pos) {
      setSelected(null);
      return;
    }

    if (!areAdjacent(selected, pos)) {
      setSelected(pos);
      return;
    }

    // Swap-Animation starten
    setPhase(PHASE.SWAPPING);
    setAnimatingCells({
      [selected]: { type: 'swap', target: pos },
      [pos]: { type: 'swap', target: selected },
    });

    await new Promise(r => setTimeout(r, TIMING.SWAP));

    const swappedGrid = swapCandies(grid, selected, pos);
    const matchData = findMatchesWithPatterns(swappedGrid);

    if (matchData.allMatched.size === 0) {
      // Ungültiger Zug - zurücktauschen
      setAnimatingCells({
        [selected]: { type: 'swap-back', target: pos },
        [pos]: { type: 'swap-back', target: selected },
      });
      await new Promise(r => setTimeout(r, TIMING.SWAP));
      setAnimatingCells({});
      setSelected(null);
      setPhase(PHASE.IDLE);
      return;
    }

    // Gültiger Zug
    setGrid(swappedGrid);
    setMoves(m => m - 1);
    setSelected(null);
    setAnimatingCells({});

    // Kaskaden-Loop
    let currentGrid = swappedGrid;
    let currentCombo = 0;
    let totalScore = 0;

    while (true) {
      const currentMatchData = findMatchesWithPatterns(currentGrid);
      if (currentMatchData.allMatched.size === 0) break;

      currentCombo++;
      setCombo(currentCombo);

      // Highlight-Phase
      setPhase(PHASE.HIGHLIGHTING);
      const highlightAnim = {};
      currentMatchData.allMatched.forEach(pos => {
        highlightAnim[pos] = { type: 'highlight' };
      });
      setAnimatingCells(highlightAnim);

      await new Promise(r => setTimeout(r, TIMING.HIGHLIGHT));

      // Explosion-Phase
      setPhase(PHASE.EXPLODING);
      const explodeAnim = {};
      currentMatchData.allMatched.forEach(pos => {
        explodeAnim[pos] = { type: 'explode' };
        const [r, c] = pos.split('-').map(Number);
        createParticles(r, c, isSpecial(currentGrid[r][c]) ? 12 : 6);
      });
      setAnimatingCells(explodeAnim);

      // Kombo-Nachricht
      if (currentCombo > 1) {
        showMessage(`${currentCombo}x COMBO! 🔥`);
      }

      // Pattern-spezifische Nachrichten
      for (const match of currentMatchData.matches.values()) {
        if (match.pattern === 'rainbow') showMessage('🌈 RAINBOW!');
        else if (match.pattern === 'mega_bomb') showMessage('💥 MEGA!');
        else if (match.pattern === 'bomb') showMessage('💣 BOOM!');
      }

      await new Promise(r => setTimeout(r, TIMING.EXPLODE));

      // Matches verarbeiten
      const { newGrid, matchedCount } = processMatches(currentGrid, currentMatchData);
      const points = matchedCount * (1 + (currentCombo - 1) * 0.5);
      totalScore += Math.round(points);

      // Falling-Phase
      setPhase(PHASE.FALLING);
      const { newGrid: filledGrid, fallingCells } = applyGravity(newGrid);
      setAnimatingCells(
        Object.fromEntries(
          Object.entries(fallingCells).map(([pos, data]) => [pos, { type: 'fall', ...data }])
        )
      );
      setGrid(filledGrid);

      await new Promise(r => setTimeout(r, TIMING.FALL));

      // Kurze Pause vor nächster Kaskade
      setPhase(PHASE.CASCADING);
      setAnimatingCells({});
      await new Promise(r => setTimeout(r, TIMING.CASCADE_PAUSE));

      currentGrid = filledGrid;
    }

    setScore(s => s + totalScore);
    setCombo(0);
    setPhase(PHASE.IDLE);
  };

  // Spiel-Ende prüfen
  useEffect(() => {
    if (moves <= 0 && phase === PHASE.IDLE) {
      setTimeout(() => {
        onWin(score);
      }, 800);
    }
  }, [moves, phase, score, onWin]);

  // Zellen-Style basierend auf Animation
  const getCellStyle = (row, col) => {
    const pos = `${row}-${col}`;
    const anim = animatingCells[pos];

    let transform = '';
    let opacity = 1;
    let scale = 1;
    let transition = 'all 0.15s ease-out';

    if (anim) {
      switch (anim.type) {
        case 'swap':
          const [targetRow, targetCol] = anim.target.split('-').map(Number);
          const dx = (targetCol - col) * 100;
          const dy = (targetRow - row) * 100;
          transform = `translate(${dx}%, ${dy}%)`;
          transition = `transform ${TIMING.SWAP}ms ease-in-out`;
          break;

        case 'highlight':
          scale = 1.15;
          transform = `scale(${scale})`;
          transition = `transform ${TIMING.HIGHLIGHT}ms ease-out`;
          break;

        case 'explode':
          scale = 0;
          opacity = 0;
          transform = `scale(${scale}) rotate(180deg)`;
          transition = `all ${TIMING.EXPLODE}ms ease-out`;
          break;

        case 'fall':
          // CSS handles this via animation class
          break;
      }
    }

    return { transform, opacity, transition };
  };

  const getCellClass = (row, col) => {
    const pos = `${row}-${col}`;
    const isSelectedCell = selected === pos;
    const anim = animatingCells[pos];

    let classes = `
      aspect-square rounded-xl text-2xl sm:text-3xl
      flex items-center justify-center
      shadow-md cursor-pointer
      select-none
    `;

    if (isSelectedCell) {
      classes += ' bg-yellow-300 ring-4 ring-yellow-500 scale-110 z-10';
    } else if (anim?.type === 'highlight') {
      classes += ' bg-green-300';
    } else if (anim?.type === 'fall' && anim.isNew) {
      classes += ' animate-fall-in bg-white/90';
    } else if (anim?.type === 'fall') {
      classes += ' animate-fall bg-white/90';
    } else {
      classes += ' bg-white/90 hover:bg-white hover:scale-105';
    }

    if (phase !== PHASE.IDLE) {
      classes += ' pointer-events-none';
    }

    return classes;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      {/* CSS für Animationen */}
      <style>{`
        @keyframes fall-in {
          from {
            transform: translateY(-200%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fall {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes particle {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--dx), var(--dy)) scale(0);
            opacity: 0;
          }
        }
        .animate-fall-in {
          animation: fall-in ${TIMING.FALL}ms ease-out;
        }
        .animate-fall {
          animation: fall ${TIMING.FALL}ms ease-out;
        }
        .particle {
          animation: particle 0.5s ease-out forwards;
        }
      `}</style>

      <div className="bg-gradient-to-b from-purple-500 to-pink-500 rounded-3xl p-4 max-w-md w-full shadow-2xl relative overflow-hidden">
        {/* Kombo-Nachricht */}
        {message && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30
                          text-4xl font-bold text-yellow-300 drop-shadow-lg animate-bounce
                          pointer-events-none">
            {message}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="bg-yellow-400 px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-1">
            <span>💰</span>
            <span className="text-lg">{score}</span>
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-white drop-shadow-lg">Candy Match!</h2>
            {combo > 1 && (
              <div className="text-yellow-300 text-sm font-bold animate-pulse">
                {combo}x Combo!
              </div>
            )}
          </div>

          <div className="bg-blue-500 px-4 py-2 rounded-full font-bold shadow-lg text-white flex items-center gap-1">
            <span>{moves}</span>
            <span className="text-sm">Züge</span>
          </div>
        </div>

        {/* Spielfeld */}
        <div ref={gridRef} className="bg-white/20 rounded-2xl p-2 backdrop-blur relative">
          {/* Partikel */}
          {particles.map(p => (
            <div
              key={p.id}
              className="particle absolute w-3 h-3 rounded-full pointer-events-none z-20"
              style={{
                left: `${(p.col + 0.5) * (100 / GRID_SIZE)}%`,
                top: `${(p.row + 0.5) * (100 / GRID_SIZE)}%`,
                backgroundColor: p.color,
                '--dx': `${Math.cos(p.angle * Math.PI / 180) * 50}px`,
                '--dy': `${Math.sin(p.angle * Math.PI / 180) * 50}px`,
              }}
            />
          ))}

          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
          >
            {grid.map((row, rowIndex) =>
              row.map((candy, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  className={getCellClass(rowIndex, colIndex)}
                  style={getCellStyle(rowIndex, colIndex)}
                >
                  {candy}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Legende */}
        <div className="flex justify-center gap-2 mt-3 text-xs text-white/80">
          <span>💣 3×3</span>
          <span>💥 5×5</span>
          <span>➖➕ Linie</span>
          <span>🌈 Farbe</span>
        </div>

        {/* Anleitung */}
        <p className="text-center text-white/90 text-sm mt-2">
          Verbinde 3+ gleiche Süßigkeiten! Spezial-Kombos geben Boni!
        </p>

        {/* Fertig-Button */}
        <button
          onClick={() => onWin(score)}
          className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600
                     text-white font-bold py-3 px-4 rounded-full shadow-lg mt-3
                     transform hover:scale-105 transition-transform"
        >
          Fertig spielen ({score} Münzen mitnehmen)
        </button>
      </div>
    </div>
  );
};

export default MiniGame;
