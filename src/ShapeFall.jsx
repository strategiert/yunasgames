import React, { useState, useEffect, useCallback, useRef } from 'react';

const GAME_WIDTH = 350;
const GAME_HEIGHT = 550;
const CATCHER_WIDTH = 70;
const CATCHER_HEIGHT = 50;
const ITEM_SIZE = 40;

// Items die fallen können
const ITEMS = {
  good: [
    { emoji: '🦴', name: 'Knochen', points: 10 },
    { emoji: '🍖', name: 'Leckerli', points: 15 },
    { emoji: '❤️', name: 'Herz', points: 20 },
    { emoji: '⭐', name: 'Stern', points: 25 },
    { emoji: '🎾', name: 'Ball', points: 10 },
  ],
  bad: [
    { emoji: '🧦', name: 'Stinkesocke', points: -20 },
    { emoji: '👟', name: 'Alter Schuh', points: -15 },
    { emoji: '🥦', name: 'Brokkoli', points: -10 },
  ],
  powerup: [
    { emoji: '🧲', name: 'Magnet', effect: 'magnet', duration: 5000 },
    { emoji: '✨', name: 'Doppelt', effect: 'double', duration: 5000 },
    { emoji: '🛡️', name: 'Schild', effect: 'shield', duration: 1 },
  ],
};

