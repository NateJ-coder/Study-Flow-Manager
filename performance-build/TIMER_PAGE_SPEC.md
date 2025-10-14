# StudyFlow Timer Page Documentation

## Overview
The StudyFlow Timer page is a Pomodoro timer application with seasonal theming, background slideshow capabilities, and comprehensive settings. This document captures all the essential components for rebuilding the timer from scratch.

## HTML Structure

### Head Section
- **Performance Optimizations**: Preload critical images and audio files
- **Font Preconnects**: Google Fonts preparation
- **Critical CSS**: Inline styles for performance
- **Meta Tags**: Standard viewport and charset settings

### Body Layout
```
body.{theme}-theme
├── .studyflow-logo (top-left)
├── .clock-container (top-right)
│   ├── .clock-icon (SVG button)
│   └── .perpetual-clock (HH:MM:SS display)
├── #bg-container (full-screen background)
└── .container (main content area)
    └── .timer-card
        ├── .back-btn (wooden style)
        ├── .calendar-icon (SVG button, top-right of card)
        ├── .settings-icon (SVG button, top-right of card)
        ├── .timer-mode (session type display)
        ├── .timer-display (25:00 countdown)
        ├── .timer-controls
        │   ├── #startButton (Play/Pause)
        │   └── #resetButton (Reset)
        └── session info paragraph
```

## CSS Styling

### CSS Custom Properties (Theme Variables)
```css
:root {
  --primary-bg: #0f1419;
  --text-color: #e7eaee;
  --amber-300: #fcd34d;
  --amber-500: #f59e0b;
  --amber-600: #d97706;
  
  /* Default: Autumn Theme */
  --season-primary: #CD853F;
  --season-secondary: #D2691E;
  --season-accent: #FF8C00;
  --season-text: #FFF8DC;
  --season-border: rgba(205, 133, 63, 0.3);
}

/* Summer Theme */
body.summer-theme {
  --season-primary: #228B22;
  --season-secondary: #32CD32;
  --season-accent: #00FF7F;
  --season-text: #F0FFF0;
  --season-border: rgba(34, 139, 34, 0.3);
}

/* Winter Theme */
body.winter-theme {
  --season-primary: #F0F8FF;
  --season-secondary: #E6E6FA;
  --season-accent: #B0E0E6;
  --season-text: #2F4F4F;
  --season-border: rgba(240, 248, 255, 0.3);
}
```

### Key Component Styles

#### Timer Card
- **Size**: Max-width 500px, centered
- **Background**: Semi-transparent with backdrop-filter blur
- **Border**: Seasonal color with rounded corners
- **Shadow**: Large drop shadow for depth

#### Wooden Buttons
- **Background**: Gradient with seasonal colors
- **Border**: 3D effect with multiple box-shadows
- **Typography**: Bold, centered text
- **Interactions**: Hover effects with transform and color changes
- **Audio**: Click sound integration

#### Timer Display
- **Font**: Large (4rem), monospace
- **Color**: Seasonal primary color
- **Spacing**: Letter-spacing for readability
- **Responsiveness**: Scales down on mobile

### Background System
- **Container**: Fixed position, full viewport
- **Image**: Cover sizing, center positioning
- **Effects**: Brightness 0.7, blur 1px filter
- **Transitions**: 1s ease-in-out for smooth changes
- **GPU Optimization**: transform3d and will-change properties

## SVG Icons

### Clock Icon (Timer Button)
```xml
<svg width="24" height="24" viewBox="0 0 60 60">
  <circle cx="30" cy="30" r="25" fill="#8B4513" stroke="#A0522D"/>
  <circle cx="30" cy="30" r="20" fill="none" stroke="#6F3B18"/>
  <path d="M30 15L30 30L40 35" stroke="#5A2D0C" stroke-width="2"/>
  <circle cx="30" cy="30" r="2" fill="#5A2D0C"/>
  <!-- Hour markers -->
  <path d="M30 10V15" stroke="#6F3B18"/>
  <path d="M50 30H45" stroke="#6F3B18"/>
  <path d="M30 50V45" stroke="#6F3B18"/>
  <path d="M10 30H15" stroke="#6F3B18"/>
</svg>
```

### Calendar Icon
```xml
<svg width="32" height="32" viewBox="0 0 60 60">
  <rect x="15" y="15" width="30" height="35" rx="5" fill="#A0522D"/>
  <rect x="18" y="10" width="24" height="8" rx="3" fill="#8B4513"/>
  <circle cx="23" cy="14" r="2" fill="#5A2D0C"/>
  <circle cx="37" cy="14" r="2" fill="#5A2D0C"/>
  <!-- Grid lines -->
  <path d="M15 25H45" stroke="#6F3B18"/>
  <path d="M15 32H45" stroke="#6F3B18"/>
  <path d="M15 39H45" stroke="#6F3B18"/>
  <path d="M22 15V50" stroke="#6F3B18"/>
  <path d="M29 15V50" stroke="#6F3B18"/>
  <path d="M36 15V50" stroke="#6F3B18"/>
  <!-- Date number -->
  <text x="25" y="47" font-family="Arial" font-size="14" fill="#E8D1B5">17</text>
  <!-- Decorative elements -->
  <path d="M17 20C19 18 25 18 27 20" stroke="#6F3B18"/>
  <path d="M38 30C40 28 40 32 38 34" stroke="#6F3B18"/>
</svg>
```

