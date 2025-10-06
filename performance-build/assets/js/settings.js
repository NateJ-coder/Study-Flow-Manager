// Settings JS - Settings functionality module

// Settings functionality
const Settings = {
  themeButtons: [],
  workDurationInput: null,
  breakDurationInput: null,
  particlesCheckbox: null,
  soundsCheckbox: null,
  
  init() {
    // Get DOM elements
    this.themeButtons = Array.from(document.querySelectorAll('.theme-btn'));
    this.workDurationInput = document.getElementById('work-duration');
    this.breakDurationInput = document.getElementById('break-duration');
    this.particlesCheckbox = document.getElementById('particles-enabled');
    this.soundsCheckbox = document.getElementById('sounds-enabled');
    
    // Setup event listeners
    this.setupThemeButtons();
    this.setupTimerSettings();
    this.setupEffectSettings();
    
    // Load current settings
    this.loadCurrentSettings();
    
    // Auto-save on change
    this.setupAutoSave();
  },
  
  setupThemeButtons() {
    this.themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        if (theme && window.StudyFlow?.ThemeSystem) {
          window.StudyFlow.ThemeSystem.setTheme(theme);
          this.updateThemeButtonStates();
          this.playSound();
        }
      });
    });
  },
  
  setupTimerSettings() {
    if (this.workDurationInput) {
      this.workDurationInput.addEventListener('change', () => {
        const minutes = parseInt(this.workDurationInput.value, 10);
        if (minutes > 0 && minutes <= 60 && window.StudyFlow?.Timer) {
          window.StudyFlow.Timer.setWorkDuration(minutes);
        }
      });
    }
    
    if (this.breakDurationInput) {
      this.breakDurationInput.addEventListener('change', () => {
        const minutes = parseInt(this.breakDurationInput.value, 10);
        if (minutes > 0 && minutes <= 30 && window.StudyFlow?.Timer) {
          window.StudyFlow.Timer.setBreakDuration(minutes);
        }
      });
    }
  },
  
  setupEffectSettings() {
    if (this.particlesCheckbox) {
      this.particlesCheckbox.addEventListener('change', () => {
        const enabled = this.particlesCheckbox.checked;
        if (window.StudyFlow?.AppState) {
          window.StudyFlow.AppState.particlesEnabled = enabled;
          
          // Start or stop particles
          if (enabled) {
            window.StudyFlow.ParticleSystem.start();
          } else {
            window.StudyFlow.ParticleSystem.stop();
          }
          
          window.StudyFlow.AppState.save();
        }
      });
    }
    
    if (this.soundsCheckbox) {
      this.soundsCheckbox.addEventListener('change', () => {
        const enabled = this.soundsCheckbox.checked;
        if (window.StudyFlow?.AppState) {
          window.StudyFlow.AppState.soundsEnabled = enabled;
          window.StudyFlow.AppState.save();
          
          if (enabled) {
            this.playSound(); // Test sound
          }
        }
      });
    }
  },
  
  setupAutoSave() {
    // Auto-save timer settings when changed
    [this.workDurationInput, this.breakDurationInput].forEach(input => {
      if (input) {
        input.addEventListener('input', window.StudyFlow.throttle(() => {
          this.validateAndSaveTimerSettings();
        }, 500));
      }
    });
  },
  
  loadCurrentSettings() {
    // Load theme state
    this.updateThemeButtonStates();
    
    // Load timer settings
    if (window.StudyFlow?.TimerState) {
      if (this.workDurationInput) {
        this.workDurationInput.value = Math.floor(window.StudyFlow.TimerState.workDuration / 60);
      }
      if (this.breakDurationInput) {
        this.breakDurationInput.value = Math.floor(window.StudyFlow.TimerState.breakDuration / 60);
      }
    }
    
    // Load effect settings
    if (window.StudyFlow?.AppState) {
      if (this.particlesCheckbox) {
        this.particlesCheckbox.checked = window.StudyFlow.AppState.particlesEnabled;
      }
      if (this.soundsCheckbox) {
        this.soundsCheckbox.checked = window.StudyFlow.AppState.soundsEnabled;
      }
    }
  },
  
  updateThemeButtonStates() {
    const currentTheme = window.StudyFlow?.AppState?.theme || 'summer';
    
    this.themeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });
  },
  
  validateAndSaveTimerSettings() {
    let workMinutes = parseInt(this.workDurationInput?.value, 10);
    let breakMinutes = parseInt(this.breakDurationInput?.value, 10);
    
    // Validate and clamp values
    if (workMinutes < 1) workMinutes = 1;
    if (workMinutes > 60) workMinutes = 60;
    if (breakMinutes < 1) breakMinutes = 1;
    if (breakMinutes > 30) breakMinutes = 30;
    
    // Update inputs with validated values
    if (this.workDurationInput) this.workDurationInput.value = workMinutes;
    if (this.breakDurationInput) this.breakDurationInput.value = breakMinutes;
    
    // Save to timer
    if (window.StudyFlow?.Timer) {
      window.StudyFlow.Timer.setWorkDuration(workMinutes);
      window.StudyFlow.Timer.setBreakDuration(breakMinutes);
    }
  },
  
  exportSettings() {
    // Create exportable settings object
    const settings = {
      theme: window.StudyFlow?.AppState?.theme || 'summer',
      workDuration: Math.floor((window.StudyFlow?.TimerState?.workDuration || 1500) / 60),
      breakDuration: Math.floor((window.StudyFlow?.TimerState?.breakDuration || 300) / 60),
      particlesEnabled: window.StudyFlow?.AppState?.particlesEnabled ?? true,
      soundsEnabled: window.StudyFlow?.AppState?.soundsEnabled ?? true,
      exportDate: new Date().toISOString()
    };
    
    // Create download link
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'studyflow-settings.json';
    link.click();
    
    URL.revokeObjectURL(url);
  },
  
  importSettings(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target.result);
        
        // Apply imported settings
        if (settings.theme && window.StudyFlow?.ThemeSystem) {
          window.StudyFlow.ThemeSystem.setTheme(settings.theme);
        }
        
        if (settings.workDuration && window.StudyFlow?.Timer) {
          window.StudyFlow.Timer.setWorkDuration(settings.workDuration);
        }
        
        if (settings.breakDuration && window.StudyFlow?.Timer) {
          window.StudyFlow.Timer.setBreakDuration(settings.breakDuration);
        }
        
        if (typeof settings.particlesEnabled === 'boolean' && window.StudyFlow?.AppState) {
          window.StudyFlow.AppState.particlesEnabled = settings.particlesEnabled;
          if (settings.particlesEnabled) {
            window.StudyFlow.ParticleSystem.start();
          } else {
            window.StudyFlow.ParticleSystem.stop();
          }
        }
        
        if (typeof settings.soundsEnabled === 'boolean' && window.StudyFlow?.AppState) {
          window.StudyFlow.AppState.soundsEnabled = settings.soundsEnabled;
        }
        
        // Save all changes
        window.StudyFlow?.AppState?.save();
        
        // Refresh UI
        this.loadCurrentSettings();
        
        console.log('Settings imported successfully');
      } catch (error) {
        console.error('Failed to import settings:', error);
        alert('Failed to import settings. Please check the file format.');
      }
    };
    
    reader.readAsText(file);
  },
  
  resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      // Clear localStorage
      localStorage.removeItem('studyflow-settings');
      localStorage.removeItem('studyflow-timer');
      
      // Reset to defaults
      if (window.StudyFlow?.ThemeSystem) {
        window.StudyFlow.ThemeSystem.setTheme('summer');
      }
      
      if (window.StudyFlow?.Timer) {
        window.StudyFlow.Timer.setWorkDuration(25);
        window.StudyFlow.Timer.setBreakDuration(5);
      }
      
      if (window.StudyFlow?.AppState) {
        window.StudyFlow.AppState.particlesEnabled = true;
        window.StudyFlow.AppState.soundsEnabled = true;
        window.StudyFlow.AppState.save();
        window.StudyFlow.ParticleSystem.start();
      }
      
      // Refresh UI
      this.loadCurrentSettings();
      
      console.log('Settings reset to defaults');
    }
  },
  
  playSound() {
    if (!window.StudyFlow?.AppState?.soundsEnabled) return;
    
    window.StudyFlow.afterPaint(() => {
      const audio = new Audio('/assets/audio/click.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    });
  }
};

// Initialize settings
const initSettings = () => {
  if (document.body.dataset.page === 'settings') {
    // Wait for core to load
    if (window.StudyFlow) {
      Settings.init();
    } else {
      // Retry after a short delay
      setTimeout(initSettings, 100);
    }
  }
};

// Export for global access
window.StudyFlow = window.StudyFlow || {};
window.StudyFlow.Settings = Settings;

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettings);
} else {
  initSettings();
}