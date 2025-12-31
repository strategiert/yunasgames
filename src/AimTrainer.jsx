import React, { useState, useEffect, useCallback, useRef } from 'react';

// Spielzustände
const GAME_STATE = {
  INTRO: 'intro',
  PLAYING: 'playing',
  FINISHED: 'finished',
};

// Konstanten
const TOTAL_TARGETS = 30;
const TARGET_SIZE = 60; // Pixel
const GAME_AREA_PADDING = 20;

// Verschiedene Futter-Emojis als Ziele
const FOOD_TARGETS = ['🍖', '🦴', '🥩', '🍗', '🥓', '🌭', '🍕', '🧀'];

const AimTrainer = ({ onClose, onWin }) => {
  const [gameState, setGameState] = useState(GAME_STATE.INTRO);
  const [targetPosition, setTargetPosition] = useState({ x: 50, y: 50 });
  const [currentFood, setCurrentFood] = useState(FOOD_TARGETS[0]);
  const [targetsHit, setTargetsHit] = useState(0);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [targetAppearTime, setTargetAppearTime] = useState(0);
  const [isTargetVisible, setIsTargetVisible] = useState(false);
  const [clickEffect, setClickEffect] = useState(null);
  const [missCount, setMissCount] = useState(0);

  const gameAreaRef = useRef(null);
  const audioContextRef = useRef(null);

  // AudioContext für Sounds
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Hit-Sound abspielen
  const playHitSound = useCallback(() => {
    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.1);

      oscillator.start(now);
      oscillator.stop(now + 0.1);
    } catch (e) {
      console.log('Audio nicht verfügbar:', e);
    }
  }, [getAudioContext]);

  // Miss-Sound abspielen
  const playMissSound = useCallback(() => {
    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 200;
      oscillator.type = 'square';

      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.15);

      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch (e) {
      console.log('Audio nicht verfügbar:', e);
    }
  }, [getAudioContext]);

  // Aufräumen beim Unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Neues Ziel platzieren
  const spawnTarget = useCallback(() => {
    if (!gameAreaRef.current) return;

    const rect = gameAreaRef.current.getBoundingClientRect();
    const maxX = rect.width - TARGET_SIZE - GAME_AREA_PADDING * 2;
    const maxY = rect.height - TARGET_SIZE - GAME_AREA_PADDING * 2;

    const newX = GAME_AREA_PADDING + Math.random() * maxX;
    const newY = GAME_AREA_PADDING + Math.random() * maxY;

    setTargetPosition({ x: newX, y: newY });
    setCurrentFood(FOOD_TARGETS[Math.floor(Math.random() * FOOD_TARGETS.length)]);
    setTargetAppearTime(performance.now());
    setIsTargetVisible(true);
  }, []);

  // Spiel starten
  const startGame = useCallback(() => {
    getAudioContext();
    setGameState(GAME_STATE.PLAYING);
    setTargetsHit(0);
    setReactionTimes([]);
    setMissCount(0);

    // Kurze Verzögerung bevor erstes Ziel erscheint
    setTimeout(() => {
      spawnTarget();
    }, 500);
  }, [spawnTarget, getAudioContext]);

  // Ziel getroffen
  const handleTargetClick = useCallback((e) => {
    e.stopPropagation();

    if (!isTargetVisible) return;

    const reactionTime = Math.round(performance.now() - targetAppearTime);
    playHitSound();

    // Click-Effekt anzeigen
    setClickEffect({ x: targetPosition.x + TARGET_SIZE / 2, y: targetPosition.y + TARGET_SIZE / 2, success: true });
    setTimeout(() => setClickEffect(null), 300);

    setReactionTimes(prev => [...prev, reactionTime]);
    setIsTargetVisible(false);

    const newTargetsHit = targetsHit + 1;
    setTargetsHit(newTargetsHit);

    if (newTargetsHit >= TOTAL_TARGETS) {
      setGameState(GAME_STATE.FINISHED);
    } else {
      // Nächstes Ziel nach kurzer Pause
      setTimeout(() => {
        spawnTarget();
      }, 200);
    }
  }, [isTargetVisible, targetAppearTime, targetsHit, spawnTarget, playHitSound, targetPosition]);

  // Daneben geklickt
  const handleMiss = useCallback((e) => {
    if (gameState !== GAME_STATE.PLAYING || !isTargetVisible) return;

    playMissSound();
    setMissCount(prev => prev + 1);

    // Miss-Effekt anzeigen
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setClickEffect({ x, y, success: false });
    setTimeout(() => setClickEffect(null), 300);
  }, [gameState, isTargetVisible, playMissSound]);

  // Spiel beenden
  const finishGame = useCallback(() => {
    const avgTime = Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length);

    // Coins basierend auf Durchschnittszeit und Genauigkeit
    let coins = 0;
    const accuracy = (TOTAL_TARGETS / (TOTAL_TARGETS + missCount)) * 100;

    if (avgTime < 400 && accuracy >= 90) coins = 30;
    else if (avgTime < 500 && accuracy >= 80) coins = 25;
    else if (avgTime < 600 && accuracy >= 70) coins = 20;
    else if (avgTime < 700) coins = 15;
    else if (avgTime < 800) coins = 10;
    else coins = 5;

    if (onWin) onWin(coins);
    onClose();
  }, [reactionTimes, missCount, onWin, onClose]);

  // Statistiken berechnen
  const getStats = () => {
    if (reactionTimes.length === 0) return { avg: 0, best: 0, worst: 0, accuracy: 100 };

    const avg = Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length);
    const best = Math.min(...reactionTimes);
    const worst = Math.max(...reactionTimes);
    const accuracy = Math.round((TOTAL_TARGETS / (TOTAL_TARGETS + missCount)) * 100);

    return { avg, best, worst, accuracy };
  };

  // Bewertung
  const getRating = (avgTime) => {
    if (avgTime < 350) return { text: 'Scharfschütze!', color: 'text-yellow-300' };
    if (avgTime < 450) return { text: 'Ausgezeichnet!', color: 'text-green-300' };
    if (avgTime < 550) return { text: 'Sehr gut!', color: 'text-green-400' };
    if (avgTime < 650) return { text: 'Gut!', color: 'text-blue-300' };
    if (avgTime < 750) return { text: 'Okay', color: 'text-blue-400' };
    return { text: 'Weiter üben!', color: 'text-orange-400' };
  };

  // Inhalt rendern
  const renderContent = () => {
    switch (gameState) {
      case GAME_STATE.INTRO:
        return (
          <div className="text-center p-8">
            <div className="text-7xl mb-6">🎯</div>
            <h2 className="text-3xl font-bold text-white mb-4">Aim Trainer</h2>
            <p className="text-white/80 mb-2">
              Klicke das Futter so schnell wie möglich!
            </p>
            <p className="text-white/60 text-sm mb-6">
              {TOTAL_TARGETS} Ziele - Teste deine Reflexe und Präzision
            </p>

            <div className="flex justify-center gap-4 mb-8 text-4xl">
              {FOOD_TARGETS.slice(0, 4).map((food, i) => (
                <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 100}ms` }}>
                  {food}
                </span>
              ))}
            </div>

            <button
              onClick={startGame}
              className="bg-white text-green-600 font-bold py-3 px-8 rounded-full
                       hover:bg-white/90 transition-all hover:scale-105"
            >
              Starten
            </button>
          </div>
        );

      case GAME_STATE.PLAYING:
        return (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-black/20">
              <div className="text-white font-bold">
                Ziele: {targetsHit} / {TOTAL_TARGETS}
              </div>
              <div className="text-white/60 text-sm">
                Fehlschüsse: {missCount}
              </div>
            </div>

            {/* Spielbereich */}
            <div
              ref={gameAreaRef}
              onClick={handleMiss}
              className="flex-1 relative bg-gradient-to-b from-green-800/30 to-green-900/30
                        cursor-crosshair overflow-hidden"
              style={{ minHeight: '350px' }}
            >
              {/* Ziel */}
              {isTargetVisible && (
                <button
                  onClick={handleTargetClick}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2
                           transition-transform duration-100 hover:scale-110
                           animate-pulse cursor-pointer z-10"
                  style={{
                    left: targetPosition.x + TARGET_SIZE / 2,
                    top: targetPosition.y + TARGET_SIZE / 2,
                    width: TARGET_SIZE,
                    height: TARGET_SIZE,
                    fontSize: TARGET_SIZE * 0.7,
                  }}
                >
                  <span className="drop-shadow-lg">{currentFood}</span>
                </button>
              )}

              {/* Click-Effekt */}
              {clickEffect && (
                <div
                  className={`absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2
                            ${clickEffect.success ? 'text-green-400' : 'text-red-400'}`}
                  style={{
                    left: clickEffect.x,
                    top: clickEffect.y,
                  }}
                >
                  <div className={`text-3xl font-bold animate-ping ${clickEffect.success ? '' : 'text-red-500'}`}>
                    {clickEffect.success ? '✓' : '✗'}
                  </div>
                </div>
              )}

              {/* Fortschrittsbalken unten */}
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/30">
                <div
                  className="h-full bg-green-400 transition-all duration-200"
                  style={{ width: `${(targetsHit / TOTAL_TARGETS) * 100}%` }}
                />
              </div>
            </div>
          </div>
        );

      case GAME_STATE.FINISHED:
        const stats = getStats();
        const rating = getRating(stats.avg);

        let coins = 0;
        if (stats.avg < 400 && stats.accuracy >= 90) coins = 30;
        else if (stats.avg < 500 && stats.accuracy >= 80) coins = 25;
        else if (stats.avg < 600 && stats.accuracy >= 70) coins = 20;
        else if (stats.avg < 700) coins = 15;
        else if (stats.avg < 800) coins = 10;
        else coins = 5;

        return (
          <div className="text-center p-8">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-white mb-2">Geschafft!</h2>
            <p className={`text-xl ${rating.color} mb-6`}>{rating.text}</p>

            {/* Hauptstatistik */}
            <div className="bg-white/10 rounded-2xl p-6 mb-4">
              <p className="text-white/60 text-sm mb-1">Durchschnittszeit</p>
              <p className="text-5xl font-bold text-white mb-2">{stats.avg} ms</p>
            </div>

            {/* Weitere Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white/60 text-xs mb-1">Beste</p>
                <p className="text-xl font-bold text-green-300">{stats.best} ms</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white/60 text-xs mb-1">Schlechteste</p>
                <p className="text-xl font-bold text-orange-300">{stats.worst} ms</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white/60 text-xs mb-1">Genauigkeit</p>
                <p className={`text-xl font-bold ${stats.accuracy >= 80 ? 'text-green-300' : 'text-orange-300'}`}>
                  {stats.accuracy}%
                </p>
              </div>
            </div>

            <div className="bg-yellow-500/30 rounded-xl p-4 mb-6">
              <p className="text-yellow-200 text-lg font-bold">
                +{coins} Münzen verdient!
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={startGame}
                className="bg-white/20 text-white font-bold py-3 px-6 rounded-full
                         hover:bg-white/30 transition-all"
              >
                Nochmal
              </button>
              <button
                onClick={finishGame}
                className="bg-white text-green-600 font-bold py-3 px-6 rounded-full
                         hover:bg-white/90 transition-all"
              >
                Beenden
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative w-full max-w-md bg-gradient-to-b from-green-600 to-emerald-800
                      rounded-3xl shadow-2xl overflow-hidden"
           style={{ height: gameState === GAME_STATE.PLAYING ? '500px' : 'auto' }}>
        {/* Schließen-Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl
                     hover:scale-110 transition-all z-20"
        >
          ✕
        </button>

        {/* Hauptinhalt */}
        {renderContent()}
      </div>
    </div>
  );
};

export default AimTrainer;
