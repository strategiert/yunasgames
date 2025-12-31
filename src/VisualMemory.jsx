import React, { useState, useEffect, useCallback, useRef } from 'react';

// Spielzustände
const GAME_STATE = {
  INTRO: 'intro',
  SHOWING: 'showing',    // Felder werden angezeigt
  INPUT: 'input',        // Spieler wählt aus
  LEVEL_UP: 'levelUp',   // Level geschafft
  LIFE_LOST: 'lifeLost', // Leben verloren
  GAME_OVER: 'gameOver', // Alle Leben weg
};

// Konstanten
const INITIAL_TILES = 3;      // Startanzahl der Felder
const TILES_PER_LEVEL = 1;    // Zusätzliche Felder pro Level
const MAX_MISTAKES = 3;       // Fehler bis Leben verloren
const INITIAL_LIVES = 3;      // Startleben
const SHOW_DURATION = 1000;   // Wie lange Felder gezeigt werden (ms)
const GRID_SIZE = 3;          // 3x3 Grid zu Beginn

const VisualMemory = ({ onClose, onWin }) => {
  const [gameState, setGameState] = useState(GAME_STATE.INTRO);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [targetTiles, setTargetTiles] = useState([]);
  const [selectedTiles, setSelectedTiles] = useState([]);
  const [correctTiles, setCorrectTiles] = useState([]);
  const [wrongTiles, setWrongTiles] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [gridSize, setGridSize] = useState(GRID_SIZE);
  const [showingTiles, setShowingTiles] = useState(false);

  const audioContextRef = useRef(null);
  const timeoutRef = useRef(null);

  // AudioContext für Sounds
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Erfolgs-Sound
  const playSuccessSound = useCallback(() => {
    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 523.25; // C5
      oscillator.type = 'sine';

      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.2);

      oscillator.start(now);
      oscillator.stop(now + 0.2);
    } catch (e) {
      console.log('Audio nicht verfügbar:', e);
    }
  }, [getAudioContext]);

  // Fehler-Sound
  const playErrorSound = useCallback(() => {
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

  // Level-Up Sound
  const playLevelUpSound = useCallback(() => {
    try {
      const audioContext = getAudioContext();

      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';

        const now = audioContext.currentTime;
        const startTime = now + i * 0.1;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, startTime + 0.2);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.2);
      });
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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Berechne Grid-Größe basierend auf Level
  const getGridSize = useCallback((lvl) => {
    if (lvl <= 3) return 3;
    if (lvl <= 6) return 4;
    if (lvl <= 10) return 5;
    return 5;
  }, []);

  // Berechne Anzahl der Zielfelder
  const getTileCount = useCallback((lvl) => {
    return INITIAL_TILES + (lvl - 1) * TILES_PER_LEVEL;
  }, []);

  // Zufällige Zielfelder generieren
  const generateTargetTiles = useCallback((size, count) => {
    const totalTiles = size * size;
    const tiles = [];

    while (tiles.length < count && tiles.length < totalTiles) {
      const randomTile = Math.floor(Math.random() * totalTiles);
      if (!tiles.includes(randomTile)) {
        tiles.push(randomTile);
      }
    }

    return tiles;
  }, []);

  // Level starten
  const startLevel = useCallback((lvl) => {
    const size = getGridSize(lvl);
    const count = getTileCount(lvl);
    const targets = generateTargetTiles(size, count);

    setGridSize(size);
    setTargetTiles(targets);
    setSelectedTiles([]);
    setCorrectTiles([]);
    setWrongTiles([]);
    setMistakes(0);
    setShowingTiles(true);
    setGameState(GAME_STATE.SHOWING);

    // Zeige Felder für eine bestimmte Zeit
    timeoutRef.current = setTimeout(() => {
      setShowingTiles(false);
      setGameState(GAME_STATE.INPUT);
    }, SHOW_DURATION + lvl * 100); // Etwas länger bei höheren Leveln
  }, [getGridSize, getTileCount, generateTargetTiles]);

  // Spiel starten
  const startGame = useCallback(() => {
    getAudioContext();
    setLevel(1);
    setLives(INITIAL_LIVES);
    startLevel(1);
  }, [startLevel, getAudioContext]);

  // Feld angeklickt
  const handleTileClick = useCallback((tileIndex) => {
    if (gameState !== GAME_STATE.INPUT) return;
    if (selectedTiles.includes(tileIndex)) return;

    setSelectedTiles(prev => [...prev, tileIndex]);

    if (targetTiles.includes(tileIndex)) {
      // Richtig!
      playSuccessSound();
      const newCorrect = [...correctTiles, tileIndex];
      setCorrectTiles(newCorrect);

      // Alle gefunden?
      if (newCorrect.length === targetTiles.length) {
        playLevelUpSound();
        setGameState(GAME_STATE.LEVEL_UP);

        timeoutRef.current = setTimeout(() => {
          const newLevel = level + 1;
          setLevel(newLevel);
          startLevel(newLevel);
        }, 1000);
      }
    } else {
      // Falsch!
      playErrorSound();
      setWrongTiles(prev => [...prev, tileIndex]);
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);

      if (newMistakes >= MAX_MISTAKES) {
        // Leben verloren
        const newLives = lives - 1;
        setLives(newLives);

        if (newLives <= 0) {
          // Game Over
          setGameState(GAME_STATE.GAME_OVER);
        } else {
          // Level neu starten
          setGameState(GAME_STATE.LIFE_LOST);
          timeoutRef.current = setTimeout(() => {
            startLevel(level);
          }, 1500);
        }
      }
    }
  }, [gameState, selectedTiles, targetTiles, correctTiles, mistakes, lives, level, startLevel, playSuccessSound, playErrorSound, playLevelUpSound]);

  // Spiel beenden
  const finishGame = useCallback(() => {
    // Coins basierend auf Level
    let coins = 0;
    if (level >= 15) coins = 35;
    else if (level >= 12) coins = 30;
    else if (level >= 10) coins = 25;
    else if (level >= 7) coins = 20;
    else if (level >= 5) coins = 15;
    else if (level >= 3) coins = 10;
    else coins = 5;

    if (onWin) onWin(coins);
    onClose();
  }, [level, onWin, onClose]);

  // Bewertung
  const getLevelRating = (lvl) => {
    if (lvl >= 15) return { text: 'Fotografisches Gedächtnis!', color: 'text-yellow-300' };
    if (lvl >= 12) return { text: 'Ausgezeichnet!', color: 'text-green-300' };
    if (lvl >= 10) return { text: 'Sehr gut!', color: 'text-green-400' };
    if (lvl >= 7) return { text: 'Gut!', color: 'text-blue-300' };
    if (lvl >= 5) return { text: 'Nicht schlecht', color: 'text-blue-400' };
    if (lvl >= 3) return { text: 'Weiter üben', color: 'text-orange-300' };
    return { text: 'Versuch es nochmal', color: 'text-orange-400' };
  };

  // Grid rendern - wie bei SequenceMemory
  const renderGrid = () => {
    const totalTiles = gridSize * gridSize;

    return (
      <div
        className="grid gap-3 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          width: gridSize === 3 ? '256px' : gridSize === 4 ? '272px' : '300px',
          height: gridSize === 3 ? '256px' : gridSize === 4 ? '272px' : '300px',
        }}
      >
        {Array.from({ length: totalTiles }).map((_, index) => {
          const isTarget = targetTiles.includes(index);
          const isShowing = showingTiles && isTarget;
          const isCorrect = correctTiles.includes(index);
          const isWrong = wrongTiles.includes(index);
          const isSelected = selectedTiles.includes(index);

          return (
            <button
              key={index}
              onClick={() => handleTileClick(index)}
              disabled={gameState !== GAME_STATE.INPUT || isSelected}
              className={`
                aspect-square rounded-xl transition-all duration-150
                ${isShowing
                  ? 'bg-white shadow-lg shadow-white/50 scale-105'
                  : isCorrect
                  ? 'bg-green-400 shadow-lg shadow-green-400/50'
                  : isWrong
                  ? 'bg-red-400 shadow-lg shadow-red-400/50'
                  : 'bg-white/20 hover:bg-white/30'
                }
                ${gameState === GAME_STATE.INPUT && !isSelected ? 'cursor-pointer' : 'cursor-default'}
              `}
              style={{
                boxShadow: isShowing
                  ? '0 0 30px rgba(255, 255, 255, 0.8), inset 0 0 20px rgba(255, 255, 255, 0.3)'
                  : isCorrect
                  ? '0 0 20px rgba(74, 222, 128, 0.6)'
                  : isWrong
                  ? '0 0 20px rgba(248, 113, 113, 0.6)'
                  : 'none'
              }}
            />
          );
        })}
      </div>
    );
  };

  // Leben-Anzeige
  const renderLives = () => (
    <div className="flex gap-1">
      {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
        <span
          key={i}
          className={`text-2xl transition-all ${i < lives ? 'opacity-100' : 'opacity-30'}`}
        >
          ❤️
        </span>
      ))}
    </div>
  );

  // Fehler-Anzeige
  const renderMistakes = () => (
    <div className="flex gap-1">
      {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-all ${
            i < mistakes ? 'bg-red-400' : 'bg-white/30'
          }`}
        />
      ))}
    </div>
  );

  // Fortschrittsanzeige (Punkte wie bei SequenceMemory)
  const renderProgress = () => {
    if (gameState === GAME_STATE.INTRO || gameState === GAME_STATE.GAME_OVER) return null;

    return (
      <div className="flex justify-center gap-1 mb-4 h-3">
        {targetTiles.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all ${
              index < correctTiles.length
                ? 'bg-green-400'
                : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    );
  };

  // Status-Text je nach Spielzustand
  const getStatusText = () => {
    switch (gameState) {
      case GAME_STATE.SHOWING:
        return 'Merke dir die Felder...';
      case GAME_STATE.INPUT:
        return `Finde ${targetTiles.length - correctTiles.length} Felder`;
      case GAME_STATE.LEVEL_UP:
        return 'Level geschafft!';
      case GAME_STATE.LIFE_LOST:
        return 'Leben verloren! Nochmal...';
      default:
        return '';
    }
  };

  // Inhalt rendern
  const renderContent = () => {
    switch (gameState) {
      case GAME_STATE.INTRO:
        return (
          <div className="text-center">
            <div className="text-7xl mb-6">👁️</div>
            <h2 className="text-3xl font-bold text-white mb-4">Visual Memory</h2>
            <p className="text-white/80 mb-2">
              Merke dir die Position der aufleuchtenden Felder!
            </p>
            <p className="text-white/60 text-sm mb-8">
              3 Fehler = 1 Leben verloren. Du hast 3 Leben.
            </p>

            <div className="mb-8 opacity-50">
              {renderGrid()}
            </div>

            <button
              onClick={startGame}
              className="bg-white text-indigo-600 font-bold py-3 px-8 rounded-full
                       hover:bg-white/90 transition-all hover:scale-105"
            >
              Starten
            </button>
          </div>
        );

      case GAME_STATE.SHOWING:
      case GAME_STATE.INPUT:
      case GAME_STATE.LEVEL_UP:
      case GAME_STATE.LIFE_LOST:
        return (
          <div className="text-center">
            {/* Level-Titel */}
            <div className="text-xl text-white/80 mb-2">Level {level}</div>

            {/* Status-Text - feste Höhe damit nichts springt */}
            <div className={`text-sm mb-6 h-5 ${
              gameState === GAME_STATE.SHOWING ? 'text-white/60' :
              gameState === GAME_STATE.LEVEL_UP ? 'text-green-300' :
              gameState === GAME_STATE.LIFE_LOST ? 'text-red-300' :
              'text-white/60'
            }`}>
              {getStatusText()}
            </div>

            {/* Fortschritts-Punkte */}
            {renderProgress()}

            {/* Grid */}
            {renderGrid()}

            {/* Fehler und Fortschritt - immer sichtbar mit fester Höhe */}
            <div className="mt-4 flex justify-center items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-xs">Fehler:</span>
                {renderMistakes()}
              </div>
              <div className="text-white/50 text-sm">
                {correctTiles.length} / {targetTiles.length}
              </div>
            </div>

            {/* Leben-Anzeige */}
            <div className="mt-3 flex justify-center">
              {renderLives()}
            </div>
          </div>
        );

      case GAME_STATE.GAME_OVER:
        const rating = getLevelRating(level);
        let coins = 0;
        if (level >= 15) coins = 35;
        else if (level >= 12) coins = 30;
        else if (level >= 10) coins = 25;
        else if (level >= 7) coins = 20;
        else if (level >= 5) coins = 15;
        else if (level >= 3) coins = 10;
        else coins = 5;

        return (
          <div className="text-center">
            <div className="text-6xl mb-4">😵</div>
            <h2 className="text-3xl font-bold text-white mb-2">Spiel vorbei!</h2>
            <p className={`text-xl ${rating.color} mb-6`}>{rating.text}</p>

            <div className="bg-white/10 rounded-2xl p-6 mb-6">
              <p className="text-white/60 text-sm mb-1">Erreichtes Level</p>
              <p className="text-5xl font-bold text-white mb-2">{level}</p>
              <p className="text-white/50 text-sm">
                {getTileCount(level)} Felder gemerkt
              </p>
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
                className="bg-white text-indigo-600 font-bold py-3 px-6 rounded-full
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
      <div className="relative w-full max-w-md bg-gradient-to-b from-indigo-500 to-purple-700
                      rounded-3xl shadow-2xl p-8 overflow-hidden">
        {/* Schließen-Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl
                     hover:scale-110 transition-all z-10"
        >
          ✕
        </button>

        {/* Level-Anzeige oben links */}
        {gameState !== GAME_STATE.INTRO && gameState !== GAME_STATE.GAME_OVER && (
          <div className="absolute top-4 left-4 bg-white/20 px-3 py-1 rounded-full">
            <span className="text-white font-bold text-sm">Level {level}</span>
          </div>
        )}

        {/* Hauptinhalt */}
        <div className="mt-8">
          {renderContent()}
        </div>

        {/* Dekorative Elemente */}
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/5 rounded-full" />
      </div>
    </div>
  );
};

export default VisualMemory;
