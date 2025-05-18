// app/components/ManageDiscountForm.jsx
import { useState, useEffect } from "react";
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
  Checkbox,
  Select,
  Spinner
} from "@shopify/polaris";
import { useSubmit, useFetcher } from "@remix-run/react";

export default function ManageDiscountForm({ settings, hideHowItWorks = false }) {
  const submit = useSubmit();
  const discountStatusFetcher = useFetcher();
  const [isGeneratingDiscount, setIsGeneratingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState(null);
  const [apiDiscountCode, setApiDiscountCode] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  // Add state for discount settings
  const [discountPercentage, setDiscountPercentage] = useState(
    settings.discountPercentage || 15
  );
  const [noExpiry, setNoExpiry] = useState(false);
  const [expiryDuration, setExpiryDuration] = useState("24");
  const [expiryUnit, setExpiryUnit] = useState("hours");
  const [oncePerCustomer, setOncePerCustomer] = useState(true);
  const [totalUsageLimit, setTotalUsageLimit] = useState(""); // Empty string means unlimited

  // Effect to update the status message when the fetcher state changes
  useEffect(() => {
    // When fetcher finishes loading
    if (discountStatusFetcher.state === "idle" && discountStatusFetcher.data) {
      // Clear the checking status message
      if (statusMessage === "Checking discount status...") {
        setStatusMessage(null);
      }

      // If we found an active discount, update apiDiscountCode
      if (discountStatusFetcher.data.hasActiveDiscount) {
        setApiDiscountCode(discountStatusFetcher.data.discountCode);
      } else {
        setApiDiscountCode(null);
      }
    }
  }, [discountStatusFetcher.state, discountStatusFetcher.data]);

  // Check discount status from API - only called when button is clicked
  const checkDiscountStatus = () => {
    setStatusMessage("Checking discount status...");
    // Use discountStatusFetcher.submit instead of load to handle POST request
    // Add a timestamp parameter to prevent caching
    const timestamp = new Date().getTime();
    discountStatusFetcher.load(`/api/check-discount-status?t=${timestamp}`);
  };

  const handleGenerateDiscount = async () => {
    try {
      setIsGeneratingDiscount(true);
      setDiscountError(null);

      // Create form data for the action
      const formData = new FormData();
      formData.append("action", "generate_discount");

      // Add discount percentage
      formData.append("percentage", discountPercentage.toString());

      // Add expiry settings
      formData.append("noExpiry", noExpiry.toString());
      if (!noExpiry) {
        formData.append("expiryDuration", expiryDuration);
        formData.append("expiryUnit", expiryUnit);
      }

      // Add customer usage settings
      formData.append("oncePerCustomer", oncePerCustomer.toString());

      // Include total usage limit if specified
      if (totalUsageLimit.trim() !== "") {
        formData.append("totalUsageLimit", totalUsageLimit);
      }

      console.log(`Submitting with: percentage=${discountPercentage}, noExpiry=${noExpiry}, expiryDuration=${expiryDuration}, expiryUnit=${expiryUnit}, oncePerCustomer=${oncePerCustomer}, totalUsageLimit=${totalUsageLimit || "unlimited"}`);

      // Submit the form to the action
      await submit(formData, { method: "post" });

      // Show a success message
      setStatusMessage("Discount created! Click 'Check Status' to verify when ready.");
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

  const handleTotalUsageLimitChange = (value) => {
    // Allow empty string (unlimited) or positive numbers
    if (value === "" || (/^\d+$/.test(value) && parseInt(value, 10) > 0)) {
      setTotalUsageLimit(value);
    }
  };

  const handleExpiryDurationChange = (value) => {
    // Allow only positive numbers for expiry duration
    if (/^\d+$/.test(value) && parseInt(value, 10) > 0) {
      setExpiryDuration(value);
    }
  };

  // Get the actual discount to display - if we've checked the API, use that result
  const getActiveDiscountCode = () => {
    // If we have a result from the API, use that
    if (discountStatusFetcher.data) {
      if (discountStatusFetcher.data.hasActiveDiscount) {
        return discountStatusFetcher.data.discountCode;
      }
      return null;
    }

    // If we haven't checked the API, use the settings
    if (!settings.currentDiscountCode) {
      return null;
    }

    // Check if it's expired based on settings
    if (!settings.discountExpiresAt && settings.noExpiry) {
      return settings.currentDiscountCode;
    }

    if (!settings.discountExpiresAt) {
      return null;
    }

    const expiryDate = new Date(settings.discountExpiresAt);
    if (expiryDate > new Date()) {
      return settings.currentDiscountCode;
    }

    return null;
  };

  // Format expiry date for display
  const getExpiryDateDisplay = () => {
    if (settings.noExpiry) return "Never expires";
    if (!settings.discountExpiresAt) return "No expiry set";

    const expiryDate = new Date(settings.discountExpiresAt);
    return expiryDate.toLocaleDateString();
  };

  // Format usage limit text for display
  const getUsageLimitText = () => {
    if (settings.totalUsageLimit) {
      return `Limited to ${settings.totalUsageLimit} total uses.`;
    }
    return "";
  };

  // Get the active discount code
  const activeDiscountCode = getActiveDiscountCode();

  // Determine if we're currently checking status
  const isCheckingStatus = discountStatusFetcher.state === "loading";

  return (
    <>
      <Card>
        <Box padding="4">
          <Text as="h2" variant="headingMd">
            Active Discount
          </Text>
          <Box paddingBlockStart="4">
            <BlockStack gap="4">
              {/* Just the status check button at the top */}


              {isCheckingStatus ? (
                <Box padding="4" textAlign="center">
                  <BlockStack gap="2" alignment="center">
                    <Spinner size="small" />
                    <Text variant="bodyMd">Checking discount status...</Text>
                  </BlockStack>
                </Box>
              ) : activeDiscountCode ? (
                <BlockStack gap="4">
                  <InlineStack gap="2" wrap={false}>
                    <Text variant="bodyMd" as="span" fontWeight="bold">
                      Discount Code:
                    </Text>
                    <Tag>{activeDiscountCode}</Tag>
                  </InlineStack>

                  <InlineStack gap="2" wrap={false}>
                    <Text variant="bodyMd" as="span" fontWeight="bold">
                      Discount Amount:
                    </Text>
                    <Text variant="bodyMd" as="span">
                      {settings.discountPercentage}% off
                    </Text>
                  </InlineStack>

                  <InlineStack gap="2" wrap={false}>
                    <Text variant="bodyMd" as="span" fontWeight="bold">
                      Expiry Status:
                    </Text>
                    <Text variant="bodyMd" as="span">
                      {getExpiryDateDisplay()}
                    </Text>
                  </InlineStack>

                  <Text variant="bodyMd" as="p">
                    This discount code is automatically applied to all products.
                    {settings.oncePerCustomer && " Limited to one use per customer."}
                    {settings.totalUsageLimit && ` ${getUsageLimitText()}`}
                  </Text>
              <div style={{ display: 'flex' }}>
                <Button
                  onClick={checkDiscountStatus}
                  loading={isCheckingStatus}
                  disabled={isCheckingStatus}
                >
                  Check Status
                </Button>
              </div>
                </BlockStack>
              ) : (
                <BlockStack gap="2">
                  <Banner status="info">
                    <Text variant="bodyMd" as="p">
                      No active discount code found. Generate a new one below.
                    </Text>
                  </Banner>
                  {(discountStatusFetcher.data &&
                    discountStatusFetcher.data.hasActiveDiscount &&
                    discountStatusFetcher.data.discountCode !== settings.currentDiscountCode) && (
                    <Banner status="warning">
                      <Text variant="bodyMd" as="p">
                        Note: The active discount code in Shopify ({discountStatusFetcher.data.discountCode}) doesn't match your app settings. Update settings or create a new discount.
                      </Text>
                    </Banner>
                  )}
                </BlockStack>
              )}

              {discountError && (
                <Banner status="critical">
                  <p>Error generating discount: {discountError}</p>
                </Banner>
              )}

              {statusMessage && !discountError && !isCheckingStatus && (
                <Banner status="success">
                  <p>{statusMessage}</p>
                </Banner>
              )}
            </BlockStack>
          </Box>
        </Box>
      </Card>

      <Box paddingBlockStart="4" style={{  paddingTop:"8px",  }}>
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
                  label="No expiration date (discount never expires)"
                  checked={noExpiry}
                  onChange={setNoExpiry}
                />

                {!noExpiry && (
                  <InlineStack gap="2" blockAlign="end">
                    <div style={{ flex: '1' }}>
                      <TextField
                        label="Expiry Duration"
                        type="number"
                        value={expiryDuration}
                        onChange={handleExpiryDurationChange}
                        min={1}
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ width: '150px' }}>
                      <Select
                        label="Time Unit"
                        options={[
                          { label: 'Minutes', value: 'minutes' },
                          { label: 'Hours', value: 'hours' },
                          { label: 'Days', value: 'days' }
                        ]}
                        value={expiryUnit}
                        onChange={setExpiryUnit}
                      />
                    </div>
                  </InlineStack>
                )}

                <TextField
                  label="Total Usage Limit"
                  type="number"
                  value={totalUsageLimit}
                  onChange={handleTotalUsageLimitChange}
                  min={1}
                  autoComplete="off"
                  helpText="Maximum number of times this discount can be used (leave empty for unlimited)"
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
   </>
  );
}
