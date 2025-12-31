import React, { useState, useEffect } from 'react';
import MiniGame from './MiniGame';
import TicTacToe from './TicTacToe';
import ShapeFall from './ShapeFall';
import ReactionTime from './ReactionTime';
import SequenceMemory from './SequenceMemory';
import AimTrainer from './AimTrainer';
import VisualMemory from './VisualMemory';
import NumberMemory from './NumberMemory';
import RhythmPaws from './RhythmPaws';
import MathHero from './MathHero';
import GameSelect from './GameSelect';

// Import dog images
import dogIdleA from './assets/dog_idle_A.jpeg';
import dogIdleB from './assets/dog_idle_B.jpeg';
import dogHappyA from './assets/dog_happy_A.jpeg';
import dogHappyB from './assets/dog_happy_B.jpeg';
import dogSadA from './assets/dog_sad_A.jpeg';
import dogSadB from './assets/dog_sad_B.jpeg';
import dogEatA from './assets/dog_eat_A.jpeg';
import dogEatB from './assets/dog_eat_B.jpeg';
import dogDrinkA from './assets/dog_drink_A.jpeg';
import dogDrinkB from './assets/dog_drink_B.jpeg';
import dogSleepA from './assets/dog_sleep_A.jpeg';
import dogPlayA from './assets/dog_play_A.jpeg';
import dogToiletA from './assets/dog_toilet_A.jpeg';
import dogToiletB from './assets/dog_toilet_B.jpeg';
import dogCleanA from './assets/dog_clean_A.jpeg';
import mainroomBg from './assets/mainroom_default.png';
import bathroomBg from './assets/bathroom_default.png';
import playroomBg from './assets/playroom_default.png';

