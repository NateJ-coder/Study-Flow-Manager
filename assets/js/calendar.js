// Calendar JS - Calendar functionality module

// Calendar state
const CalendarState = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
  tasks: {},
  
  load() {
    try {
      const saved = localStorage.getItem('studyflow-calendar');
      if (saved) {
        const data = JSON.parse(saved);
        this.tasks = data.tasks || {};
      }
    } catch (e) {
      console.warn('Could not load calendar data:', e);
    }
  },
  
  save() {
    try {
      const data = {
        tasks: this.tasks
      };
      localStorage.setItem('studyflow-calendar', JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save calendar data:', e);
    }
  },
  
  getDateKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  },
  
  getTasks(date) {
    const key = this.getDateKey(date);
    return this.tasks[key] || [];
  },
  
  addTask(date, task) {
    const key = this.getDateKey(date);
    if (!this.tasks[key]) {
      this.tasks[key] = [];
    }
    this.tasks[key].push(task);
    this.save();
  },
  
  removeTask(date, taskIndex) {
    const key = this.getDateKey(date);
    if (this.tasks[key]) {
      this.tasks[key].splice(taskIndex, 1);
      if (this.tasks[key].length === 0) {
        delete this.tasks[key];
      }
      this.save();
    }
  }
};

// Calendar functionality
const Calendar = {
  container: null,
  titleElement: null,
  prevBtn: null,
  nextBtn: null,
  
  monthNames: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  
  dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  
  init() {
    // Get DOM elements
    this.container = document.getElementById('calendar-grid');
    this.titleElement = document.getElementById('calendar-title');
    this.prevBtn = document.getElementById('prev-month');
    this.nextBtn = document.getElementById('next-month');
    
    if (!this.container || !this.titleElement || !this.prevBtn || !this.nextBtn) {
      console.warn('Calendar elements not found');
      return;
    }
    
    // Load state
    CalendarState.load();
    
    // Setup event listeners
    this.prevBtn.addEventListener('click', () => this.previousMonth());
    this.nextBtn.addEventListener('click', () => this.nextMonth());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      switch (e.code) {
        case 'ArrowLeft':
          if (e.shiftKey) {
            e.preventDefault();
            this.previousMonth();
          }
          break;
        case 'ArrowRight':
          if (e.shiftKey) {
            e.preventDefault();
            this.nextMonth();
          }
          break;
        case 'KeyT':
          if (e.ctrlKey) {
            e.preventDefault();
            this.goToToday();
          }
          break;
      }
    });
    
    // Initial render
    this.render();
  },
  
  previousMonth() {
    CalendarState.currentMonth--;
    if (CalendarState.currentMonth < 0) {
      CalendarState.currentMonth = 11;
      CalendarState.currentYear--;
    }
    this.render();
    this.playSound();
  },
  
  nextMonth() {
    CalendarState.currentMonth++;
    if (CalendarState.currentMonth > 11) {
      CalendarState.currentMonth = 0;
      CalendarState.currentYear++;
    }
    this.render();
    this.playSound();
  },
  
  goToToday() {
    const today = new Date();
    CalendarState.currentMonth = today.getMonth();
    CalendarState.currentYear = today.getFullYear();
    this.render();
  },
  
  render() {
    this.updateTitle();
    this.renderGrid();
  },
  
  updateTitle() {
    const monthName = this.monthNames[CalendarState.currentMonth];
    this.titleElement.textContent = `${monthName} ${CalendarState.currentYear}`;
  },
  
  renderGrid() {
    // Clear existing content
    this.container.innerHTML = '';
    
    // Add day headers
    this.dayNames.forEach(day => {
      const header = document.createElement('div');
      header.className = 'calendar-day-header';
      header.textContent = day;
      this.container.appendChild(header);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(CalendarState.currentYear, CalendarState.currentMonth, 1);
    const lastDay = new Date(CalendarState.currentYear, CalendarState.currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Generate 6 weeks (42 days)
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayElement = this.createDayElement(currentDate);
      this.container.appendChild(dayElement);
    }
  },
  
  createDayElement(date) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = date.getDate();
    
    // Add classes based on date properties
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const isCurrentMonth = date.getMonth() === CalendarState.currentMonth;
    const hasTasks = CalendarState.getTasks(date).length > 0;
    
    if (isToday) dayElement.classList.add('today');
    if (!isCurrentMonth) dayElement.classList.add('other-month');
    if (hasTasks) dayElement.classList.add('has-tasks');
    
    // Add click handler
    dayElement.addEventListener('click', () => {
      this.selectDate(date, dayElement);
    });
    
    // Add hover effect with task preview
    if (hasTasks) {
      dayElement.title = `${CalendarState.getTasks(date).length} task(s)`;
    }
    
    return dayElement;
  },
  
  selectDate(date, element) {
    // Remove previous selection
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Add selection to clicked element
    element.classList.add('selected');
    CalendarState.selectedDate = date;
    
    // Show task popup or create one
    this.showTaskPopup(date, element);
    this.playSound();
  },
  
  showTaskPopup(date, element) {
    // Remove existing popup
    const existingPopup = document.querySelector('.task-popup');
    if (existingPopup) {
      existingPopup.remove();
    }
    
    // Create popup
    const popup = document.createElement('div');
    popup.className = 'task-popup';
    
    const tasks = CalendarState.getTasks(date);
    const dateString = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    popup.innerHTML = `
      <h3>${dateString}</h3>
      <div class="task-list">
        ${tasks.map((task, index) => `
          <div class="task-item">
            <span>${task}</span>
            <button onclick="Calendar.removeTaskByIndex(${index})" class="remove-task">&times;</button>
          </div>
        `).join('')}
      </div>
      <div class="add-task">
        <input type="text" placeholder="Add a task..." class="task-input" maxlength="50">
        <button class="add-task-btn">Add</button>
      </div>
    `;
    
    // Position popup
    element.style.position = 'relative';
    element.appendChild(popup);
    
    // Setup task input
    const input = popup.querySelector('.task-input');
    const addBtn = popup.querySelector('.add-task-btn');
    
    const addTask = () => {
      const taskText = input.value.trim();
      if (taskText) {
        CalendarState.addTask(date, taskText);
        input.value = '';
        this.render(); // Re-render to show changes
        this.showTaskPopup(date, element); // Refresh popup
      }
    };
    
    addBtn.addEventListener('click', addTask);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addTask();
      }
    });
    
    // Auto-focus input
    input.focus();
    
    // Close popup when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function closePopup(e) {
        if (!popup.contains(e.target) && !element.contains(e.target)) {
          popup.remove();
          document.removeEventListener('click', closePopup);
        }
      });
    }, 100);
  },
  
  removeTaskByIndex(index) {
    if (CalendarState.selectedDate) {
      CalendarState.removeTask(CalendarState.selectedDate, index);
      this.render();
      
      // Refresh popup if still selected
      const selectedElement = document.querySelector('.calendar-day.selected');
      if (selectedElement) {
        this.showTaskPopup(CalendarState.selectedDate, selectedElement);
      }
    }
  },
  
  playSound() {
    if (!window.StudyFlow?.AppState?.soundsEnabled) return;
    
    window.StudyFlow.afterPaint(() => {
      const audio = new Audio('/assets/audio/click.mp3');
      audio.volume = 0.2;
      audio.play().catch(() => {});
    });
  }
};

