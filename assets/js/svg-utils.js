// svg-utils.js — Safe SVG handling utilities
console.log("[svg-utils.js] SVG security utilities loaded ✅");

/**
 * Safely insert SVG content by removing potential XSS vectors
 * @param {HTMLElement} targetEl - Element to insert SVG into
 * @param {string} svgText - SVG content to sanitize and insert
 */
export function safeInsertSVG(targetEl, svgText) {
  try {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    
    // Security: Remove any <script> tags
    doc.querySelectorAll('script').forEach(n => n.remove());
    
    // Security: Remove all event handler attributes and dangerous links
    doc.querySelectorAll('*').forEach(n => {
      [...n.attributes].forEach(a => {
        if (a.name.startsWith('on')) {
          n.removeAttribute(a.name);
        }
        if (a.name === 'href' || a.name === 'xlink:href') {
          n.removeAttribute(a.name);
        }
      });
    });
    
    // Check for parser errors
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) {
      throw new Error('Invalid SVG content');
    }
    
    // Safe insertion using replaceChildren instead of innerHTML
    targetEl.replaceChildren(doc.documentElement);
    
    console.log("[svg-utils] SVG safely inserted after sanitization");
    
  } catch (error) {
    console.error("[svg-utils] Error sanitizing SVG:", error);
    // Fallback: create a safe placeholder
    targetEl.innerHTML = '<span>⚠️</span>';
  }
}

/**
 * Apply theme colors to SVG content safely
 * @param {string} svgText - Original SVG text
 * @param {string} season - Season theme to apply
 * @returns {string} Themed SVG text
 */
export function applySVGTheming(svgText, season = 'summer') {
  // Theme color mapping
  const themes = {
    summer: { primary: '#4ECDC4', secondary: '#45B7D1' },
    autumn: { primary: '#FF6B35', secondary: '#F7931E' },
    winter: { primary: '#74B9FF', secondary: '#0984E3' },
    rain: { primary: '#636E72', secondary: '#2D3436' }
  };
  
  const colors = themes[season] || themes.summer;
  
  // Safe string replacement - only replace known color placeholders
  return svgText
    .replace(/#THEME_PRIMARY/g, colors.primary)
    .replace(/#THEME_SECONDARY/g, colors.secondary);
}