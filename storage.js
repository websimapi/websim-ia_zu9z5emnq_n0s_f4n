const KEY = "catcascade_save_v1";

export function loadSave() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
}
export function saveSave(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
export function newDefaultSave() {
  return {
    score: 0, treats: 0, best: 0,
    unlockedTier: 2, // first three tiers appear
    inventory: { wild: 0, tornado: 0, copy: 0 },
    achievements: {},
    daily: { lastClaim: 0, streak: 0 },
    settings: { sfx: 1 },
    run: { combo: 0 },
    version: 1
  };
}
export function exportSave() {
  const raw = localStorage.getItem(KEY) || "{}";
  const blob = btoa(unescape(encodeURIComponent(raw)));
  return blob;
}
export function importSave(blob) {
  try {
    const json = decodeURIComponent(escape(atob(blob)));
    localStorage.setItem(KEY, json);
    return true;
  } catch {
    return false;
  }
}