// Initialize calendar
const initCalendar = () => {
  if (document.body.dataset.page === 'calendar') {
    Calendar.init();
  }
};

// Export for global access
window.StudyFlow = window.StudyFlow || {};
window.StudyFlow.Calendar = Calendar;
window.StudyFlow.CalendarState = CalendarState;

// Make removeTaskByIndex globally accessible for inline onclick
window.Calendar = Calendar;

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCalendar);
} else {
  initCalendar();
}// calendar.js — Enhanced Calendar functionality with task management, reminders, and seasonal features
console.log("[calendar.js] Enhanced Calendar module loaded ✅");

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;
let tasks = {};
let reminders = {};
let completedDays = {};
let reminderTimeouts = {};

// Seasonal themes and features
const seasonalFeatures = {
  summer: {
    primaryColor: '#FF9800',
    secondaryColor: '#FFB74D',
    penColor: '#E65100',
    xColor: '#F57C00',
    gradient: 'linear-gradient(135deg, #FF9800, #FFC107)',
    encouragements: ['Sunny success ahead! ☀️', 'Hot streak continues! 🔥', 'Blazing through tasks! 🌞']
  },
  autumn: {
    primaryColor: '#8D6E63',
    secondaryColor: '#A1887F',
    penColor: '#5D4037',
    xColor: '#6D4C41',
    gradient: 'linear-gradient(135deg, #8D6E63, #BCAAA4)',
    encouragements: ['Falling into focus! 🍂', 'Harvesting success! 🍁', 'Crisp and productive! 🌰']
  },
  winter: {
    primaryColor: '#607D8B',
    secondaryColor: '#90A4AE',
    penColor: '#37474F',
    xColor: '#455A64',
    gradient: 'linear-gradient(135deg, #607D8B, #B0BEC5)',
    encouragements: ['Cool and calculated! ❄️', 'Crystalline focus! ❅', 'Sharp as winter air! ⛄']
  }
};

// Completion celebration messages
const completionMessages = [
  "Another one bites the dust! 🎯",
  "Boom! Day conquered! 💥",
  "Mission accomplished! 🚀",
  "Crushed it like a champion! 🏆",
  "Knocked it out of the park! ⚾",
  "Slaying the day like a boss! 👑",
  "Achievement unlocked! 🎮",
  "Victory dance time! 💃",
  "Today's battle: WON! ⚔️",
  "Steamrolled through success! 🚂",
  "Checkmate, productivity! ♟️",
  "Mic drop moment! 🎤",
  "Nailed it to perfection! 🔨",
  "Bulldozed through barriers! 🚜",
  "Scored a perfect game! 🎯",
];

// Get current season
function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter'; // Winter covers months 11, 0, 1, 2, 3, 4 (Nov-Apr)
}

