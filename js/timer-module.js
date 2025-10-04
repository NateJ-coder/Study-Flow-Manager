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

// Reminder functionality for the timer page
export function initializeReminderDialog() {
  console.log("🔔 Initializing timer reminder dialog");
  
  const setReminderBtn = document.getElementById('btn-set-reminder');
  const reminderDialog = document.getElementById('reminder-dialog');
  const closeBtn = document.getElementById('reminder-dialog-close');
  const cancelBtn = document.getElementById('reminder-cancel');
  const reminderForm = document.getElementById('reminder-form');
  const dateOption = document.getElementById('reminder-date-option');
  const customDateGroup = document.getElementById('custom-date-group');
  const timeInput = document.getElementById('reminder-time');
  
  console.log("🔍 Element check:", {
    setReminderBtn: !!setReminderBtn,
    reminderDialog: !!reminderDialog,
    closeBtn: !!closeBtn,
    cancelBtn: !!cancelBtn,
    reminderForm: !!reminderForm,
    dateOption: !!dateOption,
    customDateGroup: !!customDateGroup,
    timeInput: !!timeInput
  });
  
  if (!setReminderBtn) {
    console.error("[timer-module.js] Set Reminder button not found! ❌");
    return;
  }
  
  if (!reminderDialog) {
    console.error("[timer-module.js] Reminder dialog not found! ❌");
    return;
  }

  // Set default time to current time + 1 hour
  function setDefaultTime() {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    timeInput.value = `${hours}:${minutes}`;
  }

  // Set default date for custom date picker
  function setDefaultDate() {
    const today = new Date();
    const customDateInput = document.getElementById('reminder-custom-date');
    if (customDateInput) {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      customDateInput.value = `${year}-${month}-${day}`;
    }
  }

  // Show/hide custom date picker
  if (dateOption && !dateOption.dataset.bound) {
    dateOption.addEventListener('change', () => {
      if (dateOption.value === 'custom') {
        customDateGroup.style.display = 'block';
        setDefaultDate();
      } else {
        customDateGroup.style.display = 'none';
      }
    });
    dateOption.dataset.bound = '1';
  }

  // Open reminder dialog
  if (!setReminderBtn.dataset.bound) {
    console.log("🔗 Binding click event to Set Reminder button");
    setReminderBtn.addEventListener('click', (e) => {
      console.log("🔔 Set Reminder button clicked!");
      e.preventDefault();
      e.stopPropagation();
      
      try {
        console.log("📖 Opening reminder dialog...");
        reminderDialog.classList.remove('hidden');
        setDefaultTime();
        
        const nameInput = document.getElementById('reminder-name');
        if (nameInput) {
          nameInput.focus();
        }
        console.log("✅ Reminder dialog opened successfully");
      } catch (error) {
        console.error("❌ Error opening reminder dialog:", error);
      }
    });
    setReminderBtn.dataset.bound = '1';
    console.log("✅ Set Reminder button event listener bound");
  } else {
    console.log("ℹ️ Set Reminder button already bound");
  }

  // Close dialog functions
  function closeDialog() {
    reminderDialog.classList.add('hidden');
    reminderForm.reset();
    dateOption.value = 'today';
    customDateGroup.style.display = 'none';
  }

  // Close button
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.addEventListener('click', closeDialog);
    closeBtn.dataset.bound = '1';
  }

  // Cancel button
  if (cancelBtn && !cancelBtn.dataset.bound) {
    cancelBtn.addEventListener('click', closeDialog);
    cancelBtn.dataset.bound = '1';
  }

  // Close on escape key (only add once)
  if (!document.dataset.reminderEscapeListener) {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !reminderDialog.classList.contains('hidden')) {
        closeDialog();
      }
    });
    document.dataset.reminderEscapeListener = 'true';
  }

  // Close on backdrop click
  if (!reminderDialog.dataset.backdropBound) {
    reminderDialog.addEventListener('click', (e) => {
      if (e.target === reminderDialog) {
        closeDialog();
      }
    });
    reminderDialog.dataset.backdropBound = '1';
  }

  // Form submission
  if (reminderForm && !reminderForm.dataset.bound) {
    reminderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = document.getElementById('reminder-name').value.trim();
      const time = document.getElementById('reminder-time').value;
      const isToday = dateOption.value === 'today';
      
      let reminderDate;
      if (isToday) {
        reminderDate = new Date();
      } else {
        const customDate = document.getElementById('reminder-custom-date').value;
        if (!customDate) {
          alert('Please select a date for your reminder.');
          return;
        }
        reminderDate = new Date(customDate);
      }

      // Set the time on the date
      const [hours, minutes] = time.split(':');
      reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Check if the reminder is in the past
      if (reminderDate <= new Date()) {
        alert('Please select a future time for your reminder.');
        return;
      }

      // Create reminder object
      const reminder = {
        id: Date.now().toString(),
        name: name,
        date: reminderDate.toISOString().split('T')[0],
        time: time,
        dateTime: reminderDate.toISOString(),
        source: 'timer'
      };

      // Save to localStorage (same format as calendar reminders)
      let reminders = [];
      try {
        const stored = localStorage.getItem('studyflow_reminders');
        if (stored) {
          reminders = JSON.parse(stored);
        }
      } catch (e) {
        console.warn('Failed to load existing reminders:', e);
      }

      reminders.push(reminder);
      localStorage.setItem('studyflow_reminders', JSON.stringify(reminders));

      // Set up the timeout for this reminder
      scheduleReminderNotification(reminder);

      console.log('🔔 Reminder created:', reminder);
      
      // Play notification sound to confirm reminder is set
      if (window.playSound) {
        window.playSound('splash');
      }
      
      // Show success message
      alert(`Reminder "${name}" set for ${reminderDate.toLocaleString()}`);
      
      closeDialog();
    });
    reminderForm.dataset.bound = '1';
  }

  console.log("[timer-module.js] Reminder dialog initialized ✅");
}