const ShapeFall = ({ onClose, onWin }) => {
  const [gameState, setGameState] = useState('ready'); // ready, playing, gameover
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('leckerliFangen_highscore');
    return saved ? parseInt(saved) : 0;
  });
  const [lives, setLives] = useState(3);
  const [catcherX, setCatcherX] = useState(GAME_WIDTH / 2 - CATCHER_WIDTH / 2);
  const [items, setItems] = useState([]);
  const [particles, setParticles] = useState([]);
  const [combo, setCombo] = useState(0);
  const [activeEffects, setActiveEffects] = useState({}); // { magnet: true, double: true, shield: 1 }
  const [lastCatch, setLastCatch] = useState(null); // Für Animations-Feedback
  const [speed, setSpeed] = useState(2.5);

  const gameLoopRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const lastTimeRef = useRef(0);
  const gameAreaRef = useRef(null);
  const isDragging = useRef(false);

  // Touch/Mouse Handler für Catcher-Bewegung
  const handleMove = useCallback((clientX) => {
    if (gameState !== 'playing') return;

    const gameArea = gameAreaRef.current;
    if (!gameArea) return;

    const rect = gameArea.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const newX = Math.max(0, Math.min(GAME_WIDTH - CATCHER_WIDTH, relativeX - CATCHER_WIDTH / 2));
    setCatcherX(newX);
  }, [gameState]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging.current) {
      handleMove(e.clientX);
    }
  }, [handleMove]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  }, [handleMove]);

  const handleMouseDown = (e) => {
    isDragging.current = true;
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleTouchStart = (e) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  // Tastatur-Steuerung
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'playing') return;

      if (e.code === 'ArrowLeft') {
        setCatcherX(x => Math.max(0, x - 30));
      } else if (e.code === 'ArrowRight') {
        setCatcherX(x => Math.min(GAME_WIDTH - CATCHER_WIDTH, x + 30));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gameState, handleMouseMove]);

  // Spiel starten
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    setItems([]);
    setParticles([]);
    setCombo(0);
    setSpeed(2.5);
    setActiveEffects({});
    setCatcherX(GAME_WIDTH / 2 - CATCHER_WIDTH / 2);
  };

  // Zufälliges Item spawnen
  const spawnItem = useCallback(() => {
    if (gameState !== 'playing') return;

    const rand = Math.random();
    let category, item;

    if (rand < 0.65) {
      // 65% gute Items
      category = 'good';
      item = ITEMS.good[Math.floor(Math.random() * ITEMS.good.length)];
    } else if (rand < 0.85) {
      // 20% schlechte Items
      category = 'bad';
      item = ITEMS.bad[Math.floor(Math.random() * ITEMS.bad.length)];
    } else {
      // 15% Power-Ups
      category = 'powerup';
      item = ITEMS.powerup[Math.floor(Math.random() * ITEMS.powerup.length)];
    }

    const x = Math.random() * (GAME_WIDTH - ITEM_SIZE);

    setItems(prev => [...prev, {
      id: Date.now() + Math.random(),
      ...item,
      category,
      x,
      y: -ITEM_SIZE,
      speed: speed + Math.random() * 1,
    }]);
  }, [gameState, speed]);

  // Partikel erstellen
  const createParticles = (x, y, emoji, isGood) => {
    const newParticles = [];
    const color = isGood ? '#FFD700' : '#FF4444';

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: Math.cos(angle) * (2 + Math.random() * 2),
        vy: Math.sin(angle) * (2 + Math.random() * 2) - 2,
        emoji: isGood ? '✨' : '💨',
        life: 1,
        size: 20,
      });
    }

    // Emoji-Partikel
    newParticles.push({
      id: Date.now() + 100,
      x,
      y,
      vx: 0,
      vy: -3,
      emoji,
      life: 1.5,
      size: 30,
      isMain: true,
    });

    setParticles(prev => [...prev, ...newParticles]);
  };

  // Power-Up aktivieren
  const activatePowerUp = (effect, duration) => {
    if (effect === 'shield') {
      setActiveEffects(prev => ({ ...prev, shield: (prev.shield || 0) + 1 }));
    } else {
      setActiveEffects(prev => ({ ...prev, [effect]: true }));
      setTimeout(() => {
        setActiveEffects(prev => ({ ...prev, [effect]: false }));
      }, duration);
    }
  };

  // Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const catcherY = GAME_HEIGHT - CATCHER_HEIGHT - 30;

    const gameLoop = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 16.67;
      lastTimeRef.current = timestamp;

      setItems(prevItems => {
        const newItems = [];
        let scoreChange = 0;
        let livesChange = 0;
        let newCombo = combo;
        let caught = null;

        for (const item of prevItems) {
          let newX = item.x;
          let newY = item.y + item.speed * delta;

          // Magnet-Effekt: Gute Items werden angezogen
          if (activeEffects.magnet && item.category === 'good') {
            const catcherCenter = catcherX + CATCHER_WIDTH / 2;
            const itemCenter = item.x + ITEM_SIZE / 2;
            const diff = catcherCenter - itemCenter;
            newX += diff * 0.05;
          }

          // Kollision mit Catcher
          if (
            newY + ITEM_SIZE >= catcherY &&
            newY <= catcherY + CATCHER_HEIGHT &&
            newX + ITEM_SIZE >= catcherX &&
            newX <= catcherX + CATCHER_WIDTH
          ) {
            if (item.category === 'good') {
              const points = activeEffects.double ? item.points * 2 : item.points;
              const comboBonus = Math.floor(newCombo / 3) * 5;
              scoreChange += points + comboBonus;
              newCombo++;
              caught = { emoji: item.emoji, points: points + comboBonus, isGood: true };
              createParticles(item.x + ITEM_SIZE/2, catcherY, item.emoji, true);
            } else if (item.category === 'bad') {
              if (activeEffects.shield > 0) {
                setActiveEffects(prev => ({ ...prev, shield: prev.shield - 1 }));
                caught = { emoji: '🛡️', points: 0, isGood: true, blocked: true };
              } else {
                livesChange--;
                newCombo = 0;
                caught = { emoji: item.emoji, points: item.points, isGood: false };
                createParticles(item.x + ITEM_SIZE/2, catcherY, item.emoji, false);
              }
            } else if (item.category === 'powerup') {
              activatePowerUp(item.effect, item.duration);
              caught = { emoji: item.emoji, points: 0, isGood: true, powerup: item.name };
              createParticles(item.x + ITEM_SIZE/2, catcherY, item.emoji, true);
            }
            continue;
          }

          // Item aus dem Bildschirm gefallen
          if (newY > GAME_HEIGHT + ITEM_SIZE) {
            if (item.category === 'good') {
              newCombo = 0; // Combo reset wenn gutes Item verpasst
            }
            continue;
          }

          newItems.push({ ...item, x: newX, y: newY });
        }

        if (scoreChange !== 0) {
          setScore(s => Math.max(0, s + scoreChange));
        }
        if (livesChange !== 0) {
          setLives(l => {
            const newLives = l + livesChange;
            if (newLives <= 0) {
              setGameState('gameover');
            }
            return Math.max(0, newLives);
          });
        }
        if (caught) {
          setLastCatch(caught);
          setTimeout(() => setLastCatch(null), 800);
        }
        setCombo(newCombo);

        // Schwierigkeit erhöhen
        if (score > 0 && score % 100 === 0) {
          setSpeed(s => Math.min(s + 0.2, 5));
        }

        return newItems;
      });

      // Partikel updaten
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.isMain ? p.vy : p.vy + 0.15,
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
  }, [gameState, catcherX, combo, activeEffects, score]);

  // Spawn Timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawnInterval = Math.max(1200 - Math.floor(score / 50) * 100, 600);

    spawnTimerRef.current = setInterval(spawnItem, spawnInterval);
    setTimeout(spawnItem, 300);

    return () => {
      if (spawnTimerRef.current) {
        clearInterval(spawnTimerRef.current);
      }
    };
  }, [gameState, spawnItem, score]);

  // Highscore speichern
  useEffect(() => {
    if (gameState === 'gameover' && score > highScore) {
      setHighScore(score);
      localStorage.setItem('leckerliFangen_highscore', score.toString());
    }
  }, [gameState, score, highScore]);

  // Münzen berechnen
  const getCoins = () => Math.floor(score / 20);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0) translateY(0); opacity: 0; }
          50% { transform: scale(1.3) translateY(-10px); }
          100% { transform: scale(1) translateY(-20px); opacity: 1; }
        }
        @keyframes float-up {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-40px); opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
          50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.8); }
        }
        .catch-popup {
          animation: bounce-in 0.3s ease-out forwards, float-up 0.5s ease-in 0.3s forwards;
        }
        .shake {
          animation: shake 0.4s ease-in-out;
        }
        .magnet-active {
          animation: pulse-glow 0.5s ease-in-out infinite;
        }
      `}</style>

      <div
        ref={gameAreaRef}
        className="relative rounded-2xl overflow-hidden select-none"
        style={{
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          background: 'linear-gradient(to bottom, #1a1a2e, #16213e, #0f3460)',
          boxShadow: '0 0 50px rgba(100, 150, 255, 0.3)',
          touchAction: 'none',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-center z-10"
             style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
          <div className="text-yellow-400 font-bold text-lg">
            {score} Pkt
          </div>
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <span key={i} className={`text-xl ${i < lives ? '' : 'opacity-30'}`}>
                {i < lives ? '❤️' : '🖤'}
              </span>
            ))}
          </div>
          <div className="text-purple-400 font-bold">
            🏆 {highScore}
          </div>
        </div>

        {/* Combo Anzeige */}
        {combo >= 3 && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 text-orange-400 font-bold text-lg animate-pulse">
            {combo}x Combo! 🔥
          </div>
        )}

        {/* Aktive Power-Ups */}
        <div className="absolute top-14 right-3 flex flex-col gap-1">
          {activeEffects.magnet && (
            <span className="text-2xl animate-bounce">🧲</span>
          )}
          {activeEffects.double && (
            <span className="text-2xl animate-bounce">✨</span>
          )}
          {activeEffects.shield > 0 && (
            <span className="text-2xl animate-bounce">🛡️ x{activeEffects.shield}</span>
          )}
        </div>

        {/* Fallende Items */}
        {items.map(item => (
          <div
            key={item.id}
            className="absolute transition-transform"
            style={{
              left: item.x,
              top: item.y,
              width: ITEM_SIZE,
              height: ITEM_SIZE,
              fontSize: ITEM_SIZE - 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: item.category === 'powerup' ? 'drop-shadow(0 0 10px gold)' : 'none',
            }}
          >
            {item.emoji}
          </div>
        ))}

        {/* Partikel */}
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute pointer-events-none"
            style={{
              left: p.x,
              top: p.y,
              fontSize: p.size,
              opacity: p.life,
              transform: `scale(${p.life})`,
            }}
          >
            {p.emoji}
          </div>
        ))}

        {/* Catch Feedback */}
        {lastCatch && (
          <div
            className="absolute left-1/2 -translate-x-1/2 catch-popup pointer-events-none z-20"
            style={{ top: GAME_HEIGHT - 150 }}
          >
            <div className={`text-2xl font-bold ${lastCatch.isGood ? 'text-green-400' : 'text-red-400'}`}>
              {lastCatch.blocked ? '🛡️ Geblockt!' :
               lastCatch.powerup ? `${lastCatch.emoji} ${lastCatch.powerup}!` :
               `${lastCatch.points > 0 ? '+' : ''}${lastCatch.points}`}
            </div>
          </div>
        )}

        {/* Catcher (Korb) */}
        <div
          className={`absolute transition-colors ${activeEffects.magnet ? 'magnet-active' : ''} ${lives < 3 && lastCatch && !lastCatch.isGood ? 'shake' : ''}`}
          style={{
            left: catcherX,
            top: GAME_HEIGHT - CATCHER_HEIGHT - 30,
            width: CATCHER_WIDTH,
            height: CATCHER_HEIGHT,
            fontSize: CATCHER_HEIGHT - 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: activeEffects.shield > 0 ? 'drop-shadow(0 0 15px cyan)' : 'drop-shadow(0 0 5px rgba(255,255,255,0.3))',
          }}
        >
          🧺
        </div>

        {/* Boden-Linie */}
        <div
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          style={{ top: GAME_HEIGHT - 20 }}
        />

        {/* Start Screen */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20">
            <div className="text-4xl mb-2">🐕</div>
            <div className="text-3xl font-bold text-yellow-400 mb-4">
              Leckerli Fangen!
            </div>
            <div className="flex gap-3 mb-4 text-3xl">
              <span>🦴</span>
              <span>🍖</span>
              <span>⭐</span>
              <span>❤️</span>
            </div>
            <p className="text-white/80 text-center px-6 mb-2">
              Fange die Leckerlis mit dem Korb!
            </p>
            <p className="text-white/60 text-sm text-center px-6 mb-4">
              Aber Vorsicht vor 🧦 und 👟!
            </p>
            <div className="text-white/50 text-xs mb-6 text-center">
              Bewege den Korb mit Finger/Maus<br/>oder ← → Pfeiltasten
            </div>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full font-bold text-xl text-white shadow-lg hover:scale-110 transition-transform"
            >
              🎮 START
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
            <div className="text-4xl mb-2">
              {score >= highScore && score > 0 ? '🎉' : '😢'}
            </div>
            <div className="text-2xl font-bold text-red-400 mb-2">
              Game Over!
            </div>
            <div className="text-5xl font-bold text-white mb-1">
              {score}
            </div>
            <div className="text-white/60 mb-4">
              {score >= highScore && score > 0 ? '🏆 Neuer Highscore!' : `Highscore: ${highScore}`}
            </div>
            <div className="text-yellow-400 text-xl font-bold mb-6">
              +{getCoins()} 💰
            </div>
            <div className="flex gap-3">
              <button
                onClick={startGame}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full font-bold text-white hover:scale-110 transition-transform"
              >
                🔄 Nochmal
              </button>
              <button
                onClick={() => onWin(getCoins())}
                className="px-6 py-2 bg-white/20 rounded-full font-bold text-white hover:scale-110 transition-transform"
              >
                ✓ Beenden
              </button>
            </div>
          </div>
        )}

        {/* Anleitung unten */}
        {gameState === 'playing' && (
          <div className="absolute bottom-1 left-0 right-0 text-center text-white/30 text-xs">
            ← Bewege den Korb → | 20 Punkte = 1 Münze
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
