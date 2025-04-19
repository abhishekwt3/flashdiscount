// app/models/MetafieldSettings.server.js

/**
 * This file handles reading and writing settings to Shopify metafields
 * instead of the database, making them accessible to the theme
 */

// The namespace and key for our app's settings
const METAFIELD_NAMESPACE = "flashoff";
const METAFIELD_KEY = "settings";

/**
 * Get discount bar settings from metafields
 */
export async function getSettings(admin) {
  try {
    console.log("Fetching settings from metafields");

    // Get the shop metafield for our app settings
    const GET_METAFIELD_QUERY = `
      query getAppSettings {
        shop {
          id
          metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
            id
            value
          }
        }
      }
    `;

    const response = await admin.graphql(GET_METAFIELD_QUERY);
    const responseJson = await response.json();

    console.log("Metafield response:", responseJson);

    if (responseJson.errors) {
      console.error("GraphQL errors:", responseJson.errors);
      throw new Error("Error fetching metafields: " + responseJson.errors[0].message);
    }

    // Store the shop ID for later use
    const shopId = responseJson.data.shop.id;
    const metafield = responseJson.data.shop.metafield;

    // If metafield exists, parse the JSON value
    if (metafield && metafield.value) {
      try {
        const settings = JSON.parse(metafield.value);
        // Add shopId to the settings object
        return { ...settings, _shopId: shopId };
      } catch (parseError) {
        console.error("Error parsing metafield JSON:", parseError);
        // Return default settings if parsing fails
        return { ...getDefaultSettings(), _shopId: shopId };
      }
    }

    // If no metafield exists yet, return default settings
    return { ...getDefaultSettings(), _shopId: shopId };
  } catch (error) {
    console.error("Error retrieving settings from metafields:", error);
    return getDefaultSettings();
  }
}

/**
 * Save discount bar settings to metafields using metafieldsSet
 */
export async function saveSettings(admin, settings) {
  try {
    console.log("Saving settings to metafields:", settings);

    // Extract shopId from settings (if it exists) or fetch it
    let shopId = settings._shopId;

    if (!shopId) {
      // If we don't have the shop ID, we need to fetch it
      const GET_SHOP_QUERY = `
        query getShopId {
          shop {
            id
          }
        }
      `;

      const shopResponse = await admin.graphql(GET_SHOP_QUERY);
      const shopResponseJson = await shopResponse.json();

      if (shopResponseJson.errors) {
        throw new Error("Error fetching shop ID: " + shopResponseJson.errors[0].message);
      }

      shopId = shopResponseJson.data.shop.id;
    }

    // Remove internal _shopId property before saving
    const { _shopId, ...settingsToSave } = settings;

    // Using metafieldsSet mutation which handles both create and update
    const METAFIELDS_SET_MUTATION = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            key
            namespace
            value
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `;

    const variables = {
      metafields: [
        {
          namespace: METAFIELD_NAMESPACE,
          key: METAFIELD_KEY,
          ownerId: shopId,
          type: "json",
          value: JSON.stringify(settingsToSave)
        }
      ]
    };

    const response = await admin.graphql(METAFIELDS_SET_MUTATION, { variables });
    const responseJson = await response.json();

    console.log("Metafields set response:", responseJson);

    if (responseJson.errors) {
      console.error("GraphQL errors:", responseJson.errors);
      throw new Error("Error updating metafields: " + responseJson.errors[0].message);
    }

    const { userErrors } = responseJson.data.metafieldsSet;

    if (userErrors && userErrors.length > 0) {
      throw new Error("Error saving settings: " + userErrors[0].message);
    }

    return { ...settingsToSave, _shopId: shopId };
  } catch (error) {
    console.error("Error saving settings to metafields:", error);
    throw error;
  }
}

/**
 * Default settings when none exist yet
 */
function getDefaultSettings() {
  return {
    backgroundColor: "#FF5733",
    textColor: "#FFFFFF",
    emoji: "🔥",
    timerDuration: 15,
    discountPercentage: 15,
    barText: "Don't leave your items behind! Get {discount}% off if you complete your purchase now!",
    isActive: true,
    sessionThreshold: 60,
    requireCartItems: true,
    isPopup: true,
    updatedAt: new Date().toISOString()
  };
}
