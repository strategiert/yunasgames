import React, { useState, useRef } from 'react';
import { DIFFICULTY } from './TicTacToe';

const GameSelect = ({ onSelectGame, onClose }) => {
  const [selectedGame, setSelectedGame] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const cardRef = useRef(null);

  const games = [
    {
      id: 'candy',
      name: 'Candy Match',
      emoji: '🍬',
      description: 'Verbinde 3 oder mehr gleiche Süßigkeiten!',
      color: 'from-pink-400 to-purple-500',
      hasDifficulty: false,
    },
    {
      id: 'tictactoe',
      name: 'Tic Tac Toe',
      emoji: '⭕',
      description: 'Spiele gegen die KI und setze 3 in einer Reihe!',
      color: 'from-indigo-400 to-blue-500',
      hasDifficulty: true,
    },
    {
      id: 'shapefall',
      name: 'Shape Fall',
      emoji: '🔷',
      description: 'Fange fallende Formen mit dem richtigen Modus!',
      color: 'from-cyan-400 to-fuchsia-500',
      hasDifficulty: false,
    },
    {
      id: 'reactiontime',
      name: 'Reaktionstest',
      emoji: '⚡',
      description: 'Teste deine Reflexe - wie schnell bist du?',
      color: 'from-orange-400 to-red-500',
      hasDifficulty: false,
    },
    {
      id: 'sequence',
      name: 'Sequenz-Gedächtnis',
      emoji: '🧠',
      description: 'Merke dir die Reihenfolge der Felder!',
      color: 'from-indigo-400 to-purple-500',
      hasDifficulty: false,
    },
    {
      id: 'aimtrainer',
      name: 'Aim Trainer',
      emoji: '🎯',
      description: 'Triff das Futter so schnell wie möglich!',
      color: 'from-green-400 to-emerald-600',
      hasDifficulty: false,
    },
    {
      id: 'visualmemory',
      name: 'Visual Memory',
      emoji: '👁️',
      description: 'Merke dir die Position der Felder!',
      color: 'from-indigo-400 to-purple-600',
      hasDifficulty: false,
    },
    {
      id: 'numbermemory',
      name: 'Number Memory',
      emoji: '🔢',
      description: 'Merke dir immer längere Zahlen!',
      color: 'from-amber-500 to-orange-600',
      hasDifficulty: false,
    },
    {
      id: 'rhythmpaws',
      name: 'Rhythm Paws',
      emoji: '🎵',
      description: 'Triff die Noten im Rhythmus!',
      color: 'from-pink-400 to-purple-600',
      hasDifficulty: false,
    },
    {
      id: 'mathhero',
      name: 'Math Hero',
      emoji: '🧮',
      description: 'Löse Matheaufgaben und werde zum Rechen-Held!',
      color: 'from-indigo-400 to-purple-600',
      hasDifficulty: false,
    },
    {
      id: 'game2048',
      name: '2048',
      emoji: '🔢',
      description: 'Kombiniere Zahlen bis zur 2048!',
      color: 'from-yellow-400 to-orange-500',
      hasDifficulty: false,
    },
    {
      id: 'jigsaw',
      name: 'Jigsaw Fantasy',
      emoji: '🧩',
      description: 'Erstelle Puzzles aus Fotos oder KI-Bildern!',
      color: 'from-pink-400 to-rose-600',
      hasDifficulty: false,
    },
    {
      id: 'magicpainter',
      name: 'Zauber-Maler',
      emoji: '🎨',
      description: 'Male etwas und die KI zaubert 3 Bilder daraus!',
      color: 'from-violet-400 to-fuchsia-500',
      hasDifficulty: false,
    },
    {
      id: 'musicbox',
      name: 'Musikbox',
      emoji: '🎶',
      description: 'Mach deine Lieblingsmusik an!',
      color: 'from-emerald-400 to-teal-600',
      hasDifficulty: false,
    },
  ];

  const difficulties = [
    {
      id: DIFFICULTY.EASY,
      name: 'Leicht',
      emoji: '🟢',
      description: 'Für Anfänger - KI macht viele Fehler',
      reward: '5 Münzen',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      id: DIFFICULTY.MEDIUM,
      name: 'Mittel',
      emoji: '🟡',
      description: 'Ausgewogen - KI spielt strategisch',
      reward: '10 Münzen',
      color: 'bg-yellow-500 hover:bg-yellow-600',
    },
    {
      id: DIFFICULTY.HARD,
      name: 'Schwer',
      emoji: '🔴',
      description: 'Für Profis - KI spielt perfekt!',
      reward: '15 Münzen',
      color: 'bg-red-500 hover:bg-red-600',
    },
  ];

  const handleGameSelect = (game) => {
    if (game.hasDifficulty) {
      setSelectedGame(game);
    } else {
      onSelectGame(game.id);
    }
  };

  const handleDifficultySelect = (diff) => {
    onSelectGame(selectedGame.id, diff.id);
  };

  const handleBack = () => {
    setSelectedGame(null);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % games.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + games.length) % games.length);
  };

  const goToIndex = (index) => {
    setCurrentIndex(index);
  };

  // Swipe-Handling
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrev();
    }
  };

  // Klick auf Hintergrund schließt das Menü
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Aktuelles Spiel
  const currentGame = games[currentIndex];

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gradient-to-b from-teal-400 to-cyan-500 rounded-3xl p-5 max-w-sm w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          {selectedGame ? (
            <button
              onClick={handleBack}
              className="text-white text-2xl hover:scale-110 transition-transform"
            >
              ←
            </button>
          ) : (
            <div className="w-8" />
          )}

          <h2 className="text-2xl font-bold text-white drop-shadow-lg text-center">
            {selectedGame ? `${selectedGame.emoji} ${selectedGame.name}` : '🎮 Spiel wählen'}
          </h2>

          <button
            onClick={onClose}
            className="text-white text-2xl hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>

        {/* Spielauswahl oder Schwierigkeitswahl */}
        {!selectedGame ? (
          // Karussell-Spielauswahl
          <div className="relative">
            {/* Karussell-Container mit Swipe */}
            <div
              className="relative overflow-hidden rounded-2xl touch-pan-y"
              ref={cardRef}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {/* Aktuelle Spielkarte */}
              <div
                onClick={() => handleGameSelect(currentGame)}
                className={`bg-gradient-to-br ${currentGame.color} p-6 rounded-2xl shadow-lg
                           cursor-pointer transition-all duration-300 hover:scale-[1.02]
                           min-h-[220px] flex flex-col items-center justify-center text-center
                           select-none`}
              >
                <div className="text-7xl mb-4">{currentGame.emoji}</div>
                <div className="text-2xl font-bold text-white mb-2">{currentGame.name}</div>
                <div className="text-white/80 text-sm mb-4 px-4">{currentGame.description}</div>
                <div className="bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-6 rounded-full
                              transition-colors inline-flex items-center gap-2">
                  Spielen ▶
                </div>
              </div>
            </div>

            {/* Punkte-Navigation */}
            <div className="flex justify-center gap-2 mt-4">
              {games.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToIndex(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${index === currentIndex
                    ? 'bg-white scale-125'
                    : 'bg-white/40 hover:bg-white/60'
                    }`}
                />
              ))}
            </div>

            {/* Spielzähler */}
            <div className="text-center text-white/70 text-sm mt-2">
              {currentIndex + 1} / {games.length}
            </div>
          </div>
        ) : (
          // Schwierigkeitswahl
          <div className="space-y-3">
            <p className="text-white/90 text-center mb-4">
              Wähle einen Schwierigkeitsgrad:
            </p>

            {difficulties.map((diff) => (
              <button
                key={diff.id}
                onClick={() => handleDifficultySelect(diff)}
                className={`w-full ${diff.color} p-4 rounded-2xl shadow-lg
                           transform hover:scale-105 transition-all duration-200
                           text-left flex items-center gap-4`}
              >
                <div className="text-3xl">{diff.emoji}</div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-white">{diff.name}</div>
                  <div className="text-white/80 text-sm">{diff.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">🏆 {diff.reward}</div>
                </div>
              </button>
            ))}

            <div className="text-center text-white/60 text-xs mt-4">
              Je schwerer, desto mehr Münzen bei Sieg!
            </div>
          </div>
        )}

        {/* Hinweis zum Schließen */}
        <p className="text-center text-white/50 text-xs mt-4">
          Tippe außerhalb zum Schließen
        </p>
      </div>
    </div>
  );
};

export default GameSelect;
