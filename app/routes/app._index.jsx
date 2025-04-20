// app/routes/app._index.jsx - Complete file with direct discount creation
import { useState, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  Box,
  Tabs,
  Divider,
  Frame,
  Toast,
  Banner,
  BlockStack,
  RangeSlider,
  Checkbox,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useNavigate, useLoaderData, useSubmit } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getSettings, saveSettings } from "../models/MetafieldSettings.server";
import DiscountBarPreview from "../components/DiscountBarPreview";
import ColorPicker from "../components/ColorPicker";
import EmojiSelector from "../components/EmojiSelector";
import TimerSettings from "../components/TimerSettings";
import ManageDiscount from "../components/ManageDiscount";
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Helper function to generate discount code
function generateDiscountCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shopId = session.shop;

  console.log("Loader: Shop ID from session:", shopId);

  // Fetch the saved settings from metafields
  const settings = await getSettings(admin);

  return json({
    settings,
    shop: shopId,
  });
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shopId = session.shop;

  console.log("Action: Shop ID from session:", shopId);

  // Get form data
  const formData = await request.formData();
  const settingsJson = formData.get("settings");
  const action = formData.get("action");

  // Get discount options
  const percentageValue = formData.get("percentage");
  const noExpiryValue = formData.get("noExpiry");
  const oncePerCustomerValue = formData.get("oncePerCustomer");

  console.log("Action: Settings JSON received:", settingsJson);
  console.log("Action type:", action);

  try {
    if (action === "generate_discount") {
      // Parse all discount options
      const percentage = percentageValue ? parseInt(percentageValue, 10) : 15;
      const noExpiry = noExpiryValue === "true";
      const oncePerCustomer = oncePerCustomerValue === "true";

      console.log("Creating discount with options:", {
        percentage,
        noExpiry,
        oncePerCustomer
      });

      // Direct discount creation - no API call needed
      try {
        // Generate a random code for display
        const displayCode = generateDiscountCode();
        console.log("Generated display code:", displayCode);

        // Calculate expiry time if not set to no expiry
        const now = new Date();
        let expiresAt = null;

        if (!noExpiry) {
          expiresAt = new Date(now.getTime() + 15 * 60000); // 15 minutes from now
        }

        // Convert percentage to decimal (e.g., 10% becomes 0.1)
        const decimalPercentage = parseFloat(percentage) / 100;
        console.log(`Converting ${percentage}% to decimal: ${decimalPercentage}`);

        // Create the automatic discount in Shopify using the correct fields
        // For customer-specific discount limits, we need to use a different approach
        let discountMutation;
        let variables;

        if (oncePerCustomer) {
          // Use a different mutation for customer-specific discounts
          discountMutation = `
            mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
              discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
                codeDiscountNode {
                  id
                  codeDiscount {
                    ... on DiscountCodeBasic {
                      title
                      codes(first: 1) {
                        edges {
                          node {
                            code
                          }
                        }
                      }
                    }
                  }
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `;

          variables = {
            basicCodeDiscount: {
              title: `Flash Sale - ${percentage}% Off (${now.getTime()})`,
              code: displayCode,
              startsAt: now.toISOString(),
              // Only include endsAt if not set to no expiry
              ...(noExpiry ? {} : { endsAt: expiresAt.toISOString() }),
              customerSelection: {
                all: true
              },
              customerGets: {
                value: {
                  percentage: decimalPercentage
                },
                items: {
                  all: true
                }
              },
              // Add usage limit to once per customer
              usageLimit: 1,
              appliesOncePerCustomer: true,
              combinesWith: {
                productDiscounts: false,
                shippingDiscounts: true,
                orderDiscounts: false
              }
            }
          };
        } else {
          // Use automatic discount without customer limits
          discountMutation = `
            mutation discountAutomaticBasicCreate($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
              discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
                automaticDiscountNode {
                  id
                  automaticDiscount {
                    ... on DiscountAutomaticBasic {
                      title
                      startsAt
                      endsAt
                    }
                  }
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `;

          variables = {
            automaticBasicDiscount: {
              title: `Flash Sale - ${percentage}% Off (${now.getTime()})`,
              startsAt: now.toISOString(),
              // Only include endsAt if not set to no expiry
              ...(noExpiry ? {} : { endsAt: expiresAt.toISOString() }),
              customerSelection: {
                all: true
              },
              customerGets: {
                value: {
                  percentage: decimalPercentage
                },
                items: {
                  all: true
                }
              },
              combinesWith: {
                productDiscounts: false,
                shippingDiscounts: true,
                orderDiscounts: false
              }
            }
          };
        }

        console.log("Creating discount with variables:", JSON.stringify(variables));

        const response = await admin.graphql(discountMutation, {
          variables,
        });

        const responseJson = await response.json();
        console.log("Discount creation response:", JSON.stringify(responseJson));

        if (responseJson.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(responseJson.errors)}`);
        }

        let discountId;
        let userErrors;

        if (oncePerCustomer) {
          // Extract data from codeDiscount response
          userErrors = responseJson.data.discountCodeBasicCreate.userErrors;
          discountId = responseJson.data.discountCodeBasicCreate.codeDiscountNode?.id;
        } else {
          // Extract data from automaticDiscount response
          userErrors = responseJson.data.discountAutomaticBasicCreate.userErrors;
          discountId = responseJson.data.discountAutomaticBasicCreate.automaticDiscountNode?.id;
        }

        if (userErrors && userErrors.length > 0) {
          throw new Error(`User errors: ${JSON.stringify(userErrors)}`);
        }

        if (!discountId) {
          throw new Error("Failed to get discount ID from response");
        }

        // Save to database
        try {
          await prisma.discountCode.create({
            data: {
              shopId,
              code: displayCode,
              discountPercentage: percentage,
              isAutomatic: !oncePerCustomer,
              discountId,
              expiresAt: expiresAt ? expiresAt : null,
              oncePerCustomer
            }
          });
          console.log("Discount saved to database");
        } catch (dbError) {
          console.error("Error saving discount to database:", dbError);
          // Continue even if DB save fails
        }

        // Get current settings
        const currentSettings = await getSettings(admin);

        // Update settings with new discount code
        const updatedSettings = {
          ...currentSettings,
          currentDiscountCode: displayCode,
          discountPercentage: percentage,
          discountCreatedAt: now.toISOString(),
          discountExpiresAt: expiresAt ? expiresAt.toISOString() : null,
          noExpiry,
          oncePerCustomer
        };

        // Save updated settings to metafields
        await saveSettings(admin, updatedSettings);

        return json({
          status: "success",
          discountCode: displayCode,
          message: "Discount code generated successfully"
        });

      } catch (discountError) {
        console.error("Error creating discount:", discountError);
        throw new Error(`Failed to create discount: ${discountError.message}`);
      }
    } else {
      // Regular settings save
      const settings = JSON.parse(settingsJson);
      console.log("Action: Parsed settings:", settings);
      await saveSettings(admin, settings);
      return json({ status: "success" });
    }
  } catch (error) {
    console.error("Error in action:", error);
    return json({ status: "error", message: error.message }, { status: 500 });
  }
};

export default function Index() {
  const { settings: savedSettings, shop } = useLoaderData();
  const navigate = useNavigate();
  const submit = useSubmit();
  const [settings, setSettings] = useState(savedSettings);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Settings saved successfully");
  const [selectedTab, setSelectedTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mainTab, setMainTab] = useState(0);

  // Update local state when saved settings change
  useEffect(() => {
    setSettings(savedSettings);
  }, [savedSettings]);

  const handleChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("settings", JSON.stringify({
        ...settings,
        updatedAt: new Date().toISOString()
      }));

      console.log("Submitting settings for shop:", shop);
      console.log("Settings being saved:", settings);

      // Submit the form
      submit(formData, { method: "post" });

      // Show success toast
      setToastMessage("Settings saved successfully");
      setShowToast(true);
    } catch (error) {
      console.error("Error saving settings:", error);
      setToastMessage(`Error: ${error.message}`);
      setShowToast(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = (selectedTabIndex) => {
    setSelectedTab(selectedTabIndex);
  };

  const handleMainTabChange = (selectedTabIndex) => {
    setMainTab(selectedTabIndex);
  };

  const mainTabs = [
    {
      id: "settings",
      content: "Discount Bar Settings",
      panelID: "settings-content",
    },
    {
      id: "discounts",
      content: "Manage Discounts",
      panelID: "discounts-content",
    }
  ];

  return (
    <Frame>
      <Page title="Automatic Discount Bar">
        <Layout>
          <Layout.Section>
            <Banner
              title="Popup Discount"
              status="success"
            >
              <p>This discount popup appears when customers have items in their cart and have been browsing for a set amount of time. It creates urgency to complete the purchase.</p>
            </Banner>
          </Layout.Section>

          <Layout.Section>
            <Tabs
              tabs={mainTabs}
              selected={mainTab}
              onSelect={handleMainTabChange}
            />

            {mainTab === 0 && (
              <>
                <Layout.Section>
                  <Card>
                    <Box padding="4">
                      <Text as="h2" variant="headingMd">
                        Preview
                      </Text>
                      <Box paddingBlock="6">
                        <DiscountBarPreview settings={settings} />
                      </Box>
                    </Box>
                  </Card>
                </Layout.Section>

                <Layout.Section>
                  <Tabs
                    tabs={[
                      {
                        id: "appearance",
                        content: "Appearance",
                        panelID: "appearance-content",
                      },
                      {
                        id: "discount",
                        content: "Discount Settings",
                        panelID: "discount-content",
                      },
                      {
                        id: "popup",
                        content: "Popup Settings",
                        panelID: "popup-content",
                      }
                    ]}
                    selected={selectedTab}
                    onSelect={handleTabChange}
                  >
                    <Card>
                      <Box padding="4">
                        {selectedTab === 0 && (
                          <>
                            <Box paddingBlock="4">
                              <Text variant="headingMd" as="h2">
                                Discount Bar Appearance
                              </Text>
                              <Box paddingBlock="4">
                                <ColorPicker
                                  label="Background Color"
                                  color={settings.backgroundColor}
                                  onChange={(color) => handleChange("backgroundColor", color)}
                                />
                              </Box>
                              <Box paddingBlock="4">
                                <ColorPicker
                                  label="Text Color"
                                  color={settings.textColor}
                                  onChange={(color) => handleChange("textColor", color)}
                                />
                              </Box>
                              <Box paddingBlock="4">
                                <EmojiSelector
                                  selected={settings.emoji}
                                  onChange={(emoji) => handleChange("emoji", emoji)}
                                />
                              </Box>
                            </Box>
                            <Divider />
                            <Box paddingBlock="4">
                              <Text variant="headingMd" as="h2">
                                Timer Settings
                              </Text>
                              <TimerSettings
                                duration={settings.timerDuration}
                                onChange={(duration) => handleChange("timerDuration", duration)}
                              />
                            </Box>
                          </>
                        )}

                        {selectedTab === 1 && (
                          <Box paddingBlock="4">
                            <Text variant="headingMd" as="h2">
                              Discount Settings
                            </Text>

                            <Box paddingBlock="4">
                              <Text variant="bodyMd" as="p">
                                Display Text
                              </Text>
                              <Text variant="bodyMd" as="p">
                                Use {"{discount}"} to include the discount percentage.
                              </Text>
                              <Box paddingBlock="2">
                                <textarea
                                  value={settings.barText}
                                  onChange={(e) => handleChange("barText", e.target.value)}
                                  style={{
                                    width: "100%",
                                    padding: "8px",
                                    borderRadius: "4px",
                                    border: "1px solid #c4cdd5",
                                    minHeight: "80px",
                                  }}
                                />
                              </Box>
                            </Box>
                          </Box>
                        )}

                        {selectedTab === 2 && (
                          <Box paddingBlock="4">
                            <BlockStack gap="4">
                              <Text variant="headingMd" as="h2">
                                Popup Settings
                              </Text>
                              <RangeSlider
                                label="Session Time Before Popup (seconds)"
                                value={settings.sessionThreshold || 60}
                                onChange={(value) => handleChange("sessionThreshold", parseInt(value, 10))}
                                output
                                min={10}
                                max={300}
                                step={10}
                              />
                              <Text variant="bodyMd" as="p">
                                The discount popup will appear after this many seconds of browsing, if the cart has items.
                              </Text>
                              <Checkbox
                                label="Only show popup when cart has items"
                                checked={settings.requireCartItems !== false}
                                onChange={(checked) => handleChange("requireCartItems", checked)}
                              />
                              <Checkbox
                                label="Enable discount popup"
                                checked={settings.isActive !== false}
                                onChange={(checked) => handleChange("isActive", checked)}
                              />
                            </BlockStack>
                          </Box>
                        )}
                      </Box>
                    </Card>
                  </Tabs>
                </Layout.Section>

                <Layout.Section>
                  <Box paddingBlock="4">
                    <Button
                      primary
                      onClick={handleSave}
                      loading={isSubmitting}
                      disabled={isSubmitting}
                    >
                      Save Settings
                    </Button>
                  </Box>
                </Layout.Section>
              </>
            )}

            {mainTab === 1 && (
              <Layout.Section>
                <ManageDiscount settings={settings} />
              </Layout.Section>
            )}
          </Layout.Section>
        </Layout>

        {showToast && (
          <Toast
            content={toastMessage}
            onDismiss={() => setShowToast(false)}
            error={toastMessage.startsWith("Error")}
          />
        )}
      </Page>
    </Frame>
  );
}
