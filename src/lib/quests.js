// Tages-Quests: 3 pro Tag, deterministisch aus dem Datum geseedet. Kein Server.

export const QUEST_POOL = [
  { id: 'feed2', label: '2× füttern', icon: '🍖', event: 'feed', target: 2, reward: 5 },
  { id: 'drink1', label: '1× Kakao geben', icon: '☕', event: 'drink', target: 1, reward: 4 },
  { id: 'game1', label: '1 Minispiel spielen', icon: '🎮', event: 'game', target: 1, reward: 5 },
  { id: 'win1', label: '1 Minispiel gewinnen', icon: '🏆', event: 'win', target: 1, reward: 8 },
  { id: 'sleep1', label: '1× schlafen legen', icon: '🛏️', event: 'sleep', target: 1, reward: 4 },
  { id: 'clean1', label: '1× sauber machen', icon: '🧹', event: 'clean', target: 1, reward: 4 },
  { id: 'draw1', label: '1 Zauberbild malen', icon: '🎨', event: 'draw', target: 1, reward: 8 },
  { id: 'coins10', label: '10 Münzen verdienen', icon: '💰', event: 'earn', target: 10, reward: 6 },
  { id: 'game2', label: '2 Minispiele spielen', icon: '🕹️', event: 'game', target: 2, reward: 8 },
];

// Lokales Datum (kein UTC-Sprung am Abend)
export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const yesterdayKey = () => dateKey(new Date(Date.now() - 86400000));

// Einfacher deterministischer Hash → dieselben 3 Quests für alle an einem Tag
export function questsForDate(key) {
  let h = 0;
  for (const c of key) h = ((h * 31 + c.charCodeAt(0)) & 0x7fffffff) >>> 0;
  const pool = [...QUEST_POOL];
  const picked = [];
  for (let i = 0; i < 3; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    picked.push(pool.splice(h % pool.length, 1)[0]);
  }
  return picked;
}

export const freshQuestState = () => ({
  date: dateKey(),
  progress: {},
  claimed: {},
  bonusClaimed: false,
});
