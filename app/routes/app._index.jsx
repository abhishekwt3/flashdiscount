// app/routes/app._index.jsx
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
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useNavigate, useLoaderData, useSubmit } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getSettings, saveSettings } from "../models/DiscountBarSettings.server";
import DiscountBarPreview from "../components/DiscountBarPreview";
import ColorPicker from "../components/ColorPicker";
import EmojiSelector from "../components/EmojiSelector";
import TimerSettings from "../components/TimerSettings";
import DiscountSettings from "../components/DiscountSettings";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shopId = session.shop;

  console.log("Loader: Shop ID from session:", shopId);

  // Fetch the saved settings from the database
  const settings = await getSettings(shopId);

  // Update default text if it still has the old format with {code}
  if (settings.barText.includes("{code}")) {
    settings.barText = "Limited time offer! {discount}% off your entire order automatically applied!";

    // If timer is still set to 30, change to 15 minutes
    if (settings.timerDuration === 30) {
      settings.timerDuration = 15;
    }

    // Save the updated settings
    await saveSettings(shopId, settings);
  }

  return json({
    settings,
    shop: shopId, // Include shop ID in the response
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

    // Save settings to the database
    await saveSettings(shopId, settings);

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
      formData.append("settings", JSON.stringify(settings));

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

  return (
    <Frame>
      <Page title="Automatic Discount Bar">
        <Layout>
          <Layout.Section>
            <Banner
              title="Automatic Discount Applied"
              status="success"
            >
              <p>This discount bar creates a 15-minute automatic discount for all products. Customers don't need to enter a code.</p>
            </Banner>
          </Layout.Section>

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
                      <Text variant="bodyMd" as="p" color="subdued">
                        Note: The discount will expire after 15 minutes, regardless of the timer display.
                      </Text>
                    </Box>
                  </>
                )}
                {selectedTab === 1 && (
                  <Box paddingBlock="4">
                    <Text variant="headingMd" as="h2">
                      Discount Settings
                    </Text>
                    <DiscountSettings
                      percentage={settings.discountPercentage}
                      onChange={(percentage) => handleChange("discountPercentage", percentage)}
                    />
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
