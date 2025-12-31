import React, { useState, useEffect, useCallback, useRef } from 'react';

// Storage Repository für LocalStorage
const STORAGE_KEY = 'mathHero_v1';

const storage = {
  load: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return { attempts: [], settings: getDefaultSettings(), stats: getDefaultStats() };
      const parsed = JSON.parse(data);
      // Migration für zukünftige Versionen
      if (!parsed.version || parsed.version < 1) {
        parsed.version = 1;
      }
      return parsed;
    } catch {
      return { attempts: [], settings: getDefaultSettings(), stats: getDefaultStats() };
    }
  },
  save: (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: 1 }));
    } catch (e) {
      console.error('Storage save failed:', e);
    }
  }
};

const getDefaultSettings = () => ({
  enableAddition: true,
  enableSubtraction: false,
  enableMultiplication: false,
  enableDivision: false,
  maxResult: 20, // 20, 100, oder 1000
  inputMode: 'numpad', // 'numpad' oder 'choice'
  soundEnabled: true,
  mobileDisplay: false, // Mobile-optimierte Ansicht
  readAloudEnabled: false, // Vorlesemodus für Erklärungen
});

// ElevenLabs API Key aus .env
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

// ElevenLabs Voice ID - Kinderstimme
const ELEVENLABS_VOICE_ID = 'jBpfuIE2acCO8z3wKNLl'; // Gigi - junge, freundliche Stimme

// Audio-Referenz für Stoppen
let currentAudio = null;

// Text-to-Speech Funktion mit ElevenLabs (mit Streaming für schnelleres Laden)
const speakText = async (text, enabled) => {
  if (!enabled) return;

  // Emojis aus dem Text entfernen für besseres Vorlesen
  const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|➡️|⬅️/gu, '');

  // Laufendes Audio stoppen
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  try {
    // Streaming-Endpoint für schnellere Wiedergabe
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_turbo_v2_5', // Schnelleres Modell
          voice_settings: {
            stability: 0.75,        // Höher = stabiler, weniger Flüstern
            similarity_boost: 0.75,
            style: 0.0,             // Kein Style = natürlicher, kein Flüstern
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('ElevenLabs API Fehler:', response.status);
      return;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    currentAudio = new Audio(audioUrl);
    currentAudio.volume = 1.0; // Volle Lautstärke
    currentAudio.play();

    // URL freigeben wenn fertig
    currentAudio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
    };
  } catch (error) {
    console.error('ElevenLabs TTS Fehler:', error);
  }
};

// Audio stoppen
const stopSpeaking = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
};

// Schwierigkeitsgrade
const DIFFICULTY_LEVELS = [
  { id: 20, name: 'Leicht', emoji: '🟢', description: 'Ergebnis bis 20', color: 'bg-green-500' },
  { id: 100, name: 'Mittel', emoji: '🟡', description: 'Ergebnis bis 100', color: 'bg-yellow-500' },
  { id: 1000, name: 'Schwer', emoji: '🔴', description: 'Ergebnis bis 1000', color: 'bg-red-500' },
];

// Rechenarten
const OPERATIONS = [
  { id: 'addition', key: 'enableAddition', symbol: '+', name: 'Addition', emoji: '➕' },
  { id: 'subtraction', key: 'enableSubtraction', symbol: '-', name: 'Subtraktion', emoji: '➖' },
  { id: 'multiplication', key: 'enableMultiplication', symbol: '×', name: 'Multiplikation', emoji: '✖️' },
  { id: 'division', key: 'enableDivision', symbol: '÷', name: 'Division', emoji: '➗' },
];

const getDefaultStats = () => ({
  totalScore: 0,
  bestStreak: 0,
  totalCorrect: 0,
  totalWrong: 0,
});

