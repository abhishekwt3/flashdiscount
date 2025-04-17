// app/routes/api.create-automatic-discount.js
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { createAutomaticDiscount } from "../models/DiscountCode.server";

/**
 * API endpoint to create an automatic discount in Shopify
 * This discount applies automatically to all products and expires after 15 minutes
 */
export async function action({ request }) {
  try {
    const { admin, session } = await authenticate.admin(request);

    // Parse the request body
    const { percentage = 15, durationMinutes = 15 } = await request.json();

    // Create the automatic discount in Shopify
    const discount = await createAutomaticDiscount(session, {
      percentage,
      durationMinutes
    });

    return json({
      success: true,
      discount
    });
  } catch (error) {
    console.error("Error creating automatic discount:", error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