// Load all data from localStorage
function loadTasks() {
  try {
    const savedTasks = localStorage.getItem('studyflow_tasks');
    if (savedTasks) {
      tasks = JSON.parse(savedTasks);
    }
    
    const savedReminders = localStorage.getItem('studyflow_reminders');
    if (savedReminders) {
      reminders = JSON.parse(savedReminders);
    }
    
    const savedCompletedDays = localStorage.getItem('studyflow_completed_days');
    if (savedCompletedDays) {
      completedDays = JSON.parse(savedCompletedDays);
    }
  } catch (error) {
    console.warn("[calendar.js] Failed to load data:", error);
    tasks = {};
    reminders = {};
    completedDays = {};
  }
}

// Save all data to localStorage
function saveTasks() {
  try {
    localStorage.setItem('studyflow_tasks', JSON.stringify(tasks));
    localStorage.setItem('studyflow_reminders', JSON.stringify(reminders));
    localStorage.setItem('studyflow_completed_days', JSON.stringify(completedDays));
  } catch (error) {
    console.warn("[calendar.js] Failed to save data:", error);
  }
}

// Initialize calendar
export function initializeCalendar() {
  console.log("[calendar.js] Initializing enhanced calendar functionality");
  
  loadTasks();
  applySeasonalTheme();
  renderCalendar();
  setupEventListeners();
  updateCalendarTitle();
  setupReminderSystem();
  setupKeyboardShortcuts();
  
  // Apply seasonal styling
  updateSeasonalStyles();
  
  // Show seasonal welcome message
  const season = getCurrentSeason();
  const welcomeMsg = `Welcome to your ${season} calendar! 🗓️ Right-click days to mark them complete, click to add tasks and reminders.`;
  showEncouragement(welcomeMsg);
}

// Apply current season theme
function applySeasonalTheme() {
  const season = getCurrentSeason();
  const theme = seasonalFeatures[season];
  document.documentElement.style.setProperty('--season-primary', theme.primaryColor);
  document.documentElement.style.setProperty('--season-secondary', theme.secondaryColor);
  document.documentElement.style.setProperty('--season-gradient', theme.gradient);
}

// Update seasonal styles dynamically
function updateSeasonalStyles() {
  const season = getCurrentSeason();
  const theme = seasonalFeatures[season];
  
  // Apply to calendar elements
  const calendarGrid = document.getElementById('calendar-grid');
  if (calendarGrid) {
    calendarGrid.style.setProperty('--seasonal-accent', theme.primaryColor);
  }
  
  // Update page title with seasonal emoji
  const pageTitle = document.querySelector('#page-calendar .page-title h1');
  if (pageTitle) {
    const seasonEmojis = {
      summer: '☀️', 
      autumn: '🍂',
      winter: '❄️'
    };
    pageTitle.innerHTML = `Calendar ${seasonEmojis[season]}`;
  }
  
  // Apply seasonal tint to background
  document.documentElement.style.setProperty('--calendar-seasonal-bg', `${theme.primaryColor}15`);
}

function setupEventListeners() {
  // Month navigation
  const prevBtn = document.getElementById('cal-prev');
  const nextBtn = document.getElementById('cal-next');
  
  if (prevBtn) {
    prevBtn.onclick = () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar();
      updateCalendarTitle();
    };
  }
  
  if (nextBtn) {
    nextBtn.onclick = () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar();
      updateCalendarTitle();
    };
  }
  
  // Task management
  const addBtn = document.getElementById('task-add');
  const closeBtn = document.getElementById('task-close');
  const moveBtn = document.getElementById('task-move-incomplete');
  
  if (addBtn) {
    addBtn.onclick = addTask;
  }
  
  if (closeBtn) {
    closeBtn.onclick = closeTaskDialog;
  }
  
  if (moveBtn) {
    moveBtn.onclick = moveIncompleteTasks;
  }
  
  // Reminder management
  const reminderAddBtn = document.getElementById('reminder-add');
  if (reminderAddBtn) {
    reminderAddBtn.onclick = addReminder;
  }
  
  // Enter key to add task
  const newTaskInput = document.getElementById('new-task-input');
  if (newTaskInput) {
    newTaskInput.onkeypress = (e) => {
      if (e.key === 'Enter') {
        addTask();
      }
    };
  }
  
  // Enter key to add reminder
  const newReminderText = document.getElementById('new-reminder-text');
  if (newReminderText) {
    newReminderText.onkeypress = (e) => {
      if (e.key === 'Enter') {
        addReminder();
      }
    };
  }
  
  // Right-click handler for days
  const calendarGrid = document.getElementById('calendar-grid');
  if (calendarGrid) {
    calendarGrid.addEventListener('contextmenu', handleRightClick);
  }
  
  // Click outside popup to close
  document.addEventListener('click', (e) => {
    const popup = document.getElementById('calendar-task-popup');
    if (popup && !popup.classList.contains('hidden')) {
      if (!popup.contains(e.target) && !e.target.closest('.calendar-day')) {
        closeTaskDialog();
      }
    }
  });
  
  // ESC key to close popup
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const popup = document.getElementById('calendar-task-popup');
      if (popup && !popup.classList.contains('hidden')) {
        closeTaskDialog();
      }
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Setup keyboard shortcuts help toggle
function setupKeyboardShortcuts() {
  const shortcutsToggle = document.getElementById('shortcuts-toggle');
  const shortcutsHelp = document.getElementById('keyboard-shortcuts');
  
  if (shortcutsToggle && shortcutsHelp) {
    shortcutsToggle.addEventListener('click', () => {
      shortcutsHelp.classList.toggle('collapsed');
    });
    
    // Auto-hide after 5 seconds when opened
    let hideTimeout;
    shortcutsToggle.addEventListener('click', () => {
      clearTimeout(hideTimeout);
      if (!shortcutsHelp.classList.contains('collapsed')) {
        hideTimeout = setTimeout(() => {
          shortcutsHelp.classList.add('collapsed');
        }, 5000);
      }
    });
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!shortcutsHelp.contains(e.target)) {
        shortcutsHelp.classList.add('collapsed');
      }
    });
  }
}

