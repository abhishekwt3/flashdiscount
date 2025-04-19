// app/routes/app._index.jsx - Updated to use metafields
import { useState, useEffect } from "react";
import {
  Page,
  Layout,
  LegacyCard,
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
  Checkbox
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

  console.log("Action: Settings JSON received:", settingsJson);

  try {
    const settings = JSON.parse(settingsJson);

    console.log("Action: Parsed settings:", settings);

    // Save settings to metafields
    await saveSettings(admin, settings);

    return json({ status: "success" });
  } catch (error) {
    console.error("Error saving settings:", error);
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
                  <LegacyCard sectioned title="Preview">
                    <Box paddingBlock="6">
                      <DiscountBarPreview settings={settings} />
                    </Box>
                  </LegacyCard>
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
                    <LegacyCard sectioned>
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
                            <Text variant="bodyMd" as="p" color="subdued">
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
                            <Text variant="bodyMd" as="p" color="subdued">
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
                    </LegacyCard>
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
