// Deko-Katalog + Raum-Slots. Feste Slots statt Drag&Drop — kindertauglich.

// Positionen sind Tailwind-Klassen relativ zum Raum-Container.
export const ROOM_SLOTS = {
  main: [
    { id: 'wandLinks', label: 'Wand links', pos: 'top-2 left-2' },
    { id: 'wandRechts', label: 'Wand rechts', pos: 'top-2 right-2' },
    { id: 'boden', label: 'Boden', pos: 'bottom-2 left-2' },
    { id: 'fenster', label: 'Fensterbrett', pos: 'top-1/2 right-2' },
  ],
  playroom: [
    { id: 'spiel1', label: 'Ecke links', pos: 'top-2 left-2' },
    { id: 'spiel2', label: 'Ecke rechts', pos: 'bottom-2 right-2' },
  ],
  bathroom: [
    { id: 'bad1', label: 'Regal', pos: 'top-2 left-2' },
    { id: 'bad2', label: 'Ecke', pos: 'bottom-2 right-2' },
  ],
};

// slots: in welche Slots das Item passt. minLevel 1 = sofort kaufbar.
export const ITEMS = [
  { id: 'bild', emoji: '🖼️', name: 'Bild', price: 5, minLevel: 1, slots: ['wandLinks', 'wandRechts'] },
  { id: 'uhr', emoji: '🕰️', name: 'Uhr', price: 8, minLevel: 1, slots: ['wandLinks', 'wandRechts'] },
  { id: 'sterne', emoji: '🌟', name: 'Sterne', price: 12, minLevel: 2, slots: ['wandLinks', 'wandRechts'] },
  { id: 'regenbogen', emoji: '🌈', name: 'Regenbogen', price: 18, minLevel: 4, slots: ['wandLinks', 'wandRechts'] },
  { id: 'ball', emoji: '⚽', name: 'Ball', price: 5, minLevel: 1, slots: ['boden', 'spiel1', 'spiel2'] },
  { id: 'teppich', emoji: '🟫', name: 'Teppich', price: 8, minLevel: 1, slots: ['boden'] },
  { id: 'bett', emoji: '🛏️', name: 'Bett', price: 10, minLevel: 1, slots: ['boden'] },
  { id: 'teddy', emoji: '🧸', name: 'Teddy', price: 12, minLevel: 1, slots: ['boden', 'spiel1', 'spiel2'] },
  { id: 'pflanze', emoji: '🪴', name: 'Pflanze', price: 6, minLevel: 1, slots: ['boden', 'fenster'] },
  { id: 'zug', emoji: '🚂', name: 'Eisenbahn', price: 15, minLevel: 2, slots: ['boden', 'spiel1', 'spiel2'] },
  { id: 'piano', emoji: '🎹', name: 'Klavier', price: 30, minLevel: 6, slots: ['boden', 'spiel1'] },
  { id: 'schloss', emoji: '🏰', name: 'Schloss', price: 40, minLevel: 8, slots: ['boden', 'spiel1', 'spiel2'] },
  { id: 'blume', emoji: '🌸', name: 'Blume', price: 5, minLevel: 1, slots: ['fenster'] },
  { id: 'kaktus', emoji: '🌵', name: 'Kaktus', price: 7, minLevel: 1, slots: ['fenster'] },
  { id: 'lampe', emoji: '🪔', name: 'Lampe', price: 9, minLevel: 1, slots: ['fenster', 'boden'] },
  { id: 'vogel', emoji: '🐦', name: 'Vogel', price: 14, minLevel: 3, slots: ['fenster'] },
  { id: 'kiste', emoji: '🧺', name: 'Spielzeugkiste', price: 8, minLevel: 1, slots: ['spiel1', 'spiel2'] },
  { id: 'zelt', emoji: '⛺', name: 'Zelt', price: 16, minLevel: 2, slots: ['spiel1', 'spiel2'] },
  { id: 'rutsche', emoji: '🛝', name: 'Rutsche', price: 20, minLevel: 3, slots: ['spiel1', 'spiel2'] },
  { id: 'ente', emoji: '🦆', name: 'Badeente', price: 6, minLevel: 1, slots: ['bad1', 'bad2'] },
  { id: 'seife', emoji: '🧼', name: 'Seife', price: 5, minLevel: 1, slots: ['bad1'] },
  { id: 'spiegel', emoji: '🪞', name: 'Spiegel', price: 10, minLevel: 1, slots: ['bad1', 'bad2'] },
  { id: 'badewanne', emoji: '🛁', name: 'Badewanne', price: 25, minLevel: 5, slots: ['bad2'] },
];

export const itemById = (id) => ITEMS.find((i) => i.id === id);

// Alt-Möbel (v1-Spielstand) → gekaufte Items der neuen Welt
export function legacyFurnitureToItems(furniture) {
  const map = { bed: 'bett', carpet: 'teppich', poster: 'bild', plant: 'pflanze' };
  return Object.entries(map)
    .filter(([oldId]) => furniture?.[oldId])
    .map(([, newId]) => newId);
}
