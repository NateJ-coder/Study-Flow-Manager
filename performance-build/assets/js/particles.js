// Particles JS - Dedicated particle system module

export class ParticleEngine {
  constructor() {
    this.particles = [];
    this.maxParticles = 30;
    this.container = null;
    this.isRunning = false;
    this.animationId = null;
    this.lastUpdate = 0;
    this.updateInterval = 1000 / 60; // 60fps
  }

  init(containerId = 'particles') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn('Particle container not found');
      return false;
    }

    // Adjust for device performance
    if (window.StudyFlow?.AppState?.isLowEndDevice) {
      this.maxParticles = 15;
      this.updateInterval = 1000 / 30; // 30fps for low-end devices
    }

    return true;
  }

  start() {
    if (this.isRunning || !this.container) return;
    
    this.isRunning = true;
    this.createInitialBurst();
    this.animate();
  }

  stop() {
    this.isRunning = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Clean up DOM elements
    this.particles.forEach(particle => {
      if (particle.element?.parentNode) {
        particle.element.parentNode.removeChild(particle.element);
      }
    });
    
    this.particles = [];
  }

  createInitialBurst() {
    const burstCount = Math.min(this.maxParticles * 0.6, 15);
    for (let i = 0; i < burstCount; i++) {
      setTimeout(() => this.createParticle(), i * 50);
    }
  }

  createParticle() {
    if (this.particles.length >= this.maxParticles) {
      this.removeOldestParticle();
    }

    const element = document.createElement('div');
    element.className = 'particle';

    const particle = {
      element,
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + 20,
      vx: (Math.random() - 0.5) * 2,
      vy: -Math.random() * 3 - 1,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 4,
      scale: Math.random() * 0.5 + 0.5,
      opacity: Math.random() * 0.7 + 0.3,
      life: 1.0,
      decay: Math.random() * 0.002 + 0.001,
      wind: Math.random() * 0.5 + 0.1,
      type: this.getParticleType()
    };

    this.styleParticle(particle);
    this.container.appendChild(element);
    this.particles.push(particle);
  }

  removeOldestParticle() {
    const oldest = this.particles.shift();
    if (oldest?.element?.parentNode) {
      oldest.element.parentNode.removeChild(oldest.element);
    }
  }

  getParticleType() {
    const theme = window.StudyFlow?.AppState?.theme || 'summer';
    const rand = Math.random();

    switch (theme) {
      case 'summer':
        return rand < 0.7 ? 'leaf' : 'flower';
      case 'autumn':
        return rand < 0.8 ? 'leaf' : 'acorn';
      case 'winter':
        return rand < 0.9 ? 'snowflake' : 'crystal';
      default:
        return 'leaf';
    }
  }

  styleParticle(particle) {
    const { element, scale, opacity, type } = particle;
    const theme = window.StudyFlow?.AppState?.theme || 'summer';

    let styles = this.getParticleStyles(type, theme, scale);
    
    element.style.cssText = `
      ${styles}
      position: absolute;
      opacity: ${opacity};
      pointer-events: none;
      z-index: -1;
      will-change: transform;
    `;

    this.updateParticlePosition(particle);
  }

  getParticleStyles(type, theme, scale) {
    const size = 6 + scale * 6;
    
    switch (theme) {
      case 'summer':
        if (type === 'leaf') {
          return `
            width: ${size}px;
            height: ${size}px;
            background: radial-gradient(ellipse at center, #22c55e 0%, #16a34a 70%, #15803d 100%);
            border-radius: 50% 0 50% 50%;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
          `;
        } else {
          return `
            width: ${size * 0.8}px;
            height: ${size * 0.8}px;
            background: radial-gradient(circle, #fbbf24 0%, #f59e0b 100%);
            border-radius: 50%;
            box-shadow: 0 0 ${size * 0.5}px rgba(251, 191, 36, 0.3);
          `;
        }

      case 'autumn':
        if (type === 'leaf') {
          const colors = ['#dc2626', '#ea580c', '#d97706', '#92400e'];
          const color = colors[Math.floor(Math.random() * colors.length)];
          return `
            width: ${size}px;
            height: ${size * 1.2}px;
            background: linear-gradient(45deg, ${color} 0%, #451a03 100%);
            clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
            filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));
          `;
        } else {
          return `
            width: ${size * 0.6}px;
            height: ${size}px;
            background: linear-gradient(to bottom, #92400e 0%, #451a03 100%);
            border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
          `;
        }

      case 'winter':
        if (type === 'snowflake') {
          return `
            width: ${size * 0.8}px;
            height: ${size * 0.8}px;
            background: radial-gradient(circle, #ffffff 0%, #e5e7eb 100%);
            border-radius: 50%;
            box-shadow: 0 0 ${size}px rgba(255, 255, 255, 0.4), 
                        inset 0 1px 0 rgba(255, 255, 255, 0.8);
          `;
        } else {
          return `
            width: ${size * 0.7}px;
            height: ${size * 1.2}px;
            background: linear-gradient(135deg, #bfdbfe 0%, #93c5fd  50%, #60a5fa 100%);
            clip-path: polygon(50% 0%, 0% 50%, 50% 100%, 100% 50%);
            filter: drop-shadow(0 1px 2px rgba(96, 165, 250, 0.3));
          `;
        }

      default:
        return `
          width: ${size}px;
          height: ${size}px;
          background: #22c55e;
          border-radius: 50%;
        `;
    }
  }

  updateParticlePosition(particle) {
    particle.element.style.transform = `
      translate(${particle.x}px, ${particle.y}px) 
      rotate(${particle.rotation}deg) 
      scale(${particle.scale})
    `;
  }

  animate(timestamp = 0) {
    if (!this.isRunning) return;

    // Throttle updates for performance
    if (timestamp - this.lastUpdate >= this.updateInterval) {
      this.updateParticles();
      this.lastUpdate = timestamp;
    }

    this.animationId = requestAnimationFrame((ts) => this.animate(ts));
  }

  updateParticles() {
    const time = Date.now() * 0.001;

    this.particles.forEach((particle, index) => {
      // Physics update
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotationSpeed;

      // Environmental effects
      particle.vy += 0.08; // Gravity
      particle.vx += Math.sin(time + index * 0.1) * 0.01 * particle.wind; // Wind

      // Life cycle
      particle.life -= particle.decay;
      particle.element.style.opacity = particle.opacity * particle.life;

      // Update DOM position
      this.updateParticlePosition(particle);

      // Remove dead or off-screen particles
      if (particle.life <= 0 || 
          particle.y > window.innerHeight + 100 || 
          particle.x < -100 || 
          particle.x > window.innerWidth + 100) {
        
        if (particle.element.parentNode) {
          particle.element.parentNode.removeChild(particle.element);
        }
        this.particles.splice(index, 1);
      }
    });

    // Occasionally spawn new particles
    if (Math.random() < 0.015 && this.particles.length < this.maxParticles) {
      this.createParticle();
    }
  }

  // Performance methods
  setMaxParticles(max) {
    this.maxParticles = Math.max(5, Math.min(50, max));
    
    // Remove excess particles if needed
    while (this.particles.length > this.maxParticles) {
      this.removeOldestParticle();
    }
  }

  setUpdateRate(fps) {
    this.updateInterval = 1000 / Math.max(15, Math.min(60, fps));
  }

  // Utility methods
  getParticleCount() {
    return this.particles.length;
  }

  isActive() {
    return this.isRunning;
  }
}

// Export for both module and global use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ParticleEngine };
} else if (typeof window !== 'undefined') {
  window.ParticleEngine = ParticleEngine;
}