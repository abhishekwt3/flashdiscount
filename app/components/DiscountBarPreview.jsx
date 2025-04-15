 // app/components/DiscountBarPreview.jsx
import { useState, useEffect } from "react";
import { Box, Text } from "@shopify/polaris";

export default function DiscountBarPreview({ settings }) {
  const [timeLeft, setTimeLeft] = useState(settings.timerDuration * 60); // Convert to seconds
  const [discountCode, setDiscountCode] = useState("SAVE15NOW");

  useEffect(() => {
    // Generate a random discount code
    const generateCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    setDiscountCode(generateCode());
  }, []);

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

  // Replace placeholders in the bar text
  const getBarText = () => {
    return settings.barText
      .replace("{code}", discountCode)
      .replace("{discount}", settings.discountPercentage);
  };

  return (
    <Box
      style={{
        backgroundColor: settings.backgroundColor,
        color: settings.textColor,
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
          {settings.emoji}
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
    </Box>
  );
}
