// ============================================
// STUDYFLOW PARTICLE SYSTEM
// ============================================
// Dedicated particle effects system for StudyFlow timer
// Supports seasonal themes with different particle types

// --- PARTICLE CONFIGURATION ---
const PARTICLE_CONFIG = {
  summer: {
    particles: {
      day: { count: 50, size: 8, speed: 1.2, type: 'green-leaf' }, // Green leaves for summer days
      night: { count: 60, size: 4, speed: 0.8, type: 'glow' } // More visible fireflies for summer nights
    }
  },
  autumn: {
    particles: {
      day: { count: 60, size: 6, speed: 1.5, type: 'leaf' }, // Autumn leaves for days
      night: { count: 45, size: 3, speed: 0.5, type: 'glow' } // More visible fireflies at night
    }
  },
  winter: {
    particles: {
      day: { count: 70, size: 4, speed: 1, type: 'snow' }, // Snowflakes for days
      night: { count: 45, size: 3, speed: 0.5, type: 'glow' } // More visible fireflies at night
    }
  }
};

// --- PARTICLE SYSTEM STATE ---
let canvas;
let ctx;
let particles = [];
let animationFrameId;
let transitionParticles = [];
let isTransitioning = false;
let transitionProgress = 0;
let isSleepMode = false;
let sleepModeFrameSkip = 0;

// External dependencies (will be injected)
let getCurrentTheme = null;
let getIsNight = null;

// --- PARTICLE SYSTEM INITIALIZATION ---
function initializeParticleSystem() {
    canvas = document.getElementById('particle-canvas');
    if (!canvas) {
        console.warn('❌ Particle canvas not found. Particle system disabled.');
        return false;
    }
    
    ctx = canvas.getContext('2d');
    console.log('✅ Particle system initialized');
    return true;
}

// --- PARTICLE CONFIGURATION ACCESS ---
function getCurrentParticleConfig() {
    if (!getCurrentTheme || !getIsNight) {
        console.warn('❌ Theme or time dependencies not set. Using default config.');
        return PARTICLE_CONFIG.autumn.particles.day;
    }
    
    const theme = getCurrentTheme();
    const timeOfDay = getIsNight() ? 'night' : 'day';
    return PARTICLE_CONFIG[theme]?.particles[timeOfDay] || PARTICLE_CONFIG.autumn.particles.day;
}

// --- PARTICLE MANAGEMENT ---
function initializeParticles(config) {
    if (!canvas || !ctx) {
        console.warn('❌ Canvas not initialized. Call initializeParticleSystem() first.');
        return;
    }

    // Stop any running animation
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        particles = [];
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    for (let i = 0; i < config.count; i++) {
        particles.push(createParticle(config));
    }

    drawParticles(config);
}

function createParticle(config) {
    return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: config.size + Math.random() * 2,
        speed: config.speed * (0.5 + Math.random()),
        angle: Math.random() * 360,
    };
}

// --- TRANSITION EFFECTS ---
function createTransitionParticles(config) {
    transitionParticles = [];
    const transitionCount = config.count * 3; // Triple the normal particle count for transition
    
    for (let i = 0; i < transitionCount; i++) {
        transitionParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: config.size + Math.random() * 4, // Slightly larger for transition
            speed: config.speed * (2 + Math.random()), // Faster during transition
            angle: Math.random() * 360,
            opacity: 0.3 + Math.random() * 0.7, // Variable opacity for depth
            life: 1.0 // Full life at start
        });
    }
}

function startParticleTransition() {
    if (isTransitioning) return; // Don't start if already transitioning
    
    const config = getCurrentParticleConfig();
    createTransitionParticles(config);
    isTransitioning = true;
    transitionProgress = 0;
    
    console.log(`🎭 Starting particle transition with ${transitionParticles.length} particles`);
}

