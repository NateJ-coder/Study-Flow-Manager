# StudyFlow Directory Structure

```
StudyFlowManager/
  README.md              # Project overview and usage guide
  index.html             # Main timer interface
  calendar.html          # Calendar and task management
  settings.html          # Application settings
  .gitignore            # Git ignore rules

  assets/               # Media and static resources
     audio/           # Sound effects (splash.mp3, etc.)
      images/          # SVG icons and graphics

  css/                 # Stylesheets and themes
    style.css           # Main application styles
    calendar-page.css   # Calendar-specific styles
    wooden-buttons.css  # Wooden UI component styles

  js/                  # JavaScript modules
    core.js            # Legacy core functionality
    core-modern.js     # Modern ES6 entry point
    timer-module.js    # Timer and reminder functionality
    calendar.js        # Calendar management
    settings.js        # Settings and theme management
    animation-frame.js # Visual effects and animations

  config/              # Configuration files
    studyflow_config.json # Main application settings
    vite.config.js        # Build tool configuration

  data/                # Data storage (runtime)

  docs/                # Documentation
    development/        # Technical docs and guides

  local-docs/          # Local development guides

  build-tools/         # Development dependencies
    node_modules/       # npm packages
    package.json        # npm configuration  
    package-lock.json   # dependency lock file
    dist/              # Build output

  .github/             # GitHub workflows and configs
```

## Clean & Organized! 

All files are now in their proper locations:
- Core app files in root
- Media in `assets/`
- Code in `js/` and `css/`
- Config in `config/`
- Documentation in `docs/`
- Build tools isolated in `build-tools/`