const PetGame = () => {
  // Game states
  const [screen, setScreen] = useState('start');
  const [petType, setPetType] = useState(null);
  const [petName, setPetName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [coins, setCoins] = useState(20);
  const [collarColor, setCollarColor] = useState('#FF6B6B');
  const [hasBell, setHasBell] = useState(false);
  const [mobileDisplay, setMobileDisplay] = useState(() => {
    const saved = localStorage.getItem('mobileDisplay');
    return saved ? JSON.parse(saved) : false;
  });

  // Pet needs (0-100)
  const [hunger, setHunger] = useState(80);
  const [sleep, setSleep] = useState(80);
  const [fun, setFun] = useState(80);
  const [toilet, setToilet] = useState(80);

  // Pet state
  const [isSleeping, setIsSleeping] = useState(false);
  const [needsClean, setNeedsClean] = useState(false);
  const [mood, setMood] = useState('idle'); // idle, happy, sad, sleeping, eating, drinking, playing, toilet, clean
  const [currentRoom, setCurrentRoom] = useState('main'); // main, bathroom, playroom
  const [showGameSelect, setShowGameSelect] = useState(false);
  const [currentGame, setCurrentGame] = useState(null); // 'candy', 'tictactoe'
  const [gameDifficulty, setGameDifficulty] = useState(null);

  // Animation frame toggle
  const [animFrame, setAnimFrame] = useState(false);

  // Furniture owned
  const [furniture, setFurniture] = useState({
    bed: false,
    carpet: false,
    poster: false,
    plant: false,
    bowl: true,
    toilet: true
  });

  // Animation timer - toggle between A and B frames
  useEffect(() => {
    const animInterval = setInterval(() => {
      setAnimFrame(f => !f);
    }, 500);
    return () => clearInterval(animInterval);
  }, []);

  // Decrease needs over time
  useEffect(() => {
    if (screen !== 'main' || isSleeping) return;

    const interval = setInterval(() => {
      setHunger(h => Math.max(0, h - 2));
      setSleep(s => Math.max(0, s - 1));
      setFun(f => Math.max(0, f - 2));
      setToilet(t => Math.max(0, t - 3));
    }, 3000);

    return () => clearInterval(interval);
  }, [screen, isSleeping]);

  // Update mood based on needs
  useEffect(() => {
    if (isSleeping) {
      setMood('sleeping');
    } else if (needsClean) {
      setMood('clean');
    } else if (hunger < 30 || sleep < 30 || fun < 30 || toilet < 30) {
      setMood('sad');
    } else if (hunger > 70 && sleep > 70 && fun > 70 && toilet > 70) {
      setMood('happy');
    } else {
      setMood('idle');
    }
  }, [hunger, sleep, fun, toilet, isSleeping, needsClean]);

  // Get current pet image based on mood and animation frame
  const getPetImage = () => {
    const images = {
      idle: [dogIdleA, dogIdleB],
      happy: [dogHappyA, dogHappyB],
      sad: [dogSadA, dogSadB],
      sleeping: [dogSleepA, dogSleepA],
      eating: [dogEatA, dogEatB],
      drinking: [dogDrinkA, dogDrinkB],
      playing: [dogPlayA, dogHappyA],
      toilet: [dogToiletA, dogToiletB],
      clean: [dogCleanA, dogCleanA]
    };

    const frames = images[mood] || images.idle;
    return animFrame ? frames[1] : frames[0];
  };

  // Pet emoji for selection screen (still use emoji there)
  const getPetEmoji = () => {
    const pets = { cat: '🐱', dog: '🐶', rabbit: '🐰', panda: '🐼' };
    return pets[petType] || '🐾';
  };

  // Action handlers
  const feed = () => {
    if (coins >= 1) {
      setCoins(c => c - 1);
      setHunger(h => Math.min(100, h + 25));
      setMood('eating');
      setTimeout(() => setMood('happy'), 2000);
    }
  };

  const giveDrink = () => {
    if (coins >= 2) {
      setCoins(c => c - 2);
      setHunger(h => Math.min(100, h + 15));
      setFun(f => Math.min(100, f + 10));
      setMood('drinking');
      setTimeout(() => setMood('happy'), 2000);
    }
  };

  const goSleep = () => {
    setIsSleeping(true);
    setMood('sleeping');
    setTimeout(() => {
      setSleep(100);
      setIsSleeping(false);
      setMood('happy');
    }, 3000);
  };

  const useToilet = () => {
    setCurrentRoom('bathroom');
    setMood('toilet');
    setTimeout(() => {
      setToilet(100);
      setNeedsClean(true);
      setMood('clean');
    }, 1500);
  };

  const clean = () => {
    setNeedsClean(false);
    setCoins(c => c + 2);
    setMood('happy');
    setCurrentRoom('main');
  };

  const play = () => {
    setShowGameSelect(true);
  };

  const handleGameSelect = (gameId, difficulty = null) => {
    setShowGameSelect(false);
    setCurrentRoom('playroom');
    setMood('playing');
    setCurrentGame(gameId);
    setGameDifficulty(difficulty);
  };

  const handleGameEnd = (earnedCoins) => {
    setCurrentGame(null);
    setGameDifficulty(null);
    setFun(f => Math.min(100, f + 30));
    setCoins(c => c + earnedCoins);
    setMood('happy');
    setCurrentRoom('main');
  };

  const handleGameSelectClose = () => {
    setShowGameSelect(false);
  };

  const buyFurniture = (item, price) => {
    if (coins >= price && !furniture[item]) {
      setCoins(c => c - price);
      setFurniture(f => ({ ...f, [item]: true }));
    }
  };

  // Toggle mobile display
  const toggleMobileDisplay = () => {
    const newValue = !mobileDisplay;
    setMobileDisplay(newValue);
    localStorage.setItem('mobileDisplay', JSON.stringify(newValue));
  };

  // Status bar component
  const StatusBar = ({ label, value, color, icon, compact }) => (
    <div className={`flex items-center gap-2 ${compact ? 'mb-1' : 'mb-2'}`}>
      <span className={compact ? 'text-sm' : 'text-lg'}>{icon}</span>
      <div className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${compact ? 'h-3' : 'h-4'}`}>
        <div
          className="h-full transition-all duration-500 rounded-full"
          style={{
            width: `${value}%`,
            backgroundColor: value < 30 ? '#EF4444' : color
          }}
        />
      </div>
      <span className={`${compact ? 'text-[10px] w-7' : 'text-xs w-8'}`}>{value}%</span>
    </div>
  );

  // Collar colors
  const collarColors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#DDA0DD'];

  // Render pet with real images
  const renderPet = () => {
    return (
      <div className="relative flex flex-col items-center">
        {/* Pet Image */}
        <div className="relative">
          <img
            src={getPetImage()}
            alt={petName}
            className={`object-contain transition-transform duration-300 ${
              mobileDisplay ? 'w-28 h-28' : 'w-48 h-48'
            }`}
            style={{
              transform: mood === 'playing' ? 'scale(1.1) rotate(5deg)' : 'scale(1)',
              filter: isSleeping ? 'brightness(0.7)' : 'none'
            }}
          />
          {/* Sleeping Zzz */}
          {isSleeping && (
            <div className={`absolute -top-2 -right-2 animate-bounce ${mobileDisplay ? 'text-2xl' : 'text-3xl'}`}>
              💤
            </div>
          )}
        </div>
        {/* Name */}
        <div className={`font-bold bg-white/80 px-3 py-1 rounded-full ${
          mobileDisplay ? 'text-sm mt-1' : 'text-lg mt-2'
        }`}>
          {petName}
        </div>
      </div>
    );
  };

  // START SCREEN
  if (screen === 'start') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold text-pink-600 mb-2">Mein Tier</h1>
        <p className="text-gray-600 mb-8">Yunas Haustier-Spiel</p>
        <div className="mb-8">
          <img
            src={dogIdleA}
            alt="Hund"
            className="w-32 h-32 object-contain animate-bounce"
          />
        </div>
        <button
          onClick={() => setScreen('choosePet')}
          className="bg-pink-500 hover:bg-pink-600 text-white text-xl font-bold py-4 px-8 rounded-full shadow-lg transform hover:scale-105 transition-all"
        >
          Spielen!
        </button>
      </div>
    );
  }

  // CHOOSE PET SCREEN
  if (screen === 'choosePet') {
    const pets = [
      { type: 'dog', image: dogHappyA, name: 'Hund' }
    ];

    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-200 to-pink-200 flex flex-col items-center p-4 pt-8">
        <h2 className="text-2xl font-bold text-purple-700 mb-6">Wähle dein Tier!</h2>

        <div className="flex gap-4 mb-8">
          {pets.map(pet => (
            <button
              key={pet.type}
              onClick={() => setPetType(pet.type)}
              className={`p-4 rounded-2xl transition-all ${
                petType === pet.type
                  ? 'bg-white shadow-lg scale-110 ring-4 ring-pink-400'
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            >
              <img
                src={pet.image}
                alt={pet.name}
                className="w-24 h-24 object-contain mb-2"
              />
              <div className="text-sm font-medium">{pet.name}</div>
            </button>
          ))}
        </div>

        {petType && (
          <div className="w-full max-w-xs">
            <label className="block text-purple-700 font-medium mb-2">
              Wie soll dein Hündchen heißen?
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Name eingeben..."
              className="w-full p-3 rounded-xl border-2 border-purple-300 focus:border-pink-400 outline-none text-center text-lg"
              maxLength={12}
            />
          </div>
        )}

        {petType && nameInput.length > 0 && (
          <button
            onClick={() => {
              setPetName(nameInput);
              setScreen('main');
            }}
            className="mt-6 bg-green-500 hover:bg-green-600 text-white text-lg font-bold py-3 px-8 rounded-full shadow-lg"
          >
            Los geht's!
          </button>
        )}
      </div>
    );
  }

  // COLLAR SCREEN
  if (screen === 'collar') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-orange-100 p-4">
        <button onClick={() => setScreen('main')} className="text-2xl mb-4">← Zurück</button>
        <h2 className="text-2xl font-bold text-center text-orange-700 mb-6">Halsband-Shop</h2>

        <div className="flex justify-center mb-8">
          {renderPet()}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-lg max-w-sm mx-auto">
          <h3 className="font-bold mb-3">Farbe wählen:</h3>
          <div className="flex gap-3 justify-center mb-4">
            {collarColors.map(color => (
              <button
                key={color}
                onClick={() => setCollarColor(color)}
                className={`w-10 h-10 rounded-full transition-transform ${
                  collarColor === color ? 'scale-125 ring-4 ring-gray-400' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 mt-4">
            <span>Glöckchen:</span>
            <button
              onClick={() => setHasBell(!hasBell)}
              className={`px-4 py-2 rounded-full font-bold ${
                hasBell ? 'bg-yellow-400' : 'bg-gray-200'
              }`}
            >
              {hasBell ? '🔔 An' : '🔕 Aus'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SHOP SCREEN
  if (screen === 'shop') {
    const items = [
      { id: 'bed', name: 'Bett', emoji: '🛏️', price: 10 },
      { id: 'carpet', name: 'Teppich', emoji: '🟫', price: 8 },
      { id: 'poster', name: 'Poster', emoji: '🖼️', price: 5 },
      { id: 'plant', name: 'Pflanze', emoji: '🪴', price: 6 }
    ];

    return (
      <div className="min-h-screen bg-gradient-to-b from-green-100 to-teal-100 p-4">
        <button onClick={() => setScreen('main')} className="text-2xl mb-4">← Zurück</button>
        <h2 className="text-2xl font-bold text-center text-teal-700 mb-2">Möbel-Shop</h2>
        <p className="text-center text-lg mb-6">💰 {coins} Münzen</p>

        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-2xl p-4 shadow-lg text-center">
              <div className="text-4xl mb-2">{item.emoji}</div>
              <div className="font-bold">{item.name}</div>
              <div className="text-sm text-gray-500 mb-2">💰 {item.price}</div>
              {furniture[item.id] ? (
                <div className="text-green-500 font-bold">✓ Gekauft</div>
              ) : (
                <button
                  onClick={() => buyFurniture(item.id, item.price)}
                  disabled={coins < item.price}
                  className={`px-4 py-2 rounded-full font-bold ${
                    coins >= item.price
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-500'
                  }`}
                >
                  Kaufen
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // HOUSE SCREEN
  if (screen === 'house') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-100 to-orange-100 p-4">
        <button onClick={() => setScreen('main')} className="text-2xl mb-4">← Zurück</button>
        <h2 className="text-2xl font-bold text-center text-amber-700 mb-6">Dein Zimmer</h2>

        <div className="bg-amber-50 rounded-2xl p-6 shadow-lg max-w-sm mx-auto min-h-64 relative border-4 border-amber-300">
          {/* Room decoration */}
          <div className="absolute top-2 left-2 text-2xl">{furniture.poster && '🖼️'}</div>
          <div className="absolute top-2 right-2 text-2xl">{furniture.plant && '🪴'}</div>
          <div className="absolute bottom-2 left-2 text-2xl">{furniture.bed && '🛏️'}</div>
          <div className="absolute bottom-2 right-2 text-2xl">{furniture.toilet && '🚽'}</div>
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
            {furniture.carpet && <div className="text-3xl">🟫</div>}
          </div>
          <div className="absolute top-1/2 left-4 text-2xl">{furniture.bowl && '🥣'}</div>

          {/* Pet in center */}
          <div className="flex items-center justify-center h-full">
            <img
              src={dogIdleA}
              alt={petName}
              className="w-24 h-24 object-contain"
            />
          </div>
        </div>

        <p className="text-center mt-4 text-gray-600">
          Kaufe mehr Möbel im Shop!
        </p>
      </div>
    );
  }

  // MAIN GAME SCREEN
  return (
    <div className={`min-h-screen bg-gradient-to-b from-sky-200 to-green-300 ${mobileDisplay ? 'p-2' : 'p-4'}`}>
      {/* Game Selection Modal */}
      {showGameSelect && (
        <GameSelect onSelectGame={handleGameSelect} onClose={handleGameSelectClose} />
      )}

      {/* Candy Match Mini Game */}
      {currentGame === 'candy' && (
        <MiniGame onClose={() => handleGameEnd(0)} onWin={handleGameEnd} />
      )}

      {/* Tic Tac Toe Game */}
      {currentGame === 'tictactoe' && (
        <TicTacToe
          onClose={() => handleGameEnd(0)}
          onWin={handleGameEnd}
          difficulty={gameDifficulty}
        />
      )}

      {/* Shape Fall Game */}
      {currentGame === 'shapefall' && (
        <ShapeFall
          onClose={() => handleGameEnd(0)}
          onWin={handleGameEnd}
        />
      )}

      {/* Reaction Time Game */}
      {currentGame === 'reactiontime' && (
        <ReactionTime
          onClose={() => handleGameEnd(0)}
          onWin={handleGameEnd}
        />
      )}

      {/* Sequence Memory Game */}
      {currentGame === 'sequence' && (
        <SequenceMemory
          onClose={() => handleGameEnd(0)}
          onWin={handleGameEnd}
        />
      )}

      {/* Aim Trainer Game */}
      {currentGame === 'aimtrainer' && (
        <AimTrainer
          onClose={() => handleGameEnd(0)}
          onWin={handleGameEnd}
        />
      )}

      {/* Visual Memory Game */}
      {currentGame === 'visualmemory' && (
        <VisualMemory
          onClose={() => handleGameEnd(0)}
          onWin={handleGameEnd}
        />
      )}

      {/* Number Memory Game */}
      {currentGame === 'numbermemory' && (
        <NumberMemory
          onClose={() => handleGameEnd(0)}
          onWin={handleGameEnd}
        />
      )}

      {/* Rhythm Paws Game */}
      {currentGame === 'rhythmpaws' && (
        <RhythmPaws
          onClose={() => handleGameEnd(0)}
          onWin={handleGameEnd}
        />
      )}

      {/* Math Hero Game */}
      {currentGame === 'mathhero' && (
        <MathHero
          onClose={() => handleGameEnd(0)}
          onWin={handleGameEnd}
          mobileDisplay={mobileDisplay}
        />
      )}

      {/* Header */}
      <div className={`flex justify-between items-center ${mobileDisplay ? 'mb-2' : 'mb-4'}`}>
        <div className={`bg-yellow-400 rounded-full font-bold shadow ${mobileDisplay ? 'px-3 py-1 text-sm' : 'px-4 py-2'}`}>
          💰 {coins}
        </div>
        <div className={`flex ${mobileDisplay ? 'gap-1' : 'gap-2'}`}>
          <button onClick={() => setScreen('collar')} className={`bg-white/50 rounded-full ${mobileDisplay ? 'text-lg p-1.5' : 'text-2xl p-2'}`}>👔</button>
          <button onClick={() => setScreen('shop')} className={`bg-white/50 rounded-full ${mobileDisplay ? 'text-lg p-1.5' : 'text-2xl p-2'}`}>🛒</button>
          <button onClick={() => setScreen('house')} className={`bg-white/50 rounded-full ${mobileDisplay ? 'text-lg p-1.5' : 'text-2xl p-2'}`}>🏠</button>
          <button
            onClick={toggleMobileDisplay}
            className={`rounded-full transition-colors ${
              mobileDisplay ? 'bg-green-400 text-base p-1.5' : 'bg-white/50 text-xl p-2'
            }`}
            title={mobileDisplay ? 'Mobile Ansicht an' : 'Mobile Ansicht aus'}
          >
            📱
          </button>
        </div>
      </div>

      {/* Status bars */}
      <div className={`bg-white/80 rounded-2xl shadow-lg ${mobileDisplay ? 'p-2 mb-2' : 'p-4 mb-4'}`}>
        <StatusBar label="Hunger" value={hunger} color="#22C55E" icon="🍖" compact={mobileDisplay} />
        <StatusBar label="Schlaf" value={sleep} color="#3B82F6" icon="😴" compact={mobileDisplay} />
        <StatusBar label="Spaß" value={fun} color="#F59E0B" icon="⭐" compact={mobileDisplay} />
        <StatusBar label="Toilette" value={toilet} color="#8B5CF6" icon="🚽" compact={mobileDisplay} />
      </div>

      {/* Pet display area with background image */}
      <div
        className={`rounded-2xl shadow-lg relative overflow-hidden transition-all duration-500 ${
          mobileDisplay ? 'p-3 mb-2' : 'p-6 mb-4'
        }`}
        style={{
          backgroundImage: `url(${
            currentRoom === 'bathroom' ? bathroomBg :
            currentRoom === 'playroom' ? playroomBg :
            mainroomBg
          })`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: mobileDisplay ? '160px' : '250px'
        }}
      >
        {/* Sleeping overlay */}
        {isSleeping && (
          <div className="absolute inset-0 bg-indigo-900/40 rounded-2xl" />
        )}

        {/* Pet */}
        <div className="flex justify-center items-center h-full py-4">
          {renderPet()}
        </div>

        {/* Needs cleaning indicator */}
        {needsClean && (
          <button
            onClick={clean}
            className="absolute bottom-2 right-2 bg-yellow-400 px-3 py-1 rounded-full text-sm font-bold animate-pulse shadow-lg"
          >
            🧹 Sauber machen! (+2💰)
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className={`grid grid-cols-3 ${mobileDisplay ? 'gap-1.5' : 'gap-3'}`}>
        <button
          onClick={feed}
          disabled={coins < 1 || isSleeping}
          className={`bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-2xl shadow-lg flex flex-col items-center ${
            mobileDisplay ? 'p-2' : 'p-4'
          }`}
        >
          <span className={mobileDisplay ? 'text-lg' : 'text-2xl'}>🍖</span>
          <span className={`${mobileDisplay ? 'text-[10px]' : 'text-xs'} mt-1`}>Füttern</span>
          <span className={`${mobileDisplay ? 'text-[10px]' : 'text-xs'} opacity-75`}>-1💰</span>
        </button>

        <button
          onClick={giveDrink}
          disabled={coins < 2 || isSleeping}
          className={`bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-2xl shadow-lg flex flex-col items-center ${
            mobileDisplay ? 'p-2' : 'p-4'
          }`}
        >
          <span className={mobileDisplay ? 'text-lg' : 'text-2xl'}>☕</span>
          <span className={`${mobileDisplay ? 'text-[10px]' : 'text-xs'} mt-1`}>Kakao</span>
          <span className={`${mobileDisplay ? 'text-[10px]' : 'text-xs'} opacity-75`}>-2💰</span>
        </button>

        <button
          onClick={goSleep}
          disabled={isSleeping}
          className={`bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white rounded-2xl shadow-lg flex flex-col items-center ${
            mobileDisplay ? 'p-2' : 'p-4'
          }`}
        >
          <span className={mobileDisplay ? 'text-lg' : 'text-2xl'}>🛏️</span>
          <span className={`${mobileDisplay ? 'text-[10px]' : 'text-xs'} mt-1`}>Schlafen</span>
        </button>

        <button
          onClick={useToilet}
          disabled={isSleeping || needsClean}
          className={`bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-2xl shadow-lg flex flex-col items-center ${
            mobileDisplay ? 'p-2' : 'p-4'
          }`}
        >
          <span className={mobileDisplay ? 'text-lg' : 'text-2xl'}>🚽</span>
          <span className={`${mobileDisplay ? 'text-[10px]' : 'text-xs'} mt-1`}>Toilette</span>
        </button>

        <button
          onClick={play}
          disabled={isSleeping || currentGame !== null}
          className={`bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-2xl shadow-lg flex flex-col items-center col-span-2 ${
            mobileDisplay ? 'p-2' : 'p-4'
          }`}
        >
          <span className={mobileDisplay ? 'text-lg' : 'text-2xl'}>🎮</span>
          <span className={`${mobileDisplay ? 'text-[10px]' : 'text-xs'} mt-1`}>Spielen</span>
          <span className={`${mobileDisplay ? 'text-[10px]' : 'text-xs'} opacity-75`}>Minispiele</span>
        </button>
      </div>

      {/* Low needs warning */}
      {(hunger < 20 || sleep < 20 || fun < 20 || toilet < 20) && !isSleeping && (
        <div className="mt-4 bg-red-100 border-2 border-red-400 rounded-xl p-3 text-center animate-pulse">
          <span className="text-red-600 font-bold">
            ⚠️ {petName} braucht deine Hilfe!
          </span>
        </div>
      )}
    </div>
  );
};

export default PetGame;
