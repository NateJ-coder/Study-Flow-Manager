// timer.js — responsible for timer controls (start/reset)
console.log("[timer.js] Module loaded ✅");

// Global timer state management
let currentTimerInterval = null;
let isTimerRunning = false;

// Pomodoro session management
let currentSession = 1;
let totalSessions = 4;
let isBreakTime = false;
const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK_DURATION = 5 * 60; // 5 minutes in seconds
const LONG_BREAK_DURATION = 15 * 60; // 15 minutes in seconds

export function startTimer() {
  console.log("⏱ Timer started");
  
  // If timer is already running, don't start another one
  if (isTimerRunning) {
    console.warn("[timer.js] Timer already running, ignoring start request");
    return;
  }
  
  // Get timer elements
  const countdown = document.getElementById("active-countdown");
  const mmElement = document.getElementById("active-time-mm");
  const ssElement = document.getElementById("active-time-ss");
  
  if (!mmElement || !ssElement) {
    console.warn("[timer.js] Timer display elements not found");
    return;
  }

  // Get current time from display (in case it was partially used)
  const currentMinutes = parseInt(mmElement.textContent) || 25;
  const currentSeconds = parseInt(ssElement.textContent) || 0;
  let timeRemaining = (currentMinutes * 60) + currentSeconds;

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
      // Timer completed - handle Pomodoro progression
      clearInterval(currentTimerInterval);
      currentTimerInterval = null;
      isTimerRunning = false;
      
      handlePomodoroCompletion();
    }
  }

  // Start the timer
  currentTimerInterval = setInterval(tick, 1000);
  isTimerRunning = true;
  
  // Update button state
  const woodenStartBtn = document.getElementById("wooden-start-btn");
  if (woodenStartBtn) {
    woodenStartBtn.textContent = "PAUSE";
    woodenStartBtn.onclick = pauseTimer;
  }
}

export function pauseTimer() {
  console.log("⏸ Timer paused");
  
  // Clear the current timer
  if (currentTimerInterval) {
    clearInterval(currentTimerInterval);
    currentTimerInterval = null;
  }
  isTimerRunning = false;
  
  // Update button state
  const woodenStartBtn = document.getElementById("wooden-start-btn");
  if (woodenStartBtn) {
    woodenStartBtn.textContent = "START";
    woodenStartBtn.onclick = startTimer;
  }
}

export function resetTimer() {
  console.log("🔁 Timer reset");
  
  // FIRST: Stop any running timer
  if (currentTimerInterval) {
    clearInterval(currentTimerInterval);
    currentTimerInterval = null;
    console.log("⏹ Stopped running timer before reset");
  }
  isTimerRunning = false;
  
  // SECOND: Reset to work session
  currentSession = 1;
  isBreakTime = false;
  updateTimerDisplay(WORK_DURATION);
  updateSessionDisplay();
  
  // THIRD: Reset button state
  const woodenStartBtn = document.getElementById("wooden-start-btn");
  if (woodenStartBtn) {
    woodenStartBtn.textContent = "START";
    woodenStartBtn.onclick = startTimer;
  }
}

function handlePomodoroCompletion() {
  console.log("⏰ Pomodoro session completed!");
  
  if (!isBreakTime) {
    // Work session completed - start break
    if (currentSession >= totalSessions) {
      // Long break after completing all sessions
      console.log("🎉 All sessions completed! Starting long break.");
      isBreakTime = true;
      updateTimerDisplay(LONG_BREAK_DURATION);
    } else {
      // Short break
      console.log(`📝 Session ${currentSession} completed! Starting short break.`);
      isBreakTime = true;
      updateTimerDisplay(SHORT_BREAK_DURATION);
    }
  } else {
    // Break completed - start next work session or reset
    if (currentSession >= totalSessions) {
      // All sessions completed, reset to beginning
      console.log("🔄 All sessions and breaks completed! Resetting to session 1.");
      currentSession = 1;
      isBreakTime = false;
      updateTimerDisplay(WORK_DURATION);
    } else {
      // Move to next session
      currentSession++;
      isBreakTime = false;
      updateTimerDisplay(WORK_DURATION);
      console.log(`🚀 Starting session ${currentSession}`);
    }
  }
  
  updateSessionDisplay();
  
  // Reset button state
  const woodenStartBtn = document.getElementById("wooden-start-btn");
  if (woodenStartBtn) {
    woodenStartBtn.textContent = "START";
    woodenStartBtn.onclick = startTimer;
  }
  
  // Auto-start next session after a brief pause (optional)
  setTimeout(() => {
    if (!isTimerRunning) {
      startTimer();
    }
  }, 3000);
}

function updateTimerDisplay(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const mmElement = document.getElementById("active-time-mm");
  const ssElement = document.getElementById("active-time-ss");
  
  if (mmElement && ssElement) {
    mmElement.textContent = minutes.toString().padStart(2, '0');
    ssElement.textContent = remainingSeconds.toString().padStart(2, '0');
  }
}

function updateSessionDisplay() {
  const currentElement = document.getElementById("active-session-current");
  const totalElement = document.getElementById("active-session-total");
  
  if (currentElement && totalElement) {
    currentElement.textContent = currentSession;
    totalElement.textContent = totalSessions;
  }
}