// --- RENDERING ENGINE ---
function drawParticles(config) {
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw normal particles
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--particle-color').trim() || '#fff';
    
    particles.forEach(p => {
        // Update position
        p.y += p.speed;
        
        if (config.type === 'leaf' || config.type === 'green-leaf' || config.type === 'snow') {
            // Add slight horizontal sway for snow/leaves
            p.x += Math.sin(p.y / 100) * 0.5;
        } else if (config.type === 'glow') {
            // Subtle random drift for glow/fireflies
            p.x += (Math.random() - 0.5) * 0.5;
        }

        // Wrap around when it falls off screen
        if (p.y > canvas.height) {
            p.y = -p.size;
            p.x = Math.random() * canvas.width; // Reset horizontal position too
        }

        // Draw particle with appropriate color and shape
        ctx.beginPath();
        
        // Set particle color based on type
        if (config.type === 'green-leaf') {
            ctx.fillStyle = '#4ade80'; // Green color for summer leaves
        } else if (config.type === 'leaf') {
            ctx.fillStyle = '#f59e0b'; // Autumn orange/yellow for autumn leaves  
        } else {
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--particle-color').trim() || '#fff';
        }
        
        if (config.type === 'snow') {
            ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); // Simple circles for snow
        } else if (config.type === 'leaf' || config.type === 'green-leaf') {
            ctx.fillRect(p.x, p.y, p.size, p.size * 0.5); // Rectangular shape for leaves
        } else {
            // Enhanced glow effect for fireflies
            ctx.globalAlpha = 0.9; // Increase opacity
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            // Enhanced glow with multiple layers
            ctx.shadowColor = '#ffff80'; // Warm yellow glow
            ctx.shadowBlur = p.size * 5; // Larger glow radius
            ctx.fillStyle = '#ffff99'; // Brighter firefly color
        }
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow for next draw
        ctx.globalAlpha = 1; // Reset alpha for next draw
    });
    
    // Draw transition particles if transitioning
    if (isTransitioning && transitionParticles.length > 0) {
        drawTransitionParticles(config);
    }

    // Sleep mode optimization: Skip frames to reduce CPU usage
    if (isSleepMode) {
        sleepModeFrameSkip++;
        if (sleepModeFrameSkip < 4) { // Only render every 4th frame in sleep mode
            animationFrameId = requestAnimationFrame(() => drawParticles(config));
            return;
        }
        sleepModeFrameSkip = 0;
    }
    
    animationFrameId = requestAnimationFrame(() => drawParticles(config));
}

function drawTransitionParticles(config) {
    transitionParticles.forEach(p => {
        // Update transition particle position and life
        p.y += p.speed;
        p.life -= 0.015; // Slower fade for longer transition (66 frames ≈ 1100ms at 60fps)
        
        if (config.type === 'leaf' || config.type === 'green-leaf' || config.type === 'snow') {
            p.x += Math.sin(p.y / 80) * 1.5; // More dramatic sway
        } else if (config.type === 'glow') {
            p.x += (Math.random() - 0.5) * 2; // More movement
            p.y += (Math.random() - 0.5) * 1;
        }
        
        // Wrap around screen
        if (p.y > canvas.height) {
            p.y = -p.size;
            p.x = Math.random() * canvas.width;
        }
        
        // Draw with dynamic opacity - peak intensity mid-transition, then fade
        const intensity = transitionProgress < 0.5 
            ? transitionProgress * 2 // Build up intensity
            : (1 - transitionProgress) * 2; // Fade out intensity
        const alpha = Math.max(0, p.opacity * p.life * intensity * 1.2);
        ctx.globalAlpha = alpha;
        
        // Set transition particle colors
        if (config.type === 'green-leaf') {
            ctx.fillStyle = '#4ade80'; // Green for summer leaves
        } else if (config.type === 'leaf') {
            ctx.fillStyle = '#f59e0b'; // Orange/yellow for autumn leaves
        } else {
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--particle-color').trim() || '#fff';
        }
        
        ctx.beginPath();
        if (config.type === 'snow') {
            ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        } else if (config.type === 'leaf' || config.type === 'green-leaf') {
            ctx.fillRect(p.x, p.y, p.size, p.size * 0.5);
        } else {
            // Enhanced transition glow
            ctx.globalAlpha = p.life * 0.8; // Fade based on life and increase visibility
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.shadowColor = '#ffff80';
            ctx.shadowBlur = p.size * 6; // Even more dramatic for transition
            ctx.fillStyle = '#ffff99';
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1; // Reset alpha
    });
    
    ctx.globalAlpha = 1.0; // Reset alpha
    
    // Update transition progress
    transitionProgress += 0.015; // Slower progress to match longer transition
    if (transitionProgress >= 1.0) {
        // Transition complete
        isTransitioning = false;
        transitionProgress = 0;
        transitionParticles = [];
        console.log('🎭 Particle transition complete');
    }
}

// --- PUBLIC API ---
window.ParticleSystem = {
    // Initialization
    initialize: initializeParticleSystem,
    
    // Configuration injection (for external dependencies)
    setThemeProvider: function(themeProvider) {
        getCurrentTheme = themeProvider;
    },
    
    setTimeProvider: function(timeProvider) {
        getIsNight = timeProvider;
    },
    
    // Particle management
    start: function(config = null) {
        const particleConfig = config || getCurrentParticleConfig();
        initializeParticles(particleConfig);
    },
    
    stop: function() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        particles = [];
        transitionParticles = [];
    },
    
    // Effects
    transition: startParticleTransition,
    
    // Performance control
    setSleepMode: function(sleepMode) {
        isSleepMode = sleepMode;
        console.log(`🎭 Particle system ${sleepMode ? 'entering' : 'exiting'} sleep mode`);
    },
    
    // Utility
    getConfig: getCurrentParticleConfig,
    
    // Legacy compatibility (for existing sleep.js)
    particleSystem: {
        setSleepMode: function(sleepMode) {
            window.ParticleSystem.setSleepMode(sleepMode);
        }
    }
};

// Legacy compatibility - expose old interface
window.particleSystem = window.ParticleSystem.particleSystem;

console.log('🎭 Particle System loaded and ready');