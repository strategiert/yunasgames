import React, { useState, useEffect, useCallback, useRef } from 'react';

// Spielzustände
const GAME_STATE = {
  INTRO: 'intro',
  SHOWING: 'showing',    // Zahl wird angezeigt
  INPUT: 'input',        // Spieler gibt ein
  CORRECT: 'correct',    // Richtig!
  WRONG: 'wrong',        // Falsch
  GAME_OVER: 'gameOver', // Spiel vorbei
};

// Konstanten
const INITIAL_DIGITS = 1;         // Startanzahl der Ziffern
const SHOW_TIME_PER_DIGIT = 1000; // Anzeigezeit pro Ziffer (ms)
const MIN_SHOW_TIME = 1500;       // Mindestanzeigezeit (ms)

const NumberMemory = ({ onClose, onWin }) => {
  const [gameState, setGameState] = useState(GAME_STATE.INTRO);
  const [level, setLevel] = useState(1);
  const [currentNumber, setCurrentNumber] = useState('');
  const [userInput, setUserInput] = useState('');
  const [showTimeLeft, setShowTimeLeft] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);

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

  // Fehler-Sound
  const playErrorSound = useCallback(() => {
    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 200;
      oscillator.type = 'sawtooth';

      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.4);

      oscillator.start(now);
      oscillator.stop(now + 0.4);
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
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Zufällige Zahl generieren
  const generateNumber = useCallback((digits) => {
    let number = '';
    for (let i = 0; i < digits; i++) {
      // Erste Ziffer sollte nicht 0 sein für bessere Lesbarkeit
      if (i === 0) {
        number += Math.floor(Math.random() * 9) + 1;
      } else {
        number += Math.floor(Math.random() * 10);
      }
    }
    return number;
  }, []);

  // Anzeigezeit berechnen
  const getShowTime = useCallback((digits) => {
    return Math.max(MIN_SHOW_TIME, digits * SHOW_TIME_PER_DIGIT);
  }, []);

  // Level starten
  const startLevel = useCallback((lvl) => {
    const digits = INITIAL_DIGITS + lvl - 1;
    const number = generateNumber(digits);
    const showTime = getShowTime(digits);

    setCurrentNumber(number);
    setUserInput('');
    setShowTimeLeft(showTime);
    setGameState(GAME_STATE.SHOWING);

    // Countdown für verbleibende Zeit
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, showTime - elapsed);
      setShowTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(intervalRef.current);
      }
    }, 50);

    // Nach Ablauf zur Eingabe wechseln
    timerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current);
      setGameState(GAME_STATE.INPUT);
      // Focus auf Eingabefeld
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }, showTime);
  }, [generateNumber, getShowTime]);

  // Spiel starten
  const startGame = useCallback(() => {
    getAudioContext();
    setLevel(1);
    startLevel(1);
  }, [startLevel, getAudioContext]);

  // Eingabe prüfen
  const checkAnswer = useCallback(() => {
    if (userInput === currentNumber) {
      // Richtig!
      playSuccessSound();
      setGameState(GAME_STATE.CORRECT);

      if (level > highScore) {
        setHighScore(level);
      }

      // Nächstes Level nach kurzer Pause
      timerRef.current = setTimeout(() => {
        const newLevel = level + 1;
        setLevel(newLevel);
        startLevel(newLevel);
      }, 1500);
    } else {
      // Falsch!
      playErrorSound();
      setGameState(GAME_STATE.WRONG);

      if (level > highScore) {
        setHighScore(level);
      }
    }
  }, [userInput, currentNumber, level, highScore, startLevel, playSuccessSound, playErrorSound]);

  // Enter-Taste zum Bestätigen
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && gameState === GAME_STATE.INPUT && userInput.length > 0) {
      checkAnswer();
    }
  }, [gameState, userInput, checkAnswer]);

  // Spiel beenden
  const finishGame = useCallback(() => {
    // Coins basierend auf Level (Ziffernanzahl)
    const digits = level;
    let coins = 0;

    if (digits >= 12) coins = 35;
    else if (digits >= 10) coins = 30;
    else if (digits >= 8) coins = 25;
    else if (digits >= 7) coins = 20;
    else if (digits >= 5) coins = 15;
    else if (digits >= 3) coins = 10;
    else coins = 5;

    if (onWin) onWin(coins);
    onClose();
  }, [level, onWin, onClose]);

  // Bewertung
  const getLevelRating = (lvl) => {
    if (lvl >= 12) return { text: 'Genie!', color: 'text-yellow-300' };
    if (lvl >= 10) return { text: 'Ausgezeichnet!', color: 'text-green-300' };
    if (lvl >= 8) return { text: 'Überdurchschnittlich!', color: 'text-green-400' };
    if (lvl >= 7) return { text: 'Durchschnittlich', color: 'text-blue-300' };
    if (lvl >= 5) return { text: 'Nicht schlecht', color: 'text-blue-400' };
    if (lvl >= 3) return { text: 'Weiter üben', color: 'text-orange-300' };
    return { text: 'Versuch es nochmal', color: 'text-orange-400' };
  };

  // Zahl mit Formatierung anzeigen
  const formatNumber = (num) => {
    // Gruppiere Ziffern für bessere Lesbarkeit (3er-Gruppen)
    if (num.length <= 4) return num;

    const groups = [];
    for (let i = 0; i < num.length; i += 3) {
      groups.push(num.slice(i, i + 3));
    }
    return groups.join(' ');
  };

  // Vergleichs-Anzeige für falsches Ergebnis
  const renderComparison = () => {
    return (
      <div className="space-y-4 mb-6">
        <div className="bg-white/10 rounded-xl p-4">
          <p className="text-white/60 text-xs mb-1">Richtige Zahl</p>
          <p className="text-2xl font-mono font-bold text-green-400 tracking-wider">
            {formatNumber(currentNumber)}
          </p>
        </div>
        <div className="bg-white/10 rounded-xl p-4">
          <p className="text-white/60 text-xs mb-1">Deine Eingabe</p>
          <p className="text-2xl font-mono font-bold text-red-400 tracking-wider">
            {formatNumber(userInput) || '-'}
          </p>
        </div>
      </div>
    );
  };

  // Inhalt rendern
  const renderContent = () => {
    switch (gameState) {
      case GAME_STATE.INTRO:
        return (
          <div className="text-center p-8">
            <div className="text-7xl mb-6">🔢</div>
            <h2 className="text-3xl font-bold text-white mb-4">Number Memory</h2>
            <p className="text-white/80 mb-2">
              Merke dir die angezeigte Zahl!
            </p>
            <p className="text-white/60 text-sm mb-6">
              Die durchschnittliche Person merkt sich 7 Ziffern.
              <br />Wie weit kommst du?
            </p>

            <div className="bg-white/10 rounded-xl p-4 mb-8 font-mono text-3xl text-amber-300 tracking-widest">
              1 2 3 4 5 6 7
            </div>

            <button
              onClick={startGame}
              className="bg-white text-amber-600 font-bold py-3 px-8 rounded-full
                       hover:bg-white/90 transition-all hover:scale-105"
            >
              Starten
            </button>
          </div>
        );

      case GAME_STATE.SHOWING:
        const progress = (showTimeLeft / getShowTime(level)) * 100;

        return (
          <div className="text-center p-8">
            <div className="text-white/60 text-sm mb-2">Level {level}</div>
            <div className="text-white/80 mb-6">{level} {level === 1 ? 'Ziffer' : 'Ziffern'}</div>

            {/* Zahl anzeigen */}
            <div className="bg-white/10 rounded-2xl p-8 mb-6">
              <p className="text-4xl md:text-5xl font-mono font-bold text-white tracking-widest">
                {formatNumber(currentNumber)}
              </p>
            </div>

            {/* Zeitbalken */}
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white/50 text-sm mt-2">Merke dir die Zahl...</p>
          </div>
        );

      case GAME_STATE.INPUT:
        return (
          <div className="text-center p-8">
            <div className="text-white/60 text-sm mb-2">Level {level}</div>
            <div className="text-white/80 mb-6">Wie lautete die Zahl?</div>

            {/* Eingabefeld */}
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={handleKeyDown}
              placeholder="Zahl eingeben..."
              className="w-full bg-white/10 text-white text-center text-3xl font-mono font-bold
                       py-4 px-6 rounded-xl border-2 border-white/30 focus:border-amber-400
                       outline-none placeholder:text-white/30 tracking-widest mb-6"
              autoComplete="off"
            />

            <button
              onClick={checkAnswer}
              disabled={userInput.length === 0}
              className="bg-amber-400 text-amber-900 font-bold py-3 px-8 rounded-full
                       hover:bg-amber-300 transition-all hover:scale-105
                       disabled:opacity-50 disabled:hover:scale-100"
            >
              Bestätigen
            </button>

            <p className="text-white/40 text-sm mt-4">
              Drücke Enter zum Bestätigen
            </p>
          </div>
        );

      case GAME_STATE.CORRECT:
        return (
          <div className="text-center p-8">
            <div className="text-6xl mb-4">✓</div>
            <h2 className="text-3xl font-bold text-green-400 mb-2">Richtig!</h2>
            <p className="text-white/60 mb-6">
              {level} {level === 1 ? 'Ziffer' : 'Ziffern'} gemerkt
            </p>

            <div className="bg-white/10 rounded-xl p-4 mb-6 font-mono text-2xl text-green-400 tracking-widest">
              {formatNumber(currentNumber)}
            </div>

            <p className="text-white/50 text-sm">Nächstes Level...</p>
          </div>
        );

      case GAME_STATE.WRONG:
        const rating = getLevelRating(level);
        const digits = level;
        let coins = 0;

        if (digits >= 12) coins = 35;
        else if (digits >= 10) coins = 30;
        else if (digits >= 8) coins = 25;
        else if (digits >= 7) coins = 20;
        else if (digits >= 5) coins = 15;
        else if (digits >= 3) coins = 10;
        else coins = 5;

        return (
          <div className="text-center p-8">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-3xl font-bold text-white mb-2">Falsch!</h2>
            <p className={`text-lg ${rating.color} mb-4`}>{rating.text}</p>

            {renderComparison()}

            <div className="bg-white/10 rounded-xl p-4 mb-4">
              <p className="text-white/60 text-sm mb-1">Erreichtes Level</p>
              <p className="text-4xl font-bold text-white">{level}</p>
              <p className="text-white/50 text-sm">
                {level} {level === 1 ? 'Ziffer' : 'Ziffern'}
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
                className="bg-white text-amber-600 font-bold py-3 px-6 rounded-full
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
      <div className="relative w-full max-w-md bg-gradient-to-b from-amber-600 to-orange-800
                      rounded-3xl shadow-2xl overflow-hidden">
        {/* Schließen-Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl
                     hover:scale-110 transition-all z-10"
        >
          ✕
        </button>

        {/* Level-Anzeige oben links */}
        {gameState !== GAME_STATE.INTRO && gameState !== GAME_STATE.WRONG && (
          <div className="absolute top-4 left-4 bg-white/20 px-3 py-1 rounded-full">
            <span className="text-white font-bold text-sm">Level {level}</span>
          </div>
        )}

        {/* Hauptinhalt */}
        {renderContent()}

        {/* Dekorative Elemente */}
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/5 rounded-full" />
      </div>
    </div>
  );
};

export default NumberMemory;
