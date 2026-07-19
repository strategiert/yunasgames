import React, { useState, useEffect, useRef } from 'react';
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

import { sfx, isMuted, setMuted } from './lib/sfx';
import { startRecording, playAsDog } from './lib/parrot';

// Tier-Frames im 3D-Look (19.07.2026): pro Tierart 15 Posen × 2 Altersstufen,
// per Glob gebündelt statt 150 Einzelimporte. Alte dog_/welpe_-Assets bleiben
// im Repo als Quellposen, landen aber nicht im Bundle.
const FRAME_MODULES = import.meta.glob(
  './assets/{tom,tomwelpe,cat,catwelpe,meerkat,meerkatwelpe,otter,otterwelpe,wolf,wolfwelpe}_*.png',
  { eager: true }
);
const frame = (prefix, pose) => FRAME_MODULES[`./assets/${prefix}_${pose}.png`]?.default;

export const PET_TYPES = [
  { id: 'dog', prefix: 'tom', label: 'Hund', emoji: '🐶' },
  { id: 'cat', prefix: 'cat', label: 'Katze', emoji: '🐱' },
  { id: 'meerkat', prefix: 'meerkat', label: 'Erdmännchen', emoji: '🐹' },
  { id: 'otter', prefix: 'otter', label: 'Otter', emoji: '🦦' },
  { id: 'wolf', prefix: 'wolf', label: 'Wolf', emoji: '🐺' },
];
const petTypeDef = (id) => PET_TYPES.find((p) => p.id === id) || PET_TYPES[0];

// mood → [Frame A, Frame B]
const POSE_FRAMES = {
  idle: ['idle_A', 'idle_B'],
  happy: ['happy_A', 'happy_B'],
  sad: ['sad_A', 'sad_B'],
  sleeping: ['sleep_A', 'sleep_A'],
  eating: ['eat_A', 'eat_B'],
  drinking: ['drink_A', 'drink_B'],
  playing: ['play_A', 'happy_A'],
  toilet: ['toilet_A', 'toilet_B'],
  clean: ['clean_A', 'clean_A'],
};
import mainroomBg from './assets/mainroom_default.png';
import bathroomBg from './assets/bathroom_default.png';
import playroomBg from './assets/playroom_default.png';

// Raum-Themes (level-gated, per fal aus den Standard-Räumen generiert)
import mainroomNacht from './assets/mainroom_nacht.jpeg';
import bathroomNacht from './assets/bathroom_nacht.jpeg';
import playroomNacht from './assets/playroom_nacht.jpeg';
import mainroomDschungel from './assets/mainroom_dschungel.jpeg';
import bathroomDschungel from './assets/bathroom_dschungel.jpeg';
import playroomDschungel from './assets/playroom_dschungel.jpeg';


// Ab diesem Level ist der Welpe ausgewachsen
const GROWN_UP_LEVEL = 4;

const ROOM_THEMES = [
  { id: 'default', label: 'Normal', emoji: '🏡', minLevel: 1 },
  { id: 'nacht', label: 'Nacht', emoji: '🌙', minLevel: 5 },
  { id: 'dschungel', label: 'Dschungel', emoji: '🌴', minLevel: 8 },
];

