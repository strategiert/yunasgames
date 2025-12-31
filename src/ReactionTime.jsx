import React, { useState, useRef, useEffect, useCallback } from 'react';

// Spielzustände
const GAME_STATE = {
  INTRO: 'intro',       // Startbildschirm
  WAITING: 'waiting',   // Rot - warte auf grün
  READY: 'ready',       // Grün - jetzt klicken!
  RESULT: 'result',     // Ergebnis anzeigen
  TOO_SOON: 'tooSoon',  // Zu früh geklickt
  FINISHED: 'finished', // Alle Versuche abgeschlossen
};

const TOTAL_ATTEMPTS = 5;

const ReactionTime = ({ onClose, onWin }) => {
  const [gameState, setGameState] = useState(GAME_STATE.INTRO);
  const [reactionTime, setReactionTime] = useState(0);
  const [attempts, setAttempts] = useState([]);
  const [currentAttempt, setCurrentAttempt] = useState(0);

  const startTimeRef = useRef(null);
  const timeoutRef = useRef(null);

  // Aufräumen beim Unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Spiel starten
  const startGame = useCallback(() => {
    setGameState(GAME_STATE.WAITING);

    // Zufällige Wartezeit zwischen 1-5 Sekunden
    const randomDelay = 1000 + Math.random() * 4000;

    timeoutRef.current = setTimeout(() => {
      startTimeRef.current = performance.now();
      setGameState(GAME_STATE.READY);
    }, randomDelay);
  }, []);

  // Klick-Handler
  const handleClick = useCallback(() => {
    if (gameState === GAME_STATE.INTRO) {
      startGame();
      return;
    }

    if (gameState === GAME_STATE.WAITING) {
      // Zu früh geklickt!
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setGameState(GAME_STATE.TOO_SOON);
      return;
    }

    if (gameState === GAME_STATE.READY) {
      // Reaktionszeit messen
      const endTime = performance.now();
      const time = Math.round(endTime - startTimeRef.current);
      setReactionTime(time);
      setGameState(GAME_STATE.RESULT);
      return;
    }

    if (gameState === GAME_STATE.TOO_SOON) {
      // Nochmal versuchen (gleicher Versuch)
      startGame();
      return;
    }

    if (gameState === GAME_STATE.RESULT) {
      // Ergebnis speichern und weiter
      const newAttempts = [...attempts, reactionTime];
      setAttempts(newAttempts);

      if (newAttempts.length >= TOTAL_ATTEMPTS) {
        setGameState(GAME_STATE.FINISHED);
      } else {
        setCurrentAttempt(newAttempts.length);
        startGame();
      }
      return;
    }

    if (gameState === GAME_STATE.FINISHED) {
      // Spiel beenden und Coins vergeben
      const avgTime = Math.round(attempts.reduce((a, b) => a + b, 0) / attempts.length);
      let coins = 0;

      // Coins basierend auf Durchschnittszeit
      if (avgTime < 200) coins = 25;
      else if (avgTime < 250) coins = 20;
      else if (avgTime < 300) coins = 15;
      else if (avgTime < 400) coins = 10;
      else coins = 5;

      if (onWin) onWin(coins);
      onClose();
    }
  }, [gameState, attempts, reactionTime, startGame, onWin, onClose]);

  // Durchschnitt berechnen
  const getAverage = () => {
    if (attempts.length === 0) return 0;
    return Math.round(attempts.reduce((a, b) => a + b, 0) / attempts.length);
  };

  // Bewertung der Zeit
  const getRating = (time) => {
    if (time < 200) return { text: 'Blitzschnell!', color: 'text-green-300' };
    if (time < 250) return { text: 'Sehr gut!', color: 'text-green-400' };
    if (time < 300) return { text: 'Gut!', color: 'text-yellow-300' };
    if (time < 400) return { text: 'Okay', color: 'text-yellow-400' };
    return { text: 'Langsam', color: 'text-orange-400' };
  };

  // Hintergrundfarbe basierend auf Zustand
  const getBackgroundClass = () => {
    switch (gameState) {
      case GAME_STATE.INTRO:
        return 'bg-gradient-to-b from-indigo-600 to-purple-700';
      case GAME_STATE.WAITING:
        return 'bg-gradient-to-b from-red-500 to-red-700';
      case GAME_STATE.READY:
        return 'bg-gradient-to-b from-green-400 to-green-600';
      case GAME_STATE.RESULT:
        return 'bg-gradient-to-b from-blue-500 to-blue-700';
      case GAME_STATE.TOO_SOON:
        return 'bg-gradient-to-b from-orange-500 to-orange-700';
      case GAME_STATE.FINISHED:
        return 'bg-gradient-to-b from-purple-500 to-indigo-700';
      default:
        return 'bg-gradient-to-b from-gray-600 to-gray-800';
    }
  };

  // Inhalt rendern
  const renderContent = () => {
    switch (gameState) {
      case GAME_STATE.INTRO:
        return (
          <div className="text-center">
            <div className="text-8xl mb-6 animate-bounce">
              <svg className="w-24 h-24 mx-auto text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Reaktionstest</h2>
            <p className="text-white/80 text-lg mb-2">
              Teste deine Reflexe!
            </p>
            <p className="text-white/60 text-sm mb-8">
              Klicke so schnell wie möglich, wenn der Bildschirm grün wird.
            </p>
            <div className="text-white/70 text-sm">
              {TOTAL_ATTEMPTS} Versuche - Durchschnitt zählt
            </div>
            <div className="mt-8 text-white/50 animate-pulse">
              Klicke um zu starten...
            </div>
          </div>
        );

      case GAME_STATE.WAITING:
        return (
          <div className="text-center">
            <div className="flex justify-center gap-3 mb-8">
              <div className="w-4 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-4 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
              <div className="w-4 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>
            <h2 className="text-5xl font-light text-white">
              Warte auf Grün...
            </h2>
            <p className="text-white/60 mt-4 text-sm">
              Versuch {currentAttempt + 1} von {TOTAL_ATTEMPTS}
            </p>
          </div>
        );

      case GAME_STATE.READY:
        return (
          <div className="text-center">
            <div className="flex justify-center gap-3 mb-8">
              <div className="w-4 h-4 bg-white rounded-full" />
              <div className="w-4 h-4 bg-white rounded-full" />
              <div className="w-4 h-4 bg-white rounded-full" />
            </div>
            <h2 className="text-7xl font-bold text-white animate-pulse">
              KLICK!
            </h2>
          </div>
        );

      case GAME_STATE.RESULT:
        const rating = getRating(reactionTime);
        return (
          <div className="text-center">
            <div className="mb-6">
              <svg className="w-20 h-20 mx-auto text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
              </svg>
            </div>
            <h2 className="text-7xl font-bold text-white mb-2">
              {reactionTime} ms
            </h2>
            <p className={`text-2xl font-semibold ${rating.color} mb-4`}>
              {rating.text}
            </p>
            <p className="text-white/60 text-sm">
              Versuch {currentAttempt + 1} von {TOTAL_ATTEMPTS}
            </p>
            <div className="mt-6 text-white/50 animate-pulse">
              Klicke um fortzufahren...
            </div>
          </div>
        );

      case GAME_STATE.TOO_SOON:
        return (
          <div className="text-center">
            <div className="mb-6">
              <svg className="w-20 h-20 mx-auto text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <h2 className="text-5xl font-bold text-white mb-4">
              Zu früh!
            </h2>
            <p className="text-white/80 text-lg">
              Warte auf Grün, bevor du klickst.
            </p>
            <div className="mt-8 text-white/50 animate-pulse">
              Klicke um es erneut zu versuchen...
            </div>
          </div>
        );

      case GAME_STATE.FINISHED:
        const avgTime = getAverage();
        const avgRating = getRating(avgTime);
        const bestTime = Math.min(...attempts);
        const worstTime = Math.max(...attempts);

        // Coins berechnen
        let coins = 0;
        if (avgTime < 200) coins = 25;
        else if (avgTime < 250) coins = 20;
        else if (avgTime < 300) coins = 15;
        else if (avgTime < 400) coins = 10;
        else coins = 5;

        return (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Ergebnis
            </h2>

            <div className="bg-white/10 rounded-2xl p-6 mb-6">
              <p className="text-white/60 text-sm mb-2">Durchschnitt</p>
              <p className="text-6xl font-bold text-white mb-2">{avgTime} ms</p>
              <p className={`text-xl font-semibold ${avgRating.color}`}>
                {avgRating.text}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-white/60 text-xs mb-1">Beste Zeit</p>
                <p className="text-2xl font-bold text-green-300">{bestTime} ms</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-white/60 text-xs mb-1">Schlechteste Zeit</p>
                <p className="text-2xl font-bold text-orange-300">{worstTime} ms</p>
              </div>
            </div>

            <div className="flex justify-center gap-2 mb-6">
              {attempts.map((time, i) => (
                <div
                  key={i}
                  className="bg-white/20 rounded-lg px-3 py-2 text-white text-sm"
                >
                  {time}
                </div>
              ))}
            </div>

            <div className="bg-yellow-500/30 rounded-xl p-4 mb-4">
              <p className="text-yellow-200 text-lg font-bold">
                +{coins} Münzen verdient!
              </p>
            </div>

            <div className="mt-4 text-white/50 animate-pulse">
              Klicke um zu beenden...
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        onClick={handleClick}
        className={`
          relative w-full max-w-md aspect-[3/4] rounded-3xl shadow-2xl
          flex flex-col items-center justify-center p-8 cursor-pointer
          transition-all duration-300 select-none
          ${getBackgroundClass()}
        `}
      >
        {/* Schließen-Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl
                     hover:scale-110 transition-all z-10"
        >
          ✕
        </button>

        {/* Versuchsanzeige */}
        {gameState !== GAME_STATE.INTRO && gameState !== GAME_STATE.FINISHED && (
          <div className="absolute top-4 left-4 flex gap-1">
            {Array.from({ length: TOTAL_ATTEMPTS }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all ${
                  i < attempts.length
                    ? 'bg-white'
                    : i === attempts.length
                    ? 'bg-white/60 animate-pulse'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        )}

        {/* Hauptinhalt */}
        {renderContent()}
      </div>
    </div>
  );
};

export default ReactionTime;