// Sound Effects mit Web Audio API
const playSound = (type, enabled) => {
  if (!enabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'correct') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialDecayTo && gain.gain.exponentialDecayTo(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'wrong') {
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.setValueAtTime(150, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'streak') {
      // Fanfare für Streak-Bonus
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {
    // Audio nicht verfügbar
  }
};

// Aufgabengenerator
const generateTask = (settings) => {
  const operations = [];
  if (settings.enableAddition) operations.push('+');
  if (settings.enableSubtraction) operations.push('-');
  if (settings.enableMultiplication) operations.push('×');
  if (settings.enableDivision) operations.push('÷');

  if (operations.length === 0) operations.push('+');

  const operation = operations[Math.floor(Math.random() * operations.length)];
  let a, b, correctAnswer;

  const maxResult = settings.maxResult;

  switch (operation) {
    case '+':
      // Addition: a + b <= maxResult
      if (maxResult <= 20) {
        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * Math.min(10, maxResult - a)) + 1;
      } else if (maxResult <= 100) {
        a = Math.floor(Math.random() * 50) + 1;
        b = Math.floor(Math.random() * Math.min(50, maxResult - a)) + 1;
      } else {
        a = Math.floor(Math.random() * 500) + 1;
        b = Math.floor(Math.random() * Math.min(500, maxResult - a)) + 1;
      }
      correctAnswer = a + b;
      break;
    case '-':
      // Subtraktion: Ergebnis immer positiv
      if (maxResult <= 20) {
        a = Math.floor(Math.random() * 18) + 2;
        b = Math.floor(Math.random() * (a - 1)) + 1;
      } else if (maxResult <= 100) {
        a = Math.floor(Math.random() * 90) + 10;
        b = Math.floor(Math.random() * (a - 1)) + 1;
      } else {
        a = Math.floor(Math.random() * 900) + 100;
        b = Math.floor(Math.random() * (a - 1)) + 1;
      }
      correctAnswer = a - b;
      break;
    case '×':
      // Multiplikation: angepasst an Schwierigkeit
      if (maxResult <= 20) {
        a = Math.floor(Math.random() * 4) + 1;
        b = Math.floor(Math.random() * 5) + 1;
      } else if (maxResult <= 100) {
        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * 10) + 1;
      } else {
        a = Math.floor(Math.random() * 30) + 2;
        b = Math.floor(Math.random() * 30) + 2;
      }
      correctAnswer = a * b;
      break;
    case '÷':
      // Division: Ergebnis immer ganze Zahl
      if (maxResult <= 20) {
        correctAnswer = Math.floor(Math.random() * 9) + 1;
        b = Math.floor(Math.random() * 5) + 1;
      } else if (maxResult <= 100) {
        correctAnswer = Math.floor(Math.random() * 12) + 1;
        b = Math.floor(Math.random() * 10) + 1;
      } else {
        correctAnswer = Math.floor(Math.random() * 50) + 1;
        b = Math.floor(Math.random() * 20) + 1;
      }
      a = correctAnswer * b;
      break;
    default:
      a = 1;
      b = 1;
      correctAnswer = 2;
  }

  return { a, b, operation, correctAnswer };
};

// Multiple Choice Optionen generieren
const generateChoices = (correctAnswer) => {
  const choices = new Set([correctAnswer]);
  while (choices.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    const wrong = Math.max(0, correctAnswer + offset);
    if (wrong !== correctAnswer) choices.add(wrong);
  }
  return Array.from(choices).sort(() => Math.random() - 0.5);
};

// Kindgerechte Erklärungen für falsche Antworten
const generateExplanation = (a, b, operation, correctAnswer) => {
  // Zufällig verschiedene Erklärungsarten wählen
  const explanationType = Math.floor(Math.random() * 2);

  switch (operation) {
    case '+':
      if (explanationType === 0) {
        // Brettspiel-Erklärung
        return `🎲 Stell dir ein Brettspiel vor: Du stehst auf Feld ${a}. Dann gehst du ${b} Felder VORWÄRTS ➡️ und landest auf Feld ${correctAnswer}!`;
      } else {
        // Gegenstände-Erklärung
        if (a <= 10 && b <= 10) {
          return `🤔 Stell dir vor: Du hast ${a} Äpfel 🍎 und bekommst ${b} dazu. Zähle alle zusammen: ${correctAnswer} Äpfel!`;
        }
        return `🤔 ${a} + ${b} = ${correctAnswer}. Tipp: Zähle von ${a} aus ${b} Schritte weiter!`;
      }
    case '-':
      if (explanationType === 0) {
        // Brettspiel-Erklärung
        return `🎲 Stell dir ein Brettspiel vor: Du stehst auf Feld ${a}. Dann gehst du ${b} Felder RÜCKWÄRTS ⬅️ und landest auf Feld ${correctAnswer}!`;
      } else {
        // Gegenstände-Erklärung
        if (a <= 20) {
          return `🤔 Du hast ${a} Bonbons 🍬 und gibst ${b} weg. Wie viele bleiben? ${correctAnswer}!`;
        }
        return `🤔 ${a} - ${b} = ${correctAnswer}. Tipp: Zähle von ${a} aus ${b} Schritte zurück!`;
      }
    case '×':
      if (b <= 5) {
        const additions = Array(b).fill(a).join(' + ');
        return `🤔 ${a} × ${b} heißt: Die ${a} wird ${b} mal genommen. Das sind ${additions} = ${correctAnswer}`;
      }
      return `🤔 ${a} × ${b} = ${correctAnswer}. Das heißt: ${a} genommen, ${b} mal!`;
    case '÷':
      return `🤔 ${a} ÷ ${b} = ${correctAnswer}. Stell dir vor: ${a} Kekse 🍪 auf ${b} Teller verteilen = ${correctAnswer} pro Teller!`;
    default:
      return `🤔 Die richtige Antwort ist ${correctAnswer}!`;
  }
};

