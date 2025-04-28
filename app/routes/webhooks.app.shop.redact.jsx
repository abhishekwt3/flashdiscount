// Use separate imports for server-only modules
import { authenticate } from "../shopify.server";

// Only import server-only modules inside the action function
export const action = async ({ request }) => {
  try {
    // Import db.server inside the action function to avoid client-side import
    const db = await import("../db.server").then(module => module.default);

    /**
     * Handles GDPR shop data redaction requests.
     * The shop has been deleted or closed. Delete all shop data stored by the app.
     * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
     */
    // Validate HMAC signature - this will throw if validation fails
    const { topic, shop, session, payload } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook from ${shop}`);

    // The shop ID for which data should be redacted
    const shopId = payload.shop_id;

    try {
      // Delete all data related to this shop
      // This should be a comprehensive cleanup of all shop data

      // 1. Delete discount settings
      await db.discountBarSettings.deleteMany({
        where: { shopId: shop }
      });

      // 2. Delete discount codes
      await db.discountCode.deleteMany({
        where: { shopId: shop }
      });

      // 3. Delete sessions
      await db.session.deleteMany({
        where: { shop }
      });

      // Add deletion for any other shop-specific data your app stores

      console.log(`Successfully deleted all data for shop ${shop}`);

      return new Response(null, { status: 200 });
    } catch (dbError) {
      console.error(`Error deleting shop data: ${dbError}`);
      return new Response(null, { status: 500 });
    }
  } catch (error) {
    console.error(`Error processing shop redaction request: ${error}`);

    // Check if this is an HMAC validation error
    if (error.message && (
        error.message.includes("HMAC") ||
        error.message.includes("hmac") ||
        error.message.includes("signature") ||
        error.message.includes("Signature"))) {
      // Return 401 for HMAC validation failures
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "HMAC validation failed" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Otherwise return 500 for processing errors
    return new Response(null, { status: 500 });
  }
};
