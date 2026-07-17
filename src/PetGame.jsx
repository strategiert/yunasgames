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
import Game2048 from './Game2048';
import JigsawGame from './JigsawGame';
import GameSelect from './GameSelect';
import MagicPainter from './MagicPainter';
import ProfileSelect from './ProfileSelect';
import Album from './Album';
import { listSessions } from './lib/galleryDb';
import {
  migrateLegacy, listProfiles, createProfile, deleteProfile, loadProfile, saveProfile,
  getActiveProfile, setActiveProfile, clearActiveProfile,
} from './lib/save';
import { levelForXp, xpForNextLevel, xpForLevel, XP, ACCESSORIES } from './lib/progression';
import { ROOM_SLOTS, ITEMS, itemById, legacyFurnitureToItems } from './lib/items';
import { questsForDate, freshQuestState, dateKey, yesterdayKey } from './lib/quests';

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

// PetWorld = die Spielwelt EINES Profils. Remount per key beim Profilwechsel,
// dadurch laufen alle useState-Initializer frisch mit dem neuen Spielstand.
const PetWorld = ({ profileId, initial, onSwitchProfile }) => {
  // Game states
  const [screen, setScreen] = useState(initial.petName ? 'main' : 'choosePet');
  const [petType, setPetType] = useState(initial.petType);
  const [petName, setPetName] = useState(initial.petName);
  const [nameInput, setNameInput] = useState('');
  const [coins, setCoins] = useState(initial.coins);
  const [collarColor, setCollarColor] = useState(initial.collarColor);
  const [hasBell, setHasBell] = useState(initial.hasBell);
  const [mobileDisplay, setMobileDisplay] = useState(() => {
    const saved = localStorage.getItem('mobileDisplay');
    return saved ? JSON.parse(saved) : false;
  });

  // Pet needs (0-100)
  const [hunger, setHunger] = useState(initial.hunger);
  const [sleep, setSleep] = useState(initial.sleep);
  const [fun, setFun] = useState(initial.fun);
  const [toilet, setToilet] = useState(initial.toilet);

  // Pet state
  const [isSleeping, setIsSleeping] = useState(false);
  const [needsClean, setNeedsClean] = useState(initial.needsClean);
  const [mood, setMood] = useState('idle'); // idle, happy, sad, sleeping, eating, drinking, playing, toilet, clean
  const [currentRoom, setCurrentRoom] = useState('main'); // main, bathroom, playroom
  const [showGameSelect, setShowGameSelect] = useState(false);
  const [currentGame, setCurrentGame] = useState(null); // 'candy', 'tictactoe'
  const [gameDifficulty, setGameDifficulty] = useState(null);

  // Animation frame toggle
  const [animFrame, setAnimFrame] = useState(false);

  // Deko: gekaufte Items + Slot-Belegung. Alt-Möbel werden beim ersten Laden übernommen.
  const [ownedItems, setOwnedItems] = useState(() =>
    initial.ownedItems.length > 0 ? initial.ownedItems : legacyFurnitureToItems(initial.furniture)
  );
  const [decor, setDecor] = useState(initial.decor);
  const [editRoom, setEditRoom] = useState(false);
  const [slotPicker, setSlotPicker] = useState(null); // Slot-ID oder null

  // Fortschritt
  const [xp, setXp] = useState(initial.xp);
  const [accessory, setAccessory] = useState(initial.accessory);
  const [levelUp, setLevelUp] = useState(null); // frisch erreichtes Level fürs Overlay
  const level = levelForXp(xp);

  const addXp = (amount) => {
    setXp((prev) => {
      const next = prev + amount;
      const before = levelForXp(prev);
      const after = levelForXp(next);
      if (after > before) setLevelUp(after);
      return next;
    });
  };

  // Tages-Quests + Lebenszeit-Statistik (fürs Album)
  const [quests, setQuests] = useState(() =>
    initial.quests?.date === dateKey() ? initial.quests : freshQuestState()
  );
  const [stats, setStats] = useState(initial.stats);
  const [showQuests, setShowQuests] = useState(false);

  // Poster (Zauber-Maler-Bild an der Wand rechts) + Album
  const [posters, setPosters] = useState(initial.posters);
  const [posterUrl, setPosterUrl] = useState(null);
  const [showAlbum, setShowAlbum] = useState(false);

  useEffect(() => {
    let url = null;
    let cancelled = false;
    (async () => {
      const p = posters.wandRechts;
      if (!p) {
        setPosterUrl(null);
        return;
      }
      const sessions = await listSessions();
      const s = sessions.find((x) => x.id === p.sessionId);
      const blob = s?.results?.[p.styleKey] || s?.drawing;
      if (blob && !cancelled) {
        url = URL.createObjectURL(blob);
        setPosterUrl(url);
      } else if (!cancelled) {
        setPosterUrl(null);
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [posters]);

  const STAT_KEY = {
    feed: 'feeds', drink: 'drinks', sleep: 'sleeps', clean: 'cleans',
    game: 'games', win: 'wins', earn: 'coinsEarned', draw: 'drawings',
  };

  const trackEvent = (event, amount = 1) => {
    setStats((prev) => ({ ...prev, [STAT_KEY[event]]: (prev[STAT_KEY[event]] || 0) + amount }));
    setQuests((prev) => {
      const progress = { ...prev.progress };
      let changed = false;
      questsForDate(prev.date).forEach((q) => {
        if (q.event === event && !prev.claimed[q.id]) {
          progress[q.id] = Math.min(q.target, (progress[q.id] || 0) + amount);
          changed = true;
        }
      });
      return changed ? { ...prev, progress } : prev;
    });
  };

  const claimQuest = (q) => {
    if (quests.claimed[q.id] || (quests.progress[q.id] || 0) < q.target) return;
    const claimed = { ...quests.claimed, [q.id]: true };
    const allDone = questsForDate(quests.date).every((qq) => claimed[qq.id]);
    const grantBonus = allDone && !quests.bonusClaimed;
    setCoins((c) => c + q.reward);
    addXp(XP.quest + (grantBonus ? XP.dailyBonus : 0));
    setQuests({ ...quests, claimed, bonusClaimed: quests.bonusClaimed || allDone });
    if (grantBonus) {
      // Streak: gestern auch alles geschafft → weiterzählen, sonst bei 1 anfangen
      setStats((prev) => ({
        ...prev,
        streak: prev.lastAllDoneDate === yesterdayKey() ? (prev.streak || 0) + 1 : 1,
        bestStreak: Math.max(
          prev.bestStreak || 0,
          prev.lastAllDoneDate === yesterdayKey() ? (prev.streak || 0) + 1 : 1
        ),
        lastAllDoneDate: quests.date,
      }));
    }
  };

  // Spielstand bei jeder Änderung ins aktive Profil sichern
  useEffect(() => {
    if (!petName) return;
    saveProfile(profileId, {
      ...initial,
      petType, petName, coins, collarColor, hasBell,
      hunger, sleep, fun, toilet, needsClean, furniture,
      xp, accessory, ownedItems, decor, quests, stats, posters,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petType, petName, coins, collarColor, hasBell, hunger, sleep, fun, toilet, needsClean, furniture, xp, accessory, ownedItems, decor, quests, stats, posters]);

  // Android-Zurück-Geste: Overlay/Spiel schließen statt PWA beenden
  useEffect(() => {
    window.history.pushState({ yuna: true }, '');
    const onPop = () => {
      window.history.pushState({ yuna: true }, '');
      setShowGameSelect(false);
      setCurrentGame(null);
      setGameDifficulty(null);
      setCurrentRoom('main');
      setShowAlbum(false);
      setSlotPicker(null);
      setLevelUp(null);
      setScreen(s => (s === 'start' || s === 'choosePet' ? s : 'main'));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Animation timer - toggle between A and B frames
  useEffect(() => {
    const animInterval = setInterval(() => {
      setAnimFrame(f => !f);
    }, 500);
    return () => clearInterval(animInterval);
  }, []);

  // Level-Up-Feier automatisch schließen
  useEffect(() => {
    if (!levelUp) return;
    const t = setTimeout(() => setLevelUp(null), 4000);
    return () => clearTimeout(t);
  }, [levelUp]);

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
      addXp(XP.care);
      trackEvent('feed');
      setTimeout(() => setMood('happy'), 2000);
    }
  };

  const giveDrink = () => {
    if (coins >= 2) {
      setCoins(c => c - 2);
      setHunger(h => Math.min(100, h + 15));
      setFun(f => Math.min(100, f + 10));
      setMood('drinking');
      addXp(XP.care);
      trackEvent('drink');
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
      addXp(XP.care);
      trackEvent('sleep');
    }, 3000);
  };

  const useToilet = () => {
    setCurrentRoom('bathroom');
    setMood('toilet');
    setTimeout(() => {
      setToilet(100);
      setNeedsClean(true);
      setMood('clean');
      addXp(XP.care);
    }, 1500);
  };

  const clean = () => {
    setNeedsClean(false);
    setCoins(c => c + 2);
    setMood('happy');
    setCurrentRoom('main');
    addXp(XP.care);
    trackEvent('clean');
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

  const handleGameEnd = (earnedCoins, countsAsGame = true) => {
    setCurrentGame(null);
    setGameDifficulty(null);
    setFun(f => Math.min(100, f + 30));
    setCoins(c => c + earnedCoins);
    setMood('happy');
    setCurrentRoom('main');
    // Ohne Münzgewinn (abgebrochen/verloren) nur Trost-XP — sonst wäre
    // Spiel-auf-zu-auf-zu eine XP-Maschine
    addXp(earnedCoins > 0 ? XP.gameBase + XP.perCoin * earnedCoins : 3);
    if (countsAsGame) trackEvent('game');
    if (earnedCoins > 0) {
      trackEvent('win');
      trackEvent('earn', earnedCoins);
    }
  };

  const handleGameSelectClose = () => {
    setShowGameSelect(false);
  };

  const buyItem = (item) => {
    if (coins >= item.price && !ownedItems.includes(item.id) && level >= item.minLevel) {
      setCoins(c => c - item.price);
      setOwnedItems(o => [...o, item.id]);
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
            className={`object-contain transition-transform duration-300 ${mobileDisplay ? 'w-28 h-28' : 'w-48 h-48'
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
          {/* Accessoire */}
          {accessory && (
            <div className={`absolute -top-1 -left-1 ${mobileDisplay ? 'text-2xl' : 'text-4xl'}`}>
              {ACCESSORIES.find((a) => a.id === accessory)?.emoji}
            </div>
          )}
        </div>
        {/* Name */}
        <div className={`font-bold bg-white/80 px-3 py-1 rounded-full ${mobileDisplay ? 'text-sm mt-1' : 'text-lg mt-2'
          }`}>
          {petName}
        </div>
      </div>
    );
  };

  // CHOOSE PET SCREEN (neues Profil: Tier aussuchen + benennen)
  if (screen === 'choosePet') {
    const pets = [
      { type: 'dog', image: dogHappyA, name: 'Hund' }
    ];

    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-200 to-pink-200 flex flex-col items-center p-4 pt-8">
        <button onClick={onSwitchProfile} className="self-start text-2xl mb-2">← Profile</button>
        <h2 className="text-2xl font-bold text-purple-700 mb-6">Wähle dein Tier!</h2>

        <div className="flex gap-4 mb-8">
          {pets.map(pet => (
            <button
              key={pet.type}
              onClick={() => setPetType(pet.type)}
              className={`p-4 rounded-2xl transition-all ${petType === pet.type
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
                className={`w-10 h-10 rounded-full transition-transform ${collarColor === color ? 'scale-125 ring-4 ring-gray-400' : ''
                  }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 mt-4">
            <span>Glöckchen:</span>
            <button
              onClick={() => setHasBell(!hasBell)}
              className={`px-4 py-2 rounded-full font-bold ${hasBell ? 'bg-yellow-400' : 'bg-gray-200'
                }`}
            >
              {hasBell ? '🔔 An' : '🔕 Aus'}
            </button>
          </div>

          <h3 className="font-bold mb-3 mt-6">Accessoires (durch Level freigeschaltet):</h3>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => setAccessory(null)}
              className={`w-12 h-12 rounded-full bg-gray-100 text-xl ${
                accessory === null ? 'ring-4 ring-gray-400 scale-110' : ''
              }`}
              title="Kein Accessoire"
            >
              🚫
            </button>
            {ACCESSORIES.map((a) => {
              const unlocked = level >= a.minLevel;
              return (
                <button
                  key={a.id}
                  onClick={() => unlocked && setAccessory(a.id)}
                  disabled={!unlocked}
                  className={`w-12 h-12 rounded-full text-xl relative ${
                    unlocked ? 'bg-yellow-100' : 'bg-gray-200 grayscale opacity-60'
                  } ${accessory === a.id ? 'ring-4 ring-yellow-400 scale-110' : ''}`}
                  title={unlocked ? a.label : `${a.label} — ab Level ${a.minLevel}`}
                >
                  {a.emoji}
                  {!unlocked && (
                    <span className="absolute -bottom-1 -right-1 text-[10px] bg-gray-500 text-white rounded-full px-1">
                      L{a.minLevel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // SHOP SCREEN
  if (screen === 'shop') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-100 to-teal-100 p-4">
        <button onClick={() => setScreen('main')} className="text-2xl mb-4">← Zurück</button>
        <h2 className="text-2xl font-bold text-center text-teal-700 mb-1">Deko-Shop</h2>
        <p className="text-center text-lg mb-1">💰 {coins} Münzen · ⭐ Level {level}</p>
        <p className="text-center text-sm text-gray-500 mb-5">
          Gekauftes stellst du im Zimmer mit ✏️ auf
        </p>

        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto pb-8">
          {ITEMS.map((item) => {
            const owned = ownedItems.includes(item.id);
            const locked = level < item.minLevel;
            return (
              <div key={item.id} className={`bg-white rounded-2xl p-3 shadow-lg text-center ${locked ? 'opacity-70' : ''}`}>
                <div className={`text-4xl mb-1 ${locked ? 'grayscale' : ''}`}>{item.emoji}</div>
                <div className="font-bold text-sm">{item.name}</div>
                <div className="text-xs text-gray-500 mb-2">💰 {item.price}</div>
                {owned ? (
                  <div className="text-green-500 font-bold text-sm">✓ Gekauft</div>
                ) : locked ? (
                  <div className="text-gray-500 text-sm font-bold">🔒 Level {item.minLevel}</div>
                ) : (
                  <button
                    onClick={() => buyItem(item)}
                    disabled={coins < item.price}
                    className={`px-4 py-1.5 rounded-full font-bold text-sm ${coins >= item.price
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-500'
                      }`}
                  >
                    Kaufen
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // MAIN GAME SCREEN
  return (
    <div className={`min-h-screen bg-gradient-to-b from-sky-200 to-green-300 ${mobileDisplay ? 'p-2' : 'p-4'}`}>
      {/* Level-Up-Feier */}
      {levelUp && (
        <div
          className="fixed inset-0 bg-black/60 z-[80] flex flex-col items-center justify-center"
          onClick={() => setLevelUp(null)}
        >
          <div className="text-6xl animate-bounce mb-2">🎉</div>
          <div className="text-white text-4xl font-bold drop-shadow-lg mb-1">Level {levelUp}!</div>
          <div className="text-white/80 text-lg mb-4">{petName} wird immer besser!</div>
          <div className="flex gap-3 text-4xl">
            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>🎊</span>
            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>⭐</span>
            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>🎊</span>
          </div>
          {ACCESSORIES.some((a) => a.minLevel === levelUp) && (
            <div className="mt-4 bg-white/20 text-white px-4 py-2 rounded-full">
              Neu freigeschaltet: {ACCESSORIES.find((a) => a.minLevel === levelUp).emoji}{' '}
              {ACCESSORIES.find((a) => a.minLevel === levelUp).label} — im 👔-Shop!
            </div>
          )}
        </div>
      )}

      {/* Sammelalbum */}
      {showAlbum && (
        <Album
          level={level}
          stats={stats}
          poster={posters.wandRechts}
          onSetPoster={(p) => setPosters((prev) => ({ ...prev, wandRechts: p || undefined }))}
          onClose={() => setShowAlbum(false)}
        />
      )}

      {/* Slot-Picker: was soll hier stehen? */}
      {slotPicker && (() => {
        const slotDef = Object.values(ROOM_SLOTS).flat().find((s) => s.id === slotPicker);
        const fitting = ITEMS.filter((i) => ownedItems.includes(i.id) && i.slots.includes(slotPicker));
        return (
          <div
            className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4"
            onClick={() => setSlotPicker(null)}
          >
            <div
              className="bg-white rounded-3xl p-5 w-full max-w-xs shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-center text-lg mb-3">{slotDef?.label}</h3>
              {fitting.length === 0 && (
                <p className="text-center text-gray-500 text-sm mb-3">
                  Nichts Passendes gekauft — schau in den 🛒 Shop!
                </p>
              )}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setDecor((prev) => {
                      const next = { ...prev };
                      delete next[slotPicker];
                      return next;
                    });
                    setSlotPicker(null);
                  }}
                  className="rounded-xl bg-gray-100 p-2 text-center"
                >
                  <div className="text-2xl">🚫</div>
                  <div className="text-xs">Leer</div>
                </button>
                {fitting.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      // Item kann nur an EINEM Platz stehen — anderswo wegräumen
                      setDecor((prev) => {
                        const next = { ...prev };
                        Object.keys(next).forEach((k) => {
                          if (next[k] === item.id) delete next[k];
                        });
                        next[slotPicker] = item.id;
                        return next;
                      });
                      setSlotPicker(null);
                    }}
                    className={`rounded-xl p-2 text-center ${
                      decor[slotPicker] === item.id ? 'bg-green-100 ring-2 ring-green-400' : 'bg-gray-50'
                    }`}
                  >
                    <div className="text-2xl">{item.emoji}</div>
                    <div className="text-xs truncate">{item.name}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* 2048 Game */}
      {currentGame === 'game2048' && (
        <Game2048
          onClose={(earnedCoins) => handleGameEnd(earnedCoins || 0)}
          onWin={handleGameEnd}
        />
      )}

      {/* Jigsaw Game */}
      {currentGame === 'jigsaw' && (
        <JigsawGame
          onClose={(earnedCoins) => handleGameEnd(earnedCoins || 0)}
          onWin={handleGameEnd}
        />
      )}

      {/* Zauber-Maler (Kreativ-Studio, keine Münzen, zählt nicht als Minispiel) */}
      {currentGame === 'magicpainter' && (
        <MagicPainter onClose={() => handleGameEnd(0, false)} onDrawing={() => trackEvent('draw')} />
      )}

      {/* Header */}
      <div className={`flex justify-between items-center ${mobileDisplay ? 'mb-2' : 'mb-4'}`}>
        <div className={`flex items-center ${mobileDisplay ? 'gap-1' : 'gap-2'}`}>
          <div className={`bg-yellow-400 rounded-full font-bold shadow ${mobileDisplay ? 'px-3 py-1 text-sm' : 'px-4 py-2'}`}>
            💰 {coins}
          </div>
          <div className={`bg-violet-400 text-white rounded-full font-bold shadow ${mobileDisplay ? 'px-3 py-1 text-sm' : 'px-4 py-2'}`}>
            ⭐ {level}
          </div>
        </div>
        <div className={`flex ${mobileDisplay ? 'gap-1' : 'gap-2'}`}>
          <button onClick={onSwitchProfile} title="Profil wechseln" className={`bg-white/50 rounded-full ${mobileDisplay ? 'text-lg p-1.5' : 'text-2xl p-2'}`}>👥</button>
          <button onClick={() => setScreen('collar')} className={`bg-white/50 rounded-full ${mobileDisplay ? 'text-lg p-1.5' : 'text-2xl p-2'}`}>👔</button>
          <button onClick={() => setScreen('shop')} className={`bg-white/50 rounded-full ${mobileDisplay ? 'text-lg p-1.5' : 'text-2xl p-2'}`}>🛒</button>
          <button onClick={() => setShowAlbum(true)} title="Sammelalbum" className={`bg-white/50 rounded-full ${mobileDisplay ? 'text-lg p-1.5' : 'text-2xl p-2'}`}>📖</button>
          <button
            onClick={toggleMobileDisplay}
            className={`rounded-full transition-colors ${mobileDisplay ? 'bg-green-400 text-base p-1.5' : 'bg-white/50 text-xl p-2'
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
        {/* XP bis zum nächsten Level */}
        <div className={`flex items-center gap-2 ${mobileDisplay ? 'mt-1' : 'mt-2'}`}>
          <span className={mobileDisplay ? 'text-sm' : 'text-lg'}>⭐</span>
          <div className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${mobileDisplay ? 'h-3' : 'h-4'}`}>
            <div
              className="h-full bg-violet-500 transition-all duration-500 rounded-full"
              style={{
                width: `${Math.round(((xp - xpForLevel(level)) / (xpForNextLevel(level) - xpForLevel(level))) * 100)}%`,
              }}
            />
          </div>
          <span className={`${mobileDisplay ? 'text-[10px]' : 'text-xs'} whitespace-nowrap`}>
            Level {level}
          </span>
        </div>
      </div>

      {/* Tages-Quests */}
      {(() => {
        const todaysQuests = questsForDate(quests.date);
        const doneCount = todaysQuests.filter((q) => quests.claimed[q.id]).length;
        return (
          <div className={`bg-white/80 rounded-2xl shadow-lg ${mobileDisplay ? 'p-2 mb-2' : 'p-3 mb-4'}`}>
            <button
              onClick={() => setShowQuests((s) => !s)}
              className="w-full flex items-center justify-between font-bold"
            >
              <span className={mobileDisplay ? 'text-sm' : ''}>
                📋 Tagesaufgaben {doneCount}/3
                {(stats.streak || 0) > 1 && <span className="ml-2">🔥 {stats.streak}</span>}
              </span>
              <span>{showQuests ? '▴' : '▾'}</span>
            </button>
            {showQuests && (
              <div className="mt-2 space-y-2">
                {todaysQuests.map((q) => {
                  const prog = Math.min(q.target, quests.progress[q.id] || 0);
                  const claimed = quests.claimed[q.id];
                  const ready = !claimed && prog >= q.target;
                  return (
                    <div key={q.id} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${claimed ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <span className="text-xl">{q.icon}</span>
                      <span className={`flex-1 text-sm ${claimed ? 'line-through text-gray-400' : ''}`}>
                        {q.label}
                      </span>
                      {claimed ? (
                        <span className="text-green-500 font-bold">✓</span>
                      ) : ready ? (
                        <button
                          onClick={() => claimQuest(q)}
                          className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse"
                        >
                          💰{q.reward} Holen!
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500 font-bold">{prog}/{q.target}</span>
                      )}
                    </div>
                  );
                })}
                {quests.bonusClaimed && (
                  <div className="text-center text-xs text-violet-600 font-bold">
                    🎉 Alles geschafft — Bonus-XP kassiert!
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Pet display area with background image */}
      <div
        className={`rounded-2xl shadow-lg relative overflow-hidden transition-all duration-500 ${mobileDisplay ? 'p-3 mb-2' : 'p-6 mb-4'
          }`}
        style={{
          backgroundImage: `url(${currentRoom === 'bathroom' ? bathroomBg :
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

        {/* Poster an der Wand rechts (Hauptraum) */}
        {currentRoom === 'main' && posterUrl && (
          <img
            src={posterUrl}
            alt="Poster"
            className={`absolute top-2 right-2 rounded-lg border-4 border-amber-100 shadow-lg object-cover
                        ${mobileDisplay ? 'w-12 h-12' : 'w-20 h-20'}`}
          />
        )}

        {/* Deko in den Slots des aktuellen Raums */}
        {(ROOM_SLOTS[currentRoom] || []).map((slot) => {
          const placed = decor[slot.id] ? itemById(decor[slot.id]) : null;
          if (slot.id === 'wandRechts' && posterUrl) return null; // Poster hat Vorrang
          if (!editRoom && !placed) return null;
          return (
            <button
              key={slot.id}
              onClick={() => editRoom && setSlotPicker(slot.id)}
              className={`absolute ${slot.pos} ${mobileDisplay ? 'text-2xl' : 'text-4xl'} ${
                editRoom
                  ? 'bg-white/50 border-2 border-dashed border-white rounded-xl px-1.5 py-0.5 animate-pulse'
                  : 'pointer-events-none'
              }`}
              title={slot.label}
            >
              {placed ? placed.emoji : '➕'}
            </button>
          );
        })}

        {/* Zimmer einrichten */}
        <button
          onClick={() => setEditRoom((e) => !e)}
          className={`absolute top-2 left-1/2 -translate-x-1/2 rounded-full shadow
                      ${editRoom ? 'bg-green-400' : 'bg-white/60'} ${mobileDisplay ? 'text-base p-1.5' : 'text-xl p-2'}`}
          title="Zimmer einrichten"
        >
          {editRoom ? '✔️' : '✏️'}
        </button>

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
          className={`bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-2xl shadow-lg flex flex-col items-center ${mobileDisplay ? 'p-2' : 'p-4'
            }`}
        >
          <span className={mobileDisplay ? 'text-lg' : 'text-2xl'}>🍖</span>
          <span className={`${mobileDisplay ? 'text-[10px]' : 'text-xs'} mt-1`}>Füttern</span>
          <span className={`${mobileDisplay ? 'text-[10px]' : 'text-xs'} opacity-75`}>-1💰</span>
        </button>

        <button
          onClick={giveDrink}
          disabled={coins < 2 || isSleeping}
          className={`bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-2xl shadow-lg flex flex-col items-center ${mobileDisplay ? 'p-2' : 'p-4'
            }`}
        >
          <span className={mobileDisplay ? 'text-lg' : 'text-2xl'}>☕</span>
          <span className={`${mobileDisplay ? 'text-[10px]' : 'text-xs'} mt-1`}>Kakao</span>
          <span className={`${mobileDisplay ? 'text-[10px]' : 'text-xs'} opacity-75`}>-2💰</span>
        </button>

        <button
          onClick={goSleep}
          disabled={isSleeping}
          className={`bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white rounded-2xl shadow-lg flex flex-col items-center ${mobileDisplay ? 'p-2' : 'p-4'
            }`}
        >
          <span className={mobileDisplay ? 'text-lg' : 'text-2xl'}>🛏️</span>
          <span className={`${mobileDisplay ? 'text-[10px]' : 'text-xs'} mt-1`}>Schlafen</span>
        </button>

        <button
          onClick={useToilet}
          disabled={isSleeping || needsClean}
          className={`bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-2xl shadow-lg flex flex-col items-center ${mobileDisplay ? 'p-2' : 'p-4'
            }`}
        >
          <span className={mobileDisplay ? 'text-lg' : 'text-2xl'}>🚽</span>
          <span className={`${mobileDisplay ? 'text-[10px]' : 'text-xs'} mt-1`}>Toilette</span>
        </button>

        <button
          onClick={play}
          disabled={isSleeping || currentGame !== null}
          className={`bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-2xl shadow-lg flex flex-col items-center col-span-2 ${mobileDisplay ? 'p-2' : 'p-4'
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

// Profil-Gate: erst „Wer spielt?", dann die Spielwelt des gewählten Profils
const PetGame = () => {
  const [activeId, setActiveId] = useState(() => {
    migrateLegacy();
    return getActiveProfile();
  });
  const [profiles, setProfiles] = useState(listProfiles);

  if (!activeId) {
    return (
      <ProfileSelect
        profiles={profiles}
        onSelect={(id) => {
          setActiveProfile(id);
          setActiveId(id);
        }}
        onCreate={(name) => {
          const id = createProfile(name);
          if (!id) return;
          setProfiles(listProfiles());
          setActiveProfile(id);
          setActiveId(id);
        }}
        onDelete={(id) => {
          deleteProfile(id);
          setProfiles(listProfiles());
        }}
      />
    );
  }

  return (
    <PetWorld
      key={activeId}
      profileId={activeId}
      initial={loadProfile(activeId)}
      onSwitchProfile={() => {
        clearActiveProfile();
        setProfiles(listProfiles());
        setActiveId(null);
      }}
    />
  );
};

export default PetGame;
