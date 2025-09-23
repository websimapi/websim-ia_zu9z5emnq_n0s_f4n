import Matter from "matter-js";
const { Engine, World, Bodies, Body, Events, Composite } = Matter;
import { CAT_TIERS, POWERUPS } from "./data.js";
import { loadSave, saveSave, newDefaultSave } from "./storage.js";
import { bindUI } from "./ui.js";
import { runTutorial } from "./tutorial.js";

const W = 360, H = 640;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const tapHint = document.getElementById("tapHint");
const FAIL_Y = H - 80;

let pointerX = W / 2;
let wildPreviewActive = false;
let wildPreviewTier = 0;

const engine = Engine.create({ gravity: { x: 0, y: -0.9 } });
const world = engine.world;

const walls = [
  Bodies.rectangle(W/2, H+20, W, 40, { isStatic: true }),
  Bodies.rectangle(-20, H/2, 40, H, { isStatic: true }),
  Bodies.rectangle(W+20, H/2, 40, H, { isStatic: true }),
  Bodies.rectangle(W/2, -20, W, 40, { isStatic: true })
];
World.add(world, walls);

let save = loadSave() || newDefaultSave();
let sprites = {};
let nextTierId = 0;
let pendingCopy = false;
let ui;

function loadSprites() {
  const keys = new Set(CAT_TIERS.map(t => t.sprite));
  ["cat_wild.png","event_winter.png","event_halloween.png","ui_treat.png"].forEach(s=>keys.add(s));
  keys.forEach(src => {
    const img = new Image();
    img.src = `./${src}`;
    sprites[src] = img;
  });
}

const cats = new Map(); // body.id -> { tier, wild?:boolean }
let lastDropTime = 0;

function randTierUnlocked() {
  const max = Math.min(save.unlockedTier, 1);
  return Math.floor(Math.random() * (max + 1));
}
function prepareNext() {
  nextTierId = randTierUnlocked();
  if (ui) {
    ui.updateNext(sprites[CAT_TIERS[nextTierId].sprite]);
  }
}

function spawnCat(x, tierId, opts = {}) {
  const t = CAT_TIERS[tierId];
  const body = Bodies.circle(x, H - 40, t.radius, { restitution: 0.1, friction: 0.2, frictionStatic: 0.5 });
  body.plugin = { type: "cat" };
  World.add(world, body);
  cats.set(body.id, { tier: tierId, wild: !!opts.wild, born: performance.now() });
  return body;
}

function canDrop() {
  return performance.now() - lastDropTime > 350;
}

let dropAtX = (x) => {
    if (!canDrop()) return;
    tapHint.style.display = "none";
    const body = spawnCat(Math.max(40, Math.min(W-40, x)), nextTierId);
    lastDropTime = performance.now();
    prepareNext();
    // gentle impulse
    Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08);
};

canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * W;
  pointerX = Math.max(40, Math.min(W - 40, x));
});
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * W;
  dropAtX(x);
});

function draw() {
  ctx.clearRect(0,0,W,H);
  // background grid lines subtle
  ctx.save();
  ctx.globalAlpha = 0.04;
  for (let y=H-100;y>0;y-=80){ ctx.fillRect(0,y,W,1); }
  ctx.restore();

  cats.forEach((meta, id) => {
    const body = Composite.get(world, id, "body");
    if (!body) return;
    const t = CAT_TIERS[meta.tier];
    const img = meta.wild ? sprites["cat_wild.png"] : sprites[t.sprite];
    if (!img) return;
    const s = t.radius * 2.2;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.drawImage(img, -s/2, -s/2, s, s);
    ctx.restore();
  });

  // bottom "release line"
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillRect(0, FAIL_Y, W, 2);
  ctx.restore();

  // launcher preview
  const previewSprite = wildPreviewActive ? sprites["cat_wild.png"] : sprites[CAT_TIERS[nextTierId].sprite];
  const tierForSize = wildPreviewActive ? CAT_TIERS[wildPreviewTier] : CAT_TIERS[nextTierId];
  if (previewSprite && tierForSize) {
    const s = tierForSize.radius * 2.2;
    ctx.save(); ctx.globalAlpha = 0.9;
    ctx.drawImage(previewSprite, pointerX - s/2, H - 36 - s/2, s, s);
    ctx.restore();
  }
}

// Save debounce
let saveTimer = 0;
function saveStateDebounced() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=> saveSave(save), 200);
}

function step() {
  Engine.update(engine, 1000/60);
  draw();
  checkOverflow();
  requestAnimationFrame(step);
}
requestAnimationFrame(step);

// Merging
let comboTimer = 0;
let comboCount = 0;

function addScore(base) {
  const mult = 1 + Math.min(comboCount, 5) * 0.15;
  const gain = Math.round(base * mult);
  save.score += gain;
  save.treats += Math.ceil(base / 5);
  save.best = Math.max(save.best, save.score);
  ui.updateHeader();
}

