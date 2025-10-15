// Intro Animation JS
// (No redirect logic here; handled inline in index.html)

window.addEventListener('DOMContentLoaded', function() {
  // Fade out before redirect
  setTimeout(() => {
    const overlay = document.getElementById('fadeout-overlay');
    if (overlay) overlay.classList.add('fadeout');
    setTimeout(() => {
      window.location.href = 'welcome.html';
    }, 700); // 0.7s fade duration
  }, 11300); // Start fade at 11.3s (animation is 12s)
});
