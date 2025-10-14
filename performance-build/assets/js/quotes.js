// ============================================
// STUDYFLOW QUOTES SYSTEM
// ============================================
// Bouncing inspirational quotes for sleep mode

// Charlie Mackesy quotes from "The Boy, the Mole, the Fox and the Horse"
const MOLE_BOOK_QUOTES = [
  {
    text: "Always remember you matter, you're important and you are loved, and you bring to this world things no one else can.",
    author: "Charlie Mackesy"
  },
  {
    text: "One of our greatest freedoms is how we react to things.",
    author: "Charlie Mackesy"
  },
  {
    text: "The greatest illusion is that life should be perfect.",
    author: "Charlie Mackesy"
  },
  {
    text: "We often wait for kindness...but being kind to yourself can start now.",
    author: "Charlie Mackesy"
  },
  {
    text: "Is your glass half empty or half full? I think I'm grateful to have a glass.",
    author: "Charlie Mackesy"
  },
  {
    text: "We have such a long way to go. Yes, but look how far we've come.",
    author: "Charlie Mackesy"
  },
  {
    text: "Isn't it odd. We can only see our outsides, but nearly everything happens on the inside.",
    author: "Charlie Mackesy"
  },
  {
    text: "Imagine how we would be if we were less afraid.",
    author: "Charlie Mackesy"
  },
  {
    text: "When things get difficult remember who you are. Who am I? You are loved.",
    author: "Charlie Mackesy"
  },
  {
    text: "Home isn't always a place is it?",
    author: "Charlie Mackesy"
  },
  {
    text: "Sometimes I think you believe in me more than I do. You'll catch up.",
    author: "Charlie Mackesy"
  },
  {
    text: "Doing nothing with friends is never doing nothing, is it? No.",
    author: "Charlie Mackesy"
  },
  {
    text: "How do they look so together and perfect? There's a lot of frantic paddling going on beneath.",
    author: "Charlie Mackesy"
  },
  {
    text: "What is the bravest thing you've ever said? Help. Asking for help isn't giving up, it's refusing to give up.",
    author: "Charlie Mackesy"
  },
  {
    text: "What do you think is the biggest waste of time? Comparing yourself to others.",
    author: "Charlie Mackesy"
  }
];

// Quote management system
class QuotesBouncer {
  constructor() {
    this.currentQuoteIndex = 0;
    this.quoteElement = null;
    this.authorElement = null;
    this.containerElement = null;
    this.animationId = null;
    this.changeIntervalId = null;
    
    // Bouncing physics
    this.x = 0;
    this.y = 0;
    this.vx = 2; // Velocity X
    this.vy = 1.5; // Velocity Y
    this.width = 0;
    this.height = 0;
    
    // Shuffle quotes on initialization
    this.quotes = this.shuffleArray([...MOLE_BOOK_QUOTES]);
    
    this.init();
  }
  
  // Shuffle array utility
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  // Initialize quote bouncer
  init() {
    this.createQuoteElement();
    this.displayCurrentQuote();
    this.startBouncing();
    this.startQuoteRotation();
  }
  
  // Create the floating quote element
  createQuoteElement() {
    this.containerElement = document.createElement('div');
    this.containerElement.id = 'bouncing-quote-container';
    this.containerElement.style.cssText = `
      position: fixed;
      max-width: 400px;
      min-width: 200px;
      padding: 20px;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 15px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 1000;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      transition: opacity 0.3s ease;
    `;
    
    this.quoteElement = document.createElement('p');
    this.quoteElement.style.cssText = `
      color: #ffffff;
      font-size: 16px;
      line-height: 1.4;
      margin: 0 0 10px 0;
      text-align: center;
      font-style: italic;
    `;
    
    this.authorElement = document.createElement('p');
    this.authorElement.style.cssText = `
      color: #bbbbbb;
      font-size: 12px;
      margin: 0;
      text-align: right;
      font-weight: 500;
    `;
    
    this.containerElement.appendChild(this.quoteElement);
    this.containerElement.appendChild(this.authorElement);
    document.body.appendChild(this.containerElement);
    
    // Set initial position
    this.updateDimensions();
    this.x = Math.random() * (window.innerWidth - this.width);
    this.y = Math.random() * (window.innerHeight - this.height);
  }
  
  // Update quote dimensions
  updateDimensions() {
    const rect = this.containerElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
  }
  
  // Display current quote
  displayCurrentQuote() {
    const quote = this.quotes[this.currentQuoteIndex];
    this.quoteElement.textContent = `"${quote.text}"`;
    this.authorElement.textContent = `— ${quote.author}`;
    
    // Update dimensions after content change
    setTimeout(() => {
      this.updateDimensions();
    }, 50);
  }
  
  // Start bouncing animation
  startBouncing() {
    const bounce = () => {
      // Update position
      this.x += this.vx;
      this.y += this.vy;
      
      // Bounce off walls
      if (this.x <= 0 || this.x >= window.innerWidth - this.width) {
        this.vx = -this.vx;
        this.x = Math.max(0, Math.min(this.x, window.innerWidth - this.width));
      }
      
      if (this.y <= 0 || this.y >= window.innerHeight - this.height) {
        this.vy = -this.vy;
        this.y = Math.max(0, Math.min(this.y, window.innerHeight - this.height));
      }
      
      // Apply position
      this.containerElement.style.left = this.x + 'px';
      this.containerElement.style.top = this.y + 'px';
      
      this.animationId = requestAnimationFrame(bounce);
    };
    
    bounce();
  }
  
  // Start quote rotation every 15 seconds
  startQuoteRotation() {
    this.changeIntervalId = setInterval(() => {
      this.nextQuote();
    }, 15000);
  }
  
  // Move to next quote
  nextQuote() {
    this.currentQuoteIndex = (this.currentQuoteIndex + 1) % this.quotes.length;
    
    // If we've cycled through all quotes, shuffle again
    if (this.currentQuoteIndex === 0) {
      this.quotes = this.shuffleArray([...MOLE_BOOK_QUOTES]);
    }
    
    // Fade out, change quote, fade in
    this.containerElement.style.opacity = '0';
    setTimeout(() => {
      this.displayCurrentQuote();
      this.containerElement.style.opacity = '1';
    }, 300);
  }
  
  // Handle window resize
  handleResize() {
    // Ensure quote stays within bounds after resize
    this.x = Math.min(this.x, window.innerWidth - this.width);
    this.y = Math.min(this.y, window.innerHeight - this.height);
  }
  
  // Destroy quote bouncer
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.changeIntervalId) {
      clearInterval(this.changeIntervalId);
    }
    if (this.containerElement && this.containerElement.parentNode) {
      this.containerElement.parentNode.removeChild(this.containerElement);
    }
  }
}

// Global quote bouncer instance
let quoteBouncer = null;

// Start quotes system
function startQuotesSystem() {
  if (!quoteBouncer) {
    quoteBouncer = new QuotesBouncer();
    
    // Handle window resize
    window.addEventListener('resize', () => {
      if (quoteBouncer) {
        quoteBouncer.handleResize();
      }
    });
  }
}

// Stop quotes system
function stopQuotesSystem() {
  if (quoteBouncer) {
    quoteBouncer.destroy();
    quoteBouncer = null;
  }
}

// Export for use in sleep.js
window.QuotesSystem = {
  start: startQuotesSystem,
  stop: stopQuotesSystem
};