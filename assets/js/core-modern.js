// core-modern.js — modern ES6 entry point that enhances the existing core.js
console.log("[core-modern.js] StudyFlow modern modules loading 🌀");

import { startWindTrails, enableFrameAnimations } from "./animation-frame.js";
import { initializeTimerButtons, enhanceTimerDisplay, initializeReminderDialog, initializeExistingTimerReminders } from "./timer-module.js";
import { loadSettings, applyThemeSettings } from "./settings.js";
import { safeInsertSVG, applySVGTheming } from "./svg-utils.js";
import { initializeCalendar, requestNotificationPermission } from "./calendar.js";

// Wait for the legacy core.js to load first, then enhance it
document.addEventListener("DOMContentLoaded", () => {
  console.log("[core-modern.js] DOM loaded, applying modern enhancements");

  // Give the legacy core a moment to initialize
  setTimeout(() => {
    initializeModernFeatures();
  }, 100);
});

async function initializeModernFeatures() {
  try {
    console.log("[core-modern.js] Initializing modern features");

    // Load and apply settings
    const settings = loadSettings();
    applyThemeSettings(settings);

    // Initialize page-specific functionality
    const currentPage = document.body.getAttribute('data-page');
    
    if (currentPage === 'timer') {
      // Timer page functionality
      initializeTimerButtons();
      enhanceTimerDisplay();
      initializeReminderDialog();
      initializeExistingTimerReminders();
      initializeWoodenButtons();
    } else if (currentPage === 'calendar') {
      // Calendar page functionality
      initializeCalendar();
      
      // Request notification permission for reminders
      requestNotificationPermission();
      
      console.log("[core-modern.js] Calendar enhanced with seasonal features and reminders");
    }

    // SVG buttons removed - using CSS-only wooden buttons now

    // Start intro animations (character pop-up only)
    enableFrameAnimations();
    initializeTitleAnimation();

    // Start wind trails after a delay (respect reduced motion)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      setTimeout(() => {
        startWindTrails();
      }, 800);
    }

    console.log("[core-modern.js] All modern features initialized ✅");

  } catch (error) {
    console.error("[core-modern.js] Error initializing modern features:", error);
  }
}

function initializeTitleAnimation() {
  const appTitle = document.getElementById('app-title');
  if (!appTitle) return;

  // Animation only plays once on load - no cycling, no perpetual loop
  console.log("[core-modern.js] StudyFlow title animation initialized - plays once only");
  
  // Remove cursor pointer and click handler - no more manual cycling
  appTitle.style.cursor = 'default';
  appTitle.title = '';
}

function initializeWoodenButtons() {
  console.log("[core-modern.js] Initializing clean wooden buttons");
  
  const startBtn = document.getElementById('wooden-start-btn');
  const resetBtn = document.getElementById('wooden-reset-btn');
  
  if (startBtn) {
    startBtn.onclick = startTimer;
    console.log("[core-modern.js] START button connected");
  } else {
    console.warn("[core-modern.js] START button not found");
  }
  
  if (resetBtn) {
    resetBtn.onclick = resetTimer;
    console.log("[core-modern.js] RESET button connected");
  } else {
    console.warn("[core-modern.js] RESET button not found");
  }
}