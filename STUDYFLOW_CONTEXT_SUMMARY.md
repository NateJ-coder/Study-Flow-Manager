# StudyFlow Project Comprehensive Context Summary
*"Speak to your future self" - Complete context for AI assistance*

## **🚀 IMMEDIATE DEVELOPMENT WORKFLOW**
**CRITICAL**: After making ANY changes, use this command to see results immediately:
```javascript
await open_simple_browser("http://localhost:8080");
```

**Development Server**: Python HTTP server on port 8080 (should be running)
**Start Command**: `cd "C:\Projects\StudyFlowManager"; python -m http.server 8080`
**Live Testing**: Changes visible immediately after browser refresh - NO server restart needed

---

## **Project Overview**
StudyFlow is a sophisticated Pomodoro timer web application with seasonal themes, advanced animations, and enterprise-grade security. The project has evolved from a basic timer into a production-ready application with modular ES6 architecture, comprehensive accessibility features, and robust security implementations.

**Repository**: `Study-Flow-Manager` (Owner: NateJ-coder, Branch: main)  
**Local Path**: `C:\Projects\StudyFlowManager\`  
**Development Server**: Python HTTP server on port 8080 (`python -m http.server 8080`)

## **Architecture & File Structure**

### **Core Files**
```
├── index.html              # Main timer page with ES6 module loading
├── calendar.html           # Calendar view (enhanced with modern modules)
├── settings.html           # Settings page (enhanced with modern modules)
├── package.json           # Vite development configuration
├── DEVELOPMENT_GUIDE.md   # Comprehensive dev workflow guide
├── css/
│   └── style.css          # Comprehensive styling (2000+ lines)
├── js/
│   ├── core.js           # Legacy JavaScript (maintained for compatibility)
│   ├── core-modern.js    # ES6 entry point with modern enhancements
│   ├── svg-utils.js      # Security utilities for safe SVG handling
│   ├── settings.js       # Settings management with validation
│   ├── timer-module.js   # Timer functionality enhancements
│   └── animation-frame.js # Animation and visual effects
├── assets/
│   ├── images/           # Background images and SVG assets
│   └── audio/            # Sound effects (rainfall, splash, drawing)
└── .github/workflows/
    └── deploy.yml        # CI/CD pipeline for GitHub Pages
```

### **Technology Stack**
- **Frontend**: Vanilla JavaScript ES6 modules + legacy compatibility
- **Development**: Vite v7.1.9 (hot reloading) + Python HTTP server (fallback)
- **Security**: Content Security Policy (CSP) + DOMParser SVG sanitization
- **Accessibility**: WCAG 2.1 compliant with reduced motion support
- **Deployment**: GitHub Actions CI/CD pipeline

## **Key Features & Implementations**

### **1. Seasonal Theme System**
**Current Themes**: Summer (default), Autumn, Winter, Spring, Rain

**Implementation Locations**:
- `js/settings.js`: Theme switching logic with whitelisted values
- `css/style.css`: CSS custom properties for seasonal colors
- `body[data-theme="season"]` attribute controls theming

**Key CSS Variables**:
```css
[data-theme="summer"] {
  --ui-tint-primary: #4ECDC4;
  --bg-primary: #FFE5B4;
}
```

**Testing Theme Changes**:
```javascript
// In browser console or dev tools
document.body.setAttribute('data-theme', 'winter');
```

### **2. Animation Systems**

#### **StudyFlow Title Animation** (Recently Enhanced)
**Location**: `#app-title` in `index.html` + `css/style.css`
**Structure**: Character-by-character spans with CSS animations
```html
<div id="app-title" class="animate-text">
  <span>S</span><span>t</span><span>u</span>...<span>w</span>
</div>
```

**Animation Styles**:
- Default: `charWave` - cascading wave with color changes
- Bounce: `charBounce` - playful bouncing motion  
- Glow: `charGlow` - ethereal glowing effect
- Auto-cycles every 8 seconds via `js/core-modern.js`

**Testing Animations**: Click the "StudyFlow" title to manually cycle through animation styles

#### **Particle System**
**Location**: CSS animations in `style.css` around lines 100-150
**Types**: Falling leaves (autumn), snow (winter), rain drops
**Control**: `#studyframe[data-season="season"]` CSS selectors

**Testing Particles**:
```javascript
// Change particle type in browser console
document.getElementById('studyframe').setAttribute('data-season', 'snow');
```

### **3. Timer Interface Components**

#### **Start/Reset Buttons** (Recently Enhanced)
**Location**: `#btn-start`, `#btn-reset` in `index.html`
**Styling**: Wooden plank design with seasonal text colors
**Fallback System**: 
- SVG buttons loaded via `js/core-modern.js`
- Text fallbacks: "START"/"RESET" always present
- CSS `:has()` selector hides text when SVG loads

**Seasonal Text Colors**:
```css
[data-theme="summer"] .frame-svg-button .button-text {
  --button-text-color: #4ECDC4; /* Light turquoise */
}
```

**Testing Buttons**: Hover over Start/Reset buttons to see wooden plank hover effects

#### **Set Reminder Button** (Recently Enhanced)
**Location**: `#btn-set-reminder` in `index.html`  
**Animation**: `buttonPop` with spring physics on hover
**Styling**: Glassmorphism with backdrop blur

