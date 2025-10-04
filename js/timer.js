// timer.js — responsible for timer controls (start/reset)
console.log("[timer.js] Module loaded ✅");

// Timer state will be imported from core.js
export function startTimer() {
  console.log("⏱ Timer started");
  
  // Get timer elements
  const startBtn = document.getElementById("btn-start");
  const countdown = document.getElementById("active-countdown");
  const mmElement = document.getElementById("active-time-mm");
  const ssElement = document.getElementById("active-time-ss");
  
  if (!mmElement || !ssElement) {
    console.warn("[timer.js] Timer display elements not found");
    return;
  }

  // Basic timer logic - starts from 25:00
  let timeRemaining = 25 * 60; // 25 minutes in seconds
  let timerInterval;

  function updateDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    mmElement.textContent = minutes.toString().padStart(2, '0');
    ssElement.textContent = seconds.toString().padStart(2, '0');
  }

  function tick() {
    timeRemaining--;
    updateDisplay();
    
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      console.log("⏰ Timer completed!");
      // Play completion sound or switch to break mode
    }
  }

  // Start the timer
  timerInterval = setInterval(tick, 1000);
  
  // Update button state
  if (startBtn) {
    startBtn.textContent = "Pause";
    startBtn.onclick = () => pauseTimer(timerInterval);
  }
}

export function pauseTimer(interval) {
  console.log("⏸ Timer paused");
  if (interval) {
    clearInterval(interval);
  }
  
  const startBtn = document.getElementById("btn-start");
  if (startBtn) {
    startBtn.textContent = "Start";
    startBtn.onclick = startTimer;
  }
}

export function resetTimer() {
  console.log("🔁 Timer reset");
  
  // Reset display to 25:00
  const mmElement = document.getElementById("active-time-mm");
  const ssElement = document.getElementById("active-time-ss");
  
  if (mmElement && ssElement) {
    mmElement.textContent = "25";
    ssElement.textContent = "00";
  }
  
  // Reset button state
  const startBtn = document.getElementById("btn-start");
  if (startBtn) {
    startBtn.textContent = "Start";
    startBtn.onclick = startTimer;
  }
}