const ROOM_BGS = {
  default: { main: mainroomBg, bathroom: bathroomBg, playroom: playroomBg },
  nacht: { main: mainroomNacht, bathroom: bathroomNacht, playroom: playroomNacht },
  dschungel: { main: mainroomDschungel, bathroom: bathroomDschungel, playroom: playroomDschungel },
};

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
  const [roomTheme, setRoomTheme] = useState(initial.roomTheme);
  const [themePicker, setThemePicker] = useState(false);

  // Fortschritt
  const [xp, setXp] = useState(initial.xp);
  const [accessory, setAccessory] = useState(initial.accessory);
  const [levelUp, setLevelUp] = useState(null); // frisch erreichtes Level fürs Overlay
  const level = levelForXp(xp);

  // Aufsteigende Belohnungs-Zahlen über dem Tier
  const [floaties, setFloaties] = useState([]);
  const floatyIdRef = useRef(0);
  const showFloaty = (text) => {
    const id = ++floatyIdRef.current;
    setFloaties((f) => [...f, { id, text }]);
    setTimeout(() => setFloaties((f) => f.filter((x) => x.id !== id)), 1600);
  };

  const addXp = (amount) => {
    showFloaty(`+${amount} ⭐`);
    setXp((prev) => {
      const next = prev + amount;
      const before = levelForXp(prev);
      const after = levelForXp(next);
      if (after > before) setLevelUp(after);
      return next;
    });
  };

  // Streicheln + Nachsprechen + Ton
  const [petting, setPetting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [talking, setTalking] = useState(false);
  const [muted, setMutedState] = useState(isMuted);
  const recRef = useRef(null);

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  const petThePet = () => {
    if (isSleeping || petting) return;
    setPetting(true);
    setMood('happy');
    showFloaty(['💕', '💖', '✨', '🐾'][Math.floor(Math.random() * 4)]);
    Math.random() < 0.4 ? sfx.voice(petType) : sfx.giggle();
    setTimeout(() => {
      setPetting(false);
      setMood('idle');
    }, 1200);
  };

  const micDown = async () => {
    if (recording || talking) return;
    try {
      recRef.current = await startRecording();
      setRecording(true);
    } catch {
      showFloaty('🎤 aus 😢');
    }
  };

  const micUp = async () => {
    if (!recRef.current) return;
    const rec = recRef.current;
    recRef.current = null;
    setRecording(false);
    const blob = await rec.stop();
    if (!blob || blob.size < 2000) return; // zu kurz — nur Tipp statt Sprechen
    setTalking(true);
    setMood('happy');
    try {
      await playAsDog(blob);
    } finally {
      setTalking(false);
      setMood('idle');
    }
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
    showFloaty(`+${q.reward} 💰`);
    sfx.coin();
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
    // furniture (v1-Altfeld) läuft über ...initial unverändert mit
    saveProfile(profileId, {
      ...initial,
      petType, petName, coins, collarColor, hasBell,
      hunger, sleep, fun, toilet, needsClean,
      xp, accessory, ownedItems, decor, quests, stats, posters, roomTheme,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petType, petName, coins, collarColor, hasBell, hunger, sleep, fun, toilet, needsClean, xp, accessory, ownedItems, decor, quests, stats, posters, roomTheme]);

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
      setThemePicker(false);
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
    sfx.levelUp();
    const t = setTimeout(() => setLevelUp(null), 4000);
    return () => clearTimeout(t);
  }, [levelUp]);

  // Decrease needs over time — bewusst gemächlich (Kinder-Feedback 18.07.:
  // vorher war alles in 3 Minuten leer). Jetzt ~50 Min von voll bis leer,
  // Schlaf noch langsamer.
  const tickRef = useRef(0);
  useEffect(() => {
    if (screen !== 'main' || isSleeping) return;

    const interval = setInterval(() => {
      tickRef.current += 1;
      setHunger(h => Math.max(0, h - 1));
      setFun(f => Math.max(0, f - 1));
      setToilet(t => Math.max(0, t - 1));
      if (tickRef.current % 2 === 0) setSleep(s => Math.max(0, s - 1));
    }, 30000);

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

  // Get current pet image based on pet type, mood, growth stage and animation frame
  const isPuppy = level < GROWN_UP_LEVEL;
  const petDef = petTypeDef(petType);
  const getPetImage = () => {
    const prefix = petDef.prefix + (isPuppy ? 'welpe' : '');
    const [a, b] = POSE_FRAMES[mood] || POSE_FRAMES.idle;
    return frame(prefix, animFrame ? b : a) || frame(prefix, 'idle_A');
  };

  // Action handlers
  const feed = () => {
    if (coins >= 1) {
      setCoins(c => c - 1);
      setHunger(h => Math.min(100, h + 25));
      setMood('eating');
      sfx.munch();
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
      sfx.munch();
      addXp(XP.care);
      trackEvent('drink');
      setTimeout(() => setMood('happy'), 2000);
    }
  };

  const goSleep = () => {
    setIsSleeping(true);
    setMood('sleeping');
    sfx.snore();
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

  const gameStartRef = useRef(null);

  const handleGameSelect = (gameId, difficulty = null) => {
    setShowGameSelect(false);
    setCurrentRoom('playroom');
    setMood('playing');
    setCurrentGame(gameId);
    setGameDifficulty(difficulty);
    gameStartRef.current = Date.now();
  };

  const handleGameEnd = (earnedCoins, countsAsGame = true) => {
    setCurrentGame(null);
    setGameDifficulty(null);
    setFun(f => Math.min(100, f + 30));
    setMood('happy');
    setCurrentRoom('main');
    // Spielzeit-Münzen (Kinder-Feedback 18.07.): Endlosspiele und Abbrüche
    // geben trotzdem was — 1 Münze je angefangene Minute, gedeckelt auf 5.
    // Deckel + Mindest-Spielzeit, damit Auf-zu-auf-zu keine Münzmaschine wird.
    const playedMs = gameStartRef.current ? Date.now() - gameStartRef.current : 0;
    gameStartRef.current = null;
    const timeCoins = countsAsGame && playedMs >= 20000
      ? Math.min(5, Math.ceil(playedMs / 60000))
      : 0;
    const total = earnedCoins + timeCoins;
    setCoins(c => c + total);
    if (total > 0) {
      showFloaty(`+${total} 💰`);
      sfx.coin();
    }
    addXp(total > 0 ? XP.gameBase + XP.perCoin * total : 3);
    if (countsAsGame) trackEvent('game');
    if (earnedCoins > 0) trackEvent('win');
    if (total > 0) trackEvent('earn', total);
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

  // Collar colors
  const collarColors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#DDA0DD'];

  // Render pet with real images
  const renderPet = () => {
    // Stimmung steuert die Bewegung: hüpfen, mampfen oder ruhig wippen
    const moodAnim = isSleeping
      ? ''
      : talking
        ? 'pet-nom'
        : mood === 'happy' || mood === 'playing'
          ? 'pet-hop'
          : mood === 'eating' || mood === 'drinking'
            ? 'pet-nom'
            : 'pet-bob';
    // Tom-Look: Tier deutlich größer, es IST der Star des Screens
    const sizeClass = mobileDisplay
      ? isPuppy ? 'w-32 h-32' : 'w-40 h-40'
      : isPuppy ? 'w-52 h-52' : 'w-64 h-64';
    return (
      <div className={`relative flex flex-col items-center ${moodAnim}`}>
        {/* Pet Image — antippen = streicheln */}
        <div className="relative" onPointerDown={petThePet} style={{ cursor: 'pointer', touchAction: 'manipulation' }}>
          <img
            src={getPetImage()}
            alt={petName}
            className={`object-contain transition-all duration-300 select-none ${sizeClass} ${petting ? 'scale-110' : ''}`}
            draggable={false}
            style={{
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
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-200 to-pink-200 flex flex-col items-center p-4 pt-8">
        <button onClick={onSwitchProfile} className="self-start text-2xl mb-2">← Profile</button>
        <h2 className="text-2xl font-bold text-purple-700 mb-6">Wähle dein Tier!</h2>

        <div className="grid grid-cols-3 gap-3 mb-8 max-w-sm">
          {PET_TYPES.map(pet => (
            <button
              key={pet.id}
              onClick={() => setPetType(pet.id)}
              className={`p-3 rounded-2xl transition-all ${petType === pet.id
                ? 'bg-white shadow-lg scale-110 ring-4 ring-pink-400'
                : 'bg-white/50 hover:bg-white/80'
                }`}
            >
              <img
                src={frame(pet.prefix + 'welpe', 'happy_A')}
                alt={pet.label}
                className="w-20 h-20 object-contain mb-1 mx-auto"
              />
              <div className="text-xs font-medium">{pet.label}</div>
            </button>
          ))}
        </div>

        {petType && (
          <div className="w-full max-w-xs">
            <label className="block text-purple-700 font-medium mb-2">
              Wie soll dein Tier heißen?
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
          <div className="text-6xl animate-bounce mb-2">{levelUp === GROWN_UP_LEVEL ? petDef.emoji : '🎉'}</div>
          <div className="text-white text-4xl font-bold drop-shadow-lg mb-1">Level {levelUp}!</div>
          <div className="text-white/80 text-lg mb-4">
            {levelUp === GROWN_UP_LEVEL
              ? `${petName} ist groß geworden! 🐾`
              : `${petName} wird immer besser!`}
          </div>
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

      {/* Raum-Stil wählen */}
      {themePicker && (
        <div
          className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4"
          onClick={() => setThemePicker(false)}
        >
          <div
            className="bg-white rounded-3xl p-5 w-full max-w-xs shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-center text-lg mb-3">🎨 Raum-Stil</h3>
            <div className="space-y-2">
              {ROOM_THEMES.map((t) => {
                const unlocked = level >= t.minLevel;
                return (
                  <button
                    key={t.id}
                    disabled={!unlocked}
                    onClick={() => {
                      setRoomTheme(t.id);
                      setThemePicker(false);
                    }}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                      roomTheme === t.id
                        ? 'bg-green-100 ring-2 ring-green-400'
                        : unlocked ? 'bg-gray-50' : 'bg-gray-100 opacity-60'
                    }`}
                  >
                    <span className={`text-2xl ${unlocked ? '' : 'grayscale'}`}>{t.emoji}</span>
                    <span className="flex-1 text-left font-bold text-sm">{t.label}</span>
                    {!unlocked && (
                      <span className="text-xs text-gray-500 font-bold">🔒 Level {t.minLevel}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
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

      {/* Zauber-Maler: zählt nicht als Minispiel, aber jedes gemalte Bild gibt Münzen+XP */}
      {currentGame === 'magicpainter' && (
        <MagicPainter
          onClose={() => handleGameEnd(0, false)}
          onDrawing={() => {
            trackEvent('draw');
            setCoins((c) => c + 5);
            trackEvent('earn', 5);
            showFloaty('+5 💰');
            addXp(XP.gameBase);
          }}
        />
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
          <button onClick={toggleMute} title="Ton an/aus" className={`bg-white/50 rounded-full ${mobileDisplay ? 'text-lg p-1.5' : 'text-2xl p-2'}`}>{muted ? '🔇' : '🔊'}</button>
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

      {/* Bedürfnisse als kompakte Chips — das Tier ist der Star, nicht die Balken */}
      <div className={`bg-white/80 rounded-2xl shadow-lg ${mobileDisplay ? 'p-2 mb-2' : 'p-3 mb-3'}`}>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { icon: '🍖', value: hunger, color: '#22C55E' },
            { icon: '😴', value: sleep, color: '#3B82F6' },
            { icon: '⭐', value: fun, color: '#F59E0B' },
            { icon: '🚽', value: toilet, color: '#8B5CF6' },
          ].map((n) => (
            <div key={n.icon} className="flex flex-col items-center gap-0.5">
              <span className={mobileDisplay ? 'text-base' : 'text-xl'}>{n.icon}</span>
              <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${mobileDisplay ? 'h-1.5' : 'h-2'}`}>
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{ width: `${n.value}%`, backgroundColor: n.value < 30 ? '#EF4444' : n.color }}
                />
              </div>
            </div>
          ))}
        </div>
        {/* XP bis zum nächsten Level */}
        <div className={`flex items-center gap-2 ${mobileDisplay ? 'mt-1.5' : 'mt-2'}`}>
          <div className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${mobileDisplay ? 'h-1.5' : 'h-2'}`}>
            <div
              className="h-full bg-violet-500 transition-all duration-500 rounded-full"
              style={{
                width: `${Math.round(((xp - xpForLevel(level)) / (xpForNextLevel(level) - xpForLevel(level))) * 100)}%`,
              }}
            />
          </div>
          <span className={`${mobileDisplay ? 'text-[10px]' : 'text-xs'} whitespace-nowrap text-violet-600 font-bold`}>
            Lv {level}
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
        key={currentRoom + roomTheme}
        className={`room-fade rounded-2xl shadow-lg relative overflow-hidden transition-all duration-500 ${mobileDisplay ? 'p-3 mb-2' : 'p-6 mb-4'
          }`}
        style={{
          backgroundImage: `url(${(ROOM_BGS[roomTheme] || ROOM_BGS.default)[currentRoom]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: mobileDisplay ? '230px' : '340px'
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

        {/* Belohnungs-Floaties */}
        <div className="absolute inset-0 pointer-events-none flex justify-center">
          {floaties.map((f, i) => (
            <span
              key={f.id}
              className="floaty absolute text-xl font-bold text-white"
              style={{
                top: '38%',
                marginLeft: `${((f.id % 3) - 1) * 40}px`,
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}
            >
              {f.text}
            </span>
          ))}
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
        {editRoom && (
          <button
            onClick={() => setThemePicker(true)}
            className={`absolute top-2 left-1/2 translate-x-6 rounded-full shadow bg-white/60
                        ${mobileDisplay ? 'text-base p-1.5' : 'text-xl p-2'}`}
            title="Raum-Stil wählen"
          >
            🎨
          </button>
        )}

        {/* Nachsprechen: Mikro gedrückt halten */}
        <button
          onPointerDown={micDown}
          onPointerUp={micUp}
          onPointerLeave={() => recRef.current && micUp()}
          className={`absolute bottom-2 left-2 rounded-full shadow-lg select-none
                      ${recording ? 'bg-red-500 scale-125 animate-pulse' : talking ? 'bg-violet-400' : 'bg-white/70'}
                      ${mobileDisplay ? 'text-lg p-2' : 'text-2xl p-3'}`}
          style={{ touchAction: 'none' }}
          title="Gedrückt halten und sprechen — der Hund plappert nach!"
        >
          {talking ? '🗣️' : '🎤'}
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
      <div className={`action-grid grid grid-cols-3 ${mobileDisplay ? 'gap-1.5' : 'gap-3'}`}>
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
        petImageFor={(id) => {
          const t = petTypeDef(loadProfile(id).petType);
          return frame(t.prefix + 'welpe', 'happy_A');
        }}
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
