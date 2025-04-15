import { useState } from "react";
import { BlockStack, Button, Popover, TextField, Box } from "@shopify/polaris";

export default function EmojiSelector({ selected, onChange }) {
  const [popoverActive, setPopoverActive] = useState(false);

  const togglePopoverActive = () => {
    setPopoverActive((active) => !active);
  };

  const commonEmojis = [
    "🔥", "⏰", "💰", "🎁", "🛍️", "💸", "⚡", "✨", "🏷️", "💯", "📢", "🎯"
  ];

  return (
    <BlockStack gap="2">
      <TextField label="Selected Emoji" value={selected} onChange={onChange} />
      <Button onClick={togglePopoverActive} disclosure>
        Choose Emoji
      </Button>
      {popoverActive && (
        <Popover
          active={popoverActive}
          activator={<div />}
          onClose={togglePopoverActive}
        >
          <Box padding="3">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "8px",
              }}
            >
              {commonEmojis.map((emoji) => (
                <Button
                  key={emoji}
                  plain
                  onClick={() => {
                    onChange(emoji);
                    togglePopoverActive();
                  }}
                >
                  <span style={{ fontSize: "24px" }}>{emoji}</span>
                </Button>
              ))}
            </div>
          </Box>
        </Popover>
      )}
    </BlockStack>
  );
}