**Testing Button**: Hover over "Set Reminder" button (bottom left) to see pop-up animation

### **4. Security Implementation**
**CSP Headers**: Strict Content Security Policy in all HTML files
**SVG Sanitization**: `js/svg-utils.js` with DOMParser-based cleaning
**Input Validation**: Whitelisted seasons, numeric clamping in `settings.js`
**XSS Prevention**: Safe DOM manipulation, no innerHTML usage

**Security Testing**: Visit `http://localhost:8080/security-test.html`

### **5. Accessibility Features**
**Reduced Motion**: `@media (prefers-reduced-motion: reduce)` disables all animations
**ARIA Labels**: Comprehensive labeling on interactive elements
**Focus Management**: Enhanced focus styles for keyboard navigation
**Color Contrast**: High contrast maintained across all themes

## **🛠️ Development Workflow**

### **Making Changes & Seeing Results**
1. **Edit files** using VS Code tools (replace_string_in_file, etc.)
2. **View changes**: `await open_simple_browser("http://localhost:8080")`
3. **Refresh browser** to see updates (F5 or Ctrl+R)
4. **No server restart needed** for CSS/JS/HTML changes

### **File Loading Order**
1. `index.html` loads `css/style.css`
2. Legacy `js/core.js` initializes base functionality
3. `js/core-modern.js` (ES6 module) enhances with modern features
4. `js/core-modern.js` imports: `animation-frame.js`, `timer-module.js`, `settings.js`, `svg-utils.js`

### **Common Modification Points**

#### **Adding New Animations**
- **Particles**: Modify CSS around lines 120-180 in `style.css`
- **Title Effects**: Add keyframes in `css/style.css` around lines 1900+
- **JavaScript Control**: Enhance `js/animation-frame.js` or `js/core-modern.js`
- **Test**: Refresh browser and observe changes immediately

#### **Theme System Changes**
- **New Seasons**: Add to `ALLOWED_SEASONS` in `js/settings.js`
- **Colors**: Add CSS variables in `style.css` theme sections
- **Season Logic**: Modify `applyThemeSettings()` in `js/settings.js`
- **Test**: Change `data-theme` attribute in browser dev tools

#### **Button/UI Modifications**
- **Button Styles**: Modify `.frame-svg-button` class in `css/style.css`
- **Interactive Elements**: Enhance `js/timer-module.js`
- **SVG Loading**: Modify `loadSafeSVGButtons()` in `js/core-modern.js`
- **Test**: Hover over buttons to see styling changes

#### **Settings Page Enhancement**
- **HTML Structure**: Modify `settings.html`
- **Validation Logic**: Enhance `js/settings.js`
- **Styling**: Add CSS rules in `style.css`
- **Test**: Navigate to `http://localhost:8080/settings.html`

## **🔧 AI Assistant Commands for Live Development**

### **Essential Testing Commands**
```javascript
// View main page
await open_simple_browser("http://localhost:8080");

// View settings page
await open_simple_browser("http://localhost:8080/settings.html");

// View security tests
await open_simple_browser("http://localhost:8080/security-test.html");

// Start development server if not running
await run_in_terminal({
  command: 'cd "C:\\Projects\\StudyFlowManager"; python -m http.server 8080',
  explanation: "Starting development server for immediate testing",
  isBackground: true
});
```

### **Interactive Testing Features**
- **Animation Cycling**: Click "StudyFlow" title to change animation style
- **Theme Testing**: Use browser dev tools to change `data-theme` attribute
- **Button Testing**: Hover over Start/Reset/Set Reminder buttons
- **Particle Testing**: Change `data-season` on `#studyframe` element

## **Security Considerations**
- **Always use** `safeInsertSVG()` from `svg-utils.js` for SVG content
- **Validate inputs** using whitelist approach in `settings.js`
- **Test CSP compliance** after any script additions
- **Maintain accessibility** - check reduced motion support

## **Testing & Deployment**
- **Local Testing**: Python server at `http://localhost:8080` ✅ IMMEDIATE VISIBILITY
- **Security Validation**: `security-test.html` includes comprehensive test suite
- **Production**: GitHub Actions automatically deploys to GitHub Pages
- **Cross-browser**: Test modern ES6 features + legacy fallbacks

## **Recent Major Changes**
1. **Character Animation System**: StudyFlow title now uses individual span elements with cascading animations
2. **Enhanced Button Styling**: Wooden plank appearance with seasonal text colors and robust fallback system
3. **Security Hardening**: Complete XSS prevention with safe DOM manipulation
4. **Accessibility Compliance**: WCAG 2.1 compliant with comprehensive reduced motion support

## **Performance Notes**
- **CSS transforms** used for animations (GPU-accelerated)
- **Idempotent event listeners** prevent memory leaks
- **Lazy loading** for SVG assets with emoji fallbacks
- **Responsive design** using clamp() functions throughout

---

## **🎯 Quick Start for AI Assistants**
1. **Server Check**: Python server should be running on port 8080
2. **Make Changes**: Use file editing tools as needed
3. **View Results**: `await open_simple_browser("http://localhost:8080")`
4. **Interactive Testing**: Use click/hover interactions described above
5. **Console Debugging**: F12 → Console for JavaScript errors

**📋 See `DEVELOPMENT_GUIDE.md` for comprehensive workflow details**

This context provides complete understanding for immediate development and testing of StudyFlow features.