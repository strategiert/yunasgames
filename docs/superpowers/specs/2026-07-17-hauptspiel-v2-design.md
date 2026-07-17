# Hauptspiel v2 — Profile, XP, Zuhause, Quests, Album

Freigegeben von Klaus am 17.07.2026. Ziel: Das Tamagotchi-Hauptspiel bekommt
einen echten Spiel-Loop mit Fortschritt. Nutzer: Kinder (Yuna + Geschwister),
mehrere auf einem Gerät.

## 1. Profile (Fundament)

- Startbildschirm wird Profilwahl: bis 4 Profile, jedes mit eigenem Tier,
  Name und komplettem Spielstand.
- Persistenz: `yunaProfiles-v1` (Index: id, name), `yunaPetSave-v2:<id>`
  (Spielstand), `yunaActiveProfile` (zuletzt aktiv).
- Migration: existiert `yunaPetSave-v1` und noch kein Profil-Index, wird
  daraus das erste Profil erzeugt. Alter Key bleibt als Backup liegen.
- Profil löschen mit Doppeltipp-Schutz.
- Zauber-Maler-Galerie (IndexedDB) bleibt geteilt über alle Profile.

## 2. XP & Level

- XP-Quellen: Pflegeaktion 5 XP · Minispiel-Ende 10 XP + 2×Münzgewinn ·
  Quest 25 XP · Tagesbonus (alle 3 Quests) 50 XP.
- Level-Kurve: Level n erreicht bei kumulativ `50·n·(n+1)` XP (L1→2: 100,
  L2→3: 300 gesamt, …). Anzeige neben Münzen, Level-Up-Overlay mit Konfetti.
- Freischaltungen: Shop-Items mit `minLevel`, Accessoires am Tier
  (Emoji-Overlay: 🎀 L2 · 🕶️ L4 · 👑 L6 · 🧣 L8), wählbar im Halsband-Shop.
- BEWUSST NICHT: sichtbares Wachsen Welpe→Hund. Es gibt nur Foto-Assets
  eines erwachsenen Hundes. Kommt als v2.1, wenn Assets existieren.
  Raum-Hintergrund-Varianten ebenfalls zurückgestellt (keine Assets).

## 3. Sichtbares Zuhause

- Feste Deko-Slots pro Raum (kein Drag&Drop, kindertauglich):
  Hauptraum 4 (Wand links, Wand rechts, Boden, Fenster),
  Spielzimmer 2, Bad 2.
- Slot antippen → Picker mit gekauften, zum Slot passenden Items.
- `lib/items.js`: ~20 Items (Emoji-basiert), Preise 5–40 Münzen,
  höherwertige level-gated. Ersetzt die bisherigen 4 Möbel;
  Alt-Besitz wird in neue Item-IDs migriert.
- Wand-rechts-Slot im Hauptraum kann alternativ ein Zauber-Maler-Poster
  tragen (siehe Album).

## 4. Tages-Quests

- 3 Quests pro Tag, deterministisch aus Datum geseedet (kein Server).
- Pool: 2× füttern · 1× Kakao · 1 Minispiel spielen · 1 Minispiel mit
  Münzgewinn · 1× schlafen · 1× sauber machen · 1 Zauberbild malen ·
  10 Münzen verdienen · 2 Minispiele spielen.
- Fortschritt über zentrales `trackEvent(typ)` im Spielstand.
- Belohnung pro Quest: Münzen + 25 XP, alle 3 → +50 XP Bonus.
- Streak: alle 3 an aufeinanderfolgenden Tagen geschafft → Zähler hoch,
  Lücke → zurück auf 1. Anzeige im Quest-Panel.

## 5. Sammelalbum

- Sticker-Grid aus Stats: Level-Meilensteine (2/5/10), Minispiele gespielt
  (1/10/50), Fütterungen (10/100), Zauberbilder (1/10), Streak (3/7).
  Gesperrte Sticker als Silhouette mit Bedingung.
- Poster: Galerie-Picker (listSessions aus IndexedDB), gewähltes Bild
  (Stil wählbar) hängt gerahmt im Wand-rechts-Slot. Gespeichert als
  `{sessionId, styleKey}` im Profil.

## Technik

- `lib/save.js`: Profil-Index, Load/Save, Migration v1→v2, Alt-Möbel-Mapping.
- Neue Komponenten: `ProfileSelect`, `Room` (Slot-Renderer), `Shop`,
  `QuestPanel`, `Album`. `PetGame.jsx` behält Orchestrierung und Pflege-Loop.
- Minispiele unangetastet; `handleGameEnd` reicht zusätzlich XP + Events durch.
- Alles localStorage/IndexedDB, kein Backend, PWA bleibt offline-fähig.
- Reihenfolge: Profile → XP/Level → Zuhause/Shop → Quests → Album.
  Jede Stufe eigener Commit, am Ende Live-Test auf beiden Domains.

## Offen / v2.1

- Welpen-/Wachstums-Assets (generieren oder fotografieren), dann visuelles
  Wachsen + Raum-Hintergrund-Varianten.
- Minispiel-Zwischenstände (2048-Board, Jigsaw) persistieren.
- „Neues Tier"-Reset pro Profil (durch Profil-Löschen abgedeckt).