// Schedule a reminder notification
function scheduleReminderNotification(reminder) {
  const now = new Date();
  const reminderTime = new Date(reminder.dateTime);
  const timeUntilReminder = reminderTime.getTime() - now.getTime();
  
  // Only schedule if it's in the future
  if (timeUntilReminder > 0) {
    // Clear any existing timeout for this reminder
    if (window.reminderTimeouts && window.reminderTimeouts[reminder.id]) {
      clearTimeout(window.reminderTimeouts[reminder.id]);
    }
    
    // Initialize timeout storage if needed
    if (!window.reminderTimeouts) {
      window.reminderTimeouts = {};
    }
    
    // Schedule the notification
    window.reminderTimeouts[reminder.id] = setTimeout(() => {
      triggerTimerReminder(reminder);
      delete window.reminderTimeouts[reminder.id];
    }, timeUntilReminder);
    
    console.log(`🔔 Timer reminder scheduled for ${reminderTime.toLocaleString()}`);
  }
}

// Trigger a timer reminder notification
function triggerTimerReminder(reminder) {
  console.log('🔔 Triggering timer reminder:', reminder);
  
  // Play notification sound
  if (window.playSound) {
    window.playSound('splash');
  }
  
  // Show in-app notification
  showTimerReminderNotification(reminder);
  
  // Browser notification if permission granted
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('StudyFlow Timer Reminder', {
      body: reminder.name,
      icon: '/assets/images/clock-icon.svg'
    });
  }
}

// Show timer reminder notification in app
function showTimerReminderNotification(reminder) {
  const notification = document.createElement('div');
  notification.className = 'timer-reminder-notification';
  notification.innerHTML = `
    <div class="timer-reminder-content">
      <h4>⏰ Timer Reminder</h4>
      <p>${reminder.name}</p>
      <button type="button" class="reminder-dismiss">Dismiss</button>
    </div>
  `;
  
  // Add notification styles if not already present
  if (!document.getElementById('timer-reminder-styles')) {
    const styles = document.createElement('style');
    styles.id = 'timer-reminder-styles';
    styles.textContent = `
      .timer-reminder-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(145deg, #2a1810, #3d2418);
        border: 2px solid var(--svg-wood-primary);
        border-radius: 12px;
        padding: 20px;
        z-index: 10000;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
      }
      
      .timer-reminder-content h4 {
        margin: 0 0 10px 0;
        color: var(--svg-wood-primary);
        font-size: 1.1em;
      }
      
      .timer-reminder-content p {
        margin: 0 0 15px 0;
        color: #fff;
        font-size: 0.95em;
      }
      
      .timer-reminder-content .reminder-dismiss {
        background: var(--svg-wood-primary);
        color: #fff;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9em;
        transition: all 0.2s ease;
      }
      
      .timer-reminder-content .reminder-dismiss:hover {
        background: var(--svg-wood-secondary);
        transform: translateY(-1px);
      }
      
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(styles);
  }
  
  document.body.appendChild(notification);
  
  // Auto-dismiss after 10 seconds
  const autoDismiss = setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 10000);
  
  // Manual dismiss
  const dismissBtn = notification.querySelector('.reminder-dismiss');
  dismissBtn.addEventListener('click', () => {
    clearTimeout(autoDismiss);
    notification.remove();
  });
}

// Initialize existing reminders on page load
export function initializeExistingTimerReminders() {
  console.log("🔔 Checking for existing timer reminders");
  
  // Request notification permission
  requestTimerNotificationPermission();
  
  try {
    const stored = localStorage.getItem('studyflow_reminders');
    if (stored) {
      const reminders = JSON.parse(stored);
      const now = new Date();
      
      // Schedule any future timer reminders
      reminders.forEach(reminder => {
        if (reminder.source === 'timer') {
          const reminderTime = new Date(reminder.dateTime);
          if (reminderTime > now) {
            scheduleReminderNotification(reminder);
          }
        }
      });
    }
  } catch (e) {
    console.warn('Failed to load existing timer reminders:', e);
  }
}

// Request notification permission for timer reminders
function requestTimerNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      console.log(`Timer notification permission: ${permission}`);
    });
  }
}