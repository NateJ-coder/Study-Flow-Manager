// Timer JS - Timer functionality module

// Timer state
const TimerState = {
  workDuration: 25 * 60, // 25 minutes in seconds
  breakDuration: 5 * 60, // 5 minutes in seconds
  currentTime: 25 * 60,
  isRunning: false,
  isBreak: false,
  intervalId: null,
  
  load() {
    try {
      const saved = localStorage.getItem('studyflow-timer');
      if (saved) {
        const data = JSON.parse(saved);
        this.workDuration = data.workDuration || this.workDuration;
        this.breakDuration = data.breakDuration || this.breakDuration;
        this.currentTime = this.workDuration; // Always start fresh
      }
    } catch (e) {
      console.warn('Could not load timer settings:', e);
    }
  },
  
  save() {
    try {
      const data = {
        workDuration: this.workDuration,
        breakDuration: this.breakDuration
      };
      localStorage.setItem('studyflow-timer', JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save timer settings:', e);
    }
  }
};

// Timer functionality
const Timer = {
  display: null,
  startBtn: null,
  resetBtn: null,
  
  init() {
    // Get DOM elements
    this.display = document.getElementById('timer-text');
    this.startBtn = document.getElementById('start-btn');
    this.resetBtn = document.getElementById('reset-btn');
    
    if (!this.display || !this.startBtn || !this.resetBtn) {
      console.warn('Timer elements not found');
      return;
    }
    
    // Load state
    TimerState.load();
    
    // Setup event listeners
    this.startBtn.addEventListener('click', () => this.toggle());
    this.resetBtn.addEventListener('click', () => this.reset());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        this.toggle();
      } else if (e.code === 'KeyR' && e.ctrlKey) {
        e.preventDefault();
        this.reset();
      }
    });
    
    // Initial display update
    this.updateDisplay();
    this.updateButtons();
  },
  
  toggle() {
    if (TimerState.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  },
  
  start() {
    if (TimerState.isRunning) return;
    
    TimerState.isRunning = true;
    TimerState.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
    
    document.body.classList.add('timer-running');
    this.updateButtons();
    this.playSound('start');
  },
  
  pause() {
    if (!TimerState.isRunning) return;
    
    TimerState.isRunning = false;
    if (TimerState.intervalId) {
      clearInterval(TimerState.intervalId);
      TimerState.intervalId = null;
    }
    
    document.body.classList.remove('timer-running');
    document.body.classList.add('timer-paused');
    this.updateButtons();
    this.playSound('pause');
  },
  
  reset() {
    // Stop if running
    if (TimerState.isRunning) {
      this.pause();
    }
    
    // Reset to work duration
    TimerState.currentTime = TimerState.workDuration;
    TimerState.isBreak = false;
    
    document.body.classList.remove('timer-running', 'timer-paused', 'timer-break');
    this.updateDisplay();
    this.updateButtons();
    this.playSound('reset');
  },
  
  tick() {
    TimerState.currentTime--;
    this.updateDisplay();
    
    // Check if time is up
    if (TimerState.currentTime <= 0) {
      this.complete();
    }
  },
  
  complete() {
    // Stop the timer
    TimerState.isRunning = false;
    if (TimerState.intervalId) {
      clearInterval(TimerState.intervalId);
      TimerState.intervalId = null;
    }
    
    // Switch between work and break
    if (TimerState.isBreak) {
      // Break completed, back to work
      TimerState.isBreak = false;
      TimerState.currentTime = TimerState.workDuration;
      document.body.classList.remove('timer-break');
      this.playSound('work-start');
    } else {
      // Work completed, start break
      TimerState.isBreak = true;
      TimerState.currentTime = TimerState.breakDuration;
      document.body.classList.add('timer-break');
      this.playSound('break-start');
    }
    
    document.body.classList.remove('timer-running', 'timer-paused');
    this.updateDisplay();
    this.updateButtons();
    
    // Show notification if supported
    this.showNotification();
  },
  
  updateDisplay() {
    if (!this.display) return;
    
    const minutes = Math.floor(TimerState.currentTime / 60);
    const seconds = TimerState.currentTime % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    this.display.textContent = timeString;
    
    // Update document title
    const prefix = TimerState.isBreak ? 'Break' : 'Focus';
    document.title = `${timeString} - ${prefix} - StudyFlow`;
  },
  
  updateButtons() {
    if (!this.startBtn || !this.resetBtn) return;
    
    if (TimerState.isRunning) {
      this.startBtn.textContent = 'Pause';
    } else {
      this.startBtn.textContent = 'Start';
    }
    
    // Update button styles based on state
    this.startBtn.classList.toggle('paused', !TimerState.isRunning && TimerState.currentTime < TimerState.workDuration);
  },
  
  playSound(type) {
    if (!window.StudyFlow?.AppState?.soundsEnabled) return;
    
    // Use afterPaint to avoid blocking
    window.StudyFlow.afterPaint(() => {
      let audioFile = '/assets/audio/click.mp3'; // Default
      
      switch (type) {
        case 'start':
        case 'work-start':
          audioFile = '/assets/audio/click.mp3';
          break;
        case 'pause':
          audioFile = '/assets/audio/click.mp3';
          break;
        case 'reset':
          audioFile = '/assets/audio/shock.mp3';
          break;
        case 'break-start':
          audioFile = '/assets/audio/splash.mp3';
          break;
      }
      
      const audio = new Audio(audioFile);
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore errors
    });
  },
  
  showNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = TimerState.isBreak ? 'Break Time!' : 'Focus Time!';
      const message = TimerState.isBreak 
        ? 'Take a well-deserved break.' 
        : 'Time to get back to work!';
      
      new Notification(title, {
        body: message,
        icon: '/assets/images/clock-icon.svg',
        silent: false
      });
    }
  },
  
  // Public methods for settings
  setWorkDuration(minutes) {
    TimerState.workDuration = minutes * 60;
    if (!TimerState.isBreak && !TimerState.isRunning) {
      TimerState.currentTime = TimerState.workDuration;
      this.updateDisplay();
    }
    TimerState.save();
  },
  
  setBreakDuration(minutes) {
    TimerState.breakDuration = minutes * 60;
    if (TimerState.isBreak && !TimerState.isRunning) {
      TimerState.currentTime = TimerState.breakDuration;
      this.updateDisplay();
    }
    TimerState.save();
  }
};

// Initialize timer when loaded
const initTimer = () => {
  if (document.body.dataset.page === 'timer') {
    Timer.init();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
};

// Export for global access
window.StudyFlow = window.StudyFlow || {};
window.StudyFlow.Timer = Timer;
window.StudyFlow.TimerState = TimerState;

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTimer);
} else {
  initTimer();
}