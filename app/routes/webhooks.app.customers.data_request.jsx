import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * Handles GDPR customer data requests.
 * The shop has received a data request from a customer. Respond with any customer data stored by the app.
 * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
 */
export const action = async ({ request }) => {
  const { topic, shop, session, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook from ${shop}`);

  // The customer ID(s) for which data is being requested
  const customerIds = payload.customer.id;

  try {
    // Fetch customer-related data from the database
    // Note: Modify this to match your database schema and what data you store about customers
    const discountCodes = await db.discountCode.findMany({
      where: {
        // If you store customer IDs with discount codes, you would filter by them here
        // customerId: customerIds
        shopId: shop
      }
    });

    // Return the customer data in the expected format
    // This data will be sent to the requesting customer
    return new Response(JSON.stringify({
      customer: {
        id: customerIds,
        // Only include fields that contain personal information
        discounts: discountCodes.map(code => ({
          code: code.code,
          percentage: code.discountPercentage,
          created_at: code.createdAt
        }))
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error(`Error processing customer data request: ${error}`);
    return new Response(null, { status: 500 });
  }
};
