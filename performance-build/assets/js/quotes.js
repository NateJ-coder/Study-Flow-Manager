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

// ----- Additional Philosophers -----
const NIETZSCHE_QUOTES = [
"Without music, life would be a mistake.",
"He who has a why to live can bear almost any how.",
"That which does not kill us makes us stronger.",
"There are no facts, only interpretations.",
"In every real man a child is hidden that wants to play.",
"To live is to suffer, to survive is to find some meaning in the suffering.",
"The higher we soar, the smaller we appear to those who cannot fly.",
"Whoever fights monsters should see to it that in the process he does not become a monster.",
"One must still have chaos in oneself to give birth to a dancing star.",
"There is always some madness in love. But there is also always some reason in madness.",
"Sometimes people don’t want to hear the truth because they don’t want their illusions destroyed.",
"Love your fate, which is in fact your life.",
"All truly great thoughts are conceived while walking.",
"In individuals, insanity is rare; but in groups, parties, nations and epochs, it is the rule.",
"The man of knowledge must be able not only to love his enemies but also to hate his friends.",
"Whoever cannot command himself must obey.",
"Convictions are more dangerous enemies of truth than lies.",
"He who climbs upon the highest mountains laughs at all tragedies, real or imaginary.",
"Become who you are.",
"There is more wisdom in your body than in your deepest philosophy."
];

const KIERKEGAARD_QUOTES = [
"Life can only be understood backwards; but it must be lived forwards.",
"Anxiety is the dizziness of freedom.",
"The function of prayer is not to influence God, but rather to change the nature of the one who prays.",
"To dare is to lose one’s footing momentarily. Not to dare is to lose oneself.",
"Faith is the highest passion in a human being.",
"The most common form of despair is not being who you are.",
"People demand freedom of speech as a compensation for the freedom of thought which they seldom use.",
"Once you label me, you negate me.",
"Subjectivity is truth.",
"The tyrant dies and his rule is over; the martyr dies and his rule begins.",
"Patience is necessary, and one cannot reap immediately where one has sown.",
"Face the facts of being what you are, for that is what changes what you are.",
"Most men pursue pleasure with such breathless haste that they hurry past it.",
"The crowd is untruth.",
"Purity of heart is to will one thing.",
"It is so hard to believe because it is so hard to obey.",
"To cheat oneself out of love is the most terrible deception.",
"The door to happiness opens outward.",
"The self is a relation that relates itself to itself.",
"Hope is a passion for the possible."
];

const SCHOPENHAUER_QUOTES = [
"All truth passes through three stages: ridicule, opposition, and acceptance.",
"Compassion is the basis of morality.",
"The world is my representation.",
"Talent hits a target no one else can hit; genius hits a target no one else can see.",
"We forfeit three-fourths of ourselves in order to be like other people.",
"It is difficult to find happiness within oneself, but it is impossible to find it anywhere else.",
"A man can be himself only so long as he is alone.",
"The greatest of follies is to sacrifice health for any other kind of happiness.",
"Every man takes the limits of his own field of vision for the limits of the world.",
"Mostly it is loss which teaches us about the worth of things.",
"The two enemies of human happiness are pain and boredom.",
"Life swings like a pendulum backward and forward between pain and boredom.",
"Politeness is to human nature what warmth is to wax.",
"Compassion is the only genuine moral motive.",
"The shortness of life, so often lamented, may be the best thing about it.",
"Religion is the masterpiece of the art of animal training.",
"The wise have always said the same things, and fools have always done just the opposite.",
"It is the courage to make a clean breast of it in the face of every question that makes the philosopher.",
"Buying books would be a good thing if one could also buy the time to read them.",
"Hatred comes from the heart; contempt from the head; and neither feeling is quite within our control."
];