// Handle right-click to cross out days
function handleRightClick(e) {
  e.preventDefault();
  const dayCell = e.target.closest('.calendar-day');
  if (dayCell) {
    const dateKey = dayCell.getAttribute('data-date');
    if (dateKey) {
      crossOutDay(dateKey, dayCell);
    }
  }
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
  // Only handle shortcuts if not typing in an input
  if (e.target.matches('input, textarea')) return;
  
  // Press 'X' to cross out current day
  if (e.key.toLowerCase() === 'x') {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    const todayCell = document.querySelector(`[data-date="${todayKey}"]`);
    if (todayCell && !completedDays[todayKey]) {
      crossOutDay(todayKey, todayCell);
      showEncouragement("Quick completion! Today is done! ⚡");
    }
  }
  
  // Arrow keys for month navigation
  if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    document.getElementById('cal-prev')?.click();
  }
  
  if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    document.getElementById('cal-next')?.click();
  }
  
  // Press 'T' to open today's tasks
  if (e.key.toLowerCase() === 't') {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    const todayCell = document.querySelector(`[data-date="${todayKey}"]`);
    if (todayCell) {
      openTaskDialog(todayKey, todayCell);
    }
  }
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  // Get first day of month and days in month
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-empty';
    grid.appendChild(emptyCell);
  }
  
  // Add days of the month
  const today = new Date();
  const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    dayCell.textContent = day;
    dayCell.setAttribute('data-date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
    
    // Highlight today
    if (isCurrentMonth && day === today.getDate()) {
      dayCell.classList.add('today');
    }
    
    // Check for tasks
    const dateKey = dayCell.getAttribute('data-date');
    if (tasks[dateKey] && tasks[dateKey].length > 0) {
      dayCell.classList.add('has-tasks');
      
      // Check if all tasks are completed
      const allCompleted = tasks[dateKey].every(task => task.completed);
      if (allCompleted) {
        dayCell.classList.add('completed');
      }
    }
    
    // Check if day is crossed out
    if (completedDays[dateKey]) {
      dayCell.classList.add('crossed-out');
      addCrossOutAnimation(dayCell);
    }
    
    // Click handler - pass the clicked element for positioning
    dayCell.onclick = () => openTaskDialog(dateKey, dayCell);
    
    grid.appendChild(dayCell);
  }
}

function updateCalendarTitle() {
  const titleElement = document.getElementById('cal-title');
  if (titleElement) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    titleElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  }
}

function openTaskDialog(dateKey, clickedDayElement = null) {
  selectedDate = dateKey;
  const popup = document.getElementById('calendar-task-popup');
  const dateLabel = document.getElementById('task-date-label');
  const taskList = document.getElementById('task-list');
  
  if (!popup || !dateLabel || !taskList) return;
  
  // Update date label
  const date = new Date(dateKey + 'T00:00:00');
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateLabel.textContent = `Tasks — ${date.toLocaleDateString('en-US', options)}`;
  
  // Render tasks and reminders
  renderTaskList(dateKey, taskList);
  renderReminderControls(dateKey);
  
  // Clear input
  const input = document.getElementById('new-task-input');
  if (input) {
    input.value = '';
  }
  
  // Position popup next to clicked day
  if (clickedDayElement) {
    positionPopupNearElement(popup, clickedDayElement);
  } else {
    // Default position if no element provided
    popup.style.left = '50px';
    popup.style.top = '100px';
  }
  
  // Show popup
  popup.classList.remove('hidden');
  
  // Focus input after animation
  setTimeout(() => {
    if (input) input.focus();
  }, 200);
}

