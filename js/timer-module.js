// timer-module.js — modular timer functions that work with existing core.js
console.log("[timer-module.js] Module loaded ✅");

// These functions will work alongside the existing timer functions in core.js
export function initializeTimerButtons() {
  console.log("⚙️ Initializing timer button handlers");
  
  const startBtn = document.getElementById("btn-start");
  const resetBtn = document.getElementById("btn-reset");

  if (!startBtn || !resetBtn) {
    console.warn("[timer-module.js] Timer buttons not found ❌");
    return;
  }

  // Idempotent guards: prevent double event listener binding
  if (!startBtn.dataset.bound) {
    startBtn.addEventListener("click", () => {
      if (window.startTimer) {
        window.startTimer();
      } else {
        console.log("⏱ Timer started (module fallback)");
      }
    });
    startBtn.dataset.bound = '1';
  }
  
  if (!resetBtn.dataset.bound) {
    resetBtn.addEventListener("click", () => {
      if (window.resetTimer) {
        window.resetTimer();
      } else {
        console.log("🔁 Timer reset (module fallback)");
      }
    });
    resetBtn.dataset.bound = '1';
  }
  
  console.log("[timer-module.js] Timer buttons initialized ✅");
}

export function enhanceTimerDisplay() {
  console.log("🎨 Enhancing timer display");
  
  // Add visual enhancements to the timer
  const timerUI = document.querySelector('.timer-ui');
  if (timerUI) {
    timerUI.style.transition = 'all 0.3s ease';
  }
}