### Settings Icon (Wooden Gear)
- **Complex SVG**: Multi-layered gear with wood grain texture
- **Features**: Radial gradients, wood texture filter, specular highlights
- **Components**: Main gear body, 12 rotated teeth, center hole with inner shadow
- **Styling**: CSS custom properties for easy theming

## Settings Modal

### Structure
```
.settings-modal (overlay)
└── .settings-content (centered modal)
    ├── Header (title + close button)
    ├── .settings-group (Pomodoro Settings)
    │   └── .settings-row × 4 (focus, breaks, sessions)
    ├── .settings-group (Audio Settings)
    │   └── .settings-row × 2 (notification, clicks)
    ├── .settings-group (Background Settings)  
    │   └── .settings-row × 2 (slideshow, timezone)
    ├── .settings-group (Theme Settings)
    │   └── .theme-selector
    │       └── .theme-option × 3 (autumn, summer, winter)
    └── Save button
```

### Settings Options

#### Pomodoro Settings
- Focus Time: 1-120 minutes (default: 25)
- Short Break: 1-30 minutes (default: 5)
- Long Break: 1-60 minutes (default: 15)
- Sessions until Long Break: 2-8 (default: 4)

#### Audio Settings
- Timer Completion Sound: Toggle (default: on)
- Button Click Sounds: Toggle (default: on)

#### Background Settings
- Slideshow Transition: 20-120 seconds (minimum enforced)
- Timezone: Dropdown with major timezones

#### Theme Options
- Autumn: 🍂 (default)
- Summer: 🌿
- Winter: ❄️

## JavaScript Functionality

### Global State
```javascript
window.timerSettings = {
  focusTime: 25,
  shortBreak: 5,
  longBreak: 15,
  sessionsUntilLong: 4,
  slideshowTime: 20,
  theme: 'autumn',
  timezone: 'auto-detect',
  notificationAudio: true,
  clickAudio: true
};
```

### Core Functions

#### Audio System
- `playClickSound(event)`: Plays click.mp3 with volume 0.3
- Respects user audio preferences
- Handles autoplay restrictions gracefully

#### Perpetual Clock
- `updatePerpetualClock()`: Updates HH:MM:SS display
- Runs every second via setInterval
- Uses 24-hour format

#### Theme Management
- `selectTheme(theme)`: Updates UI selection, stores pending theme
- `applyTheme(theme)`: Applies theme to background system
- Two-step process: select in UI, apply on save

#### Navigation
- `goToTimer()`: Already on page, provides feedback
- `goToCalendar()`: Navigate to calendar page

### Timer Logic Requirements
- **States**: focus, shortBreak, longBreak
- **Session Tracking**: Current session number, total sessions
- **Time Management**: Countdown display, state transitions
- **Audio Integration**: Completion sounds, click feedback
- **Settings Integration**: Dynamic duration updates

### Settings Management
- **UI Loading**: Populate form fields from settings
- **Validation**: Enforce minimum values (especially slideshow time)
- **Persistence**: localStorage with fallback defaults
- **Theme Handling**: Pending selection system

## Responsive Design

### Mobile Adaptations (max-width: 768px)
- Timer card padding reduction
- Vertical button layout
- Full-width buttons with max-width
- Reduced logo and clock sizes
- Repositioned calendar icon

### Performance Optimizations
- Critical CSS inlined
- Image preloading with fetchpriority
- GPU-accelerated animations
- Deferred JavaScript loading
- Backdrop-filter for modal effects

## Audio Assets Required
- `assets/audio/click.mp3`: Button click sound
- `assets/audio/splash.mp3`: Timer completion sound
- Volume: 0.3 default
- Format: MP3 for broad compatibility

## Dependencies
The timer page expects these external JavaScript files:
- `core.js`: Core application logic
- `settings.js`: Settings management
- `timer.js`: Timer functionality
- External: Background management system (to be implemented)

## Integration Points
- **Theme System**: CSS custom properties + JavaScript theme switching
- **Settings Persistence**: localStorage with structured data
- **Audio System**: Integrated with user preferences
- **Navigation**: Links to welcome.html and calendar pages
- **Clock Integration**: Real-time display in header

This documentation provides the complete foundation for rebuilding the StudyFlow Timer page from scratch while maintaining all its functionality and visual design.