function renderTaskList(dateKey, container) {
  container.innerHTML = '';
  
  const dayTasks = tasks[dateKey] || [];
  
  if (dayTasks.length === 0) {
    container.innerHTML = '<p class="no-tasks">No tasks for this day. Add one below!</p>';
    return;
  }
  
  dayTasks.forEach((task, index) => {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
    
    taskItem.innerHTML = `
      <label class="task-checkbox">
        <input type="checkbox" ${task.completed ? 'checked' : ''} 
               onchange="toggleTask('${dateKey}', ${index})">
        <span class="task-text">${escapeHtml(task.text)}</span>
      </label>
      <button class="task-delete" onclick="deleteTask('${dateKey}', ${index})" aria-label="Delete task">×</button>
    `;
    
    container.appendChild(taskItem);
  });
}

function addTask() {
  const input = document.getElementById('new-task-input');
  const timeInput = document.getElementById('reminder-time-input');
  const advanceSelect = document.getElementById('reminder-advance-select');
  
  if (!input || !selectedDate) return;
  
  const taskText = input.value.trim();
  if (!taskText) return;
  
  // Initialize tasks array for date if it doesn't exist
  if (!tasks[selectedDate]) {
    tasks[selectedDate] = [];
  }
  
  // Add new task
  const newTask = {
    text: taskText,
    completed: false,
    created: new Date().toISOString()
  };
  
  tasks[selectedDate].push(newTask);
  
  // Handle reminder if time is set
  if (timeInput && timeInput.value) {
    addReminder(selectedDate, taskText, timeInput.value, advanceSelect?.value || '0');
  }
  
  // Save and update display
  saveTasks();
  renderTaskList(selectedDate, document.getElementById('task-list'));
  renderCalendar(); // Update calendar to show task indicators
  
  // Add visual feedback for task addition
  const dayCell = document.querySelector(`[data-date="${selectedDate}"]`);
  if (dayCell) {
    dayCell.classList.add('task-added-animation');
    setTimeout(() => {
      dayCell.classList.remove('task-added-animation');
    }, 600);
  }
  
  // Play click sound if available
  const clickSound = document.getElementById('audio-click');
  if (clickSound) {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {}); // Silent fail if audio can't play
  }
  
  // Clear inputs and keep focus
  input.value = '';
  if (timeInput) timeInput.value = '';
  input.focus();
  
  // Show encouraging message
  showEncouragement("Task added! 📝 Keep building momentum!");
  
  console.log(`[calendar.js] Added task: "${taskText}" for ${selectedDate}`);
}

function toggleTask(dateKey, index) {
  if (!tasks[dateKey] || !tasks[dateKey][index]) return;
  
  tasks[dateKey][index].completed = !tasks[dateKey][index].completed;
  saveTasks();
  renderCalendar(); // Update calendar to show completion status
  
  // Add drawing animation to the calendar day
  const dayCell = document.querySelector(`[data-date="${dateKey}"]`);
  if (dayCell && tasks[dateKey][index].completed) {
    dayCell.classList.add('drawing-animation');
    setTimeout(() => {
      dayCell.classList.remove('drawing-animation');
    }, 800);
  }
  
  console.log(`[calendar.js] Toggled task ${index} for ${dateKey}:`, tasks[dateKey][index].completed);
}

function deleteTask(dateKey, index) {
  if (!tasks[dateKey] || !tasks[dateKey][index]) return;
  
  const taskText = tasks[dateKey][index].text;
  tasks[dateKey].splice(index, 1);
  
  // Remove date entry if no tasks left
  if (tasks[dateKey].length === 0) {
    delete tasks[dateKey];
  }
  
  saveTasks();
  renderTaskList(dateKey, document.getElementById('task-list'));
  renderCalendar();
  
  console.log(`[calendar.js] Deleted task: "${taskText}" from ${dateKey}`);
}

function moveIncompleteTasks() {
  if (!selectedDate || !tasks[selectedDate]) return;
  
  const incompleteTasks = tasks[selectedDate].filter(task => !task.completed);
  if (incompleteTasks.length === 0) {
    showEncouragement("All tasks completed! Great job! 🎉");
    return;
  }
  
  // Calculate next day
  const currentDate = new Date(selectedDate + 'T00:00:00');
  currentDate.setDate(currentDate.getDate() + 1);
  const nextDateKey = currentDate.toISOString().split('T')[0];
  
  // Move incomplete tasks to next day
  if (!tasks[nextDateKey]) {
    tasks[nextDateKey] = [];
  }
  
  incompleteTasks.forEach(task => {
    tasks[nextDateKey].push({
      ...task,
      moved: true,
      movedFrom: selectedDate
    });
  });
  
  // Keep only completed tasks for current day
  tasks[selectedDate] = tasks[selectedDate].filter(task => task.completed);
  if (tasks[selectedDate].length === 0) {
    delete tasks[selectedDate];
  }
  
  saveTasks();
  renderTaskList(selectedDate, document.getElementById('task-list'));
  renderCalendar();
  
  showEncouragement(`Moved ${incompleteTasks.length} incomplete tasks to tomorrow. Fresh start! 💪`);
  
  console.log(`[calendar.js] Moved ${incompleteTasks.length} tasks from ${selectedDate} to ${nextDateKey}`);
}

function closeTaskDialog() {
  const popup = document.getElementById('calendar-task-popup');
  if (popup) {
    popup.classList.add('hidden');
  }
  selectedDate = null;
}

