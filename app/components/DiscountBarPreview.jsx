// app/components/DiscountBarPreview.jsx
import { useState, useEffect } from "react";
import { Box, Text } from "@shopify/polaris";

export default function DiscountBarPreview({ settings }) {
  // Default values in case settings are incomplete
  const safeSettings = {
    backgroundColor: "#E8F7E9",
    textColor: "#000000",
    emoji: "😊",
    timerDuration: 15,
    discountPercentage: 20,
    barText: "Surprise offer just for you ! Get {discount}% off on if you place your order within 15 minutes !",
    ...settings
  };

  const [timeLeft, setTimeLeft] = useState((safeSettings.timerDuration || 15) * 60); // Convert to seconds

  useEffect(() => {
    // Reset timer when duration changes, with safety check
    const duration = safeSettings.timerDuration || 15;
    setTimeLeft(duration * 60);
  }, [safeSettings.timerDuration]);

  useEffect(() => {
    // Set up timer
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time as MM:SS
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Get display text for the bar (limit to 80 chars)
  const getBarText = () => {
    // Replace placeholders in the text
    const text = safeSettings.barText || "Surprise offer just for you ! Get {discount}% off on if you place your order within 15 minutes !";
    const percentage = safeSettings.discountPercentage || 20;
    const displayText = text.replace("{discount}", percentage);
    
    // Limit to 80 characters
    if (displayText.length > 80) {
      return displayText.substring(0, 77) + "...";
    }
    return displayText;
  };

  return (
    <div style={{ position: "relative", width: "400px", margin: "0 auto", height: "110px" }}>
      {/* Timer bar on top */}
      <Box
        style={{
          position: "absolute",
          top: "0",
          right: "15px",
          zIndex: "5",
          display: "flex",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.9)",
          padding: "3px 8px",
          borderRadius: "12px 12px 0 0",
          fontSize: "12px",
          fontWeight: "bold",
          color: "#FF0000",
          boxShadow: "0 -2px 5px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ marginRight: "5px" }}>Time Left: </span>
          <span>{formatTime(timeLeft)}</span>
        </div>
        <span
          style={{
            fontSize: "18px",
            cursor: "pointer",
            lineHeight: "1",
            marginLeft: "8px",
          }}
        >
          &times;
        </span>
      </Box>

      {/* Main discount bar */}
      <Box
        style={{
          position: "absolute",
          top: "20px",
          width: "100%",
          maxHeight: "90px",
          borderRadius: "10px",
          overflow: "visible",
          backgroundColor: safeSettings.backgroundColor,
          color: safeSettings.textColor,
          boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Main content with emoji and text */}
        <Box
          style={{
            display: "flex",
            padding: "5px 10px",
            alignItems: "center",
            height: "60px",
          }}
        >
          <div
            style={{
              fontSize: "38px",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "10px",
              flexShrink: "0",
            }}
          >
            {safeSettings.emoji}
          </div>
          <div style={{ flex: "1", overflow: "hidden" }}>
            <Text
              variant="bodyMd"
              as="span"
              style={{
                fontSize: "12px",
                lineHeight: "1.2", 
                display: "block",
                wordWrap: "break-word",
                maxHeight: "36px", // 3 lines of text
                overflow: "hidden",
              }}
            >
              {getBarText()}
            </Text>
          </div>
        </Box>

        {/* Apply button at bottom */}
        <div
          style={{
            position: "absolute",
            bottom: "-8px",
            left: "0",
            right: "0",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              backgroundColor: "#00ab5e",
              color: "white",
              padding: "1px 15px",
              height: "16px",
              lineHeight: "16px",
              borderRadius: "8px",
              fontSize: "9px",
              textTransform: "uppercase",
              fontWeight: "bold",
              cursor: "pointer",
              letterSpacing: "0.5px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            Apply Offer
          </span>
        </div>
      </Box>
    </div>
  );
}