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
  Checkbox,
  Select
} from "@shopify/polaris";
import { useSubmit } from "@remix-run/react";

export default function ManageDiscountForm({ settings, hideHowItWorks = false }) {
  const submit = useSubmit();
  const [isGeneratingDiscount, setIsGeneratingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState(null);

  // Add state for discount settings
  const [discountPercentage, setDiscountPercentage] = useState(
    settings.discountPercentage || 15
  );
  // Changed noExpiry default to false to enable expiry by default
  const [noExpiry, setNoExpiry] = useState(false);
  const [expiryDuration, setExpiryDuration] = useState("24");
  const [expiryUnit, setExpiryUnit] = useState("hours");
  const [oncePerCustomer, setOncePerCustomer] = useState(true);
  const [totalUsageLimit, setTotalUsageLimit] = useState(""); // Empty string means unlimited

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

  // Check if discount is active
  const isDiscountActive = () => {
    if (!settings.discountExpiresAt && settings.noExpiry) return true;
    if (!settings.discountExpiresAt) return false;

    const expiryDate = new Date(settings.discountExpiresAt);
    return expiryDate > new Date();
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

  // Format expiry description for display in How It Works
  const getExpiryDescription = () => {
    if (noExpiry) {
      return "The discount has no expiration date and will remain active until you replace it";
    } else {
      const unit = expiryUnit;
      return `The discount will expire after ${expiryDuration} ${unit}`;
    }
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
                  <InlineStack gap="2" wrap={false}>
                    <Text variant="bodyMd" as="span" fontWeight="bold">
                      Discount Code:
                    </Text>
                    <Tag>{settings.currentDiscountCode}</Tag>
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

      <Box paddingBlockStart="4" style={{  paddingTop:"10px",  }}>
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

      {/* <Box paddingBlockStart="4">
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
                    {getExpiryDescription()}
                  </li>
                  <li style={{ margin: "8px 0" }}>
                    {totalUsageLimit ? `The discount can be used a maximum of ${totalUsageLimit} times in total` : "The discount can be used an unlimited number of times"}
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
      </Box> */}
    </>
  );
}