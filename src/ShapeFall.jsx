import React, { useState, useEffect, useCallback, useRef } from 'react';

const GAME_WIDTH = 350;
const GAME_HEIGHT = 500;
const CATCHER_WIDTH = 80;
const CATCHER_HEIGHT = 15;
const SHAPE_SIZE = 30;

const COLORS = {
  CIRCLE: '#00FFFF',    // Cyan
  SQUARE: '#FF00FF',    // Magenta
  BG: '#1a1a1a',
  GLOW_CIRCLE: '0 0 20px #00FFFF, 0 0 40px #00FFFF',
  GLOW_SQUARE: '0 0 20px #FF00FF, 0 0 40px #FF00FF',
};

const ShapeFall = ({ onClose, onWin }) => {
  const [gameState, setGameState] = useState('ready'); // ready, playing, gameover
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [catcherMode, setCatcherMode] = useState('circle'); // circle oder square
  const [shapes, setShapes] = useState([]);
  const [particles, setParticles] = useState([]);
  const [catcherEffect, setCatcherEffect] = useState(null); // 'success', 'fail'
  const [combo, setCombo] = useState(0);
  const [speed, setSpeed] = useState(2);

  const gameLoopRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const lastTimeRef = useRef(0);

  // Catcher umschalten
  const toggleCatcher = useCallback(() => {
    if (gameState !== 'playing') return;
    setCatcherMode(m => m === 'circle' ? 'square' : 'circle');
  }, [gameState]);

  // Tastatur-Events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        if (gameState === 'ready') {
          startGame();
        } else {
          toggleCatcher();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, toggleCatcher]);

  // Spiel starten
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setShapes([]);
    setParticles([]);
    setCombo(0);
    setSpeed(2);
    setCatcherMode('circle');
  };

  // Neue Form spawnen
  const spawnShape = useCallback(() => {
    if (gameState !== 'playing') return;

    const type = Math.random() > 0.5 ? 'circle' : 'square';
    const x = Math.random() * (GAME_WIDTH - SHAPE_SIZE * 2) + SHAPE_SIZE;

    setShapes(prev => [...prev, {
      id: Date.now() + Math.random(),
      type,
      x,
      y: -SHAPE_SIZE,
      speed: speed + Math.random() * 1.5,
    }]);
  }, [gameState, speed]);

  // Partikel erstellen
  const createParticles = (x, y, color) => {
    const newParticles = [];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: Math.cos(angle) * (3 + Math.random() * 2),
        vy: Math.sin(angle) * (3 + Math.random() * 2),
        color,
        life: 1,
        size: 6 + Math.random() * 4,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  // Erfolgseffekt
  const triggerSuccess = () => {
    setCatcherEffect('success');
    setTimeout(() => setCatcherEffect(null), 200);
  };

  // Fehlereffekt
  const triggerFail = () => {
    setCatcherEffect('fail');
    setTimeout(() => setCatcherEffect(null), 500);
  };

  // Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const catcherY = GAME_HEIGHT - CATCHER_HEIGHT - 20;
    const catcherX = GAME_WIDTH / 2 - CATCHER_WIDTH / 2;

    const gameLoop = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 16.67; // Normalisieren auf 60fps
      lastTimeRef.current = timestamp;

      setShapes(prevShapes => {
        const newShapes = [];
        let gameOver = false;

        for (const shape of prevShapes) {
          const newY = shape.y + shape.speed * delta;

          // Kollision mit Catcher prüfen
          if (
            newY + SHAPE_SIZE >= catcherY &&
            newY + SHAPE_SIZE <= catcherY + CATCHER_HEIGHT + shape.speed * 2 &&
            shape.x >= catcherX - SHAPE_SIZE / 2 &&
            shape.x <= catcherX + CATCHER_WIDTH + SHAPE_SIZE / 2
          ) {
            // Form berührt Catcher
            if (shape.type === catcherMode) {
              // Richtig gefangen!
              setScore(s => s + 1 + Math.floor(combo / 5));
              setCombo(c => c + 1);
              createParticles(shape.x, catcherY, shape.type === 'circle' ? COLORS.CIRCLE : COLORS.SQUARE);
              triggerSuccess();

              // Schwierigkeit erhöhen
              if ((score + 1) % 10 === 0) {
                setSpeed(s => Math.min(s + 0.3, 6));
              }
            } else {
              // Falsch! Game Over
              gameOver = true;
              triggerFail();
            }
            continue; // Form entfernen
          }

          // Form unter dem Bildschirm?
          if (newY > GAME_HEIGHT + SHAPE_SIZE) {
            // Verpasst - Combo zurücksetzen aber kein Game Over
            setCombo(0);
            continue;
          }

          newShapes.push({ ...shape, y: newY });
        }

        if (gameOver) {
          setGameState('gameover');
          setHighScore(h => Math.max(h, score));
          return prevShapes;
        }

        return newShapes;
      });

      // Partikel updaten
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.1, // Gravity
            life: p.life - 0.03,
          }))
          .filter(p => p.life > 0)
      );

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, catcherMode, score, combo]);

  // Spawn Timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawnInterval = Math.max(800 - score * 20, 400);

    spawnTimerRef.current = setInterval(() => {
      spawnShape();
    }, spawnInterval);

    // Initial spawn
    setTimeout(spawnShape, 500);

    return () => {
      if (spawnTimerRef.current) {
        clearInterval(spawnTimerRef.current);
      }
    };
  }, [gameState, spawnShape, score]);

  // Münzen berechnen
  const getCoins = () => Math.floor(score / 3);

  // Click Handler
  const handleClick = () => {
    if (gameState === 'ready' || gameState === 'gameover') {
      startGame();
    } else {
      toggleCatcher();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      {/* CSS Animationen */}
      <style>{`
        @keyframes neon-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.5); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-10px); }
          80% { transform: translateX(10px); }
        }
        @keyframes success-glow {
          0% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.2); filter: brightness(2); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        @keyframes float-down {
          0% { transform: translateY(-20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .neon-text {
          text-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor;
        }
        .shape-fall {
          animation: float-down 0.3s ease-out;
        }
      `}</style>

      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          width: GAME_WIDTH,
          height: GAME_HEIGHT + 100,
          backgroundColor: COLORS.BG,
          boxShadow: '0 0 50px rgba(0, 255, 255, 0.3), 0 0 100px rgba(255, 0, 255, 0.2)',
        }}
        onClick={handleClick}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-center z-10"
             style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
          <div className="text-cyan-400 font-bold neon-text">
            Score: {score}
          </div>
          <div className="text-center">
            <div className="text-white text-sm font-bold">SHAPE FALL</div>
            {combo > 2 && (
              <div className="text-yellow-400 text-xs animate-pulse">
                {combo}x Combo!
              </div>
            )}
          </div>
          <div className="text-fuchsia-400 font-bold neon-text">
            Best: {highScore}
          </div>
        </div>

        {/* Spielfeld */}
        <div
          className="absolute"
          style={{
            top: 50,
            left: 0,
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            animation: catcherEffect === 'fail' ? 'shake 0.5s ease-in-out' : 'none',
          }}
        >
          {/* Fallende Formen */}
          {shapes.map(shape => (
            <div
              key={shape.id}
              className="absolute shape-fall"
              style={{
                left: shape.x - SHAPE_SIZE / 2,
                top: shape.y,
                width: SHAPE_SIZE,
                height: SHAPE_SIZE,
                backgroundColor: shape.type === 'circle' ? COLORS.CIRCLE : COLORS.SQUARE,
                borderRadius: shape.type === 'circle' ? '50%' : '4px',
                boxShadow: shape.type === 'circle' ? COLORS.GLOW_CIRCLE : COLORS.GLOW_SQUARE,
              }}
            />
          ))}

          {/* Partikel */}
          {particles.map(p => (
            <div
              key={p.id}
              className="absolute rounded"
              style={{
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity: p.life,
                boxShadow: `0 0 ${p.size}px ${p.color}`,
              }}
            />
          ))}

          {/* Catcher */}
          <div
            className="absolute transition-all duration-100"
            style={{
              left: GAME_WIDTH / 2 - CATCHER_WIDTH / 2,
              top: GAME_HEIGHT - CATCHER_HEIGHT - 20,
              width: CATCHER_WIDTH,
              height: CATCHER_HEIGHT,
              backgroundColor: catcherMode === 'circle' ? COLORS.CIRCLE : COLORS.SQUARE,
              borderRadius: catcherMode === 'circle' ? '20px' : '4px',
              boxShadow: catcherMode === 'circle' ? COLORS.GLOW_CIRCLE : COLORS.GLOW_SQUARE,
              animation: catcherEffect === 'success' ? 'success-glow 0.2s ease-out' : 'none',
              transform: catcherEffect === 'success' ? 'scale(1.1)' : 'scale(1)',
            }}
          />

          {/* Modus-Anzeige */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm font-bold"
            style={{ top: GAME_HEIGHT - 60 }}
          >
            <span style={{ color: COLORS.CIRCLE, opacity: catcherMode === 'circle' ? 1 : 0.3 }}>●</span>
            <span className="text-white/50">⟷</span>
            <span style={{ color: COLORS.SQUARE, opacity: catcherMode === 'square' ? 1 : 0.3 }}>■</span>
          </div>
        </div>

        {/* Start Screen */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20">
            <div className="text-4xl font-bold text-white mb-4 neon-text" style={{ color: COLORS.CIRCLE }}>
              SHAPE FALL
            </div>
            <div className="flex gap-4 mb-6">
              <div
                className="w-12 h-12 rounded-full"
                style={{ backgroundColor: COLORS.CIRCLE, boxShadow: COLORS.GLOW_CIRCLE }}
              />
              <div
                className="w-12 h-12 rounded"
                style={{ backgroundColor: COLORS.SQUARE, boxShadow: COLORS.GLOW_SQUARE }}
              />
            </div>
            <p className="text-white/80 text-center px-4 mb-4">
              Tippe oder drücke SPACE um zwischen<br />
              <span style={{ color: COLORS.CIRCLE }}>Kreis</span> und <span style={{ color: COLORS.SQUARE }}>Quadrat</span> zu wechseln!
            </p>
            <p className="text-white/60 text-sm mb-6">
              Fange die passenden Formen!
            </p>
            <button
              onClick={startGame}
              className="px-8 py-3 rounded-full font-bold text-lg transition-transform hover:scale-110"
              style={{
                background: `linear-gradient(135deg, ${COLORS.CIRCLE}, ${COLORS.SQUARE})`,
                boxShadow: '0 0 30px rgba(0, 255, 255, 0.5)',
              }}
            >
              START
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
            <div
              className="text-3xl font-bold mb-2 neon-text"
              style={{ color: COLORS.SQUARE }}
            >
              GAME OVER
            </div>
            <div className="text-6xl font-bold text-white mb-2">
              {score}
            </div>
            <div className="text-white/60 mb-4">
              {score > highScore ? '🎉 Neuer Highscore!' : `Highscore: ${highScore}`}
            </div>
            <div className="text-yellow-400 text-xl font-bold mb-6">
              +{getCoins()} 💰
            </div>
            <div className="flex gap-3">
              <button
                onClick={startGame}
                className="px-6 py-2 rounded-full font-bold transition-transform hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.CIRCLE}, ${COLORS.SQUARE})`,
                }}
              >
                Nochmal
              </button>
              <button
                onClick={() => onWin(getCoins())}
                className="px-6 py-2 bg-white/20 rounded-full font-bold text-white transition-transform hover:scale-110"
              >
                Beenden (+{getCoins()}💰)
              </button>
            </div>
          </div>
        )}

        {/* Anleitung unten */}
        {gameState === 'playing' && (
          <div className="absolute bottom-2 left-0 right-0 text-center text-white/40 text-xs">
            Tippe zum Wechseln | Score ÷ 3 = Münzen
          </div>
        )}
      </div>

      {/* Schließen Button */}
      <button
        onClick={() => onWin(getCoins())}
        className="absolute top-4 right-4 text-white/50 hover:text-white text-3xl transition-colors"
      >
        ✕
      </button>
    </div>
  );
};

export default ShapeFall;
