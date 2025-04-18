import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { createAutomaticDiscount, getActiveDiscounts } from "../models/DiscountCode.server";

/**
 * Test endpoint to debug automatic discount creation
 */
export async function loader({ request }) {
  try {
    const { admin, session } = await authenticate.admin(request);
    console.log("Test discount endpoint called. Authenticated session for shop:", session.shop);

    // First, query existing discounts to see what's already there
    console.log("Querying existing discounts...");
    const existingDiscounts = await getActiveDiscounts(session);

    // Create a test automatic discount
    console.log("Creating test automatic discount...");
    const discountPercentage = 15;
    const durationMinutes = 15;

    const discount = await createAutomaticDiscount(session, {
      percentage: discountPercentage,
      durationMinutes
    });

    // Query discounts again after creation to confirm it's there
    console.log("Querying discounts after creation...");
    const updatedDiscounts = await getActiveDiscounts(session);

    return json({
      success: true,
      message: "Test discount creation completed",
      testDiscount: discount,
      existingDiscountsBefore: existingDiscounts,
      existingDiscountsAfter: updatedDiscounts
    });
  } catch (error) {
    console.error("Error in test discount endpoint:", error);
    return json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
