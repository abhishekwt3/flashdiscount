// app/components/DiscountBarPreview.jsx
import { useState, useEffect } from "react";
import { Box, Text } from "@shopify/polaris";

export default function DiscountBarPreview({ settings }) {
  // Default values in case settings are incomplete
  const safeSettings = {
    backgroundColor: "#FF5733",
    textColor: "#FFFFFF",
    emoji: "🔥",
    timerDuration: 15,
    discountPercentage: 15,
    barText: "Limited time offer! {discount}% off your entire order automatically applied!",
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

  // Get display text for the bar
  const getBarText = () => {
    // Replace placeholders in the text
    const text = safeSettings.barText || "Limited time offer! {discount}% off your entire order automatically applied!";
    const percentage = safeSettings.discountPercentage || 15;

    return text.replace("{discount}", percentage);
  };

  return (
    <Box
      style={{
        backgroundColor: safeSettings.backgroundColor,
        color: safeSettings.textColor,
        width: "350px",
        height: "75px",
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 16px",
        margin: "0 auto",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <span
          style={{
            fontSize: "24px",
            marginRight: "12px",
          }}
        >
          {safeSettings.emoji}
        </span>
        <Text variant="bodyMd" as="span">
          {getBarText()}
        </Text>
        <Box
          style={{
            marginLeft: "12px",
            display: "flex",
            alignItems: "center",
            background: "rgba(0,0,0,0.1)",
            padding: "4px 8px",
            borderRadius: "4px",
          }}
        >
          <Text variant="bodyMd" as="span">
            {formatTime(timeLeft)}
          </Text>
        </Box>
      </div>
      {/* Badge showing automatic application */}
      <div
        style={{
          position: "absolute",
          bottom: "-10px",
          right: "10px",
          background: "#00a881",
          color: "white",
          fontSize: "10px",
          padding: "2px 6px",
          borderRadius: "10px",
          fontWeight: "bold",
        }}
      >
        AUTO-APPLIED
      </div>
    </Box>
  );
}
