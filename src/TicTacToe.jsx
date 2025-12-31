import React, { useState, useEffect, useCallback } from 'react';

const PLAYER = '⭕';
const AI = '❌';
const EMPTY = null;

// Schwierigkeitsgrade
const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

// Board-Positionen
const CENTER = 4;
const CORNERS = [0, 2, 6, 8];
const EDGES = [1, 3, 5, 7];

// Gewinnkombinationen
const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Reihen
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Spalten
  [0, 4, 8], [2, 4, 6], // Diagonalen
];

// Gegenüberliegende Ecken
const OPPOSITE_CORNERS = { 0: 8, 2: 6, 6: 2, 8: 0 };

// Ecken neben einer Position
const ADJACENT_CORNERS = {
  0: [2, 6], 2: [0, 8], 6: [0, 8], 8: [2, 6],
  1: [0, 2], 3: [0, 6], 5: [2, 8], 7: [6, 8],
};

const TicTacToe = ({ onClose, onWin, difficulty = DIFFICULTY.MEDIUM }) => {
  const [board, setBoard] = useState(Array(9).fill(EMPTY));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState([]);
  const [score, setScore] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [message, setMessage] = useState(null);
  const [moveCount, setMoveCount] = useState(0);

  // Prüft auf Gewinner
  const checkWinner = useCallback((currentBoard) => {
    for (const pattern of WIN_PATTERNS) {
      const [a, b, c] = pattern;
      if (
        currentBoard[a] &&
        currentBoard[a] === currentBoard[b] &&
        currentBoard[a] === currentBoard[c]
      ) {
        return { winner: currentBoard[a], line: pattern };
      }
    }
    return null;
  }, []);

  // Prüft auf Unentschieden
  const checkDraw = (currentBoard) => {
    return currentBoard.every(cell => cell !== EMPTY);
  };

  // Zählt Züge eines Spielers
  const countMoves = (currentBoard, player) => {
    return currentBoard.filter(cell => cell === player).length;
  };

  // Findet leere Felder
  const getEmptySquares = (currentBoard) => {
    return currentBoard
      .map((cell, index) => cell === EMPTY ? index : null)
      .filter(index => index !== null);
  };

  // Findet einen Gewinnzug oder Block
  const findWinningMove = (currentBoard, player) => {
    for (const pattern of WIN_PATTERNS) {
      const [a, b, c] = pattern;
      const cells = [currentBoard[a], currentBoard[b], currentBoard[c]];
      const playerCount = cells.filter(c => c === player).length;
      const emptyCount = cells.filter(c => c === EMPTY).length;

      if (playerCount === 2 && emptyCount === 1) {
        const emptyIndex = pattern[cells.indexOf(EMPTY)];
        return emptyIndex;
      }
    }
    return null;
  };

  // Findet eine "Gabel" (Fork) - 2 Gewinnmöglichkeiten gleichzeitig erstellen
  const findFork = (currentBoard, player) => {
    const emptySquares = getEmptySquares(currentBoard);

    for (const square of emptySquares) {
      // Simuliere den Zug
      const testBoard = [...currentBoard];
      testBoard[square] = player;

      // Zähle wie viele Gewinnmöglichkeiten dieser Zug eröffnet
      let winningThreats = 0;
      for (const pattern of WIN_PATTERNS) {
        const [a, b, c] = pattern;
        const cells = [testBoard[a], testBoard[b], testBoard[c]];
        const playerCount = cells.filter(c => c === player).length;
        const emptyCount = cells.filter(c => c === EMPTY).length;

        if (playerCount === 2 && emptyCount === 1) {
          winningThreats++;
        }
      }

      // Eine Gabel erzeugt mindestens 2 Gewinndrohungen
      if (winningThreats >= 2) {
        return square;
      }
    }
    return null;
  };

  // Blocke eine gegnerische Gabel
  const blockFork = (currentBoard, opponent) => {
    const emptySquares = getEmptySquares(currentBoard);
    const me = opponent === PLAYER ? AI : PLAYER;

    // Finde alle möglichen Gabeln des Gegners
    const opponentForks = [];
    for (const square of emptySquares) {
      const testBoard = [...currentBoard];
      testBoard[square] = opponent;

      let threats = 0;
      for (const pattern of WIN_PATTERNS) {
        const [a, b, c] = pattern;
        const cells = [testBoard[a], testBoard[b], testBoard[c]];
        const playerCount = cells.filter(c => c === opponent).length;
        const emptyCount = cells.filter(c => c === EMPTY).length;

        if (playerCount === 2 && emptyCount === 1) {
          threats++;
        }
      }

      if (threats >= 2) {
        opponentForks.push(square);
      }
    }

    if (opponentForks.length === 0) return null;

    // Wenn nur eine Gabel möglich ist, blocke sie
    if (opponentForks.length === 1) {
      return opponentForks[0];
    }

    // Mehrere Gabeln möglich: Finde einen Zug der eine Drohung erzeugt
    // UND den Gegner zwingt zu blocken (statt seine Gabel zu bauen)
    for (const square of emptySquares) {
      if (opponentForks.includes(square)) continue;

      const testBoard = [...currentBoard];
      testBoard[square] = me;

      // Prüfe ob dieser Zug eine Drohung erzeugt
      const myWinMove = findWinningMove(testBoard, me);
      if (myWinMove !== null) {
        // Prüfe ob der Block-Zug des Gegners NICHT eine seiner Gabeln ist
        if (!opponentForks.includes(myWinMove)) {
          return square;
        }
      }
    }

    // Fallback: Blocke eine der Gabeln
    return opponentForks[Math.floor(Math.random() * opponentForks.length)];
  };

  // Minimax mit Alpha-Beta Pruning und Variabilität
  const minimax = useCallback((currentBoard, depth, isMaximizing, alpha, beta) => {
    const result = checkWinner(currentBoard);

    if (result?.winner === AI) return 10 - depth;
    if (result?.winner === PLAYER) return depth - 10;
    if (checkDraw(currentBoard)) return 0;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (currentBoard[i] === EMPTY) {
          currentBoard[i] = AI;
          const evaluation = minimax(currentBoard, depth + 1, false, alpha, beta);
          currentBoard[i] = EMPTY;
          maxEval = Math.max(maxEval, evaluation);
          alpha = Math.max(alpha, evaluation);
          if (beta <= alpha) break;
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let i = 0; i < 9; i++) {
        if (currentBoard[i] === EMPTY) {
          currentBoard[i] = PLAYER;
          const evaluation = minimax(currentBoard, depth + 1, true, alpha, beta);
          currentBoard[i] = EMPTY;
          minEval = Math.min(minEval, evaluation);
          beta = Math.min(beta, evaluation);
          if (beta <= alpha) break;
        }
      }
      return minEval;
    }
  }, [checkWinner]);

  // Findet ALLE besten Züge (für Variabilität)
  const findAllBestMoves = useCallback((currentBoard) => {
    const moves = [];
    let bestScore = -Infinity;

    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === EMPTY) {
        currentBoard[i] = AI;
        const score = minimax(currentBoard, 0, false, -Infinity, Infinity);
        currentBoard[i] = EMPTY;

        if (score > bestScore) {
          bestScore = score;
          moves.length = 0;
          moves.push(i);
        } else if (score === bestScore) {
          moves.push(i);
        }
      }
    }

    return moves;
  }, [minimax]);

  // Zufälliger Zug aus einer Liste
  const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Strategische Eröffnungszüge für die KI
  const getOpeningMove = (currentBoard) => {
    const aiMoves = countMoves(currentBoard, AI);
    const playerMoves = countMoves(currentBoard, PLAYER);

    // KI's erster Zug
    if (aiMoves === 0) {
      // Spieler hat Mitte genommen -> nimm eine Ecke
      if (currentBoard[CENTER] === PLAYER) {
        return randomChoice(CORNERS);
      }
      // Spieler hat eine Ecke genommen -> nimm die Mitte
      if (CORNERS.some(c => currentBoard[c] === PLAYER)) {
        return CENTER;
      }
      // Spieler hat eine Kante genommen -> nimm die Mitte
      if (EDGES.some(e => currentBoard[e] === PLAYER)) {
        return CENTER;
      }
    }

    // KI's zweiter Zug
    if (aiMoves === 1) {
      // Wenn KI die Mitte hat und Spieler eine Ecke -> nimm gegenüberliegende Ecke
      if (currentBoard[CENTER] === AI) {
        const playerCorner = CORNERS.find(c => currentBoard[c] === PLAYER);
        if (playerCorner !== undefined) {
          const opposite = OPPOSITE_CORNERS[playerCorner];
          if (currentBoard[opposite] === EMPTY) {
            return opposite;
          }
        }
        // Spieler hat Kante -> nimm eine Ecke die nicht neben der Kante ist
        const playerEdge = EDGES.find(e => currentBoard[e] === PLAYER);
        if (playerEdge !== undefined) {
          const notAdjacentCorners = CORNERS.filter(c => !ADJACENT_CORNERS[playerEdge]?.includes(c));
          const emptyNotAdjacent = notAdjacentCorners.filter(c => currentBoard[c] === EMPTY);
          if (emptyNotAdjacent.length > 0) {
            return randomChoice(emptyNotAdjacent);
          }
        }
      }

      // Wenn KI eine Ecke hat
      const aiCorner = CORNERS.find(c => currentBoard[c] === AI);
      if (aiCorner !== undefined) {
        // Spieler hat Mitte -> nimm gegenüberliegende Ecke
        if (currentBoard[CENTER] === PLAYER) {
          const opposite = OPPOSITE_CORNERS[aiCorner];
          if (currentBoard[opposite] === EMPTY) {
            return opposite;
          }
        }
      }
    }

    return null;
  };

  // LEICHTE KI - macht viele Fehler
  const getEasyMove = (currentBoard) => {
    // 20% Chance intelligent zu spielen
    if (Math.random() < 0.2) {
      const winMove = findWinningMove(currentBoard, AI);
      if (winMove !== null) return winMove;
    }

    // 30% Chance zu blocken
    if (Math.random() < 0.3) {
      const blockMove = findWinningMove(currentBoard, PLAYER);
      if (blockMove !== null) return blockMove;
    }

    // Sonst zufällig
    return randomChoice(getEmptySquares(currentBoard));
  };

  // MITTLERE KI - spielt solide aber nicht perfekt
  const getMediumMove = (currentBoard) => {
    // Immer gewinnen wenn möglich
    const winMove = findWinningMove(currentBoard, AI);
    if (winMove !== null) return winMove;

    // Immer blocken wenn nötig
    const blockMove = findWinningMove(currentBoard, PLAYER);
    if (blockMove !== null) return blockMove;

    // 70% Chance Gabeln zu nutzen
    if (Math.random() < 0.7) {
      const forkMove = findFork(currentBoard, AI);
      if (forkMove !== null) return forkMove;
    }

    // 60% Chance gegnerische Gabeln zu blocken
    if (Math.random() < 0.6) {
      const blockForkMove = blockFork(currentBoard, PLAYER);
      if (blockForkMove !== null) return blockForkMove;
    }

    // Mitte bevorzugen
    if (currentBoard[CENTER] === EMPTY && Math.random() < 0.8) {
      return CENTER;
    }

    // Ecken bevorzugen
    const emptyCorners = CORNERS.filter(c => currentBoard[c] === EMPTY);
    if (emptyCorners.length > 0 && Math.random() < 0.7) {
      return randomChoice(emptyCorners);
    }

    // Kanten
    const emptyEdges = EDGES.filter(e => currentBoard[e] === EMPTY);
    if (emptyEdges.length > 0) {
      return randomChoice(emptyEdges);
    }

    return randomChoice(getEmptySquares(currentBoard));
  };

  // SCHWERE KI - spielt perfekt mit Variabilität
  const getHardMove = (currentBoard) => {
    // Immer gewinnen wenn möglich (sofort, ohne Nachdenken)
    const winMove = findWinningMove(currentBoard, AI);
    if (winMove !== null) return winMove;

    // Immer blocken wenn nötig
    const blockMove = findWinningMove(currentBoard, PLAYER);
    if (blockMove !== null) return blockMove;

    // Strategische Eröffnungen nutzen
    const openingMove = getOpeningMove(currentBoard);
    if (openingMove !== null) return openingMove;

    // Gabeln bauen
    const forkMove = findFork(currentBoard, AI);
    if (forkMove !== null) return forkMove;

    // Gegnerische Gabeln blocken
    const blockForkMove = blockFork(currentBoard, PLAYER);
    if (blockForkMove !== null) return blockForkMove;

    // Mitte nehmen
    if (currentBoard[CENTER] === EMPTY) return CENTER;

    // Gegenüberliegende Ecke zum Spieler
    for (const corner of CORNERS) {
      if (currentBoard[corner] === PLAYER) {
        const opposite = OPPOSITE_CORNERS[corner];
        if (currentBoard[opposite] === EMPTY) {
          return opposite;
        }
      }
    }

    // Leere Ecke
    const emptyCorners = CORNERS.filter(c => currentBoard[c] === EMPTY);
    if (emptyCorners.length > 0) {
      return randomChoice(emptyCorners);
    }

    // Leere Kante
    const emptyEdges = EDGES.filter(e => currentBoard[e] === EMPTY);
    if (emptyEdges.length > 0) {
      return randomChoice(emptyEdges);
    }

    // Fallback: Minimax mit Variabilität
    const bestMoves = findAllBestMoves([...currentBoard]);
    return randomChoice(bestMoves);
  };

  // KI-Zug basierend auf Schwierigkeit
  const getAIMove = useCallback((currentBoard) => {
    switch (difficulty) {
      case DIFFICULTY.EASY:
        return getEasyMove(currentBoard);
      case DIFFICULTY.MEDIUM:
        return getMediumMove(currentBoard);
      case DIFFICULTY.HARD:
        return getHardMove(currentBoard);
      default:
        return randomChoice(getEmptySquares(currentBoard));
    }
  }, [difficulty, findAllBestMoves]);

  // Zeigt temporäre Nachricht
  const showMessage = (text, duration = 1500) => {
    setMessage(text);
    setTimeout(() => setMessage(null), duration);
  };

  // KI macht ihren Zug
  useEffect(() => {
    if (!isPlayerTurn && !gameOver) {
      setIsThinking(true);

      const delay = difficulty === DIFFICULTY.HARD ? 1000 :
                   difficulty === DIFFICULTY.MEDIUM ? 700 : 400;

      const timer = setTimeout(() => {
        const move = getAIMove(board);

        if (move !== null) {
          const newBoard = [...board];
          newBoard[move] = AI;
          setBoard(newBoard);
          setMoveCount(m => m + 1);

          const result = checkWinner(newBoard);
          if (result) {
            setWinner(result.winner);
            setWinningLine(result.line);
            setGameOver(true);
            if (result.winner === PLAYER) {
              const points = difficulty === DIFFICULTY.HARD ? 15 :
                            difficulty === DIFFICULTY.MEDIUM ? 10 : 5;
              setScore(points);
              showMessage(`🎉 Du gewinnst! +${points} Münzen`);
            } else {
              showMessage('😔 Die KI gewinnt!');
            }
          } else if (checkDraw(newBoard)) {
            setGameOver(true);
            const points = difficulty === DIFFICULTY.HARD ? 5 : 3;
            setScore(points);
            showMessage(`🤝 Unentschieden! +${points} Münzen`);
          } else {
            setIsPlayerTurn(true);
          }
        }

        setIsThinking(false);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, gameOver, board, getAIMove, checkWinner, difficulty]);

  // Spieler macht Zug
  const handleCellClick = (index) => {
    if (board[index] !== EMPTY || !isPlayerTurn || gameOver || isThinking) return;

    const newBoard = [...board];
    newBoard[index] = PLAYER;
    setBoard(newBoard);
    setMoveCount(m => m + 1);

    const result = checkWinner(newBoard);
    if (result) {
      setWinner(result.winner);
      setWinningLine(result.line);
      setGameOver(true);
      const points = difficulty === DIFFICULTY.HARD ? 15 :
                    difficulty === DIFFICULTY.MEDIUM ? 10 : 5;
      setScore(points);
      showMessage(`🎉 Du gewinnst! +${points} Münzen`);
    } else if (checkDraw(newBoard)) {
      setGameOver(true);
      const points = difficulty === DIFFICULTY.HARD ? 5 : 3;
      setScore(points);
      showMessage(`🤝 Unentschieden! +${points} Münzen`);
    } else {
      setIsPlayerTurn(false);
    }
  };

  // Neues Spiel starten
  const resetGame = () => {
    setBoard(Array(9).fill(EMPTY));
    setIsPlayerTurn(true);
    setGameOver(false);
    setWinner(null);
    setWinningLine([]);
    setMessage(null);
    setMoveCount(0);
  };

  // Schwierigkeits-Label
  const getDifficultyLabel = () => {
    switch (difficulty) {
      case DIFFICULTY.EASY: return '🟢 Leicht';
      case DIFFICULTY.MEDIUM: return '🟡 Mittel';
      case DIFFICULTY.HARD: return '🔴 Schwer';
      default: return '';
    }
  };

  // Zellen-Style
  const getCellClass = (index) => {
    const isWinning = winningLine.includes(index);
    const isEmpty = board[index] === EMPTY;

    let classes = `
      aspect-square rounded-xl text-4xl sm:text-5xl
      flex items-center justify-center
      font-bold transition-all duration-200
      shadow-md
    `;

    if (isWinning) {
      classes += ' bg-green-400 scale-110 animate-pulse';
    } else if (isEmpty && isPlayerTurn && !gameOver && !isThinking) {
      classes += ' bg-white/90 hover:bg-yellow-200 hover:scale-105 cursor-pointer';
    } else {
      classes += ' bg-white/90';
    }

    if (!isEmpty) {
      classes += board[index] === PLAYER ? ' text-blue-500' : ' text-red-500';
    }

    return classes;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-indigo-500 to-purple-600 rounded-3xl p-4 max-w-sm w-full shadow-2xl relative">
        {/* Nachricht */}
        {message && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30
                          bg-white/95 px-6 py-4 rounded-2xl shadow-2xl
                          text-2xl font-bold text-center animate-bounce">
            {message}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="bg-yellow-400 px-3 py-1 rounded-full font-bold shadow-lg">
            💰 {score}
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-white drop-shadow-lg">Tic Tac Toe</h2>
            <div className="text-sm text-white/80">{getDifficultyLabel()}</div>
          </div>

          <div className="bg-white/20 px-3 py-1 rounded-full text-white text-sm">
            {isThinking ? '🤔 KI denkt...' : isPlayerTurn ? '👆 Du bist dran' : ''}
          </div>
        </div>

        {/* Spieler-Anzeige */}
        <div className="flex justify-center gap-8 mb-4">
          <div className={`px-4 py-2 rounded-xl font-bold transition-all ${
            isPlayerTurn && !gameOver ? 'bg-blue-400 text-white scale-110' : 'bg-white/30 text-white/70'
          }`}>
            {PLAYER} Du
          </div>
          <div className={`px-4 py-2 rounded-xl font-bold transition-all ${
            !isPlayerTurn && !gameOver ? 'bg-red-400 text-white scale-110' : 'bg-white/30 text-white/70'
          }`}>
            {AI} KI
          </div>
        </div>

        {/* Spielfeld */}
        <div className="bg-white/20 rounded-2xl p-3 backdrop-blur">
          <div className="grid grid-cols-3 gap-2">
            {board.map((cell, index) => (
              <button
                key={index}
                onClick={() => handleCellClick(index)}
                disabled={cell !== EMPTY || !isPlayerTurn || gameOver || isThinking}
                className={getCellClass(index)}
              >
                {cell}
              </button>
            ))}
          </div>
        </div>

        {/* Denkanimation */}
        {isThinking && (
          <div className="flex justify-center mt-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Info-Text */}
        <p className="text-center text-white/80 text-sm mt-3">
          {gameOver
            ? winner === PLAYER
              ? '🎉 Glückwunsch, du hast gewonnen!'
              : winner === AI
                ? '😢 Die KI hat gewonnen. Versuch es nochmal!'
                : '🤝 Unentschieden! Gut gespielt!'
            : difficulty === DIFFICULTY.HARD
              ? '⚠️ Perfekte KI - Unentschieden ist das Beste!'
              : 'Setze 3 in einer Reihe um zu gewinnen!'}
        </p>

        {/* Buttons */}
        <div className="flex gap-2 mt-4">
          {gameOver && (
            <button
              onClick={resetGame}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-full shadow-lg
                         transform hover:scale-105 transition-transform"
            >
              🔄 Nochmal spielen
            </button>
          )}
          <button
            onClick={() => onWin(score)}
            className={`${gameOver ? 'flex-1' : 'w-full'} bg-gradient-to-r from-red-500 to-orange-500
                       hover:from-red-600 hover:to-orange-600 text-white font-bold py-3 px-4 rounded-full shadow-lg
                       transform hover:scale-105 transition-transform`}
          >
            {gameOver ? `Beenden (+${score}💰)` : 'Aufgeben'}
          </button>
        </div>

        {/* Punkte-Info */}
        <div className="text-center text-white/60 text-xs mt-2">
          Gewinnen: {difficulty === DIFFICULTY.HARD ? 15 : difficulty === DIFFICULTY.MEDIUM ? 10 : 5} Münzen |
          Unentschieden: {difficulty === DIFFICULTY.HARD ? 5 : 3} Münzen
        </div>
      </div>
    </div>
  );
};

export { DIFFICULTY };
export default TicTacToe;
