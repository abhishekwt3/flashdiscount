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
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useNavigate } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import DiscountBarPreview from "../components/DiscountBarPreview";
import ColorPicker from "../components/ColorPicker";
import EmojiSelector from "../components/EmojiSelector";
import TimerSettings from "../components/TimerSettings";
import DiscountSettings from "../components/DiscountSettings";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  // Here you would fetch the saved settings from your database
  // For now, we'll use default values
  const settings = {
    backgroundColor: "#FF5733",
    textColor: "#FFFFFF",
    emoji: "🔥",
    timerDuration: 30, // minutes
    discountPercentage: 15,
    barText: "Limited time offer! Use code {code} for {discount}% off your order!",
  };

  return json({ settings });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Here you would save the settings to your database
  // And potentially create the discount in Shopify

  return json({ status: "success" });
};

export default function Index() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    backgroundColor: "#FF5733",
    textColor: "#FFFFFF",
    emoji: "🔥",
    timerDuration: 30,
    discountPercentage: 15,
    barText: "Limited time offer! Use code {code} for {discount}% off your order!",
  });
  const [showToast, setShowToast] = useState(false);

  const handleChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    // Save settings
    // You'd make an API call here
    setShowToast(true);
  };

  return (
    <Frame>
      <Page title="Discount Bar">
        <Layout>
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
            >
              <LegacyCard sectioned>
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
                <Divider />
                <Box paddingBlock="4">
                  <Text variant="headingMd" as="h2">
                    Discount Settings
                  </Text>
                  <DiscountSettings
                    percentage={settings.discountPercentage}
                    onChange={(percentage) => handleChange("discountPercentage", percentage)}
                  />
                </Box>
              </LegacyCard>
            </Tabs>
          </Layout.Section>

          <Layout.Section>
            <Box paddingBlock="4">
              <Button primary onClick={handleSave}>
                Save Settings
              </Button>
            </Box>
          </Layout.Section>
        </Layout>

        {showToast && (
          <Toast
            content="Settings saved successfully"
            onDismiss={() => setShowToast(false)}
          />
        )}
      </Page>
    </Frame>
  );
}
