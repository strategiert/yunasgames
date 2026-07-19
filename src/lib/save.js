// Profilbewusste Spielstand-Persistenz. Ein Profil = ein Kind = ein Tier.
const PROFILES_KEY = 'yunaProfiles-v1';
const ACTIVE_KEY = 'yunaActiveProfile';
const SAVE_PREFIX = 'yunaPetSave-v2:';
const LEGACY_KEY = 'yunaPetSave-v1';

// Kinder wollen mehrere Tiere gleichzeitig — jedes Profil ist ein eigenes Tier
export const MAX_PROFILES = 12;

const readJson = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeJson = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch { /* Quota voll — Spiel läuft weiter */ }
};

export function defaultState() {
  return {
    petType: null,
    petName: '',
    coins: 20,
    collarColor: '#FF6B6B',
    hasBell: false,
    hunger: 80,
    sleep: 80,
    fun: 80,
    toilet: 80,
    needsClean: false,
    furniture: { bed: false, carpet: false, poster: false, plant: false, bowl: true, toilet: true },
    xp: 0,
    accessory: null,
    roomTheme: 'default',
    decor: {},
    ownedItems: [],
    posters: {},
    quests: null,
    stats: {},
  };
}

// Einmalig: v1-Spielstand (ein Kind, vor Profilen) wird erstes Profil.
// Alter Key bleibt als Backup liegen.
export function migrateLegacy() {
  if (readJson(PROFILES_KEY)) return;
  const legacy = readJson(LEGACY_KEY);
  if (!legacy?.petName) return;
  const id = 'p1';
  writeJson(PROFILES_KEY, [{ id, name: legacy.petName }]);
  writeJson(SAVE_PREFIX + id, { ...defaultState(), ...legacy });
  localStorage.setItem(ACTIVE_KEY, id);
}

export const listProfiles = () => readJson(PROFILES_KEY) || [];

export function createProfile(name) {
  const profiles = listProfiles();
  if (profiles.length >= MAX_PROFILES) return null;
  const id = 'p' + (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now());
  writeJson(PROFILES_KEY, [...profiles, { id, name }]);
  writeJson(SAVE_PREFIX + id, defaultState());
  return id;
}

export function deleteProfile(id) {
  writeJson(PROFILES_KEY, listProfiles().filter((p) => p.id !== id));
  try {
    localStorage.removeItem(SAVE_PREFIX + id);
  } catch { /* egal */ }
  if (getActiveProfile() === id) clearActiveProfile();
}

// Defaults druntermischen: alte Spielstände bekommen neue Felder automatisch
export const loadProfile = (id) => ({ ...defaultState(), ...(readJson(SAVE_PREFIX + id) || {}) });
export const saveProfile = (id, data) => writeJson(SAVE_PREFIX + id, data);

export const getActiveProfile = () => {
  const id = localStorage.getItem(ACTIVE_KEY);
  return id && listProfiles().some((p) => p.id === id) ? id : null;
};
export const setActiveProfile = (id) => localStorage.setItem(ACTIVE_KEY, id);
export const clearActiveProfile = () => {
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch { /* egal */ }
};