function handleMerge(a, b) {
  const ma = cats.get(a.id), mb = cats.get(b.id);
  const tierA = ma?.tier, tierB = mb?.tier;
  const isWild = ma?.wild || mb?.wild;
  if (tierA == null || tierB == null) return;

  if (tierA === tierB || isWild) {
    const nextTier = isWild ? Math.max(tierA, tierB) + 1 : tierA + 1;
    const capped = Math.min(nextTier, CAT_TIERS.length - 1);
    const keep = a, remove = b;
    const pos = { x: (a.position.x + b.position.x)/2, y: (a.position.y + b.position.y)/2 };
    const meta = cats.get(keep.id); const oldR = keep.circleRadius; const newR = CAT_TIERS[capped].radius;
    World.remove(world, remove); cats.delete(remove.id);
    Body.setPosition(keep, pos); Body.setVelocity(keep, { x: 0, y: 2 }); Body.setAngularVelocity(keep, (Math.random()-0.5)*0.2);
    Body.scale(keep, newR/oldR, newR/oldR); meta.tier = capped; meta.wild = false;
    addScore(CAT_TIERS[capped].score);
    // combo
    const now = performance.now();
    if (now - comboTimer < 900) comboCount++; else comboCount = 1;
    comboTimer = now;
    save.run.combo = Math.max(save.run.combo || 0, comboCount);
    // achievements
    if (!save.achievements.first_merge) save.achievements.first_merge = 1;
    if (comboCount >= 3) save.achievements.combo3 = 1;
    // unlock progression
    if (capped > save.unlockedTier && capped <= save.unlockedTier + 1) {
      save.unlockedTier = capped;
      ui.refreshAll();
    }
    // pending magic copy effect
    if (pendingCopy) {
      const copy = spawnCat(Math.min(W-40, pos.x + 26), capped);
      Body.setVelocity(copy, { x: 0.8, y: 2 });
      pendingCopy = false;
    }
    saveStateDebounced();
  }
}

Events.on(engine, "collisionStart", (evt) => {
  for (const pair of evt.pairs) {
    const { bodyA, bodyB } = pair;
    if (cats.has(bodyA.id) && cats.has(bodyB.id)) {
      handleMerge(bodyA, bodyB);
    }
  }
});

function checkOverflow() {
  const now = performance.now();
  let anyFail = false;
  cats.forEach((meta, id) => {
    const b = Composite.get(world, id, "body"); if (!b) return;
    const r = CAT_TIERS[meta.tier].radius;
    const bottom = b.position.y + r;
    const age = now - (meta.born || now);
    if (bottom > FAIL_Y) {
      if (age > 800) { meta.belowSince ||= now; if (now - meta.belowSince > 5000) anyFail = true; }
    } else { meta.belowSince = 0; }
  });
  if (anyFail) gameOver();
}

function openOverlay(title, html) {
  const overlay = document.getElementById("overlay");
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = html;
  overlay.classList.remove("hidden");
  document.getElementById("modalClose").onclick = () => overlay.classList.add("hidden");
}

function gameOver() {
  openOverlay("Game Over", `
    <p>Score: <b>${save.score.toLocaleString()}</b></p>
    <p>Best: <b>${save.best.toLocaleString()}</b></p>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button id="ovRestart" class="btn">Restart</button>
    </div>`);
  document.getElementById("ovRestart").onclick = restart;
}

function restart() {
  // clear cats
  cats.forEach((_, id) => {
    const b = Composite.get(world, id, "body");
    if (b) World.remove(world, b);
  });
  cats.clear();
  save.score = 0;
  save.run.combo = 0;
  prepareNext();
  tapHint.style.display = "";
  saveStateDebounced();
  document.getElementById("overlay").classList.add("hidden");
}

// Power-ups
function usePowerUp(key) {
  if (save.inventory[key] <= 0) return;
  if (key === "wild") {
    // Replace next with wild
    const wildTier = Math.min(save.unlockedTier, 1); // low tier drop
    wildPreviewActive = true; wildPreviewTier = wildTier;
    ui.updateNext(sprites["cat_wild.png"]);
    // when dropping, mark as wild
    const origDrop = dropAtX;
    const once = (x) => {
      if (!canDrop()) return;
      const body = spawnCat(Math.max(40, Math.min(W-40, x)), wildTier, { wild: true });
      lastDropTime = performance.now();
      prepareNext(); wildPreviewActive = false; dropAtX = origDrop;
    };
    dropAtX = once;
  }
  if (key === "tornado") {
    // Apply impulses
    cats.forEach((m, id) => {
      const b = Composite.get(world, id, "body");
      if (!b) return;
      Body.applyForce(b, b.position, { x: (Math.random()-0.5)*0.01, y: 0.02 + Math.random()*0.01 });
      Body.setAngularVelocity(b, (Math.random()-0.5)*0.6);
    });
  }
  if (key === "copy") {
    pendingCopy = true;
  }
  save.inventory[key]--;
  ui.updateHeader();
  saveStateDebounced();
}

// Daily rewards
function claimDaily() {
  const now = Date.now();
  const day = Math.floor(now / 86400000);
  const last = Math.floor((save.daily.lastClaim || 0) / 86400000);
  if (day === last) {
    openOverlay("Daily Reward", "<p>Already claimed today.</p>");
    return;
  }
  if (day === last + 1) save.daily.streak++; else save.daily.streak = 1;
  save.daily.lastClaim = now;
  const reward = 30 + save.daily.streak * 10;
  save.treats += reward;
  // grant random power-up
  const keys = Object.keys(POWERUPS);
  const k = keys[Math.floor(Math.random()*keys.length)];
  save.inventory[k] = (save.inventory[k]||0) + 1;

  openOverlay("Daily Reward", `<p>You received ${reward} treats and 1 ${POWERUPS[k].name}!</p>`);
  ui.updateHeader();
  saveStateDebounced();
}

// --- INITIALIZE ---
loadSprites();

ui = bindUI({
  getState: () => save,
  onDailyClaim: claimDaily,
  onTutorial: () => runTutorial(),
  onRestart: restart,
  onUsePowerUp: usePowerUp
});

prepareNext();

requestAnimationFrame(step);

// Tutorial on first run
if (!loadSave()) setTimeout(runTutorial, 300);