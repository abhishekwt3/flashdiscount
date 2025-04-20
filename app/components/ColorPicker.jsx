// app/components/ColorPicker.jsx
import { useState } from "react";
import { Box, BlockStack, InlineStack, TextField, Popover } from "@shopify/polaris";

export default function ColorPicker({ label, color, onChange }) {
  const [popoverActive, setPopoverActive] = useState(false);

  const togglePopoverActive = () => {
    setPopoverActive((active) => !active);
  };

  const handleChange = (value) => {
    onChange(value);
  };

  return (
    <BlockStack gap="2">
      <TextField
        label={label}
        value={color}
        onChange={handleChange}
        autoComplete="off"
      />
      <InlineStack gap="2">
        <div
          style={{
            backgroundColor: color,
            cursor: "pointer",
            border: "1px solid #ddd",
            height: "32px",
            width: "32px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={togglePopoverActive}
        >
          <span style={{ color: getContrastColor(color), fontSize: "18px" }}>+</span>
        </div>
        <Popover
          active={popoverActive}
          activator={<div />}
          onClose={togglePopoverActive}
        >
          <Box padding="3">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "8px",
              }}
            >
              {[
                "#FF5733", "#FFC300", "#36B37E", "#00B8D9", "#6554C0",
                "#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF"
              ].map((presetColor) => (
                <div
                  key={presetColor}
                  style={{
                    backgroundColor: presetColor,
                    width: "24px",
                    height: "24px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    border: "1px solid #ddd",
                  }}
                  onClick={() => {
                    handleChange(presetColor);
                    togglePopoverActive();
                  }}
                />
              ))}
            </div>
          </Box>
        </Popover>
      </InlineStack>
    </BlockStack>
  );
}

// Helper function to determine contrasting text color for better visibility
function getContrastColor(hexcolor) {
  // If no color provided, return black
  if (!hexcolor) return "#000000";

  // Convert hex to RGB
  let r = 0, g = 0, b = 0;

  // 3 digits
  if (hexcolor.length === 4) {
    r = parseInt(hexcolor[1] + hexcolor[1], 16);
    g = parseInt(hexcolor[2] + hexcolor[2], 16);
    b = parseInt(hexcolor[3] + hexcolor[3], 16);
  }
  // 6 digits
  else if (hexcolor.length === 7) {
    r = parseInt(hexcolor.substring(1, 3), 16);
    g = parseInt(hexcolor.substring(3, 5), 16);
    b = parseInt(hexcolor.substring(5, 7), 16);
  }

  // Calculate luminance (perceived brightness)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for bright colors, white for dark colors
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
