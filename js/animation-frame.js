// animation-frame.js — intro and frame animations
console.log("[animation-frame.js] Module loaded ✅");

export function swirlInTitle() {
  const title = document.getElementById("app-title");
  if (!title) return;
  console.log("[animation-frame] Starting swirl animation");

  title.style.opacity = 0;
  title.style.transform = "rotate(-180deg) scale(0.5)";
  title.style.transition = "transform 1.2s ease-out, opacity 1.2s ease-out";

  requestAnimationFrame(() => {
    setTimeout(() => {
      title.style.opacity = 1;
      title.style.transform = "rotate(0deg) scale(1)";
    }, 200);
  });
}

export function startWindTrails() {
  console.log("[animation-frame] Launching wind trails");
  const container = document.body;
  
  // Remove any existing wind trails first
  const existingTrails = document.querySelectorAll('.wind-trail');
  existingTrails.forEach(trail => trail.remove());
  
  for (let i = 0; i < 6; i++) {
    const trail = document.createElement("div");
    trail.className = "wind-trail";
    trail.style.left = `${Math.random() * 100}vw`;
    trail.style.top = `${Math.random() * 60 + 10}vh`;
    trail.style.animationDelay = `${i * 0.5}s`;
    container.appendChild(trail);
    
    // Remove trail after animation completes
    setTimeout(() => {
      if (trail.parentNode) {
        trail.remove();
      }
    }, 4000 + (i * 500));
  }
}

export function enableFrameAnimations() {
  console.log("[animation-frame] Enabling frame animations");
  const frame = document.getElementById("studyframe");
  if (frame) {
    frame.classList.remove("paused");
  }
}

export function pauseFrameAnimations() {
  console.log("[animation-frame] Pausing frame animations");
  const frame = document.getElementById("studyframe");
  if (frame) {
    frame.classList.add("paused");
  }
}
