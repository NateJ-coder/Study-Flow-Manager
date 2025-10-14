# StudyFlow Background System Specification

## Overview
The StudyFlow background system provides dynamic, theme-based background images with seasonal particle effects. Users can select themes (Summer, Autumn, Winter) and the system automatically cycles through appropriate images while displaying matching particle animations.

## Core Requirements

### 1. Theme Selection
- **User Control**: Dropdown in settings allows selection of Summer, Autumn, or Winter themes
- **Persistence**: Selected theme saved to localStorage as `studyflow-settings`
- **Default**: Autumn theme if no preference saved
- **Case Sensitivity**: All theme keys must be lowercase (`'summer'`, `'autumn'`, `'winter'`)

### 2. Image Assets Structure
```
assets/images/
├── summer-day-1.png through summer-day-8.png
├── summer-night-1.png through summer-night-8.png
├── autumn-day-1.png through autumn-day-8.png  
├── autumn-night-1.png through autumn-night-8.png
├── winter-day-1.png through winter-day-7.png
├── winter-night-1.png through winter-night-7.png
```

**Total Assets**: 47 images
- Summer: 16 images (8 day + 8 night)
- Autumn: 16 images (8 day + 8 night) 
- Winter: 14 images (7 day + 7 night)

### 3. Day/Night Cycling
- **Time Detection**: Use local timezone to determine day vs night
- **Day Hours**: 6:00 AM to 6:00 PM (show day images)
- **Night Hours**: 6:00 PM to 6:00 AM (show night images)
- **Auto-Switch**: Check time periodically and switch image sets automatically

### 4. Image Rotation Logic
- **Within Theme**: Only show images from selected theme
- **Sequential Order**: Cycle through images in numerical order (1, 2, 3, etc.)
- **Time-Appropriate**: Only show day images during day, night images during night
- **Interval**: Change background every 20+ seconds (configurable)
- **Smooth Transition**: Fade between images for visual continuity

### 5. Particle System Integration
- **Summer**: Light green hexagonal leaves falling gently
- **Autumn**: Orange/brown hexagonal leaves with varied falling patterns
- **Winter**: White 6-pointed snowflakes with gentle drift
- **Performance**: Limit particle count for smooth animation
- **Visibility**: Particles should be clearly visible against backgrounds

### 6. Settings Integration
- **Theme Dropdown**: Options for "Summer", "Autumn", "Winter"
- **Storage Key**: `studyflow-settings` in localStorage
- **Settings Structure**:
  ```json
  {
    "theme": "autumn",
    "backgroundRotation": {
      "enabled": true,
      "interval": 20000
    }
  }
  ```

### 7. Performance Requirements
- **Preloading**: Load next image before transition
- **Memory Management**: Unload old images after transition
- **Lazy Loading**: Only load images as needed
- **Smooth Transitions**: No visual glitches during image changes
- **Responsive**: Work across different screen sizes

### 8. Error Handling
- **Missing Images**: Graceful fallback to available images
- **Network Issues**: Retry loading with exponential backoff
- **Invalid Themes**: Default to autumn theme
- **Console Logging**: Clear debugging information for troubleshooting

### 9. DOM Integration Points
- **Background Container**: Element where background images are applied
- **Settings Modal**: Theme selection dropdown
- **Particle Container**: Element for particle effect canvas/animations
- **Timer Interface**: Background should not interfere with timer functionality

### 10. Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Image Formats**: PNG support (primary format for assets)
- **CSS Features**: Transitions, transforms for smooth animations
- **JavaScript**: ES6+ features acceptable for modern browser targets

## Implementation Notes

### Theme Data Structure (core.js)
```javascript
const THEME_DATA = {
  summer: {
    day: { images: ['summer-day-1.png', 'summer-day-2.png', ...] },
    night: { images: ['summer-night-1.png', 'summer-night-2.png', ...] }
  },
  autumn: {
    day: { images: ['autumn-day-1.png', 'autumn-day-2.png', ...] },
    night: { images: ['autumn-night-1.png', 'autumn-night-2.png', ...] }
  },
  winter: {
    day: { images: ['winter-day-1.png', 'winter-day-2.png', ...] },
    night: { images: ['winter-night-1.png', 'winter-night-2.png', ...] }
  }
};
```

### Key Functions Needed
1. `initializeBackgroundSystem()` - Set up system on page load
2. `setTheme(themeName)` - Change to specific theme
3. `updateBackground()` - Cycle to next appropriate image
4. `isNightTime()` - Determine day/night based on local time
5. `preloadNextImage()` - Performance optimization
6. `initializeParticles(theme)` - Set up particle effects
7. `saveSettings()` - Persist theme selection
8. `loadSettings()` - Restore saved preferences

### Critical Success Factors
- **User Experience**: Seamless theme switching with immediate visual feedback
- **Performance**: No lag or stuttering during transitions
- **Reliability**: System works consistently across page loads and browser sessions
- **Visual Quality**: Images and particles complement each other aesthetically
- **Maintainability**: Clean, documented code that's easy to modify and extend

## Testing Checklist
- [ ] Theme dropdown changes background immediately
- [ ] Day/night images switch based on local time
- [ ] Images cycle through complete set before repeating
- [ ] Particles match selected theme
- [ ] Settings persist across browser sessions
- [ ] No console errors during normal operation
- [ ] Smooth transitions between all images
- [ ] System recovers gracefully from missing assets
