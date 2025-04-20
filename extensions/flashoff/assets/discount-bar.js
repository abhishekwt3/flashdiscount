// Updated Discount Bar Popup Script handling homepage redirect
(function() {
  console.log('Discount Bar Script Loaded');

  // Constants
  const PROXY_PATH = '/apps/flashoff'; // App proxy path
  const STORAGE_KEY = 'flashoff_discount_data';
  const SESSION_START_KEY = 'flashoff_session_start';
  const POPUP_SHOWN_KEY = 'flashoff_popup_shown';
  const DISCOUNT_APPLIED_KEY = 'flashoff_discount_applied';
  const DEFAULT_DURATION_MINUTES = 15;
  const CART_CHECK_INTERVAL = 5000; // Check cart every 5 seconds

  // See if we just applied a discount and need to go to cart
  const discountJustApplied = localStorage.getItem(DISCOUNT_APPLIED_KEY);

  if (discountJustApplied) {
    // We just came back from the discount page to the homepage
    // Clear the flag and redirect to cart
    localStorage.removeItem(DISCOUNT_APPLIED_KEY);
    console.log('Detected return from discount page, redirecting to cart');

    // Go to cart page
    window.location.href = '/cart';
    return; // Stop execution
  }

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
    requireCartItems: discountBar.dataset.requireCartItems !== 'false', // Default true
    currentDiscountCode: discountBar.dataset.discountCode || '',
    isAutomatic: discountBar.dataset.isAutomatic === 'true'
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
  let isAutomatic = false;

  // Add event listeners
  if (closeButton) {
    closeButton.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent triggering the container click
      hideDiscountBar();
    });
  }

  // Handle click to apply discount
  container.addEventListener('click', () => {
    console.log('Discount bar clicked, discount code:', discountCode);

    if (discountCode) {
      if (isAutomatic) {
        // If it's an automatic discount, just go to cart
        window.location.href = '/cart';
      } else {
        // For code-based discounts, use the discount URL with tracking
        applyDiscountWithTracking(discountCode);
      }
    }
  });

  // Start checking for conditions to show popup
  if (!popupAlreadyShown) {
    startCartAndSessionCheck();
  } else {
    console.log('Popup already shown in this session, checking for active discount');
    const savedDiscount = getSavedDiscount();
    if (savedDiscount && isDiscountActive(savedDiscount)) {
      console.log('Active discount found, showing popup');
      showDiscountPopup();
    }
  }

  /**
   * Apply a discount code with tracking to handle the homepage redirect
   */
  function applyDiscountWithTracking(code) {
    console.log(`Applying discount code with tracking: ${code}`);

    // Set a flag that we're applying a discount
    // This will be checked when we return to the homepage
    localStorage.setItem(DISCOUNT_APPLIED_KEY, 'true');

    // Redirect to the discount URL
    window.location.href = `/discount/${code}`;
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
      isAutomatic = savedDiscount.isAutomatic;
      const elapsedSeconds = Math.floor((Date.now() - savedDiscount.createdAt) / 1000);
      timeLeft = savedDiscount.expiresAt ? Math.max(0, Math.floor((savedDiscount.expiresAt - Date.now()) / 1000)) : DEFAULT_DURATION_MINUTES * 60;

      console.log(`Using existing discount code: ${discountCode}, isAutomatic: ${isAutomatic}, time left: ${timeLeft}s`);

      // Update the display
      updateDiscountDisplay();

      if (savedDiscount.expiresAt) {
        startTimer(timeLeft);
      } else {
        // No expiry, show permanent text
        if (timerElement) {
          timerElement.textContent = "No expiry";
        }
      }
    } else if (settings.currentDiscountCode) {
      // Use the current discount code from settings
      discountCode = settings.currentDiscountCode;
      isAutomatic = settings.isAutomatic;

      console.log(`Using current discount code from settings: ${discountCode}, isAutomatic: ${isAutomatic}`);

      // Save this discount for future reference
      const discountData = {
        code: discountCode,
        percentage: settings.discountPercentage,
        createdAt: Date.now(),
        expiresAt: null, // We don't know the expiry from settings
        isAutomatic: isAutomatic
      };

      saveDiscount(discountData);

      // Update the display
      updateDiscountDisplay();

      // Set no timer as we don't know the expiry
      if (timerElement) {
        timerElement.textContent = "Limited time";
      }
    } else {
      // Generate a new discount
      console.log('No active discount found, generating mock code');
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

    // Update click text based on automatic vs code discount
    updateClickBadge();
  }

  /**
   * Update the badge text based on discount type
   */
  function updateClickBadge() {
    // Update container class
    const containerClass = isAutomatic ? "auto-discount" : "code-discount";
    container.className = `discount-bar-container ${containerClass}`;
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

    // For our demo, let's assume this is not an automatic discount
    isAutomatic = false;

    // Store the discount data
    const discountData = {
      code: code,
      percentage: settings.discountPercentage,
      createdAt: Date.now(),
      expiresAt: Date.now() + (DEFAULT_DURATION_MINUTES * 60 * 1000),
      isAutomatic: isAutomatic
    };

    saveDiscount(discountData);

    // Update UI
    discountCode = code;
    timeLeft = DEFAULT_DURATION_MINUTES * 60;
    updateDiscountDisplay();
    startTimer(timeLeft);

    // Update badge and container class
    updateClickBadge();
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
    // Update text with proper discount code instructions
    let displayText = settings.barText
      .replace('{discount}', settings.discountPercentage);

    if (!isAutomatic) {
      // Add code to the display text if it's not automatic
      displayText = displayText.replace('automatically applied', `use code "${discountCode}"`);
      if (!displayText.includes(discountCode)) {
        displayText += ` Use code: ${discountCode}`;
      }
    }

    textElement.textContent = displayText;
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

    // If no expiry, it's always active
    if (!discountData.expiresAt) return true;

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
    localStorage.removeItem(DISCOUNT_APPLIED_KEY);
    console.log('FlashOff session data cleared. Refresh the page to start a new session.');
  };

  /**
   * Force show the popup - for testing purposes
   * Can be called from console: window.showDiscountPopup()
   */
  window.showDiscountPopup = showDiscountPopup;
})();
