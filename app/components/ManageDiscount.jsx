// app/components/ManageDiscount.jsx
import { useState } from "react";
import {
  Card,
  Button,
  Text,
  Box,
  Banner,
  BlockStack,
  InlineStack,
  Tag,
  RangeSlider,
  TextField,
  Checkbox
} from "@shopify/polaris";
import { useSubmit } from "@remix-run/react";

export default function ManageDiscount({ settings }) {
  const submit = useSubmit();
  const [isGeneratingDiscount, setIsGeneratingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState(null);

  // Add state for discount settings
  const [discountPercentage, setDiscountPercentage] = useState(
    settings.discountPercentage || 15
  );
  // Set noExpiry to true by default - discounts will never expire by default
  const [noExpiry, setNoExpiry] = useState(true);
  const [oncePerCustomer, setOncePerCustomer] = useState(true);

  const handleGenerateDiscount = async () => {
    try {
      setIsGeneratingDiscount(true);
      setDiscountError(null);

      // Create form data for the action
      const formData = new FormData();
      formData.append("action", "generate_discount");

      // Always set noExpiry to true regardless of state to ensure codes don't expire
      formData.append("percentage", discountPercentage.toString());
      formData.append("noExpiry", "true");
      formData.append("oncePerCustomer", oncePerCustomer.toString());

      console.log(`Submitting with: percentage=${discountPercentage}, noExpiry=true, oncePerCustomer=${oncePerCustomer}`);

      // Submit the form to the action
      await submit(formData, { method: "post" });
    } catch (error) {
      console.error("Error generating discount code:", error);
      setDiscountError(error.message);
    } finally {
      setIsGeneratingDiscount(false);
    }
  };

  const handlePercentageChange = (value) => {
    // Convert to number and validate
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 5 && numValue <= 50) {
      setDiscountPercentage(numValue);
    }
  };

  const handleSliderChange = (value) => {
    setDiscountPercentage(parseInt(value, 10));
  };

  // Check if discount is active
  const isDiscountActive = () => {
    if (!settings.discountExpiresAt && !settings.noExpiry) return false;
    if (settings.noExpiry) return true;

    const expiryDate = new Date(settings.discountExpiresAt);
    return expiryDate > new Date();
  };

  // Format time remaining for discount
  const getDiscountTimeRemaining = () => {
    if (settings.noExpiry) return "No expiry";
    if (!settings.discountExpiresAt) return "00:00";

    const expiryDate = new Date(settings.discountExpiresAt);
    const now = new Date();
    const diffMs = expiryDate - now;

    if (diffMs <= 0) return "00:00";

    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Card>
        <Box padding="4">
          <Text as="h2" variant="headingMd">
            Active Discount
          </Text>
          <Box paddingBlockStart="4">
            <BlockStack gap="4">
              {settings.currentDiscountCode && isDiscountActive() ? (
                <BlockStack gap="4">
                  <InlineStack gap="2" blockAlign="center">
                    <Text variant="bodyMd" as="span">Active Discount Code:</Text>
                    <Tag>{settings.currentDiscountCode}</Tag>
                    <Text variant="bodyMd" as="span">
                      {settings.discountPercentage}% off
                    </Text>
                    <Text variant="bodyMd" as="span">
                      Never expires
                    </Text>
                  </InlineStack>
                  <Text variant="bodyMd" as="p">
                    This discount code is automatically applied to all products.
                    {settings.oncePerCustomer && " Limited to one use per customer."}
                  </Text>
                </BlockStack>
              ) : (
                <Text variant="bodyMd" as="p">
                  No active discount code. Generate a new one below.
                </Text>
              )}

              {discountError && (
                <Banner status="critical">
                  <p>Error generating discount: {discountError}</p>
                </Banner>
              )}
            </BlockStack>
          </Box>
        </Box>
      </Card>

      <Box paddingBlockStart="4">
        <Card>
          <Box padding="4">
            <Text as="h2" variant="headingMd">
              Create New Discount
            </Text>
            <Box paddingBlockStart="4">
              <BlockStack gap="4">
                <TextField
                  label="Discount Percentage (%)"
                  type="number"
                  value={String(discountPercentage)}
                  onChange={handlePercentageChange}
                  min={5}
                  max={50}
                  autoComplete="off"
                  helpText="Set the percentage for the new discount (5-50%)"
                />

                <RangeSlider
                  label="Adjust Percentage"
                  value={discountPercentage}
                  onChange={handleSliderChange}
                  output
                  min={5}
                  max={50}
                  step={5}
                />

                <Checkbox
                  label="Limit to one use per customer"
                  checked={oncePerCustomer}
                  onChange={setOncePerCustomer}
                />

                <Box paddingBlockStart="4">
                  <Button
                    primary
                    onClick={handleGenerateDiscount}
                    loading={isGeneratingDiscount}
                    disabled={isGeneratingDiscount}
                  >
                    Generate {discountPercentage}% Discount Code
                  </Button>
                </Box>
              </BlockStack>
            </Box>
          </Box>
        </Card>
      </Box>

      <Box paddingBlockStart="4">
        <Card>
          <Box padding="4">
            <Text as="h2" variant="headingMd">
              How It Works
            </Text>
            <Box paddingBlockStart="4">
              <BlockStack gap="4">
                <Text variant="bodyMd" as="p">
                  When you generate a new discount code:
                </Text>
                <ul style={{ paddingLeft: "20px" }}>
                  <li style={{ margin: "8px 0" }}>
                    A store-wide discount of {discountPercentage}% is created
                  </li>
                  <li style={{ margin: "8px 0" }}>
                    The discount is automatically applied to all products
                  </li>
                  <li style={{ margin: "8px 0" }}>
                    The discount has no expiration date and will remain active until you replace it
                  </li>
                  <li style={{ margin: "8px 0" }}>
                    {oncePerCustomer ? (
                      "Each customer can use the discount only once"
                    ) : (
                      "Customers can use the discount multiple times"
                    )}
                  </li>
                  <li style={{ margin: "8px 0" }}>
                    The discount bar will show this code to your customers
                  </li>
                </ul>
              </BlockStack>
            </Box>
          </Box>
        </Card>
      </Box>
    </>
  );
}
