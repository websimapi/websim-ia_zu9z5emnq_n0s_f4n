import { CAT_TIERS, EVENTS, isEventActive, POWERUPS } from "./data.js";
import { exportSave, importSave } from "./storage.js";

export function bindUI({ getState, onDailyClaim, onTutorial, onRestart, onUsePowerUp }) {
  const scoreEl = document.getElementById("score");
  const treatsEl = document.getElementById("treats");
  const streakEl = document.getElementById("streak");
  const tierList = document.getElementById("tierList");
  const achList = document.getElementById("achList");
  const eventInfo = document.getElementById("eventInfo");
  const nextCanvas = document.getElementById("nextCanvas");
  const btnDaily = document.getElementById("btn-daily");

  document.getElementById("btn-restart").onclick = onRestart;
  document.getElementById("btn-tutorial").onclick = onTutorial;
  document.getElementById("pu-wild").onclick = () => onUsePowerUp("wild");
  document.getElementById("pu-tornado").onclick = () => onUsePowerUp("tornado");
  document.getElementById("pu-copy").onclick = () => onUsePowerUp("copy");

  document.getElementById("btn-export").onclick = () => {
    const code = exportSave();
    openModal("Export Save", `<p>Copy this code:</p><textarea style="width:100%;height:120px">${code}</textarea>`);
  };
  document.getElementById("btn-import").onclick = () => {
    openModal("Import Save", `<p>Paste code:</p><textarea id="impt" style="width:100%;height:120px"></textarea><div style="margin-top:8px"><button id="doImp" class="btn">Import</button></div>`);
    setTimeout(()=> {
      document.getElementById("doImp").onclick = () => {
        const ok = importSave(document.getElementById("impt").value.trim());
        if (ok) location.reload();
        else alert("Invalid code.");
      };
    },0);
  };

  btnDaily.onclick = onDailyClaim;

  function renderEvent() {
    const active = EVENTS.find(e => isEventActive(e.key));
    if (!active) {
      eventInfo.innerHTML = "<div>No event right now. Check back soon!</div>";
    } else {
      eventInfo.innerHTML = `
        <div style="display:flex;gap:8px;align-items:center">
          <img src="./${active.badge}" alt="" style="width:28px;height:28px">
          <div>
            <div style="font-weight:700">${active.name}</div>
            <div style="color:#555;font-size:13px">${active.desc}</div>
          </div>
        </div>`;
    }
  }

  function renderUnlocked() {
    const st = getState();
    tierList.innerHTML = "";
    CAT_TIERS.forEach(t => {
      const li = document.createElement("li");
      const lock = t.id <= st.unlockedTier ? "" : "opacity:.35;filter:grayscale(1)";
      li.innerHTML = `<img src="./${t.sprite}" style="${lock}" alt=""><span>${t.name}</span>`;
      tierList.appendChild(li);
    });
  }

  function renderAchievements() {
    const st = getState();
    achList.innerHTML = "";
    const entries = [
      ["first_merge","First Merge"],
      ["combo3","Combo x3"],
      ["score1k","1,000 pts"]
    ];
    for (const [key, label] of entries) {
      const done = !!st.achievements[key];
      const li = document.createElement("li");
      li.textContent = done ? `✓ ${label}` : `□ ${label}`;
      achList.appendChild(li);
    }
  }

  function renderHeader() {
    const st = getState();
    scoreEl.textContent = st.score.toLocaleString();
    treatsEl.textContent = st.treats.toLocaleString();
    streakEl.textContent = `Day ${st.daily.streak}`;
    document.getElementById("pu-wild").disabled = st.inventory.wild <= 0;
    document.getElementById("pu-tornado").disabled = st.inventory.tornado <= 0;
    document.getElementById("pu-copy").disabled = st.inventory.copy <= 0;
  }

  function drawNext(spriteImg) {
    const ctx = nextCanvas.getContext("2d");
    ctx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
    if (!spriteImg) return;
    const s = Math.min(nextCanvas.width, nextCanvas.height) * 0.8;
    ctx.save();
    ctx.translate(nextCanvas.width/2, nextCanvas.height/2);
    ctx.drawImage(spriteImg, -s/2, -s/2, s, s);
    ctx.restore();
  }

  renderEvent();
  renderUnlocked();
  renderAchievements();
  renderHeader();

  return {
    refreshAll() {
      renderUnlocked();
      renderAchievements();
      renderHeader();
    },
    updateHeader: renderHeader,
    updateNext: drawNext
  };
}

export function openModal(title, html) {
  const overlay = document.getElementById("overlay");
  const t = document.getElementById("modalTitle");
  const b = document.getElementById("modalBody");
  t.textContent = title;
  b.innerHTML = html;
  overlay.classList.remove("hidden");
  document.getElementById("modalClose").onclick = () => overlay.classList.add("hidden");
}

