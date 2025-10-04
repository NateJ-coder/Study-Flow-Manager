# StudyFlow Development Workflow Guide

## **Immediate Change Visibility Setup**

### **Current Development Server Status**
- **Active Server**: Python HTTP server running on port 8080
- **Server Command**: `python -m http.server 8080` (from project root)
- **Access URL**: `http://localhost:8080`
- **Browser Tool**: VS Code Simple Browser integration available

### **Live Development Workflow**

#### **Method 1: VS Code Simple Browser (RECOMMENDED)**
```javascript
// AI Assistant should run this after making changes:
await open_simple_browser("http://localhost:8080")
```
- **Advantages**: Embedded browser in VS Code, side-by-side editing
- **Refresh**: Manual browser refresh needed after file changes
- **Best for**: Quick visual verification of changes

#### **Method 2: External Browser**
- Open `http://localhost:8080` in Chrome/Edge/Firefox
- **Auto-refresh setup**: Install browser extension like "Live Server" or "Auto Refresh"
- **Manual refresh**: Press F5 or Ctrl+R after file changes

### **Change Detection & Testing Process**

#### **After Making File Modifications**
1. **Save files** (VS Code auto-saves by default)
2. **Open/Refresh browser** using Simple Browser tool
3. **Verify changes** visually and functionally
4. **Check console** for JavaScript errors (F12 Developer Tools)

#### **Common Testing Scenarios**

**CSS Changes** (Immediate visibility):
```css
/* Example: Change button color */
.frame-svg-button { background: red; }
```
- Refresh browser → See color change immediately
- No server restart needed

**JavaScript Changes** (Immediate visibility):
```javascript
/* Example: Add console log */
console.log("Testing change");
```
- Refresh browser → Check browser console for output
- No server restart needed

**HTML Structure Changes** (Immediate visibility):
```html
<!-- Example: Add new element -->
<div class="test-element">New content</div>
```
- Refresh browser → New element appears immediately

## **Development Server Management**

### **Server Commands for AI Assistant**
```javascript
// Start development server
await run_in_terminal({
  command: 'cd "C:\\Projects\\StudyFlowManager"; python -m http.server 8080',
  explanation: "Starting development server for live testing",
  isBackground: true
});

// Open browser for testing
await open_simple_browser("http://localhost:8080");
```

### **Alternative: Vite Development Server**
```javascript
// If npm/Vite is preferred (hot reload)
await run_in_terminal({
  command: 'cd "C:\\Projects\\StudyFlowManager"; npm run dev',
  explanation: "Starting Vite dev server with hot reload",
  isBackground: true
});
// Then open http://localhost:5173
```

### **Testing Specific Features**

#### **Animation Testing**
- **StudyFlow title**: Click title to cycle animations
- **Particle effects**: Change `data-theme` attribute in browser dev tools
- **Button hovers**: Hover over Start/Reset/Set Reminder buttons

#### **Theme Testing**
```javascript
// Test theme switching in browser console
document.body.setAttribute('data-theme', 'winter');
```

#### **Security Testing**
- Open `http://localhost:8080/security-test.html`
- Comprehensive XSS and CSP validation suite

#### **Accessibility Testing**
- Use browser's accessibility inspector
- Test with keyboard navigation (Tab key)
- Test with reduced motion: 
  ```css
  /* Temporarily add to browser dev tools */
  * { animation-duration: 0.01ms !important; }
  ```

## **File Change Impact Matrix**

| File Modified | Requires Restart | Immediate Visibility | Testing Method |
|---------------|------------------|---------------------|----------------|
| `css/style.css` | ❌ No | ✅ Yes | Refresh browser |
| `js/*.js` | ❌ No | ✅ Yes | Refresh + check console |
| `index.html` | ❌ No | ✅ Yes | Refresh browser |
| `assets/*` | ❌ No | ✅ Yes | Hard refresh (Ctrl+F5) |
| `package.json` | ✅ Yes | ❌ No | Restart server |

## **AI Assistant Integration Commands**

### **Complete Testing Workflow Template**
```javascript
// 1. Make file changes (using replace_string_in_file, etc.)

// 2. Open/refresh browser for immediate testing
await open_simple_browser("http://localhost:8080");

// 3. Optional: Run specific tests
await run_in_terminal({
  command: 'cd "C:\\Projects\\StudyFlowManager"',
  explanation: "Navigate to project directory",
  isBackground: false
});
```

### **Advanced Testing Commands**
```javascript
// Test specific page
await open_simple_browser("http://localhost:8080/settings.html");

// Test security suite
await open_simple_browser("http://localhost:8080/security-test.html");

// Check server status
await get_terminal_output("terminal_id_here");
```

## **Browser Developer Tools Usage**

### **Essential Dev Tools Commands**
```javascript
// Theme switching test
document.body.setAttribute('data-theme', 'autumn');

// Animation control
document.getElementById('app-title').click(); // Cycle animations

// Particle system test
document.getElementById('studyframe').setAttribute('data-season', 'snow');

// Console testing
console.log('Testing StudyFlow changes');
```

### **Debugging Checklist**
1. **Console Errors**: Check F12 → Console tab
2. **Network Issues**: Check F12 → Network tab for failed loads
3. **CSS Issues**: Check F12 → Elements tab for computed styles
4. **Animation Performance**: Check F12 → Performance tab

## **Quick Reference for AI Assistants**

### **"Show me the change" Workflow**
1. `await open_simple_browser("http://localhost:8080")`
2. Wait for user confirmation or ask for specific testing
3. For animation changes: "Click the StudyFlow title to see the new animation"
4. For theme changes: "The button colors should now reflect the new seasonal theme"

### **Development Server Troubleshooting**
```powershell
# If server port is busy
netstat -ano | findstr :8080
taskkill /PID [PID_NUMBER] /F

# Restart server
cd "C:\Projects\StudyFlowManager"
python -m http.server 8080
```

This guide ensures future AI assistants can provide immediate visual feedback and comprehensive testing capabilities for any StudyFlow modifications.