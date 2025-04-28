// Use separate imports for server-only modules
import { authenticate } from "../shopify.server";

// Only import server-only modules inside the action function
export const action = async ({ request }) => {
  try {
    // Import db.server inside the action function to avoid client-side import
    const db = await import("../db.server").then(module => module.default);

    /**
     * Handles GDPR customer data redaction requests.
     * The shop has requested deletion of customer data. Delete all customer data stored by the app.
     * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
     */
    // Validate HMAC signature - this will throw if validation fails
    const { topic, shop, session, payload } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook from ${shop}`);

    // The customer ID(s) for which data should be redacted
    const customerIds = payload.customer.id;
    // The shop ID to which the customer belongs
    const shopId = payload.shop_id;

    try {
      // If your app stores customer-specific data, delete it here
      // Example: Delete customer-specific discount codes, preferences, or any personal information

      // This app does not seem to store customer-specific data based on the schema
      // But if it did, you would implement deletion logic like this:
      /*
      await db.customerData.deleteMany({
        where: {
          customerId: customerIds,
          shopId: shop
        }
      });
      */

      console.log(`Successfully processed redaction request for customer ${customerIds} from shop ${shop}`);

      return new Response(null, { status: 200 });
    } catch (dbError) {
      console.error(`Error deleting customer data: ${dbError}`);
      return new Response(null, { status: 500 });
    }
  } catch (error) {
    console.error(`Error processing customer redaction request: ${error}`);

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
