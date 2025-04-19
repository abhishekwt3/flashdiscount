// Discount Bar Popup Script - With proper conditions
(function() {
  console.log('Discount Bar Script Loaded');

  // Constants
  const PROXY_PATH = '/apps/flashoff'; // App proxy path
  const DISCOUNT_ENDPOINT = `${PROXY_PATH}/api/generate-code`;
  const STORAGE_KEY = 'flashoff_discount_data';
  const SESSION_START_KEY = 'flashoff_session_start';
  const POPUP_SHOWN_KEY = 'flashoff_popup_shown';
  const DEFAULT_DURATION_MINUTES = 15;
  const CART_CHECK_INTERVAL = 5000; // Check cart every 5 seconds

  // Get the discount bar element
  const discountBar = document.getElementById('discount-bar-app');
  if (!discountBar) {
    console.error('Discount bar element not found');
    return;
  }

  console.log('Discount bar element found');

  // DOM elements
  const container = discountBar.querySelector('.discount-bar-container');
  const emojiElement = discountBar.querySelector('.discount-bar-emoji');
  const textElement = discountBar.querySelector('.discount-bar-text');
  const timerElement = discountBar.querySelector('.discount-bar-timer');
  const closeButton = discountBar.querySelector('.discount-bar-close');

  // Get settings from data attributes
  const settings = {
    backgroundColor: discountBar.dataset.backgroundColor || '#FF5733',
    textColor: discountBar.dataset.textColor || '#FFFFFF',
    emoji: discountBar.dataset.emoji || '🔥',
    timerDuration: parseInt(discountBar.dataset.timerDuration || '15', 10),
    discountPercentage: parseInt(discountBar.dataset.discountPercentage || '15', 10),
    barText: discountBar.dataset.barText || 'Limited time offer! {discount}% off your order! Click to apply discount.',
    sessionThreshold: parseInt(discountBar.dataset.sessionThreshold || '60', 10), // Default 60 seconds
    requireCartItems: discountBar.dataset.requireCartItems !== 'false' // Default true
  };

  console.log('Settings loaded:', settings);

  // Apply styles
  container.style.backgroundColor = settings.backgroundColor;
  container.style.color = settings.textColor;
  emojiElement.textContent = settings.emoji;

  // Initially hide the discount bar - now managed by the cart and session checks
  discountBar.style.display = 'none';

  // Track session start time if not already set
  if (!localStorage.getItem(SESSION_START_KEY)) {
    localStorage.setItem(SESSION_START_KEY, Date.now().toString());
    console.log('New session started');
  }

  // Check if we've already shown the popup in this session
  const popupAlreadyShown = localStorage.getItem(POPUP_SHOWN_KEY) === 'true';

  // Variables for discount tracking
  let discountCode = '';
  let timeLeft = 0;
  let timer;
  let cartChecker;

  // Add event listeners
  if (closeButton) {
    closeButton.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent triggering the container click
      hideDiscountBar();
    });
  }

  // Handle click to apply discount
  container.addEventListener('click', () => {
    console.log('Discount bar clicked');
    window.location.href = '/cart';
  });

  // Start checking for conditions to show popup
  if (!popupAlreadyShown) {
    startCartAndSessionCheck();
  } else {
    console.log('Popup already shown in this session, not showing again');
  }

  /**
   * Start checking cart contents and session time
   */
  function startCartAndSessionCheck() {
    console.log('Starting cart and session checks');

    // Stop any existing checker
    if (cartChecker) {
      clearInterval(cartChecker);
    }

    cartChecker = setInterval(() => {
      checkCartAndSession();
    }, CART_CHECK_INTERVAL);
  }

  /**
   * Check cart contents and session time to decide if popup should appear
   */
  function checkCartAndSession() {
    // Get session duration in seconds
    const sessionStart = parseInt(localStorage.getItem(SESSION_START_KEY) || Date.now().toString(), 10);
    const sessionDuration = Math.floor((Date.now() - sessionStart) / 1000);

    console.log(`Session duration: ${sessionDuration}s, Threshold: ${settings.sessionThreshold}s`);

    // Check if session meets threshold
    if (sessionDuration < settings.sessionThreshold) {
      console.log('Session time below threshold, not showing popup yet');
      return; // Not enough time has passed
    }

    // If we don't need to check cart, show popup immediately
    if (!settings.requireCartItems) {
      console.log('Cart check not required, showing popup');
      showDiscountPopup();
      clearInterval(cartChecker); // Stop checking
      return;
    }

    // Check cart contents
    fetch('/cart.js')
      .then(response => response.json())
      .then(cart => {
        console.log(`Cart has ${cart.item_count} items`);

        if (cart.item_count > 0) {
          console.log('Cart has items, showing popup');
          showDiscountPopup();
          clearInterval(cartChecker); // Stop checking after showing
        } else {
          console.log('Cart is empty, not showing popup yet');
        }
      })
      .catch(error => {
        console.error('Error checking cart:', error);
      });
  }

  /**
   * Show the discount popup and generate a code
   */
  function showDiscountPopup() {
    // Mark popup as shown for this session
    localStorage.setItem(POPUP_SHOWN_KEY, 'true');
    console.log('Showing discount popup and marking as shown');

    // Check if a discount is already active
    const savedDiscount = getSavedDiscount();

    if (isDiscountActive(savedDiscount)) {
      // Use the existing discount
      discountCode = savedDiscount.code;
      const elapsedSeconds = Math.floor((Date.now() - savedDiscount.createdAt) / 1000);
      timeLeft = Math.max(0, DEFAULT_DURATION_MINUTES * 60 - elapsedSeconds);

      console.log(`Using existing discount code: ${discountCode}, time left: ${timeLeft}s`);

      // Update the display
      updateDiscountDisplay();
      startTimer(timeLeft);
    } else {
      // Generate a new discount
      console.log('Generating new discount code');
      generateNewDiscount();
    }

    // Show the popup with animation
    discountBar.style.display = 'flex';
    discountBar.style.opacity = '0';
    discountBar.style.transform = 'translateY(20px)';

    // Trigger animation
    setTimeout(() => {
      discountBar.style.opacity = '1';
      discountBar.style.transform = 'translateY(0)';
    }, 50);
  }

  /**
   * Hide the discount bar
   */
  function hideDiscountBar() {
    console.log('Hiding discount bar');
    discountBar.style.opacity = '0';
    discountBar.style.transform = 'translateY(20px)';

    setTimeout(() => {
      discountBar.style.display = 'none';
    }, 300); // Match transition duration
  }

  /**
   * Generates a new discount code for display purposes
   */
  function generateNewDiscount() {
    // This is a simplified version for now - it just creates a mock discount code
    // In a real implementation, you would call your API to generate a real code

    const code = generateMockCode();
    console.log(`Generated mock code: ${code}`);

    // Store the discount data
    const discountData = {
      code: code,
      percentage: settings.discountPercentage,
      createdAt: Date.now(),
      expiresAt: Date.now() + (DEFAULT_DURATION_MINUTES * 60 * 1000)
    };

    saveDiscount(discountData);

    // Update UI
    discountCode = code;
    timeLeft = DEFAULT_DURATION_MINUTES * 60;
    updateDiscountDisplay();
    startTimer(timeLeft);
  }

  /**
   * Generate a mock discount code
   */
  function generateMockCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Updates the display with discount information
   */
  function updateDiscountDisplay() {
    // Format bar text
    textElement.textContent = settings.barText
      .replace('{discount}', settings.discountPercentage);
  }

  /**
   * Starts the countdown timer
   */
  function startTimer(seconds) {
    // Clear any existing timer
    if (timer) {
      clearInterval(timer);
    }

    // Update timer display initially
    timerElement.textContent = formatTime(seconds);

    // Set up the timer
    timer = setInterval(() => {
      seconds -= 1;

      if (seconds <= 0) {
        clearInterval(timer);
        seconds = 0;
      }

      timerElement.textContent = formatTime(seconds);
    }, 1000);
  }

  /**
   * Formats seconds into MM:SS
   */
  function formatTime(timeInSeconds) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Saves discount data to localStorage
   */
  function saveDiscount(discountData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(discountData));
  }

  /**
   * Gets saved discount data from localStorage
   */
  function getSavedDiscount() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    return savedData ? JSON.parse(savedData) : null;
  }

  /**
   * Checks if a saved discount is still active
   */
  function isDiscountActive(discountData) {
    if (!discountData) return false;

    const now = Date.now();
    return discountData.expiresAt > now;
  }

  /**
   * Clear session data - for testing purposes
   * Can be called from console: window.clearFlashOffSession()
   */
  window.clearFlashOffSession = function() {
    localStorage.removeItem(SESSION_START_KEY);
    localStorage.removeItem(POPUP_SHOWN_KEY);
    localStorage.removeItem(STORAGE_KEY);
    console.log('FlashOff session data cleared. Refresh the page to start a new session.');
  };

  /**
   * Force show the popup - for testing purposes
   * Can be called from console: window.showDiscountPopup()
   */
  window.showDiscountPopup = showDiscountPopup;
})();
