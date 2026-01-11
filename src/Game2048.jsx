import React, { useState, useEffect, useCallback } from 'react';

const Game2048 = ({ onClose, onWin }) => {
  const [board, setBoard] = useState(Array(4).fill().map(() => Array(4).fill(0)));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  
  // Initialize game
  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const newBoard = Array(4).fill().map(() => Array(4).fill(0));
    addRandomTile(newBoard);
    addRandomTile(newBoard);
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
    setWon(false);
  };

  const addRandomTile = (currentBoard) => {
    const emptyTiles = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentBoard[r][c] === 0) {
          emptyTiles.push({ r, c });
        }
      }
    }

    if (emptyTiles.length > 0) {
      const { r, c } = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
      currentBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  };

  const traverse = (direction, callback) => {
      // Create a copy of the board to modify
      const newBoard = board.map(row => [...row]);
      let moved = false;
      let scoreToAdd = 0;

      if (direction === 'UP') {
          for (let c = 0; c < 4; c++) {
              let merged = [false, false, false, false];
              for (let r = 1; r < 4; r++) {
                  if (newBoard[r][c] !== 0) {
                      let currentRow = r;
                      while (currentRow > 0) {
                          if (newBoard[currentRow - 1][c] === 0) {
                              newBoard[currentRow - 1][c] = newBoard[currentRow][c];
                              newBoard[currentRow][c] = 0;
                              currentRow--;
                              moved = true;
                          } else if (newBoard[currentRow - 1][c] === newBoard[currentRow][c] && !merged[currentRow - 1]) {
                              newBoard[currentRow - 1][c] *= 2;
                              newBoard[currentRow][c] = 0;
                              merged[currentRow - 1] = true;
                              scoreToAdd += newBoard[currentRow - 1][c];
                              moved = true;
                              break;
                          } else {
                              break;
                          }
                      }
                  }
              }
          }
      } else if (direction === 'DOWN') {
          for (let c = 0; c < 4; c++) {
              let merged = [false, false, false, false];
              for (let r = 2; r >= 0; r--) {
                  if (newBoard[r][c] !== 0) {
                      let currentRow = r;
                      while (currentRow < 3) {
                          if (newBoard[currentRow + 1][c] === 0) {
                              newBoard[currentRow + 1][c] = newBoard[currentRow][c];
                              newBoard[currentRow][c] = 0;
                              currentRow++;
                              moved = true;
                          } else if (newBoard[currentRow + 1][c] === newBoard[currentRow][c] && !merged[currentRow + 1]) {
                              newBoard[currentRow + 1][c] *= 2;
                              newBoard[currentRow][c] = 0;
                              merged[currentRow + 1] = true;
                              scoreToAdd += newBoard[currentRow + 1][c];
                              moved = true;
                              break;
                          } else {
                              break;
                          }
                      }
                  }
              }
          }
      } else if (direction === 'LEFT') {
          for (let r = 0; r < 4; r++) {
              let merged = [false, false, false, false];
              for (let c = 1; c < 4; c++) {
                  if (newBoard[r][c] !== 0) {
                      let currentCol = c;
                      while (currentCol > 0) {
                          if (newBoard[r][currentCol - 1] === 0) {
                              newBoard[r][currentCol - 1] = newBoard[r][currentCol];
                              newBoard[r][currentCol] = 0;
                              currentCol--;
                              moved = true;
                          } else if (newBoard[r][currentCol - 1] === newBoard[r][currentCol] && !merged[currentCol - 1]) {
                              newBoard[r][currentCol - 1] *= 2;
                              newBoard[r][currentCol] = 0;
                              merged[currentCol - 1] = true;
                              scoreToAdd += newBoard[r][currentCol - 1];
                              moved = true;
                              break;
                          } else {
                              break;
                          }
                      }
                  }
              }
          }
      } else if (direction === 'RIGHT') {
          for (let r = 0; r < 4; r++) {
              let merged = [false, false, false, false];
              for (let c = 2; c >= 0; c--) {
                  if (newBoard[r][c] !== 0) {
                      let currentCol = c;
                      while (currentCol < 3) {
                          if (newBoard[r][currentCol + 1] === 0) {
                              newBoard[r][currentCol + 1] = newBoard[r][currentCol];
                              newBoard[r][currentCol] = 0;
                              currentCol++;
                              moved = true;
                          } else if (newBoard[r][currentCol + 1] === newBoard[r][currentCol] && !merged[currentCol + 1]) {
                              newBoard[r][currentCol + 1] *= 2;
                              newBoard[r][currentCol] = 0;
                              merged[currentCol + 1] = true;
                              scoreToAdd += newBoard[r][currentCol + 1];
                              moved = true;
                              break;
                          } else {
                              break;
                          }
                      }
                  }
              }
          }
      }

      if (moved) {
          addRandomTile(newBoard);
          setBoard(newBoard);
          setScore(prev => prev + scoreToAdd);
          checkGameState(newBoard);
      }
  };

  const checkGameState = (currentBoard) => {
      // Check for 2048 tile
      for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
              if (currentBoard[r][c] === 2048 && !won) {
                  setWon(true);
                  // Don't stop the game, just mark as won
              }
          }
      }

      // Check for Game Over (no empty cells and no merges possible)
      let movesPossible = false;
      
      // Check for empty cells
      for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
              if (currentBoard[r][c] === 0) {
                  movesPossible = true;
                  break;
              }
          }
      }

      // Check for merges
      if (!movesPossible) {
          for (let r = 0; r < 4; r++) {
              for (let c = 0; c < 4; c++) {
                  // Check right
                  if (c < 3 && currentBoard[r][c] === currentBoard[r][c+1]) {
                      movesPossible = true;
                  }
                  // Check down
                  if (r < 3 && currentBoard[r][c] === currentBoard[r+1][c]) {
                      movesPossible = true;
                  }
              }
          }
      }

      if (!movesPossible) {
          setGameOver(true);
      }
  };

  const handleKeyDown = useCallback((e) => {
    if (gameOver) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        traverse('UP');
        break;
      case 'ArrowDown':
        e.preventDefault();
        traverse('DOWN');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        traverse('LEFT');
        break;
      case 'ArrowRight':
        e.preventDefault();
        traverse('RIGHT');
        break;
      default:
        break;
    }
  }, [board, gameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);


  // Swipe handling
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontal) {
        if (Math.abs(distanceX) > minSwipeDistance) {
            if (distanceX > 0) traverse('LEFT');
            else traverse('RIGHT');
        }
    } else {
        if (Math.abs(distanceY) > minSwipeDistance) {
            if (distanceY > 0) traverse('UP');
            else traverse('DOWN');
        }
    }
  };

  // UI Configuration
  const getCellColor = (value) => {
      const colors = {
          0: 'bg-indigo-200',
          2: 'bg-white text-gray-800',
          4: 'bg-yellow-100 text-gray-800',
          8: 'bg-orange-200 text-white',
          16: 'bg-orange-400 text-white',
          32: 'bg-orange-500 text-white',
          64: 'bg-red-400 text-white',
          128: 'bg-red-500 text-white',
          256: 'bg-yellow-400 text-white shadow-[0_0_10px_rgba(250,204,21,0.6)]',
          512: 'bg-yellow-500 text-white shadow-[0_0_10px_rgba(234,179,8,0.6)]',
          1024: 'bg-yellow-600 text-white shadow-[0_0_15px_rgba(202,138,4,0.7)]',
          2048: 'bg-yellow-700 text-white shadow-[0_0_20px_rgba(161,98,7,0.8)] border-2 border-yellow-300',
      };
      return colors[value] || 'bg-gray-900 text-white';
  };

  const getFontSize = (value) => {
      if (value < 100) return 'text-3xl sm:text-4xl';
      if (value < 1000) return 'text-2xl sm:text-3xl';
      return 'text-xl sm:text-2xl';
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={(e) => {
        if(e.target === e.currentTarget) onClose(Math.floor(score / 50));
    }}>
      <div 
        className="bg-gradient-to-br from-indigo-500 to-purple-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="text-yellow-300 font-bold text-xl">2048</div>
            <div className="text-white/70 text-sm">Join the numbers!</div>
          </div>
          <div className="bg-black/30 px-4 py-2 rounded-xl text-center">
             <div className="text-xs text-white/70 uppercase font-bold tracking-wider">Score</div>
             <div className="text-white font-bold text-xl">{score}</div>
          </div>
        </div>

        {/* Board */}
        <div className="bg-indigo-900/50 p-3 rounded-xl backdrop-blur-sm border-2 border-indigo-400/30 touch-none">
            <div className="grid grid-cols-4 gap-2">
                {board.map((row, r) => (
                    row.map((cell, c) => (
                        <div 
                            key={`${r}-${c}`}
                            className={`aspect-square rounded-lg flex items-center justify-center font-bold transition-all duration-100 transform
                                ${getCellColor(cell)} ${getFontSize(cell)}
                                ${cell > 0 ? 'scale-100 opacity-100' : 'scale-95'}`}
                        >
                            {cell > 0 ? cell : ''}
                        </div>
                    ))
                ))}
            </div>
        </div>

        {/* Game Over / Win Overlay */}
        {(gameOver || (won && !gameOver)) && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50 rounded-3xl backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl shadow-2xl text-center m-4 animate-bounce-in">
                    <h2 className="text-3xl font-bold mb-2">
                        {gameOver ? 'Game Over!' : 'You Won!'}
                    </h2>
                    <p className="text-gray-600 mb-4">
                        {gameOver ? `Score: ${score}` : 'You reached 2048!'}
                    </p>
                    <div className="flex gap-2 justify-center">
                        <button 
                            onClick={initGame}
                            className="bg-indigo-500 text-white px-4 py-2 rounded-full font-bold hover:bg-indigo-600 transition-colors"
                        >
                            Try Again
                        </button>
                        <button 
                            onClick={() => onWin(Math.floor(score/10))} 
                            className="bg-green-500 text-white px-4 py-2 rounded-full font-bold hover:bg-green-600 transition-colors"
                        >
                            Collect {Math.floor(score/10)} 💰
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Controls Hint */}
        <div className="mt-6 flex justify-between items-center">
            <button 
                onClick={() => onClose(Math.floor(score/20))}
                className="text-white/60 hover:text-white transition-colors"
            >
                ← Exit
            </button>
            <div className="text-white/40 text-xs text-right">
                Swipe or use Arrow Keys
            </div>
        </div>

      </div>
    </div>
  );
};

export default Game2048;
