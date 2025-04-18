// Discount Bar Script
(function() {
  // Constants
  const DISCOUNT_ENDPOINT = '/api/generate-code';
  const STORAGE_KEY = 'flashoff_discount_data';
  const DEFAULT_DURATION_MINUTES = 15;

  // Get the discount bar element
  const discountBar = document.getElementById('discount-bar-app');
  if (!discountBar) return;

  // DOM elements
  const container = discountBar.querySelector('.discount-bar-container');
  const emojiElement = discountBar.querySelector('.discount-bar-emoji');
  const textElement = discountBar.querySelector('.discount-bar-text');
  const timerElement = discountBar.querySelector('.discount-bar-timer');

  // Get settings from data attributes
  const settings = {
    backgroundColor: discountBar.dataset.backgroundColor || '#FF5733',
    textColor: discountBar.dataset.textColor || '#FFFFFF',
    emoji: discountBar.dataset.emoji || '🔥',
    timerDuration: parseInt(discountBar.dataset.timerDuration || '15', 10),
    discountPercentage: parseInt(discountBar.dataset.discountPercentage || '15', 10),
    barText: discountBar.dataset.barText || 'Limited time offer! {discount}% off your entire order!'
  };

  // Apply styles
  container.style.backgroundColor = settings.backgroundColor;
  container.style.color = settings.textColor;
  emojiElement.textContent = settings.emoji;

  // Check if a discount is already active
  const savedDiscount = getSavedDiscount();
  let discountCode = '';
  let timeLeft = 0;
  let timer;

  if (isDiscountActive(savedDiscount)) {
    // Use the existing discount
    discountCode = savedDiscount.code;
    const elapsedSeconds = Math.floor((Date.now() - savedDiscount.createdAt) / 1000);
    timeLeft = Math.max(0, DEFAULT_DURATION_MINUTES * 60 - elapsedSeconds);

    // Update the display
    updateDiscountDisplay(discountCode);
    startTimer(timeLeft);
  } else {
    // Generate a new discount
    generateNewDiscount();
  }

  // Handle click to apply discount
  container.addEventListener('click', () => {
    // Simply redirect to cart - the discount is automatic
    window.location.href = '/cart';
  });

  /**
   * Generates a new discount via the API
   */
  function generateNewDiscount() {
    fetch(DISCOUNT_ENDPOINT)
      .then(response => {
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          // Store the new discount data
          const discountData = {
            code: data.code,
            percentage: settings.discountPercentage,
            createdAt: Date.now(),
            expiresAt: Date.now() + (DEFAULT_DURATION_MINUTES * 60 * 1000)
          };

          saveDiscount(discountData);

          // Update UI
          discountCode = data.code;
          timeLeft = DEFAULT_DURATION_MINUTES * 60;
          updateDiscountDisplay(discountCode);
          startTimer(timeLeft);
        } else {
          console.error('Error generating discount:', data.error);
          // Use a placeholder code
          discountCode = 'SHOPNOW';
          timeLeft = DEFAULT_DURATION_MINUTES * 60;
          updateDiscountDisplay(discountCode);
          startTimer(timeLeft);
        }
      })
      .catch(error => {
        console.error('Error fetching discount:', error);
        // Use a placeholder in case of error
        discountCode = 'SHOPNOW';
        timeLeft = DEFAULT_DURATION_MINUTES * 60;
        updateDiscountDisplay(discountCode);
        startTimer(timeLeft);
      });
  }

  /**
   * Updates the display with discount information
   */
  function updateDiscountDisplay(code) {
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

        // Generate a new discount when the timer expires
        generateNewDiscount();
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
})();
