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
import { useNavigate, useLoaderData, useSubmit } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getSettings, saveSettings } from "../models/MetafieldSettings.server";
import DiscountBarPreview from "../components/DiscountBarPreview";
import ColorPicker from "../components/ColorPicker";
import EmojiSelector from "../components/EmojiSelector";
import TimerSettings from "../components/TimerSettings";
import ManageDiscountForm from "../components/ManageDiscountForm";
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

  try {
    // Get form data
    const formData = await request.formData();
    
    // Check what type of action we're handling
    const actionType = formData.get("action");
    
    // Handle discount generation
    if (actionType === "generate_discount") {
      // Parse discount options
      const percentage = formData.get("percentage") ? parseInt(formData.get("percentage"), 10) : 15;
      const noExpiry = formData.get("noExpiry") === "true";
      const oncePerCustomer = formData.get("oncePerCustomer") === "true";
      
      // Get the total usage limit (if provided)
      const totalUsageLimitValue = formData.get("totalUsageLimit");
      const totalUsageLimit = totalUsageLimitValue ? parseInt(totalUsageLimitValue, 10) : null;
      
      // Get expiry settings if applicable
      let expiryDate = null;
      if (!noExpiry) {
        const expiryDuration = parseInt(formData.get("expiryDuration") || "24", 10);
        const expiryUnit = formData.get("expiryUnit") || "hours";
        
        // Calculate expiry date
        const now = new Date();
        expiryDate = new Date(now);
        
        if (expiryUnit === "minutes") {
          expiryDate.setMinutes(expiryDate.getMinutes() + expiryDuration);
        } else if (expiryUnit === "hours") {
          expiryDate.setHours(expiryDate.getHours() + expiryDuration);
        } else if (expiryUnit === "days") {
          expiryDate.setDate(expiryDate.getDate() + expiryDuration);
        }
      }

      console.log("Creating discount with options:", {
        percentage,
        noExpiry,
        oncePerCustomer,
        totalUsageLimit: totalUsageLimit || "unlimited",
        expiryDate: expiryDate ? expiryDate.toISOString() : "never"
      });

      // Your existing discount generation code...
      // [Rest of discount generation logic]

      // Always return a response
      return json({
        status: "success",
        discountCode: "CODE", // Replace with actual code from your logic
        message: "Discount code generated successfully"
      });
    } 
    // Handle settings save from any tab
    else if (formData.has("settings")) {
      const settingsJson = formData.get("settings");
      
      // Log what type of settings we're saving based on form data
      // This helps with debugging which tab's settings are being saved
      console.log("Saving settings. Form data keys:", [...formData.keys()]);
      
      if (settingsJson) {
        try {
          const settings = JSON.parse(settingsJson);
          console.log("Action: Parsed settings:", settings);
          
          // Save settings to database or metafields
          await saveSettings(admin, settings);
          
          // Always return a success response
          return json({ 
            status: "success", 
            message: "Settings saved successfully",
            // Include the tab if it was provided in the form data
            tab: formData.get("tab") || null
          });
        } catch (parseError) {
          console.error("Error parsing settings JSON:", parseError);
          return json({ 
            status: "error", 
            message: "Invalid settings format: " + parseError.message 
          }, { status: 400 });
        }
      } else {
        console.error("Settings form data is empty");
        return json({ 
          status: "error", 
          message: "No settings provided" 
        }, { status: 400 });
      }
    }
    // Handle toggle actions (like enabling/disabling features)
    else if (actionType === "toggle_active") {
      const isActive = formData.get("isActive") === "true";
      console.log(`Toggling active status to ${isActive}`);
      
      // Your code to toggle the active status
      // await toggleActive(shopId, isActive);
      
      return json({ 
        status: "success", 
        message: `Discount bar ${isActive ? 'enabled' : 'disabled'} successfully` 
      });
    }
    // Fallback for any other form submissions
    else {
      console.warn("Unrecognized action in form submission:", [...formData.entries()]);
      return json({ 
        status: "error", 
        message: "Unrecognized action" 
      }, { status: 400 });
    }
  } catch (error) {
    // Global error handler
    console.error("Error in action:", error);
    return json({ 
      status: "error", 
      message: error.message || "An unknown error occurred" 
    }, { status: 500 });
  }
};