function positionPopupNearElement(popup, element) {
  const rect = element.getBoundingClientRect();
  const popupWidth = 400; // matches CSS width
  const popupHeight = 500; // estimated height
  const margin = 10; // minimum margin from screen edges
  
  // Get viewport dimensions with scroll offset
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  
  let left, top;
  
  // Try positioning to the right of the element first
  left = rect.right + margin;
  top = rect.top + scrollY;
  
  // Check if popup fits to the right
  if (left + popupWidth > viewportWidth) {
    // Try positioning to the left
    left = rect.left - popupWidth - margin;
    
    // If still doesn't fit to the left, center horizontally
    if (left < margin) {
      left = Math.max(margin, (viewportWidth - popupWidth) / 2);
    }
  }
  
  // Ensure left position is not off-screen
  left = Math.max(margin, Math.min(left, viewportWidth - popupWidth - margin));
  
  // Adjust vertical position if popup goes off bottom
  if (top + popupHeight > scrollY + viewportHeight) {
    // Try positioning above the element
    top = rect.top + scrollY - popupHeight - margin;
    
    // If still goes off top, position at top with margin
    if (top < scrollY + margin) {
      top = scrollY + margin;
    }
  }
  
  // Ensure top position is not off-screen
  top = Math.max(scrollY + margin, Math.min(top, scrollY + viewportHeight - popupHeight - margin));
  
  // Apply final positions
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  
  console.log('Positioned popup at:', { 
    left, 
    top, 
    elementRect: rect, 
    viewport: { width: viewportWidth, height: viewportHeight },
    scroll: { x: scrollX, y: scrollY }
  });
}

function showEncouragement(message) {
  const encouragement = document.getElementById('encouragement');
  if (encouragement) {
    encouragement.textContent = message;
    encouragement.hidden = false;
    
    setTimeout(() => {
      encouragement.hidden = true;
    }, 3000);
  }
}

// Add reminder for a task
function addReminder(dateKey, taskText, time, advanceMinutes) {
  const [hours, minutes] = time.split(':').map(Number);
  const taskDate = new Date(dateKey + 'T00:00:00');
  taskDate.setHours(hours, minutes, 0, 0);
  
  // Subtract advance time
  const reminderDate = new Date(taskDate.getTime() - (parseInt(advanceMinutes) * 60 * 1000));
  
  if (!reminders[dateKey]) {
    reminders[dateKey] = [];
  }
  
  const reminder = {
    taskText,
    datetime: reminderDate.toISOString(),
    originalTime: time,
    advance: advanceMinutes,
    triggered: false
  };
  
  reminders[dateKey].push(reminder);
  
  // Show confirmation message
  const confirmationMsg = `Alright! I will remind you at ${reminderDate.toLocaleString()} to ${taskText}.`;
  showEncouragement(confirmationMsg);
  
  console.log(`[calendar.js] Added reminder for "${taskText}" at ${reminderDate.toLocaleString()}`);
}

// Render reminder controls in task popup
function renderReminderControls(dateKey) {
  const reminderList = document.getElementById('reminder-list');
  if (!reminderList) return;
  
  // Auto-fill reminder date with selected date
  const reminderDateInput = document.getElementById('new-reminder-date');
  if (reminderDateInput) {
    reminderDateInput.value = dateKey;
  }
  
  // Clear existing reminders
  reminderList.innerHTML = '';
  
  // Get reminders for this date
  const dayReminders = reminders[dateKey] || [];
  
  if (dayReminders.length === 0) {
    reminderList.innerHTML = '<div class="no-reminders" style="text-align: center; color: #888; padding: 10px; font-style: italic;">No reminders set</div>';
    return;
  }
  
  // Render each reminder
  dayReminders.forEach((reminder, index) => {
    const reminderEl = document.createElement('div');
    reminderEl.className = 'reminder-item';
    reminderEl.innerHTML = `
      <div class="reminder-content">
        <span class="reminder-time">${reminder.time}</span>
        <span class="reminder-text">${reminder.text}</span>
      </div>
      <button class="reminder-delete" onclick="deleteReminder('${dateKey}', ${index})" title="Delete reminder">&times;</button>
    `;
    reminderList.appendChild(reminderEl);
  });
}

// Delete a reminder
function deleteReminder(dateKey, index) {
  if (!reminders[dateKey] || !reminders[dateKey][index]) return;
  
  reminders[dateKey].splice(index, 1);
  
  if (reminders[dateKey].length === 0) {
    delete reminders[dateKey];
  }
  
  saveTasks();
  renderReminderControls(dateKey);
}

