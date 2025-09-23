import { TUTORIAL_STEPS } from "./data.js";
import { openModal } from "./ui.js";

export function runTutorial() {
  let i = 0;
  const next = () => {
    const s = TUTORIAL_STEPS[i];
    if (!s) return;
    openModal(s.title, `<p>${s.text}</p><div style="margin-top:10px"><button id="nextTut" class="btn">Next</button></div>`);
    setTimeout(()=> {
      const btn = document.getElementById("nextTut");
      if (!btn) return;
      btn.onclick = () => {
        i++;
        if (i >= TUTORIAL_STEPS.length) document.getElementById("overlay").classList.add("hidden");
        else next();
      };
    },0);
  };
  next();
}

