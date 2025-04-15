import { BlockStack, RangeSlider, TextField } from "@shopify/polaris";

export default function DiscountSettings({ percentage, onChange }) {
  const handleRangeChange = (value) => {
    onChange(parseInt(value, 10));
  };

  const handleTextChange = (value) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 5 && numValue <= 50) {
      onChange(numValue);
    }
  };

  return (
    <BlockStack gap="2">
      <TextField
        label="Discount Percentage (%)"
        type="number"
        value={String(percentage)}
        onChange={handleTextChange}
        min={5}
        max={50}
      />
      <RangeSlider
        label="Adjust Percentage"
        value={percentage}
        onChange={handleRangeChange}
        output
        min={5}
        max={50}
        step={5}
      />
    </BlockStack>
  );
}