// Add reminder function
function addReminder() {
  const reminderText = document.getElementById('new-reminder-text');
  const reminderTime = document.getElementById('new-reminder-time');
  
  if (!reminderText || !reminderTime || !selectedDate) return;
  
  const text = reminderText.value.trim();
  const time = reminderTime.value;
  
  if (!text || !time) {
    alert('Please enter both reminder message and time');
    return;
  }
  
  // Create reminder object
  const reminder = {
    text: text,
    time: time,
    datetime: `${selectedDate}T${time}:00`,
    triggered: false
  };
  
  // Initialize reminders array for this date if needed
  if (!reminders[selectedDate]) {
    reminders[selectedDate] = [];
  }
  
  // Add reminder
  reminders[selectedDate].push(reminder);
  
  // Clear inputs
  reminderText.value = '';
  reminderTime.value = '';
  
  // Save and refresh
  saveTasks();
  renderReminderControls(selectedDate);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Cross out day with animation and sound
function crossOutDay(dateKey, dayCell) {
  if (completedDays[dateKey]) return; // Already crossed out
  
  completedDays[dateKey] = {
    crossedOut: true,
    timestamp: new Date().toISOString()
  };
  
  saveTasks();
  
  // Add crossed-out styling
  dayCell.classList.add('crossed-out');
  
  // Add permanent X immediately (so it stays visible)
  addCrossOutAnimation(dayCell);
  
  // Play drawing animation (this will show pen motion)
  playDrawingAnimation(dayCell);
  
  // Play drawing sound
  playSound('drawing');
  
  // Show completion message with seasonal variation
  const season = getCurrentSeason();
  const seasonalMsg = seasonalFeatures[season].encouragements[Math.floor(Math.random() * seasonalFeatures[season].encouragements.length)];
  const generalMsg = completionMessages[Math.floor(Math.random() * completionMessages.length)];
  const message = Math.random() > 0.5 ? seasonalMsg : generalMsg;
  showEncouragement(message);
  
  console.log(`[calendar.js] Crossed out day: ${dateKey}`);
}

// Create and play pen drawing animation
function playDrawingAnimation(dayCell) {
  const season = getCurrentSeason();
  const theme = seasonalFeatures[season];
  
  // Create SVG animation overlay
  const svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgOverlay.setAttribute('class', 'drawing-animation-svg');
  svgOverlay.setAttribute('viewBox', '0 0 100 100');
  svgOverlay.style.position = 'absolute';
  svgOverlay.style.top = '0';
  svgOverlay.style.left = '0';
  svgOverlay.style.width = '100%';
  svgOverlay.style.height = '100%';
  svgOverlay.style.pointerEvents = 'none';
  svgOverlay.style.zIndex = '15'; // Higher z-index to show above permanent X
  svgOverlay.style.backgroundColor = 'transparent';
  
  // Create pen tip (small circle that moves)
  const penTip = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  penTip.setAttribute('r', '3');
  penTip.setAttribute('fill', theme.penColor);
  penTip.setAttribute('opacity', '0.9');
  penTip.style.filter = 'drop-shadow(1px 1px 2px rgba(0,0,0,0.8))';
  
  // Create first stroke path (top-left to bottom-right)
  const stroke1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  stroke1.setAttribute('d', 'M20,20 L80,80');
  stroke1.setAttribute('stroke', theme.penColor);
  stroke1.setAttribute('stroke-width', '3');
  stroke1.setAttribute('fill', 'none');
  stroke1.setAttribute('stroke-linecap', 'round');
  stroke1.setAttribute('opacity', '0.8');
  stroke1.style.filter = 'drop-shadow(1px 1px 1px rgba(0,0,0,0.6))';
  
  // Create second stroke path (top-right to bottom-left)
  const stroke2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  stroke2.setAttribute('d', 'M80,20 L20,80');
  stroke2.setAttribute('stroke', theme.penColor);
  stroke2.setAttribute('stroke-width', '3');
  stroke2.setAttribute('fill', 'none');
  stroke2.setAttribute('stroke-linecap', 'round');
  stroke2.setAttribute('opacity', '0.8');
  stroke2.style.filter = 'drop-shadow(1px 1px 1px rgba(0,0,0,0.6))';
  
  // Add elements to SVG
  svgOverlay.appendChild(stroke1);
  svgOverlay.appendChild(stroke2);
  svgOverlay.appendChild(penTip);
  
  // Position relative container and add SVG
  dayCell.style.position = 'relative';
  dayCell.appendChild(svgOverlay);
  
  // Animate first stroke
  const path1Length = stroke1.getTotalLength();
  stroke1.style.strokeDasharray = path1Length;
  stroke1.style.strokeDashoffset = path1Length;
  
  const path2Length = stroke2.getTotalLength();
  stroke2.style.strokeDasharray = path2Length;
  stroke2.style.strokeDashoffset = path2Length;
  
  // Start pen tip at first position
  penTip.setAttribute('cx', '20');
  penTip.setAttribute('cy', '20');
  
  // Animate first stroke
  const anim1 = stroke1.animate([
    { strokeDashoffset: path1Length },
    { strokeDashoffset: 0 }
  ], {
    duration: 600,
    easing: 'ease-in-out',
    fill: 'forwards'
  });
  
  // Animate pen tip for first stroke
  penTip.animate([
    { cx: '20', cy: '20' },
    { cx: '80', cy: '80' }
  ], {
    duration: 600,
    easing: 'ease-in-out',
    fill: 'forwards'
  });
  
  // After first stroke, animate second stroke
  setTimeout(() => {
    // Move pen tip to start of second stroke
    penTip.setAttribute('cx', '80');
    penTip.setAttribute('cy', '20');
    
    // Animate second stroke
    stroke2.animate([
      { strokeDashoffset: path2Length },
      { strokeDashoffset: 0 }
    ], {
      duration: 600,
      easing: 'ease-in-out',
      fill: 'forwards'
    });
    
    // Animate pen tip for second stroke
    penTip.animate([
      { cx: '80', cy: '20' },
      { cx: '20', cy: '80' }
    ], {
      duration: 600,
      easing: 'ease-in-out',
      fill: 'forwards'
    });
  }, 650);
  
  // Remove pen animation after both strokes complete
  setTimeout(() => {
    if (svgOverlay.parentNode) {
      svgOverlay.remove();
    }
  }, 1500);
}

// Add permanent cross-out styling to crossed-out days
function addCrossOutAnimation(dayCell) {
  const season = getCurrentSeason();
  const theme = seasonalFeatures[season];
  
  // Check if permanent X already exists
  if (dayCell.querySelector('.permanent-x')) {
    return; // Already has permanent X
  }
  
  // Add permanent X mark with SVG for better quality
  const xMarkPermanent = document.createElement('div');
  xMarkPermanent.className = 'permanent-x';
  xMarkPermanent.style.position = 'absolute';
  xMarkPermanent.style.top = '0';
  xMarkPermanent.style.left = '0';
  xMarkPermanent.style.width = '100%';
  xMarkPermanent.style.height = '100%';
  xMarkPermanent.style.pointerEvents = 'none';
  xMarkPermanent.style.display = 'flex';
  xMarkPermanent.style.alignItems = 'center';
  xMarkPermanent.style.justifyContent = 'center';
  xMarkPermanent.style.zIndex = '5';
  
  // Create SVG X for better visibility
  xMarkPermanent.innerHTML = `
    <svg width="80%" height="80%" viewBox="0 0 100 100" style="pointer-events: none;">
      <path d="M20,20 L80,80 M80,20 L20,80" 
            stroke="${theme.xColor}" 
            stroke-width="6" 
            stroke-linecap="round" 
            fill="none" 
            opacity="0.9"
            style="filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.5));" />
    </svg>
  `;
  
  dayCell.style.position = 'relative';
  dayCell.appendChild(xMarkPermanent);
}

// Setup reminder system
function setupReminderSystem() {
  // Check for due reminders on load
  checkDueReminders();
  
  // Set up interval to check reminders every minute
  setInterval(checkDueReminders, 60000);
}

// Check and trigger due reminders
function checkDueReminders() {
  const now = new Date();
  
  Object.keys(reminders).forEach(dateKey => {
    const dayReminders = reminders[dateKey] || [];
    dayReminders.forEach((reminder, index) => {
      if (!reminder.triggered && new Date(reminder.datetime) <= now) {
        triggerReminder(reminder);
        reminder.triggered = true;
        saveTasks();
      }
    });
  });
}

// Trigger a reminder notification
function triggerReminder(reminder) {
  // Play notification sound
  playSound('splash');
  
  // Show notification
  showReminderNotification(reminder);
  
  // Browser notification if permission granted
  if (Notification.permission === 'granted') {
    new Notification('StudyFlow Reminder', {
      body: `Time to: ${reminder.taskText}`,
      icon: '/assets/images/clock-icon.svg'
    });
  }
}

// Show reminder notification in app
function showReminderNotification(reminder) {
  const notification = document.createElement('div');
  notification.className = 'reminder-notification';
  notification.innerHTML = `
    <div class="reminder-content">
      <h3>⏰ Reminder</h3>
      <p><strong>${reminder.taskText}</strong></p>
      <p>Scheduled for: ${new Date(reminder.datetime).toLocaleString()}</p>
      <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 10000);
}

// Play sound effect
function playSound(soundName) {
  try {
    // Try to play generated audio buffer first
    if (window.AudioContext || window.webkitAudioContext) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      let buffer = null;
      
      if (soundName === 'splash' && window.splashAudioBuffer) {
        buffer = window.splashAudioBuffer;
      } else if (soundName === 'drawing' && window.drawingAudioBuffer) {
        buffer = window.drawingAudioBuffer;
      }
      
      if (buffer) {
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        
        source.buffer = buffer;
        gainNode.gain.value = 0.3; // 30% volume
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start();
        return;
      }
    }
    
    // Fallback to loading MP3 file
    const audio = new Audio(`/assets/audio/${soundName}.mp3`);
    audio.volume = 0.5; // 50% volume
    audio.play().catch(error => {
      console.warn(`[calendar.js] Could not play ${soundName}.mp3:`, error);
    });
  } catch (error) {
    console.warn(`[calendar.js] Error playing sound ${soundName}:`, error);
  }
}

// Request notification permission
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Make functions globally available for onclick handlers
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.crossOutDay = crossOutDay;
window.deleteReminder = deleteReminder;

// Export for use in core-modern.js
export { loadTasks, saveTasks, requestNotificationPermission };