import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Spielzustände
const GAME_STATE = {
  INTRO: 'intro',
  SHOWING: 'showing',    // Sequenz wird angezeigt
  INPUT: 'input',        // Spieler gibt ein
  SUCCESS: 'success',    // Runde geschafft
  GAME_OVER: 'gameOver', // Fehler gemacht
};

// 3x3 Grid = 9 Felder
const GRID_SIZE = 9;

// Timing-Konstanten
const SHOW_DELAY = 600;      // Zeit zwischen Feldern beim Anzeigen
const FLASH_DURATION = 400;  // Wie lange ein Feld aufleuchtet
const SUCCESS_DELAY = 800;   // Pause nach erfolgreicher Runde
const START_DELAY = 1000;    // Pause vor Start der Sequenz

// Frequenzen für die 9 Felder (Pentatonische Skala - klingt harmonisch)
const FREQUENCIES = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.00, // G4
  440.00, // A4
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
];

const SequenceMemory = ({ onClose, onWin }) => {
  const [gameState, setGameState] = useState(GAME_STATE.INTRO);
  const [sequence, setSequence] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [activeCell, setActiveCell] = useState(null);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [playerFlash, setPlayerFlash] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);

  const timeoutRef = useRef(null);
  const audioContextRef = useRef(null);

  // AudioContext initialisieren
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Ton für ein bestimmtes Feld abspielen
  const playTone = useCallback((cellIndex, duration = 300) => {
    try {
      const audioContext = getAudioContext();

      // Oszillator erstellen
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Frequenz für dieses Feld
      oscillator.frequency.value = FREQUENCIES[cellIndex];
      oscillator.type = 'sine';

      // Sanfter Attack und Release
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, now + duration / 1000);

      oscillator.start(now);
      oscillator.stop(now + duration / 1000);
    } catch (e) {
      console.log('Audio nicht verfügbar:', e);
    }
  }, [getAudioContext]);

  // Fehler-Ton abspielen
  const playErrorTone = useCallback(() => {
    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 150;
      oscillator.type = 'sawtooth';

      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.5);

      oscillator.start(now);
      oscillator.stop(now + 0.5);
    } catch (e) {
      console.log('Audio nicht verfügbar:', e);
    }
  }, [getAudioContext]);

  // Aufräumen beim Unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Sequenz anzeigen
  const showSequence = useCallback(async (seq) => {
    setGameState(GAME_STATE.SHOWING);
    setActiveCell(null);

    // Warte kurz bevor die Sequenz startet
    await new Promise(resolve => setTimeout(resolve, START_DELAY));

    // Zeige jedes Element der Sequenz
    for (let i = 0; i < seq.length; i++) {
      const cellIndex = seq[i];
      setActiveCell(cellIndex);
      playTone(cellIndex, FLASH_DURATION);
      await new Promise(resolve => setTimeout(resolve, FLASH_DURATION));
      setActiveCell(null);
      await new Promise(resolve => setTimeout(resolve, SHOW_DELAY - FLASH_DURATION));
    }

    setGameState(GAME_STATE.INPUT);
    setPlayerIndex(0);
  }, [playTone]);

  // Neues Spiel starten
  const startGame = useCallback(() => {
    // AudioContext aktivieren (benötigt User-Interaktion)
    getAudioContext();

    const firstCell = Math.floor(Math.random() * GRID_SIZE);
    const newSequence = [firstCell];
    setSequence(newSequence);
    setLevel(1);
    setPlayerIndex(0);
    setIsCorrect(null);
    showSequence(newSequence);
  }, [showSequence, getAudioContext]);

  // Nächste Runde
  const nextRound = useCallback(() => {
    const newCell = Math.floor(Math.random() * GRID_SIZE);
    const newSequence = [...sequence, newCell];
    setSequence(newSequence);
    setLevel(prev => prev + 1);
    setPlayerIndex(0);
    setIsCorrect(null);
    showSequence(newSequence);
  }, [sequence, showSequence]);

  // Spieler klickt auf ein Feld
  const handleCellClick = useCallback((cellIndex) => {
    if (gameState !== GAME_STATE.INPUT) return;

    // Ton abspielen
    playTone(cellIndex, 200);

    // Visuelles Feedback
    setPlayerFlash(cellIndex);
    setTimeout(() => setPlayerFlash(null), 200);

    const expectedCell = sequence[playerIndex];

    if (cellIndex === expectedCell) {
      // Richtig!
      setIsCorrect(true);

      if (playerIndex === sequence.length - 1) {
        // Runde geschafft!
        setGameState(GAME_STATE.SUCCESS);
        if (level > highScore) {
          setHighScore(level);
        }
        timeoutRef.current = setTimeout(() => {
          nextRound();
        }, SUCCESS_DELAY);
      } else {
        // Nächstes Element der Sequenz
        setPlayerIndex(prev => prev + 1);
      }
    } else {
      // Falsch! Spiel vorbei
      playErrorTone();
      setIsCorrect(false);
      setGameState(GAME_STATE.GAME_OVER);
      if (level > highScore) {
        setHighScore(level);
      }
    }
  }, [gameState, sequence, playerIndex, level, highScore, nextRound, playTone, playErrorTone]);

  // Spiel beenden und Coins berechnen
  const finishGame = useCallback(() => {
    // Coins basierend auf erreichtem Level
    let coins = 0;
    if (level >= 15) coins = 30;
    else if (level >= 12) coins = 25;
    else if (level >= 10) coins = 20;
    else if (level >= 7) coins = 15;
    else if (level >= 5) coins = 10;
    else if (level >= 3) coins = 5;
    else coins = 2;

    if (onWin) onWin(coins);
    onClose();
  }, [level, onWin, onClose]);

  // Grid rendern
  const renderGrid = () => {
    return (
      <div className="grid grid-cols-3 gap-3 w-64 h-64 mx-auto">
        {Array.from({ length: GRID_SIZE }).map((_, index) => {
          const isActive = activeCell === index;
          const isPlayerFlash = playerFlash === index;
          const isShowingPhase = gameState === GAME_STATE.SHOWING;

          return (
            <button
              key={index}
              onClick={() => handleCellClick(index)}
              disabled={gameState !== GAME_STATE.INPUT}
              className={`
                aspect-square rounded-xl transition-all duration-150
                ${isActive || isPlayerFlash
                  ? 'bg-white shadow-lg shadow-white/50 scale-105'
                  : 'bg-white/20 hover:bg-white/30'
                }
                ${gameState === GAME_STATE.INPUT ? 'cursor-pointer' : 'cursor-default'}
                ${isShowingPhase ? 'pointer-events-none' : ''}
              `}
              style={{
                boxShadow: isActive || isPlayerFlash
                  ? '0 0 30px rgba(255, 255, 255, 0.8), inset 0 0 20px rgba(255, 255, 255, 0.3)'
                  : 'none'
              }}
            />
          );
        })}
      </div>
    );
  };

  // Fortschrittsanzeige
  const renderProgress = () => {
    if (gameState === GAME_STATE.INTRO || gameState === GAME_STATE.GAME_OVER) return null;

    return (
      <div className="flex justify-center gap-1 mb-4 h-3">
        {sequence.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all ${
              index < playerIndex
                ? 'bg-green-400'
                : index === playerIndex && gameState === GAME_STATE.INPUT
                ? 'bg-white animate-pulse'
                : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    );
  };

  // Bewertung des Levels
  const getLevelRating = (lvl) => {
    if (lvl >= 15) return { text: 'Unglaublich!', color: 'text-yellow-300' };
    if (lvl >= 12) return { text: 'Ausgezeichnet!', color: 'text-green-300' };
    if (lvl >= 10) return { text: 'Sehr gut!', color: 'text-green-400' };
    if (lvl >= 7) return { text: 'Gut!', color: 'text-blue-300' };
    if (lvl >= 5) return { text: 'Nicht schlecht', color: 'text-blue-400' };
    if (lvl >= 3) return { text: 'Weiter üben', color: 'text-orange-300' };
    return { text: 'Versuch es nochmal', color: 'text-orange-400' };
  };

  // Status-Text je nach Spielzustand
  const getStatusText = () => {
    switch (gameState) {
      case GAME_STATE.SHOWING:
        return 'Merke dir die Sequenz...';
      case GAME_STATE.INPUT:
        return 'Dein Zug!';
      case GAME_STATE.SUCCESS:
        return 'Richtig! Nächste Runde...';
      default:
        return '';
    }
  };

  // Inhalt basierend auf Spielzustand
  const renderContent = () => {
    switch (gameState) {
      case GAME_STATE.INTRO:
        return (
          <div className="text-center">
            <div className="text-7xl mb-6">🧠</div>
            <h2 className="text-3xl font-bold text-white mb-4">Sequenz-Gedächtnis</h2>
            <p className="text-white/80 mb-2">
              Merke dir die Reihenfolge der aufleuchtenden Felder!
            </p>
            <p className="text-white/60 text-sm mb-8">
              Mit jeder Runde wird die Sequenz länger.
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
      case GAME_STATE.SUCCESS:
        return (
          <div className="text-center">
            {/* Level-Titel */}
            <div className="text-xl text-white/80 mb-2">Level {level}</div>

            {/* Status-Text - feste Höhe damit nichts springt */}
            <div className={`text-sm mb-6 h-5 ${
              gameState === GAME_STATE.SUCCESS ? 'text-green-300' : 'text-white/60'
            }`}>
              {getStatusText()}
            </div>

            {/* Fortschritts-Punkte */}
            {renderProgress()}

            {/* Grid */}
            {renderGrid()}

            {/* Zähler-Anzeige - immer sichtbar mit fester Höhe */}
            <div className="mt-4 text-white/50 text-sm h-5">
              {gameState === GAME_STATE.INPUT ? (
                <span>{playerIndex + 1} / {sequence.length}</span>
              ) : (
                <span className="invisible">0 / 0</span>
              )}
            </div>
          </div>
        );

      case GAME_STATE.GAME_OVER:
        const rating = getLevelRating(level);
        let coins = 0;
        if (level >= 15) coins = 30;
        else if (level >= 12) coins = 25;
        else if (level >= 10) coins = 20;
        else if (level >= 7) coins = 15;
        else if (level >= 5) coins = 10;
        else if (level >= 3) coins = 5;
        else coins = 2;

        return (
          <div className="text-center">
            <div className="text-6xl mb-4">😵</div>
            <h2 className="text-3xl font-bold text-white mb-2">Spiel vorbei!</h2>
            <p className={`text-xl ${rating.color} mb-6`}>{rating.text}</p>

            <div className="bg-white/10 rounded-2xl p-6 mb-6">
              <p className="text-white/60 text-sm mb-1">Erreichtes Level</p>
              <p className="text-5xl font-bold text-white mb-2">{level}</p>
              <p className="text-white/50 text-sm">
                Sequenzlänge: {sequence.length} Felder
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

export default SequenceMemory;
