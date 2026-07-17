// XP-Kurve und Freischaltungen. Level n ist erreicht ab kumulativ 50·n·(n+1) XP
// (Level 2 ab 100, Level 3 ab 300, Level 4 ab 600 …).
export const levelForXp = (xp) => {
  let n = 1;
  while (xp >= 50 * n * (n + 1)) n++;
  return n;
};

// Kumulative XP-Schwelle für das nächste Level
export const xpForNextLevel = (level) => 50 * level * (level + 1);
export const xpForLevel = (level) => (level <= 1 ? 0 : 50 * (level - 1) * level);

export const XP = {
  care: 5, // Füttern, Kakao, Schlafen, Toilette, Saubermachen
  gameBase: 10, // Minispiel beendet
  perCoin: 2, // je gewonnener Münze obendrauf
  quest: 25,
  dailyBonus: 50, // alle 3 Tages-Quests
};

export const ACCESSORIES = [
  { id: 'schleife', emoji: '🎀', label: 'Schleife', minLevel: 2 },
  { id: 'brille', emoji: '🕶️', label: 'Coole Brille', minLevel: 4 },
  { id: 'krone', emoji: '👑', label: 'Krone', minLevel: 6 },
  { id: 'schal', emoji: '🧣', label: 'Schal', minLevel: 8 },
];
