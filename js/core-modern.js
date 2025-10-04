// core-modern.js — modern ES6 entry point that enhances the existing core.js
console.log("[core-modern.js] StudyFlow modern modules loading 🌀");

import { swirlInTitle, startWindTrails, enableFrameAnimations } from "./animation-frame.js";
import { initializeTimerButtons, enhanceTimerDisplay } from "./timer-module.js";
import { loadSettings, applyThemeSettings } from "./settings.js";
import { safeInsertSVG, applySVGTheming } from "./svg-utils.js";

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

    // Initialize timer enhancements
    initializeTimerButtons();
    enhanceTimerDisplay();

    // Load SVG buttons safely
    await loadSafeSVGButtons(settings);

    // Start intro animations
    swirlInTitle();
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

  const animationStyles = ['', 'style-bounce', 'style-glow'];
  let currentStyleIndex = 0;

  // Cycle through animation styles every 8 seconds
  setInterval(() => {
    // Remove current style class
    animationStyles.forEach(style => {
      if (style) appTitle.classList.remove(style);
    });

    // Add next style class
    currentStyleIndex = (currentStyleIndex + 1) % animationStyles.length;
    if (animationStyles[currentStyleIndex]) {
      appTitle.classList.add(animationStyles[currentStyleIndex]);
    }
  }, 8000);

  // Add click interaction to manually cycle animations
  appTitle.addEventListener('click', () => {
    animationStyles.forEach(style => {
      if (style) appTitle.classList.remove(style);
    });
    
    currentStyleIndex = (currentStyleIndex + 1) % animationStyles.length;
    if (animationStyles[currentStyleIndex]) {
      appTitle.classList.add(animationStyles[currentStyleIndex]);
    }
  });

  // Add hover effect for better interactivity
  appTitle.style.cursor = 'pointer';
  appTitle.title = 'Click to change animation style';
}

async function loadSafeSVGButtons(settings) {
  try {
    const currentSeason = settings?.season || 'summer';
    
    // Load and safely insert start button
    const startResponse = await fetch('assets/images/start-button.svg');
    if (!startResponse.ok) throw new Error(`Failed to load start button: ${startResponse.status}`);
    
    const startSvg = await startResponse.text();
    const startBtn = document.getElementById('btn-start');
    if (startBtn) {
      const themedSvg = applySVGTheming(startSvg, currentSeason);
      safeInsertSVG(startBtn, themedSvg);
    }
    
    // Load and safely insert reset button  
    const resetResponse = await fetch('assets/images/reset-button.svg');
    if (!resetResponse.ok) throw new Error(`Failed to load reset button: ${resetResponse.status}`);
    
    const resetSvg = await resetResponse.text();
    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) {
      const themedSvg = applySVGTheming(resetSvg, currentSeason);
      safeInsertSVG(resetBtn, themedSvg);
    }
    
    console.log("[core-modern.js] SVG buttons safely loaded and themed");
  } catch (error) {
    console.warn("[core-modern.js] Could not load SVG buttons:", error);
    
    // Fallback: ensure text labels are visible and properly styled
    const startBtn = document.getElementById('btn-start');
    const resetBtn = document.getElementById('btn-reset');
    
    if (startBtn) {
      const textSpan = startBtn.querySelector('.button-text');
      if (textSpan) {
        textSpan.style.display = 'block';
        textSpan.style.fontSize = 'clamp(12px, 1.5vw, 16px)';
      }
    }
    
    if (resetBtn) {
      const textSpan = resetBtn.querySelector('.button-text');
      if (textSpan) {
        textSpan.style.display = 'block';
        textSpan.style.fontSize = 'clamp(12px, 1.5vw, 16px)';
      }
    }
    
    console.log("[core-modern.js] Using text fallback for buttons");
  }
}