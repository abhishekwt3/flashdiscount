// app/routes/api.create-discount.js
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { createDiscount, generateDiscountCode } from "../models/DiscountCode.server";

/**
 * API endpoint to create a discount code in Shopify
 */
export async function action({ request }) {
  try {
    const { admin, session } = await authenticate.admin(request);

    // Parse the request body
    const { percentage = 15 } = await request.json();

    // Generate a unique discount code
    const code = generateDiscountCode();

    // Create the discount in Shopify
    const discount = await createDiscount(session, {
      code,
      percentage
    });

    return json({
      success: true,
      code,
      discount
    });
  } catch (error) {
    console.error("Error creating discount:", error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
