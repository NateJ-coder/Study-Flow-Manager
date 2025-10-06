# StudyFlow Manager - File Path Quick Reference

## 🗂️ Essential File Paths

### **🌐 Web Pages (HTML)**
```
/index.html                           # GitHub Pages entry (redirects)
/performance-build/index.html         # App main entry  
/performance-build/welcome.html       # Welcome/landing page
/performance-build/timer.html         # Timer page (minimal)
/performance-build/calendar.html      # Calendar page (minimal)
```

### **🎨 Stylesheets (CSS)**
```
/performance-build/assets/css/core.css      # Main application styles
/performance-build/assets/css/timer.css     # Timer-specific styles
/performance-build/assets/css/calendar.css  # Calendar-specific styles
```

### **⚡ JavaScript (JS)**
```
/performance-build/assets/js/core.js        # Core app logic & themes
/performance-build/assets/js/settings.js    # Background manager
/performance-build/assets/js/timer.js       # Pomodoro timer logic  
/performance-build/assets/js/calendar.js    # Session tracking
```

### **🎵 Audio Files**
```
/performance-build/assets/audio/click.mp3   # Button click sound
/performance-build/assets/audio/drawing.mp3 # Session start sound
/performance-build/assets/audio/splash.mp3  # Timer complete sound
```

### **🖼️ Background Images**
```
# Autumn Theme (16 images)
/performance-build/assets/images/autumn-day-[1-8].png
/performance-build/assets/images/autumn-night-[1-8].png

# Summer Theme (16 images)  
/performance-build/assets/images/summer-day-[1-8].png
/performance-build/assets/images/summer-night-[1-8].png

# Winter Theme (15 images)
/performance-build/assets/images/winter-day-[1-8].png
/performance-build/assets/images/winter-night-[1-7].png
```

## 🔗 URL Structure (Live Site)

### **Base URL**: `https://natej-coder.github.io/Study-Flow-Manager/`

### **Page URLs**:
```
https://natej-coder.github.io/Study-Flow-Manager/
├── (redirects to welcome.html)
│
https://natej-coder.github.io/Study-Flow-Manager/performance-build/welcome.html
├── Main welcome/landing page
│
https://natej-coder.github.io/Study-Flow-Manager/performance-build/timer.html  
├── Timer/focus page
│
https://natej-coder.github.io/Study-Flow-Manager/performance-build/calendar.html
├── Calendar/tracking page
```

### **Asset URLs** (for reference in code):
```
# From any page in performance-build/, use relative paths:
assets/css/core.css
assets/js/settings.js  
assets/images/autumn-day-8.png
assets/audio/click.mp3

# From root index.html, use full paths:
performance-build/assets/css/core.css
performance-build/assets/js/settings.js
```

## 📝 Common File Editing Scenarios

### **To modify the welcome page**:
```
Edit: /performance-build/welcome.html
```

### **To change styling**:
```
Edit: /performance-build/assets/css/core.css      # Global styles
Edit: /performance-build/assets/css/timer.css     # Timer-specific  
Edit: /performance-build/assets/css/calendar.css  # Calendar-specific
```

### **To modify functionality**:
```
Edit: /performance-build/assets/js/core.js      # Main app logic
Edit: /performance-build/assets/js/settings.js  # Background management
Edit: /performance-build/assets/js/timer.js     # Timer functionality
```

### **To add/change background images**:
```
Add to: /performance-build/assets/images/
Update: /performance-build/assets/js/core.js (THEME_DATA section)
```

## 🚀 Deployment Workflow

### **Make Changes** → **Test Locally** → **Deploy**:
```bash
# 1. Make your changes to any file above
# 2. Test locally (optional):
cd performance-build
python -m http.server 8080
# Visit: http://localhost:8080/welcome.html

# 3. Deploy to live site:
git add .
git commit -m "Description of changes" 
git push origin main
# Changes live in 1-2 minutes at: natej-coder.github.io/Study-Flow-Manager/
```

---

*Quick Reference for StudyFlow Manager Development*