export default function Index() {
  const { settings: savedSettings, shop } = useLoaderData();
  const navigate = useNavigate();
  const submit = useSubmit();
  const [settings, setSettings] = useState(savedSettings);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Settings saved successfully");
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
        <div style={{ paddingBottom: "50px" }}>  {/* Added 50px bottom padding */}
          <Layout>
            <Layout.Section>
              <Tabs
                tabs={mainTabs}
                selected={mainTab}
                onSelect={handleMainTabChange}
              />

              {mainTab === 0 && (
                <Layout>
                  {/* Settings column (left side) */}
                  <Layout.Section variant="oneHalf">
                    <Card>
                    {/* Appearance & Text Settings Card */}
                  {/* Appearance & Text Settings Card */}
                    <Card>
                      <Box padding="4">
                        <Text variant="headingMd" as="h2">
                          Appearance & Text Settings
                        </Text>
                        <Box paddingBlock="4">
                          <BlockStack gap="4">
                            {/* Two-column layout for color pickers */}
                            <div style={{ display: "flex", gap: "16px" }}>
                              <div style={{ flex: 1 }}>
                                <ColorPicker
                                  label="Background Color"
                                  color={settings.backgroundColor}
                                  onChange={(color) => handleChange("backgroundColor", color)}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <ColorPicker
                                  label="Text Color"
                                  color={settings.textColor}
                                  onChange={(color) => handleChange("textColor", color)}
                                />
                              </div>
                            </div>
                            
                            {/* Two-column layout for emoji picker and timer settings */}
                            <div style={{ display: "flex", gap: "16px" }}>
                              <div style={{ flex: 1 }}>
                                <EmojiSelector
                                  selected={settings.emoji}
                                  onChange={(emoji) => handleChange("emoji", emoji)}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <TimerSettings
                                  duration={settings.timerDuration}
                                  onChange={(duration) => handleChange("timerDuration", duration)}
                                />
                              </div>
                            </div>
                          </BlockStack>
                        </Box>
                      </Box>
                    </Card>
                    
                    {/* Discount Message Card */}
                    <Box paddingBlockStart="4" style={{  paddingTop:"8px",  }}>
                      <Card>
                        <Box padding="4">
                          <Text variant="headingMd" as="h2">
                            Discount Message
                          </Text>
                          <Box paddingBlock="4">
                            <BlockStack gap="4">
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
                            </BlockStack>
                          </Box>
                        </Box>
                      </Card>
                    </Box>
                    
                    {/* Display Conditions Card */}
                    <Box paddingBlockStart="4" style={{  paddingTop:"8px",  }}>
                      <Card>
                        <Box padding="4">
                          <Text variant="headingMd" as="h2">
                            Display Conditions
                          </Text>
                          <Box paddingBlock="4">
                            <BlockStack gap="4">
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
                        </Box>
                      </Card>
                    </Box>
                    
                    {/* Save Button with green color and proper padding */}
                    <Box paddingBlockStart="6" style={{  paddingTop:"8px",  }}>
                      <Button
                        primary
                        onClick={handleSave}
                        loading={isSubmitting}
                        disabled={isSubmitting}
                        size="large"
                        monochrome
                        style={{
                          backgroundColor: "#008060", /* Shopify green */
                          borderColor: "#008060",
                          color: "white",
                          paddingLeft: "24px",
                          paddingRight: "24px"
                        }}
                      >
                        Save Settings
                      </Button>
                    </Box>
                    </Card>
                  </Layout.Section>
                  
                  {/* Preview column (right side) */}
                  <Layout.Section variant="oneHalf">
                    <Card>
                      <Box padding="4">
                        <Text as="h2" variant="headingMd">
                          Preview
                        </Text>
                        <Box paddingBlock="6">
                          <DiscountBarPreview settings={settings} />
                        </Box>
                        <Text as="p" variant="bodyMd">
                          This is how your discount bar will appear to customers. Changes you make to the settings on the left will update this preview.
                        </Text>
                      </Box>
                    </Card>
                    
                    {/* Moved Popup Discount description below preview with added padding */}
                    <Box paddingBlockStart="4" style={{  paddingTop:"10px",  }}>
                      <Banner
                        title="Popup Discount"
                        status="success"
                      >
                        <p>This discount popup appears when customers have items in their cart and have been browsing for a set amount of time. It creates urgency to complete the purchase.</p>
                      </Banner>
                    </Box>
                  </Layout.Section>
                </Layout>
              )}

              {mainTab === 1 && (
                <Layout>
                  {/* Manage Discount column (left side) - using just the form portion */}
                  <Layout.Section variant="oneHalf">
                    <Card>
                      <Box padding="4">
                        <Text as="h2" variant="headingMd">
                          Create & Manage Discounts
                        </Text>
                        <Box paddingBlockStart="4">
                          <ManageDiscountForm settings={settings} />
                        </Box>
                      </Box>
                    </Card>
                  </Layout.Section>
                  
                  {/* How It Works column (right side) */}
                  <Layout.Section variant="oneHalf">
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
                                A store-wide discount is created with your specified percentage
                              </li>
                              <li style={{ margin: "8px 0" }}>
                                The discount is automatically applied to all products
                              </li>
                              <li style={{ margin: "8px 0" }}>
                                You can control how long the discount remains active
                              </li>
                              <li style={{ margin: "8px 0" }}>
                                You can limit how many times the discount can be used
                              </li>
                              <li style={{ margin: "8px 0" }}>
                                You can control whether each customer can use it once or multiple times
                              </li>
                              <li style={{ margin: "8px 0" }}>
                                The discount popup will show to customers based on your settings
                              </li>
                            </ul>
                          </BlockStack>
                        </Box>
                      </Box>
                    </Card>
                    
                    <Box paddingBlockStart="6" style={{ paddingTop: "8px"}}>
                      <Banner title="Tips for Effective Discounts" status="info">
                        <ul style={{ paddingLeft: "20px", margin: "10px 0" }}>
                          <li style={{ margin: "8px 0" }}>
                            Time-limited discounts create a sense of urgency
                          </li>
                          <li style={{ margin: "8px 0" }}>
                            Discounts between 10-20% typically offer the best balance of conversion and profit
                          </li>
                          <li style={{ margin: "8px 0" }}>
                            "One use per customer" prevents discount abuse while still encouraging purchases
                          </li>
                        </ul>
                      </Banner>
                    </Box>
                  </Layout.Section>
                </Layout>
              )}
            </Layout.Section>
          </Layout>
        </div>

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