// ============================================
// CALENDAR SLEEP REDIRECTION LOGIC
// ============================================

/**
 * Handles the 'sleepModeEntered' event dispatched by the SleepModeManager.
 * When the calendar page becomes inactive, it redirects to the Timer page 
 * with a query parameter to immediately enter sleep mode there.
 */
function handleCalendarSleepMode() {
  console.log('😴 Inactivity detected on Calendar page. Redirecting to Timer sleep state...');
  // Use SF_CONFIG to get the timer page path (from config.js)
  const timerPagePath = window.SF_CONFIG?.PAGES?.TIMER || 'timer.html';
  // The 'sleep=true' parameter signals the Timer page to skip normal initialization 
  // and immediately enter a sleep state, ensuring the user experience is seamless.
  window.location.replace(timerPagePath + '?sleep=true');
}

// 1. Listen for the event that the SleepModeManager dispatches when the timeout is reached.
window.addEventListener('sleepModeEntered', handleCalendarSleepMode);

// 2. We must ensure the SleepModeManager and settings loading logic are initialized
//    on the calendar page for inactivity to be tracked.
//    (This assumes the necessary scripts are loaded and settings are available globally.)
//    If your settings/init code is in calendar.js, no further action is needed here.