// Badge Definitionen
const BADGES = [
  { id: 'star5', name: '5 Sterne', emoji: '⭐', requirement: (stats) => stats.totalCorrect >= 5 },
  { id: 'star25', name: '25 Sterne', emoji: '🌟', requirement: (stats) => stats.totalCorrect >= 25 },
  { id: 'star100', name: '100 Sterne', emoji: '💫', requirement: (stats) => stats.totalCorrect >= 100 },
  { id: 'streak5', name: 'Rechen-Ritter', emoji: '🛡️', requirement: (stats) => stats.bestStreak >= 5 },
  { id: 'streak10', name: 'Mathe-Held', emoji: '🦸', requirement: (stats) => stats.bestStreak >= 10 },
  { id: 'mul', name: 'Mal-Meister', emoji: '✖️', requirement: (_, attempts) =>
    attempts.filter(a => a.operation === '×' && a.isCorrect).length >= 10 },
  { id: 'div', name: 'Teilen-Talent', emoji: '➗', requirement: (_, attempts) =>
    attempts.filter(a => a.operation === '÷' && a.isCorrect).length >= 10 },
];

const MathHero = ({ onClose, onWin, mobileDisplay: propMobileDisplay }) => {
  // Game States
  const [screen, setScreen] = useState('setup'); // 'setup', 'game', 'dashboard', 'settings'
  const [task, setTask] = useState(null);

  // Temporäre Auswahl für Setup-Screen
  const [setupOperations, setSetupOperations] = useState({
    enableAddition: true,
    enableSubtraction: false,
    enableMultiplication: false,
    enableDivision: false,
  });
  const [setupDifficulty, setSetupDifficulty] = useState(20);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null); // { type: 'correct'|'wrong', answer: number }
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [choices, setChoices] = useState([]);

  // Aktuelle Spieleinstellungen (von Setup übernommen)
  const [gameSettings, setGameSettings] = useState(null);

  // Persistent Data
  const [settings, setSettings] = useState(getDefaultSettings());
  const [attempts, setAttempts] = useState([]);
  const [stats, setStats] = useState(getDefaultStats());

  // Dashboard Long Press
  const [dashboardPressStart, setDashboardPressStart] = useState(null);
  const [dashboardProgress, setDashboardProgress] = useState(0);

  // Timing
  const taskStartTime = useRef(Date.now());
  const consecutiveCorrect = useRef(0);
  const consecutiveWrong = useRef(0);

  // Use prop value if provided, otherwise use settings value
  const isMobileDisplay = propMobileDisplay !== undefined ? propMobileDisplay : settings.mobileDisplay;

  // Load Data on Mount
  useEffect(() => {
    const data = storage.load();
    setSettings(data.settings || getDefaultSettings());
    setAttempts(data.attempts || []);
    setStats(data.stats || getDefaultStats());
  }, []);

  // Generate first task
  useEffect(() => {
    if (!task && screen === 'game' && gameSettings) {
      const newTask = generateTask(gameSettings);
      setTask(newTask);
      setChoices(generateChoices(newTask.correctAnswer));
      taskStartTime.current = Date.now();
    }
  }, [task, screen, gameSettings]);

  // Save data when it changes
  useEffect(() => {
    storage.save({ attempts, settings, stats });
  }, [attempts, settings, stats]);

  // Dashboard long press handler
  useEffect(() => {
    if (dashboardPressStart) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - dashboardPressStart;
        setDashboardProgress(Math.min(100, (elapsed / 2000) * 100));
        if (elapsed >= 2000) {
          setScreen('dashboard');
          setDashboardPressStart(null);
          setDashboardProgress(0);
        }
      }, 50);
      return () => clearInterval(interval);
    } else {
      setDashboardProgress(0);
    }
  }, [dashboardPressStart]);

  // Answer Handler
  const handleAnswer = useCallback((answer) => {
    if (!task || feedback) return;

    const answerNum = typeof answer === 'string' ? parseInt(answer, 10) : answer;
    if (isNaN(answerNum)) return;

    const isCorrect = answerNum === task.correctAnswer;
    const responseTime = Date.now() - taskStartTime.current;

    // Create attempt record
    const attempt = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      timestamp: new Date().toISOString(),
      mode: 'practice',
      operation: task.operation,
      a: task.a,
      b: task.b,
      correctAnswer: task.correctAnswer,
      userAnswer: answerNum,
      isCorrect,
      responseTimeMs: responseTime,
      difficulty: gameSettings?.maxResult || 20,
    };

    setAttempts(prev => [attempt, ...prev].slice(0, 500)); // Keep last 500

    if (isCorrect) {
      consecutiveCorrect.current++;
      consecutiveWrong.current = 0;

      // Score Berechnung
      const streakBonus = Math.min(20, streak * 2);
      const points = 10 + streakBonus;

      setScore(prev => prev + points);
      setStreak(prev => prev + 1);

      // Stats Update
      setStats(prev => ({
        ...prev,
        totalScore: prev.totalScore + points,
        totalCorrect: prev.totalCorrect + 1,
        bestStreak: Math.max(prev.bestStreak, streak + 1),
      }));

      playSound(streak >= 4 ? 'streak' : 'correct', settings.soundEnabled);
      setFeedback({ type: 'correct', answer: task.correctAnswer });
    } else {
      consecutiveWrong.current++;
      consecutiveCorrect.current = 0;

      setStreak(0);
      setStats(prev => ({
        ...prev,
        totalWrong: prev.totalWrong + 1,
      }));

      playSound('wrong', settings.soundEnabled);
      const explanation = generateExplanation(task.a, task.b, task.operation, task.correctAnswer);
      setFeedback({
        type: 'wrong',
        answer: task.correctAnswer,
        explanation
      });

      // Vorlesen wenn aktiviert
      speakText(explanation, settings.readAloudEnabled);
    }

    // Next task after delay (only auto-advance for correct answers)
    if (isCorrect) {
      setTimeout(() => {
        setFeedback(null);
        setUserInput('');
        const newTask = generateTask(gameSettings || settings);
        setTask(newTask);
        setChoices(generateChoices(newTask.correctAnswer));
        taskStartTime.current = Date.now();
      }, 800);
    }
    // For wrong answers, user must click to continue
  }, [task, feedback, streak, settings, gameSettings]);

  // Continue to next task (after wrong answer)
  const continueToNextTask = () => {
    // Stoppe ElevenLabs Audio wenn aktiv
    stopSpeaking();
    setFeedback(null);
    setUserInput('');
    const newTask = generateTask(gameSettings || settings);
    setTask(newTask);
    setChoices(generateChoices(newTask.correctAnswer));
    taskStartTime.current = Date.now();
  };

  // Numpad Input Handler
  const handleNumpadPress = (num) => {
    if (feedback) return;
    if (num === 'clear') {
      setUserInput('');
    } else if (num === 'enter') {
      if (userInput) handleAnswer(userInput);
    } else {
      const newInput = userInput + num;
      // Erlaube bis zu 4 Ziffern für Ergebnisse bis 1000
      if (newInput.length <= 4) {
        setUserInput(newInput);
      }
    }
  };

  // Settings Update
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Get Today's Stats
  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAttempts = attempts.filter(a => a.timestamp.startsWith(today));
    const correct = todayAttempts.filter(a => a.isCorrect).length;
    const wrong = todayAttempts.filter(a => !a.isCorrect).length;
    return {
      correct,
      wrong,
      accuracy: todayAttempts.length > 0 ? Math.round((correct / todayAttempts.length) * 100) : 0,
      total: todayAttempts.length,
    };
  };

  // Get Frequent Mistakes
  const getFrequentMistakes = () => {
    const mistakes = attempts.filter(a => !a.isCorrect);
    const freq = {};
    mistakes.forEach(m => {
      const key = `${m.a} ${m.operation} ${m.b}`;
      freq[key] = (freq[key] || 0) + 1;
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  // Get Earned Badges
  const getEarnedBadges = () => {
    return BADGES.filter(b => b.requirement(stats, attempts));
  };

  // Handle Game End
  const handleClose = () => {
    const earnedCoins = Math.floor(score / 20);
    onWin(earnedCoins);
  };

  // Start Game mit gewählten Einstellungen
  const startGame = () => {
    const hasOperation = setupOperations.enableAddition || setupOperations.enableSubtraction ||
                         setupOperations.enableMultiplication || setupOperations.enableDivision;
    if (!hasOperation) return; // Mindestens eine Operation muss gewählt sein

    setGameSettings({
      ...settings,
      ...setupOperations,
      maxResult: setupDifficulty,
    });
    setScore(0);
    setStreak(0);
    setTask(null);
    setScreen('game');
  };

  // Toggle Operation im Setup
  const toggleSetupOperation = (key) => {
    setSetupOperations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // SETUP SCREEN
  if (screen === 'setup') {
    const hasOperation = setupOperations.enableAddition || setupOperations.enableSubtraction ||
                         setupOperations.enableMultiplication || setupOperations.enableDivision;

    return (
      <div className="fixed inset-0 bg-gradient-to-b from-indigo-600 to-purple-800 flex flex-col z-50 p-4 overflow-auto">
        <div className="max-w-md mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleClose}
              className="text-white text-2xl"
            >
              ←
            </button>
            <h2 className="text-2xl font-bold text-white">🧮 Math Hero</h2>
            <div className="w-8" />
          </div>

          {/* Rechenarten */}
          <div className="bg-white/10 rounded-2xl p-4 mb-4">
            <h3 className="text-white font-bold mb-3">Rechenarten wählen</h3>
            <div className="grid grid-cols-2 gap-2">
              {OPERATIONS.map(op => (
                <button
                  key={op.id}
                  onClick={() => toggleSetupOperation(op.key)}
                  className={`p-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                    setupOperations[op.key]
                      ? 'bg-white text-indigo-700 scale-105'
                      : 'bg-white/20 text-white/70'
                  }`}
                >
                  <span className="text-2xl">{op.emoji}</span>
                  <span className="text-sm">{op.name}</span>
                </button>
              ))}
            </div>
            {!hasOperation && (
              <p className="text-red-300 text-xs mt-2 text-center">
                Wähle mindestens eine Rechenart!
              </p>
            )}
          </div>

          {/* Schwierigkeitsgrad */}
          <div className="bg-white/10 rounded-2xl p-4 mb-6">
            <h3 className="text-white font-bold mb-3">Schwierigkeit</h3>
            <div className="space-y-2">
              {DIFFICULTY_LEVELS.map(level => (
                <button
                  key={level.id}
                  onClick={() => setSetupDifficulty(level.id)}
                  className={`w-full p-3 rounded-xl font-bold transition-all flex items-center gap-3 ${
                    setupDifficulty === level.id
                      ? `${level.color} text-white scale-[1.02]`
                      : 'bg-white/20 text-white/70'
                  }`}
                >
                  <span className="text-2xl">{level.emoji}</span>
                  <div className="text-left flex-1">
                    <div className="font-bold">{level.name}</div>
                    <div className="text-xs opacity-80">{level.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={startGame}
            disabled={!hasOperation}
            className={`w-full py-4 rounded-2xl font-bold text-xl transition-all ${
              hasOperation
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
            }`}
          >
            🚀 Spiel starten!
          </button>

          {/* Stats Preview */}
          <div className="mt-6 bg-white/10 rounded-2xl p-4">
            <div className="flex justify-around text-center">
              <div>
                <div className="text-2xl font-bold text-yellow-400">{stats.totalScore}</div>
                <div className="text-white/50 text-xs">Punkte</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{stats.totalCorrect}</div>
                <div className="text-white/50 text-xs">Richtig</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">{stats.bestStreak}</div>
                <div className="text-white/50 text-xs">Beste Serie</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD SCREEN
  if (screen === 'dashboard') {
    const todayStats = getTodayStats();
    const frequentMistakes = getFrequentMistakes();
    const earnedBadges = getEarnedBadges();

    return (
      <div className="fixed inset-0 bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col z-50 p-4 overflow-auto">
        <div className="max-w-md mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setScreen('game')}
              className="text-white text-2xl"
            >
              ←
            </button>
            <h2 className="text-xl font-bold text-white">📊 Papa Dashboard</h2>
            <div className="w-8" />
          </div>

          {/* Today Stats */}
          <div className="bg-white/10 rounded-2xl p-4 mb-4">
            <h3 className="text-white/70 text-sm mb-2">Heute</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-green-400">{todayStats.correct}</div>
                <div className="text-white/50 text-xs">Richtig</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{todayStats.wrong}</div>
                <div className="text-white/50 text-xs">Falsch</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">{todayStats.accuracy}%</div>
                <div className="text-white/50 text-xs">Genauigkeit</div>
              </div>
            </div>
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-yellow-500/20 rounded-xl p-3">
              <div className="text-2xl font-bold text-yellow-400">{stats.totalScore}</div>
              <div className="text-white/50 text-xs">Gesamtpunkte</div>
            </div>
            <div className="bg-purple-500/20 rounded-xl p-3">
              <div className="text-2xl font-bold text-purple-400">{stats.bestStreak}</div>
              <div className="text-white/50 text-xs">Beste Streak</div>
            </div>
            <div className="bg-green-500/20 rounded-xl p-3">
              <div className="text-2xl font-bold text-green-400">{stats.totalCorrect}</div>
              <div className="text-white/50 text-xs">Gesamt Richtig</div>
            </div>
            <div className="bg-red-500/20 rounded-xl p-3">
              <div className="text-2xl font-bold text-red-400">{stats.totalWrong}</div>
              <div className="text-white/50 text-xs">Gesamt Falsch</div>
            </div>
          </div>

          {/* Badges */}
          <div className="bg-white/10 rounded-2xl p-4 mb-4">
            <h3 className="text-white/70 text-sm mb-2">Abzeichen</h3>
            <div className="flex flex-wrap gap-2">
              {BADGES.map(badge => {
                const earned = earnedBadges.find(b => b.id === badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                      earned ? 'bg-yellow-500/30 text-yellow-300' : 'bg-white/5 text-white/30'
                    }`}
                  >
                    <span>{badge.emoji}</span>
                    <span>{badge.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Frequent Mistakes */}
          {frequentMistakes.length > 0 && (
            <div className="bg-white/10 rounded-2xl p-4 mb-4">
              <h3 className="text-white/70 text-sm mb-2">Häufige Fehler</h3>
              <div className="space-y-1">
                {frequentMistakes.map(([task, count]) => (
                  <div key={task} className="flex justify-between text-sm">
                    <span className="text-white/80">{task}</span>
                    <span className="text-red-400">{count}x falsch</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent History */}
          <div className="bg-white/10 rounded-2xl p-4 mb-4">
            <h3 className="text-white/70 text-sm mb-2">Letzte 20 Aufgaben</h3>
            <div className="max-h-48 overflow-auto space-y-1">
              {attempts.slice(0, 20).map(a => (
                <div key={a.id} className="flex justify-between text-xs">
                  <span className="text-white/60">
                    {a.a} {a.operation} {a.b} = {a.userAnswer}
                  </span>
                  <span className={a.isCorrect ? 'text-green-400' : 'text-red-400'}>
                    {a.isCorrect ? '✓' : `✗ (${a.correctAnswer})`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setScreen('settings')}
            className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl mb-4"
          >
            ⚙️ Einstellungen
          </button>

          {/* Reset Button */}
          <button
            onClick={() => {
              if (confirm('Alle Daten zurücksetzen?')) {
                setAttempts([]);
                setStats(getDefaultStats());
                setScore(0);
                setStreak(0);
              }
            }}
            className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 rounded-xl text-sm"
          >
            Daten zurücksetzen
          </button>
        </div>
      </div>
    );
  }

  // SETTINGS SCREEN
  if (screen === 'settings') {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col z-50 p-4">
        <div className="max-w-md mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setScreen('dashboard')}
              className="text-white text-2xl"
            >
              ←
            </button>
            <h2 className="text-xl font-bold text-white">⚙️ Einstellungen</h2>
            <div className="w-8" />
          </div>

          {/* Operations */}
          <div className="bg-white/10 rounded-2xl p-4 mb-4">
            <h3 className="text-white/70 text-sm mb-3">Rechenarten</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-white">➕ Addition</span>
                <input
                  type="checkbox"
                  checked={settings.enableAddition}
                  onChange={(e) => updateSetting('enableAddition', e.target.checked)}
                  className="w-6 h-6 rounded"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-white">➖ Subtraktion</span>
                <input
                  type="checkbox"
                  checked={settings.enableSubtraction}
                  onChange={(e) => updateSetting('enableSubtraction', e.target.checked)}
                  className="w-6 h-6 rounded"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-white">✖️ Multiplikation</span>
                <input
                  type="checkbox"
                  checked={settings.enableMultiplication}
                  onChange={(e) => updateSetting('enableMultiplication', e.target.checked)}
                  className="w-6 h-6 rounded"
                />
              </label>
            </div>
          </div>

          {/* Max Result */}
          <div className="bg-white/10 rounded-2xl p-4 mb-4">
            <h3 className="text-white/70 text-sm mb-3">Maximales Ergebnis</h3>
            <div className="flex gap-2">
              {[10, 15, 20, 30].map(num => (
                <button
                  key={num}
                  onClick={() => updateSetting('maxResult', num)}
                  className={`flex-1 py-2 rounded-lg font-bold ${
                    settings.maxResult === num
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Input Mode */}
          <div className="bg-white/10 rounded-2xl p-4 mb-4">
            <h3 className="text-white/70 text-sm mb-3">Eingabemodus</h3>
            <div className="flex gap-2">
              <button
                onClick={() => updateSetting('inputMode', 'numpad')}
                className={`flex-1 py-3 rounded-lg font-bold ${
                  settings.inputMode === 'numpad'
                    ? 'bg-green-500 text-white'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                🔢 Ziffern
              </button>
              <button
                onClick={() => updateSetting('inputMode', 'choice')}
                className={`flex-1 py-3 rounded-lg font-bold ${
                  settings.inputMode === 'choice'
                    ? 'bg-green-500 text-white'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                🎯 Auswahl
              </button>
            </div>
          </div>

          {/* Sound */}
          <div className="bg-white/10 rounded-2xl p-4 mb-4">
            <label className="flex items-center justify-between">
              <span className="text-white">🔊 Sound</span>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => updateSetting('soundEnabled', e.target.checked)}
                className="w-6 h-6 rounded"
              />
            </label>
          </div>

          {/* Read Aloud Toggle */}
          <div className="bg-white/10 rounded-2xl p-4 mb-4">
            <label className="flex items-center justify-between">
              <span className="text-white">🔈 Vorlesen</span>
              <button
                onClick={() => updateSetting('readAloudEnabled', !settings.readAloudEnabled)}
                className={`w-14 h-8 rounded-full transition-colors duration-200 ${
                  settings.readAloudEnabled ? 'bg-green-500' : 'bg-gray-500'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                    settings.readAloudEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
            <p className="text-white/50 text-xs mt-2">
              Liest Erklärungen bei falschen Antworten vor
            </p>
          </div>

          {/* Mobile Display Toggle */}
          <div className="bg-white/10 rounded-2xl p-4 mb-4">
            <label className="flex items-center justify-between">
              <span className="text-white">📱 Mobile Ansicht</span>
              <button
                onClick={() => updateSetting('mobileDisplay', !settings.mobileDisplay)}
                className={`w-14 h-8 rounded-full transition-colors duration-200 ${
                  settings.mobileDisplay ? 'bg-green-500' : 'bg-gray-500'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                    settings.mobileDisplay ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
            <p className="text-white/50 text-xs mt-2">
              Optimiert das Layout für kleinere Bildschirme
            </p>
          </div>

          {/* Back Button */}
          <button
            onClick={() => setScreen('game')}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl"
          >
            Zurück zum Spiel
          </button>
        </div>
      </div>
    );
  }

  // GAME SCREEN
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-indigo-500 to-purple-700 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => setScreen('setup')}
          className="bg-white/20 hover:bg-white/30 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl"
          title="Zurück zur Auswahl"
        >
          ←
        </button>

        <div className="flex items-center gap-4">
          {/* Score */}
          <div className="bg-yellow-400 px-4 py-1 rounded-full font-bold text-yellow-900">
            ⭐ {score}
          </div>

          {/* Streak */}
          {streak > 0 && (
            <div className="bg-orange-400 px-3 py-1 rounded-full font-bold text-orange-900 animate-pulse">
              🔥 {streak}
            </div>
          )}
        </div>

        {/* Dashboard Button (Long Press) */}
        <div className="relative">
          <button
            onMouseDown={() => setDashboardPressStart(Date.now())}
            onMouseUp={() => setDashboardPressStart(null)}
            onMouseLeave={() => setDashboardPressStart(null)}
            onTouchStart={() => setDashboardPressStart(Date.now())}
            onTouchEnd={() => setDashboardPressStart(null)}
            className="bg-white/20 hover:bg-white/30 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl relative overflow-hidden"
          >
            📊
            {dashboardProgress > 0 && (
              <div
                className="absolute inset-0 bg-white/30"
                style={{
                  clipPath: `inset(${100 - dashboardProgress}% 0 0 0)`,
                  transition: 'clip-path 50ms linear'
                }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {task && (
          <>
            {/* Task Display */}
            <div className={`text-center mb-8 transition-all duration-200 ${
              feedback?.type === 'correct' ? 'scale-110' : ''
            }`}>
              <div className={`font-bold text-white mb-4 drop-shadow-lg ${
                isMobileDisplay ? 'text-5xl' : 'text-6xl md:text-8xl'
              }`}>
                {task.a} {task.operation} {task.b}
              </div>
              <div className={`font-bold text-white/90 ${
                isMobileDisplay ? 'text-4xl' : 'text-5xl md:text-7xl'
              }`}>
                = {feedback ? feedback.answer : '?'}
              </div>
            </div>

            {/* Feedback Animation */}
            {feedback && (
              <div className="text-center mb-4">
                <div className={`text-6xl mb-2 animate-bounce`}>
                  {feedback.type === 'correct' ? '⭐' : '😅'}
                </div>
                {/* Erklärung bei falscher Antwort */}
                {feedback.type === 'wrong' && feedback.explanation && (
                  <div className={`bg-white/95 rounded-2xl p-4 mx-4 shadow-lg ${
                    isMobileDisplay ? 'text-sm' : 'text-base'
                  }`}>
                    <p className="text-indigo-800 font-medium leading-relaxed mb-3">
                      {feedback.explanation}
                    </p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakText(feedback.explanation, true);
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-full text-sm inline-flex items-center gap-2"
                      >
                        🎤 Vorlesen
                      </button>
                      <button
                        onClick={continueToNextTask}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-6 rounded-full text-sm inline-block"
                      >
                        Weiter →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input Area */}
            {!feedback && (
              settings.inputMode === 'choice' ? (
                // Multiple Choice
                <div className={`grid grid-cols-2 gap-3 w-full ${
                  isMobileDisplay ? 'max-w-[280px] gap-2' : 'max-w-xs'
                }`}>
                  {choices.map((choice, i) => (
                    <button
                      key={i}
                      onClick={() => handleAnswer(choice)}
                      className={`bg-white hover:bg-yellow-100 text-indigo-700 font-bold rounded-2xl shadow-lg transform hover:scale-105 transition-all ${
                        isMobileDisplay ? 'text-2xl py-4' : 'text-3xl py-6'
                      }`}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              ) : (
                // Numpad
                <div className={`w-full ${isMobileDisplay ? 'max-w-[260px]' : 'max-w-xs'}`}>
                  {/* Display */}
                  <div className={`bg-white/20 rounded-xl mb-3 text-center ${
                    isMobileDisplay ? 'p-3' : 'p-4'
                  }`}>
                    <span className={`font-bold text-white ${
                      isMobileDisplay ? 'text-3xl' : 'text-4xl'
                    }`}>
                      {userInput || '...'}
                    </span>
                  </div>

                  {/* Number Pad */}
                  <div className={`grid grid-cols-3 ${isMobileDisplay ? 'gap-1.5' : 'gap-2'}`}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <button
                        key={num}
                        onClick={() => handleNumpadPress(num)}
                        className={`bg-white hover:bg-yellow-100 text-indigo-700 font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all ${
                          isMobileDisplay ? 'text-xl py-3' : 'text-2xl py-4'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      onClick={() => handleNumpadPress('clear')}
                      className={`bg-red-400 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg ${
                        isMobileDisplay ? 'text-lg py-3' : 'text-xl py-4'
                      }`}
                    >
                      ✕
                    </button>
                    <button
                      onClick={() => handleNumpadPress(0)}
                      className={`bg-white hover:bg-yellow-100 text-indigo-700 font-bold rounded-xl shadow-lg ${
                        isMobileDisplay ? 'text-xl py-3' : 'text-2xl py-4'
                      }`}
                    >
                      0
                    </button>
                    <button
                      onClick={() => handleNumpadPress('enter')}
                      className={`bg-green-400 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg ${
                        isMobileDisplay ? 'text-lg py-3' : 'text-xl py-4'
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* Earned Badges Display */}
      {getEarnedBadges().length > 0 && (
        <div className="p-4 flex justify-center gap-2">
          {getEarnedBadges().slice(0, 5).map(badge => (
            <span key={badge.id} className="text-2xl" title={badge.name}>
              {badge.emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default MathHero;
