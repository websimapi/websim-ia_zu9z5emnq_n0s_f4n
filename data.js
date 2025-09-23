export const GAME_NAME = "CatCascade: Cozy Merge";

export const CAT_TIERS = [
  { id: 0, key: "kitten", name: "Kitten", score: 2, radius: 18, sprite: "cat_kitten.png" },
  { id: 1, key: "tabby", name: "Tabby", score: 5, radius: 22, sprite: "cat_tabby.png" },
  { id: 2, key: "tuxedo", name: "Tuxedo", score: 10, radius: 26, sprite: "cat_tuxedo.png" },
  { id: 3, key: "siamese", name: "Siamese", score: 18, radius: 30, sprite: "cat_siamese.png" },
  { id: 4, key: "mainecoon", name: "Maine Coon", score: 30, radius: 35, sprite: "cat_coon.png" },
  { id: 5, key: "bengal", name: "Bengal", score: 48, radius: 40, sprite: "cat_bengal.png" },
  { id: 6, key: "sphynx", name: "Sphynx", score: 70, radius: 46, sprite: "cat_sphynx.png" },
  { id: 7, key: "persian", name: "Persian Royale", score: 100, radius: 54, sprite: "cat_persian.png" }
];

export const POWERUPS = {
  wild: { key: "wild", name: "Wild Cat", desc: "Merges with any type", cost: 80 },
  tornado: { key: "tornado", name: "Cat Tornado", desc: "Reorganizes the bin", cost: 60 },
  copy: { key: "copy", name: "Magic Copy", desc: "Duplicates next merge", cost: 100 }
};

export const EVENTS = [
  { key: "halloween", name: "Halloween Cats", start: "10-20", end: "11-05", desc: "Spooky costumes and treats bonus.", badge: "event_halloween.png" },
  { key: "winter", name: "Winter Warmth", start: "12-10", end: "01-05", desc: "Scarves, snow, and cozy purrs.", badge: "event_winter.png" }
];

export const TUTORIAL_STEPS = [
  { title: "Welcome!", text: "Tap or click to drop a cat. Same types merge into a higher-tier cat." },
  { title: "Combos", text: "Chain merges grant combo multipliers for big scores." },
  { title: "Power-ups", text: "Use Wild, Tornado, and Magic Copy to escape jams and boost merges." },
  { title: "Avoid Overcrowding", text: "If cats overflow the bin, it's game over. Place wisely!" }
];

export function isEventActive(key, now = new Date()) {
  const ev = EVENTS.find(e => e.key === key);
  if (!ev) return false;
  const mmdd = (d) => `${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const start = ev.start, end = ev.end;
  const cur = mmdd(now);
  if (start <= end) return cur >= start && cur <= end;
  // cross-year (e.g., Dec–Jan)
  return cur >= start || cur <= end;
}