const PLATO_QUOTES = [
"The beginning is the most important part of the work.",
"Wise men speak because they have something to say; fools because they have to say something.",
"The measure of a man is what he does with power.",
"Opinion is the medium between knowledge and ignorance.",
"At the touch of love everyone becomes a poet.",
"Courage is knowing what not to fear.",
"The greatest wealth is to live content with little.",
"The price good men pay for indifference to public affairs is to be ruled by evil men.",
"Music gives a soul to the universe, wings to the mind, flight to the imagination.",
"An empty vessel makes the loudest sound, so they that have the least wit are the greatest babblers.",
"Be kind, for everyone you meet is fighting a harder battle.",
"Justice means minding your own business and not meddling with other men’s concerns.",
"Necessity is the mother of invention.",
"I am the wisest man alive, for I know one thing, and that is that I know nothing.",
"Only the dead have seen the end of war.",
"Good actions give strength to ourselves and inspire good actions in others.",
"The heaviest penalty for declining to rule is to be ruled by someone inferior to yourself.",
"Books give a soul to the universe.",
"Man - a being in search of meaning.",
"Love is a serious mental disease."
];

const KANT_QUOTES = [
"Science is organized knowledge. Wisdom is organized life.",
"Act only according to that maxim whereby you can at the same time will that it should become a universal law.",
"We are not rich by what we possess but by what we can do without.",
"Experience without theory is blind, but theory without experience is mere intellectual play.",
"Two things fill the mind with ever new and increasing admiration: the starry heavens above me and the moral law within me.",
"Immaturity is the inability to use one’s understanding without guidance from another.",
"Dare to know! Have the courage to use your own understanding.",
"In law, a man is guilty when he violates the rights of others. In ethics, he is guilty if he only thinks of doing so.",
"Happiness is not an ideal of reason but of imagination.",
"The hand is the visible part of the brain.",
"Out of the crooked timber of humanity, no straight thing was ever made.",
"Thoughts without content are empty; intuitions without concepts are blind.",
"The only thing that is unconditionally good is a good will.",
"Freedom is the precondition for moral responsibility.",
"Reason is the faculty that gives us principles.",
"Perpetual peace is not a natural state; it must be established.",
"All our knowledge begins with the senses.",
"Morality is not properly the doctrine of how we may make ourselves happy, but how we may make ourselves worthy of happiness.",
"Education is the development in man of all perfection of which he is capable.",
"Space and time are the framework within which the mind constructs reality."
];

const WILDE_QUOTES = [
"Be yourself; everyone else is already taken.",
"Always forgive your enemies; nothing annoys them so much.",
"To live is the rarest thing in the world. Most people exist, that is all.",
"Experience is simply the name we give our mistakes.",
"We are all in the gutter, but some of us are looking at the stars.",
"The truth is rarely pure and never simple.",
"A cynic is a man who knows the price of everything and the value of nothing.",
"I can resist everything except temptation.",
"Some cause happiness wherever they go; others whenever they go.",
"The only thing to do with good advice is to pass it on.",
"Life is too important to be taken seriously.",
"No man is rich enough to buy back his past.",
"Every saint has a past, and every sinner has a future.",
"The only way to get rid of temptation is to yield to it.",
"To define is to limit.",
"You can never be overdressed or overeducated.",
"Selfishness is not living as one wishes to live, it is asking others to live as one wishes.",
"True friends stab you in the front.",
"Women are meant to be loved, not to be understood.",
"Art is the most intense mode of individualism that the world has known."
];

// Combine pools into a single array of quote objects for the bouncer
const PHILOSOPHER_POOLS = [
  ...NIETZSCHE_QUOTES.map(t => ({ text: t, author: 'Friedrich Nietzsche' })),
  ...KIERKEGAARD_QUOTES.map(t => ({ text: t, author: 'Søren Kierkegaard' })),
  ...SCHOPENHAUER_QUOTES.map(t => ({ text: t, author: 'Arthur Schopenhauer' })),
  ...PLATO_QUOTES.map(t => ({ text: t, author: 'Plato' })),
  ...KANT_QUOTES.map(t => ({ text: t, author: 'Immanuel Kant' })),
  ...WILDE_QUOTES.map(t => ({ text: t, author: 'Oscar Wilde' }))
];

// Expanded quotes pool (mole book + philosophers)
const EXPANDED_QUOTES_POOL = [
  ...MOLE_BOOK_QUOTES,
  ...PHILOSOPHER_POOLS
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
    
  // Shuffle quotes on initialization (use expanded pool)
  this.quotes = this.shuffleArray([...EXPANDED_QUOTES_POOL]);
    
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