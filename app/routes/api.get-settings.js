import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getSettings } from "../models/DiscountBarSettings.server";

/**
 * API endpoint to get the discount bar settings
 * This will be called by the theme app extension
 */
export async function loader({ request }) {
  try {
    const { admin, session } = await authenticate.public.appProxy(request);
    const shop = session.shop;

    // Get the settings for this shop
    const settings = await getSettings(shop);

    return json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);

    // Return default settings if there's an error
    return json({
      backgroundColor: "#FF5733",
      textColor: "#FFFFFF",
      emoji: "🔥",
      timerDuration: 30,
      discountPercentage: 15,
      barText: "Limited time offer! Use code {code} for {discount}% off your order!"
    });
  }
}
