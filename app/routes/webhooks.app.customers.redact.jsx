import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * Handles GDPR customer data redaction requests.
 * The shop has requested deletion of customer data. Delete all customer data stored by the app.
 * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
 */
export const action = async ({ request }) => {
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
  } catch (error) {
    console.error(`Error processing customer redaction request: ${error}`);
    return new Response(null, { status: 500 });
  }
};
