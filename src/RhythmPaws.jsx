import React, { useState, useEffect, useCallback, useRef } from 'react';

// Spielzustände
const GAME_STATE = {
  INTRO: 'intro',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  FINISHED: 'finished',
};

// Konstanten
const LANES = 4;
const NOTE_SPEED = 4; // Pixel pro Frame
const HIT_ZONE_Y = 400; // Y-Position der Trefferzone
const HIT_TOLERANCE = 50; // Pixel-Toleranz für Treffer
const PERFECT_TOLERANCE = 20;
const GAME_DURATION = 45000; // 45 Sekunden

// Tasten für jede Bahn
const LANE_KEYS = ['d', 'f', 'j', 'k'];
const LANE_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3'];
const LANE_EMOJIS = ['🐾', '🦴', '⭐', '❤️'];

// Noten-Frequenzen (Pentatonische Skala)
const NOTE_FREQUENCIES = [
  329.63, // E4
  392.00, // G4
  440.00, // A4
  493.88, // B4
];

const RhythmPaws = ({ onClose, onWin }) => {
  const [gameState, setGameState] = useState(GAME_STATE.INTRO);
  const [countdown, setCountdown] = useState(3);
  const [notes, setNotes] = useState([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hitFeedback, setHitFeedback] = useState(null);
  const [pressedLanes, setPressedLanes] = useState([false, false, false, false]);
  const [perfectCount, setPerfectCount] = useState(0);
  const [goodCount, setGoodCount] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [progress, setProgress] = useState(0);

  const gameLoopRef = useRef(null);
  const noteSpawnRef = useRef(null);
  const audioContextRef = useRef(null);
  const startTimeRef = useRef(null);
  const notesRef = useRef([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);

  // Refs synchron halten
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  // AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Note spielen
  const playNote = useCallback((lane, type = 'hit') => {
    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = NOTE_FREQUENCIES[lane];
      oscillator.type = type === 'miss' ? 'sawtooth' : 'sine';

      const now = audioContext.currentTime;
      const duration = type === 'miss' ? 0.1 : 0.15;
      const volume = type === 'miss' ? 0.1 : 0.25;

      gainNode.gain.setValueAtTime(volume, now);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (e) {
      console.log('Audio nicht verfügbar:', e);
    }
  }, [getAudioContext]);

  // Beat spielen (Hintergrund-Rhythmus)
  const playBeat = useCallback(() => {
    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 100;
      oscillator.type = 'square';

      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.05);

      oscillator.start(now);
      oscillator.stop(now + 0.05);
    } catch (e) {
      console.log('Audio nicht verfügbar:', e);
    }
  }, [getAudioContext]);

  // Note spawnen
  const spawnNote = useCallback(() => {
    const lane = Math.floor(Math.random() * LANES);
    const newNote = {
      id: Date.now() + Math.random(),
      lane,
      y: -50,
      hit: false,
    };
    setNotes(prev => [...prev, newNote]);
    playBeat();
  }, [playBeat]);

  // Game Loop
  const gameLoop = useCallback(() => {
    // Noten bewegen
    setNotes(prev => {
      const updated = prev.map(note => ({
        ...note,
        y: note.y + NOTE_SPEED,
      }));

      // Verpasste Noten entfernen und als Miss zählen
      const missed = updated.filter(
        note => !note.hit && note.y > HIT_ZONE_Y + HIT_TOLERANCE + 30
      );

      if (missed.length > 0) {
        setMissCount(prev => prev + missed.length);
        setCombo(0);
        setHitFeedback({ type: 'miss', lane: missed[0].lane });
        setTimeout(() => setHitFeedback(null), 300);
      }

      // Noten die noch im Spiel sind
      return updated.filter(
        note => note.y <= HIT_ZONE_Y + HIT_TOLERANCE + 50
      );
    });

    // Fortschritt aktualisieren
    if (startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      setProgress(Math.min(elapsed / GAME_DURATION, 1));

      if (elapsed >= GAME_DURATION) {
        endGame();
        return;
      }
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // Spiel beenden
  const endGame = useCallback(() => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    if (noteSpawnRef.current) {
      clearInterval(noteSpawnRef.current);
    }
    setGameState(GAME_STATE.FINISHED);
  }, []);

  // Taste gedrückt
  const handleKeyDown = useCallback((e) => {
    if (gameState !== GAME_STATE.PLAYING) return;

    const key = e.key.toLowerCase();
    const laneIndex = LANE_KEYS.indexOf(key);

    if (laneIndex === -1) return;

    setPressedLanes(prev => {
      const newPressed = [...prev];
      newPressed[laneIndex] = true;
      return newPressed;
    });

    // Prüfe ob eine Note getroffen wurde
    const currentNotes = notesRef.current;
    const hitNote = currentNotes.find(
      note => !note.hit &&
        note.lane === laneIndex &&
        Math.abs(note.y - HIT_ZONE_Y) <= HIT_TOLERANCE
    );

    if (hitNote) {
      const distance = Math.abs(hitNote.y - HIT_ZONE_Y);
      const isPerfect = distance <= PERFECT_TOLERANCE;

      playNote(laneIndex, 'hit');

      // Note als getroffen markieren
      setNotes(prev =>
        prev.map(note =>
          note.id === hitNote.id ? { ...note, hit: true } : note
        )
      );

      // Score und Combo
      const comboBonus = Math.floor(comboRef.current / 10);
      const points = isPerfect ? 100 + comboBonus * 10 : 50 + comboBonus * 5;

      setScore(prev => prev + points);
      setCombo(prev => {
        const newCombo = prev + 1;
        if (newCombo > maxCombo) setMaxCombo(newCombo);
        return newCombo;
      });

      if (isPerfect) {
        setPerfectCount(prev => prev + 1);
        setHitFeedback({ type: 'perfect', lane: laneIndex });
      } else {
        setGoodCount(prev => prev + 1);
        setHitFeedback({ type: 'good', lane: laneIndex });
      }

      setTimeout(() => setHitFeedback(null), 300);
    } else {
      // Daneben gedrückt
      playNote(laneIndex, 'miss');
    }
  }, [gameState, playNote, maxCombo]);

  // Taste losgelassen
  const handleKeyUp = useCallback((e) => {
    const key = e.key.toLowerCase();
    const laneIndex = LANE_KEYS.indexOf(key);

    if (laneIndex === -1) return;

    setPressedLanes(prev => {
      const newPressed = [...prev];
      newPressed[laneIndex] = false;
      return newPressed;
    });
  }, []);

  // Touch/Click Handler für Mobile
  const handleLanePress = useCallback((laneIndex) => {
    if (gameState !== GAME_STATE.PLAYING) return;

    setPressedLanes(prev => {
      const newPressed = [...prev];
      newPressed[laneIndex] = true;
      return newPressed;
    });

    setTimeout(() => {
      setPressedLanes(prev => {
        const newPressed = [...prev];
        newPressed[laneIndex] = false;
        return newPressed;
      });
    }, 100);

    // Gleiche Logik wie bei Tastendruck
    const currentNotes = notesRef.current;
    const hitNote = currentNotes.find(
      note => !note.hit &&
        note.lane === laneIndex &&
        Math.abs(note.y - HIT_ZONE_Y) <= HIT_TOLERANCE
    );

    if (hitNote) {
      const distance = Math.abs(hitNote.y - HIT_ZONE_Y);
      const isPerfect = distance <= PERFECT_TOLERANCE;

      playNote(laneIndex, 'hit');

      setNotes(prev =>
        prev.map(note =>
          note.id === hitNote.id ? { ...note, hit: true } : note
        )
      );

      const comboBonus = Math.floor(comboRef.current / 10);
      const points = isPerfect ? 100 + comboBonus * 10 : 50 + comboBonus * 5;

      setScore(prev => prev + points);
      setCombo(prev => {
        const newCombo = prev + 1;
        if (newCombo > maxCombo) setMaxCombo(newCombo);
        return newCombo;
      });

      if (isPerfect) {
        setPerfectCount(prev => prev + 1);
        setHitFeedback({ type: 'perfect', lane: laneIndex });
      } else {
        setGoodCount(prev => prev + 1);
        setHitFeedback({ type: 'good', lane: laneIndex });
      }

      setTimeout(() => setHitFeedback(null), 300);
    } else {
      playNote(laneIndex, 'miss');
    }
  }, [gameState, playNote, maxCombo]);

  // Event Listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Aufräumen
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (noteSpawnRef.current) {
        clearInterval(noteSpawnRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Countdown
  useEffect(() => {
    if (gameState === GAME_STATE.COUNTDOWN) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        startGame();
      }
    }
  }, [gameState, countdown]);

  // Spiel starten
  const startGame = useCallback(() => {
    getAudioContext();
    setGameState(GAME_STATE.PLAYING);
    setNotes([]);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setPerfectCount(0);
    setGoodCount(0);
    setMissCount(0);
    setProgress(0);
    startTimeRef.current = Date.now();

    // Game Loop starten
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    // Noten spawnen (alle 400-800ms zufällig)
    const spawnNotes = () => {
      spawnNote();
      const nextSpawn = 400 + Math.random() * 400;
      noteSpawnRef.current = setTimeout(spawnNotes, nextSpawn);
    };
    spawnNotes();
  }, [gameLoop, spawnNote, getAudioContext]);

  // Countdown starten
  const startCountdown = useCallback(() => {
    getAudioContext();
    setCountdown(3);
    setGameState(GAME_STATE.COUNTDOWN);
  }, [getAudioContext]);

  // Spiel beenden und Coins berechnen
  const finishGame = useCallback(() => {
    const totalNotes = perfectCount + goodCount + missCount;
    const accuracy = totalNotes > 0 ? ((perfectCount + goodCount) / totalNotes) * 100 : 0;

    let coins = 0;
    if (score >= 5000 && accuracy >= 90) coins = 35;
    else if (score >= 4000 && accuracy >= 80) coins = 30;
    else if (score >= 3000 && accuracy >= 70) coins = 25;
    else if (score >= 2000) coins = 20;
    else if (score >= 1000) coins = 15;
    else if (score >= 500) coins = 10;
    else coins = 5;

    if (onWin) onWin(coins);
    onClose();
  }, [score, perfectCount, goodCount, missCount, onWin, onClose]);

  // Bewertung
  const getRating = () => {
    const totalNotes = perfectCount + goodCount + missCount;
    const accuracy = totalNotes > 0 ? ((perfectCount + goodCount) / totalNotes) * 100 : 0;

    if (accuracy >= 95 && score >= 5000) return { text: 'Perfekt!', color: 'text-yellow-300', grade: 'S' };
    if (accuracy >= 90) return { text: 'Ausgezeichnet!', color: 'text-green-300', grade: 'A' };
    if (accuracy >= 80) return { text: 'Sehr gut!', color: 'text-green-400', grade: 'B' };
    if (accuracy >= 70) return { text: 'Gut!', color: 'text-blue-300', grade: 'C' };
    if (accuracy >= 50) return { text: 'Okay', color: 'text-blue-400', grade: 'D' };
    return { text: 'Weiter üben!', color: 'text-orange-400', grade: 'E' };
  };

  // Inhalt rendern
  const renderContent = () => {
    switch (gameState) {
      case GAME_STATE.INTRO:
        return (
          <div className="text-center p-6">
            <div className="text-6xl mb-4">🎵</div>
            <h2 className="text-2xl font-bold text-white mb-3">Rhythm Paws</h2>
            <p className="text-white/80 text-sm mb-2">
              Drücke die Tasten wenn die Noten die Linie erreichen!
            </p>

            <div className="flex justify-center gap-2 my-4">
              {LANE_KEYS.map((key, i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: LANE_COLORS[i] }}
                >
                  {key.toUpperCase()}
                </div>
              ))}
            </div>

            <p className="text-white/60 text-xs mb-4">
              Oder tippe auf die Bahnen (Mobile)
            </p>

            <button
              onClick={startCountdown}
              className="bg-white text-pink-600 font-bold py-3 px-8 rounded-full
                       hover:bg-white/90 transition-all hover:scale-105"
            >
              Starten
            </button>
          </div>
        );

      case GAME_STATE.COUNTDOWN:
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-8xl font-bold text-white animate-pulse">
              {countdown || 'Los!'}
            </div>
          </div>
        );

      case GAME_STATE.PLAYING:
        return (
          <div className="relative h-[480px] select-none">
            {/* Fortschrittsbalken */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
              <div
                className="h-full bg-pink-400 transition-all duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            {/* Score und Combo */}
            <div className="absolute top-3 left-3 text-white">
              <div className="text-2xl font-bold">{score}</div>
              {combo > 0 && (
                <div className="text-sm text-yellow-300">
                  {combo}x Combo
                </div>
              )}
            </div>

            {/* Hit Feedback */}
            {hitFeedback && (
              <div className="absolute top-3 right-3 text-right">
                <div className={`text-xl font-bold ${
                  hitFeedback.type === 'perfect' ? 'text-yellow-300' :
                  hitFeedback.type === 'good' ? 'text-green-300' :
                  'text-red-400'
                }`}>
                  {hitFeedback.type === 'perfect' ? 'PERFECT!' :
                   hitFeedback.type === 'good' ? 'GOOD!' :
                   'MISS'}
                </div>
              </div>
            )}

            {/* Spielfeld */}
            <div className="absolute top-12 bottom-0 left-0 right-0 flex">
              {Array.from({ length: LANES }).map((_, laneIndex) => (
                <div
                  key={laneIndex}
                  className="flex-1 relative border-x border-white/10"
                  onClick={() => handleLanePress(laneIndex)}
                  style={{ touchAction: 'manipulation' }}
                >
                  {/* Hintergrund-Gradient */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      background: `linear-gradient(to bottom, transparent, ${LANE_COLORS[laneIndex]})`
                    }}
                  />

                  {/* Noten */}
                  {notes
                    .filter(note => note.lane === laneIndex && !note.hit)
                    .map(note => (
                      <div
                        key={note.id}
                        className="absolute left-1/2 -translate-x-1/2 w-12 h-12
                                 rounded-lg flex items-center justify-center text-2xl
                                 shadow-lg transition-transform"
                        style={{
                          top: note.y,
                          backgroundColor: LANE_COLORS[laneIndex],
                          boxShadow: `0 0 15px ${LANE_COLORS[laneIndex]}`,
                        }}
                      >
                        {LANE_EMOJIS[laneIndex]}
                      </div>
                    ))}

                  {/* Trefferzone */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 w-14 h-14
                              rounded-lg border-4 flex items-center justify-center
                              transition-all duration-75 ${
                                pressedLanes[laneIndex]
                                  ? 'scale-90 opacity-100'
                                  : 'scale-100 opacity-60'
                              }`}
                    style={{
                      top: HIT_ZONE_Y - 28,
                      borderColor: LANE_COLORS[laneIndex],
                      backgroundColor: pressedLanes[laneIndex]
                        ? LANE_COLORS[laneIndex] + '80'
                        : 'transparent',
                    }}
                  >
                    <span className="text-white font-bold text-sm">
                      {LANE_KEYS[laneIndex].toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Trefferlinie */}
            <div
              className="absolute left-0 right-0 h-1 bg-white/50"
              style={{ top: HIT_ZONE_Y + 12 }}
            />
          </div>
        );

      case GAME_STATE.FINISHED:
        const rating = getRating();
        const totalNotes = perfectCount + goodCount + missCount;
        const accuracy = totalNotes > 0
          ? Math.round(((perfectCount + goodCount) / totalNotes) * 100)
          : 0;

        let coins = 0;
        if (score >= 5000 && accuracy >= 90) coins = 35;
        else if (score >= 4000 && accuracy >= 80) coins = 30;
        else if (score >= 3000 && accuracy >= 70) coins = 25;
        else if (score >= 2000) coins = 20;
        else if (score >= 1000) coins = 15;
        else if (score >= 500) coins = 10;
        else coins = 5;

        return (
          <div className="text-center p-6">
            <div className="text-6xl mb-2">{rating.grade}</div>
            <h2 className="text-2xl font-bold text-white mb-1">Song beendet!</h2>
            <p className={`text-lg ${rating.color} mb-4`}>{rating.text}</p>

            <div className="bg-white/10 rounded-2xl p-4 mb-4">
              <p className="text-white/60 text-sm">Punkte</p>
              <p className="text-4xl font-bold text-white">{score}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white/60 text-xs">Genauigkeit</p>
                <p className="text-xl font-bold text-white">{accuracy}%</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white/60 text-xs">Max Combo</p>
                <p className="text-xl font-bold text-yellow-300">{maxCombo}x</p>
              </div>
            </div>

            <div className="flex justify-center gap-4 text-sm mb-4">
              <div className="text-yellow-300">Perfect: {perfectCount}</div>
              <div className="text-green-300">Good: {goodCount}</div>
              <div className="text-red-400">Miss: {missCount}</div>
            </div>

            <div className="bg-yellow-500/30 rounded-xl p-3 mb-4">
              <p className="text-yellow-200 font-bold">
                +{coins} Münzen verdient!
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setGameState(GAME_STATE.INTRO);
                }}
                className="bg-white/20 text-white font-bold py-2 px-5 rounded-full
                         hover:bg-white/30 transition-all"
              >
                Nochmal
              </button>
              <button
                onClick={finishGame}
                className="bg-white text-pink-600 font-bold py-2 px-5 rounded-full
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-pink-500 to-purple-700
                      rounded-3xl shadow-2xl overflow-hidden">
        {/* Schließen-Button */}
        {gameState !== GAME_STATE.PLAYING && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl
                       hover:scale-110 transition-all z-10"
          >
            ✕
          </button>
        )}

        {/* Hauptinhalt */}
        {renderContent()}
      </div>
    </div>
  );
};

export default RhythmPaws;
