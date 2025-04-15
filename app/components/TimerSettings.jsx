import { BlockStack, RangeSlider, TextField } from "@shopify/polaris";

export default function TimerSettings({ duration, onChange }) {
  const handleRangeChange = (value) => {
    onChange(parseInt(value, 10));
  };

  const handleTextChange = (value) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 5 && numValue <= 60) {
      onChange(numValue);
    }
  };

  return (
    <BlockStack gap="2">
      <TextField
        label="Timer Duration (minutes)"
        type="number"
        value={String(duration)}
        onChange={handleTextChange}
        min={5}
        max={60}
      />
      <RangeSlider
        label="Adjust Duration"
        value={duration}
        onChange={handleRangeChange}
        output
        min={5}
        max={60}
        step={5}
      />
    </BlockStack>
  );
}
