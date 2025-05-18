// Updated Discount Bar Popup Script with auto-hide after timer expires
(function() {
  console.log('Discount Bar Script Loaded');

  // Constants
  const PROXY_PATH = '/apps/flashoff'; // App proxy path
  const STORAGE_KEY = 'flashoff_discount_data';
  const SESSION_START_KEY = 'flashoff_session_start';
  const POPUP_SHOWN_KEY = 'flashoff_popup_shown';
  const POPUP_DISMISSED_KEY = 'flashoff_popup_dismissed';
  const DISCOUNT_APPLIED_KEY = 'flashoff_discount_applied';
  const DEFAULT_DURATION_MINUTES = 15;
  const CART_CHECK_INTERVAL = 5000; // Check cart every 5 seconds

  // Wait for DOM to be fully loaded before initializing
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', moveAndInitialize);
  } else {
    // DOM already loaded
    moveAndInitialize();
  }

  // Function to move discount bar to body and then initialize
  function moveAndInitialize() {
    // Get the discount bar element
    const discountBar = document.getElementById('discount-bar-app');

    if (!discountBar) {
      console.error('Discount bar element not found');
      return;
    }

    // IMPORTANT: Ensure it's hidden before moving to prevent flash of empty content
    discountBar.style.display = 'none';
    discountBar.style.opacity = '0';

    // Remove it from its current position
    discountBar.parentNode.removeChild(discountBar);

    // Append it directly to the body element
    document.body.appendChild(discountBar);

    console.log('Discount bar moved to body element');

    // Once moved, initialize the discount bar functionality
    initializeDiscountBar(discountBar);
  }

  // Main initialization function
  function initializeDiscountBar(discountBar) {
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

    // Check if popup was previously dismissed
    const popupDismissed = localStorage.getItem(POPUP_DISMISSED_KEY) === 'true';
    if (popupDismissed) {
      console.log('Popup was previously dismissed, not showing');
      return; // Stop execution if already dismissed
    }

    console.log('Discount bar element found');

    // DOM elements
    const container = discountBar.querySelector('.discount-bar-container');
    const emojiElement = discountBar.querySelector('.discount-bar-emoji');
    const textElement = discountBar.querySelector('.discount-bar-text');
    const timerElement = discountBar.querySelector('.discount-bar-timer');
    const closeButton = discountBar.querySelector('.discount-bar-close');
    const applyButton = discountBar.querySelector('.apply-button');

    // Check if we're in the Shopify Theme Editor
    const isInCustomizer = window.Shopify && window.Shopify.designMode;
    if (isInCustomizer) {
      // If in customizer, show preview and return
      prepareCustomizerPreview(discountBar);
      return;
    }

    // Get settings from data attributes
    const settings = {
      backgroundColor: discountBar.dataset.backgroundColor || '#E8F7E9',
      textColor: discountBar.dataset.textColor || '#000000',
      emoji: discountBar.dataset.emoji || '😊',
      timerDuration: parseInt(discountBar.dataset.timerDuration || '15', 10),
      discountPercentage: parseInt(discountBar.dataset.discountPercentage || '20', 10),
      barText: discountBar.dataset.barText || 'Surprise offer just for you ! Get {discount}% off on if you place your order within 15 minutes !',
      sessionThreshold: parseInt(discountBar.dataset.sessionThreshold || '60', 10), // Default 60 seconds
      requireCartItems: discountBar.dataset.requireCartItems !== 'false', // Default true
      currentDiscountCode: discountBar.dataset.discountCode || '',
      isAutomatic: discountBar.dataset.isAutomatic === 'true'
    };

    console.log('Settings loaded:', settings);

    // Apply styles from settings
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
        dismissPopupPermanently();
      });
    }

    // Handle click to apply discount
    container.addEventListener('click', handleContainerClick);

    if (applyButton) {
      applyButton.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent event bubbling
        handleContainerClick(e);
      });
    }

    function handleContainerClick(e) {
      console.log('Discount bar clicked, discount code:', discountCode);

      // Mark as dismissed permanently
      dismissPopupPermanently();

      if (discountCode) {
        if (isAutomatic) {
          // If it's an automatic discount, just go to cart
          window.location.href = '/cart';
        } else {
          // For code-based discounts, use the discount URL with tracking
          applyDiscountWithTracking(discountCode);
        }
      }
    }

    // Function to permanently dismiss the popup
    function dismissPopupPermanently() {
      // Hide the popup
      hideDiscountBar();

      // Mark as dismissed in localStorage - this ensures it won't show again
      localStorage.setItem(POPUP_DISMISSED_KEY, 'true');
      console.log('Popup dismissed permanently');
    }

    // Start checking for conditions to show popup
    if (!popupAlreadyShown && !popupDismissed) {
      startCartAndSessionCheck();
    } else if (!popupDismissed) {
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
      // If popup was dismissed, don't show it again
      if (localStorage.getItem(POPUP_DISMISSED_KEY) === 'true') {
        console.log('Popup was dismissed, stopping checks');
        clearInterval(cartChecker);
        return;
      }

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
      // If popup was dismissed, don't show it
      if (localStorage.getItem(POPUP_DISMISSED_KEY) === 'true') {
        console.log('Popup was dismissed, not showing');
        return;
      }

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
          // No expiry, show "No expiry" text but still start a timer to hide popup after the set duration
          if (timerElement) {
            timerElement.textContent = "No expiry";
          }
          // Even if discount doesn't expire, hide the popup after the configured timer duration
          startTimerToHidePopup(settings.timerDuration * 60);
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

        // Start the timer - this will now hide the popup when it reaches zero
        if (timerElement) {
          startTimer(settings.timerDuration * 60);
        }
      } else {
        // Generate a new discount but don't show the code
        console.log('Using automatic discount without code');

        // Set as automatic discount
        isAutomatic = true;

        // Use empty code
        discountCode = '';

        // Store discount data without a code
        const discountData = {
          code: '',
          percentage: settings.discountPercentage,
          createdAt: Date.now(),
          expiresAt: Date.now() + (DEFAULT_DURATION_MINUTES * 60 * 1000),
          isAutomatic: true
        };

        saveDiscount(discountData);

        // Update display without a code
        updateDiscountDisplay();

        // Start timer
        timeLeft = DEFAULT_DURATION_MINUTES * 60;
        startTimer(timeLeft);
      }

      // Update the apply button text
      if (applyButton) {
        applyButton.textContent = "APPLY OFFER";
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
     * Updates the display with discount information - WITHOUT showing code
     */
    function updateDiscountDisplay() {
      // Update text with proper discount code instructions but NEVER show the code
      let displayText = settings.barText
        .replace('{discount}', settings.discountPercentage);

      // Remove any references to discount codes
      displayText = displayText.replace(/\b(use\s+code|code)[:\s]*/gi, '');
      displayText = displayText.replace(/\s+\b[A-Z0-9]{6,}\b/g, '');

      // Clean up double spaces
      displayText = displayText.replace(/\s+/g, ' ').trim();

      // Set the text WITHOUT the code
      textElement.textContent = displayText;
    }

    /**
     * Starts the countdown timer that will dismiss the popup when it reaches zero
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
          // When timer reaches zero, hide the popup and prevent it from showing again
          dismissPopupPermanently();
        }

        timerElement.textContent = formatTime(seconds);
      }, 1000);
    }

    /**
     * Starts a timer to hide the popup after a duration, without showing countdown
     * Used for "no expiry" discounts
     */
    function startTimerToHidePopup(seconds) {
      setTimeout(() => {
        dismissPopupPermanently();
      }, seconds * 1000);
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
  }

  /**
   * Prepare a preview version for the theme customizer
   */
  function prepareCustomizerPreview(discountBar) {
    console.log('Preparing customizer preview');

    // Get DOM elements
    const container = discountBar.querySelector('.discount-bar-container');
    const emojiElement = discountBar.querySelector('.discount-bar-emoji');
    const textElement = discountBar.querySelector('.discount-bar-text');
    const timerElement = discountBar.querySelector('.discount-bar-timer');

    // Get settings from data attributes
    const settings = {
      backgroundColor: discountBar.dataset.backgroundColor || '#E8F7E9',
      textColor: discountBar.dataset.textColor || '#000000',
      emoji: discountBar.dataset.emoji || '😊',
      discountPercentage: parseInt(discountBar.dataset.discountPercentage || '20', 10),
      barText: discountBar.dataset.barText || 'Surprise offer just for you! Get {discount}% off if you place your order within 15 minutes!'
    };

    // Apply styles to preview
    if (container) {
      container.style.backgroundColor = settings.backgroundColor;
      container.style.color = settings.textColor;
    }

    if (emojiElement) {
      emojiElement.textContent = settings.emoji;
    }

    if (textElement) {
      // Replace placeholder in text
      textElement.textContent = settings.barText.replace('{discount}', settings.discountPercentage);
    }

    if (timerElement) {
      timerElement.textContent = "15:00";
    }

    // Make the bar visible in the customizer
    discountBar.style.display = 'flex';
    discountBar.style.opacity = '1';

    // Add a note in the customizer to explain that this is just a preview
    const customLabel = document.createElement('div');
    customLabel.style.position = 'absolute';
    customLabel.style.top = '-25px';
    customLabel.style.left = '0';
    customLabel.style.width = '100%';
    customLabel.style.textAlign = 'center';
    customLabel.style.fontSize = '12px';
    customLabel.style.color = '#666';
    customLabel.textContent = 'Discount Popup - Appears when conditions are met';

    // Add the label to the discount bar container
    discountBar.appendChild(customLabel);
  }

  /**
   * Clear session data - for testing purposes
   */
  window.clearFlashOffSession = function() {
    localStorage.removeItem(SESSION_START_KEY);
    localStorage.removeItem(POPUP_SHOWN_KEY);
    localStorage.removeItem(POPUP_DISMISSED_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DISCOUNT_APPLIED_KEY);
    console.log('FlashOff session data cleared. Refresh the page to start a new session.');
  };

  /**
   * Force show the popup - for testing purposes
   */
  window.showFlashoffDiscountPopup = function() {
    const discountBar = document.getElementById('discount-bar-app');
    if (discountBar) {
      discountBar.style.display = 'flex';
      discountBar.style.opacity = '1';
      discountBar.style.transform = 'translateY(0)';
      console.log('Discount popup forced to show');
    } else {
      console.error('Discount bar element not found');
    }
  };
})();
