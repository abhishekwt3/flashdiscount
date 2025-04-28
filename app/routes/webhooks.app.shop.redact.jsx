import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * Handles GDPR shop data redaction requests.
 * The shop has been deleted or closed. Delete all shop data stored by the app.
 * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
 */
export const action = async ({ request }) => {
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
  } catch (error) {
    console.error(`Error processing shop redaction request: ${error}`);
    return new Response(null, { status: 500 });
  }
};
