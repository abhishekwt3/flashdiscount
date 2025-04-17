import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { createAutomaticDiscount, generateDiscountCode } from "../models/DiscountCode.server";
import { prisma } from "../db.server";

/**
 * API endpoint to create an automatic discount
 * This will be called by the theme app extension
 */
export async function loader({ request }) {
  try {
    const { admin, session } = await authenticate.public.appProxy(request);
    const shop = session.shop;

    // Get the settings for this shop
    const settings = await prisma.discountBarSettings.findFirst({
      where: { shopId: shop, isActive: true }
    });

    // If no active settings are found, use default values
    const percentage = settings?.discountPercentage || 15;
    const durationMinutes = 15; // Fixed 15 minutes duration

    // Create the automatic discount in Shopify
    let discount;
    let discountError = null;

    try {
      discount = await createAutomaticDiscount(session, {
        percentage,
        durationMinutes
      });
    } catch (error) {
      console.error("Error creating automatic discount:", error);
      discountError = error.message;
      // Continue execution - we'll create a "display-only" discount code below
    }

    // For display purposes, we still generate a "phantom code"
    // This is just to show in the UI but doesn't need to be entered
    const displayCode = generateDiscountCode();

    // Only try to store in database if we have a successful discount creation
    if (discount && !discountError) {
      try {
        await prisma.discountCode.create({
          data: {
            shopId: shop,
            code: displayCode,
            discountPercentage: percentage,
            isAutomatic: true,
            discountId: discount.discountId,
            expiresAt: new Date(Date.now() + durationMinutes * 60000)
          }
        });
      } catch (dbError) {
        console.error("Error saving discount code to database:", dbError);
        // Continue execution - the discount is still created in Shopify
      }
    }

    return json({
      success: discount && !discountError,
      code: displayCode, // For UI display purposes
      isAutomatic: true,
      discount: discount || null,
      error: discountError
    });
  } catch (error) {
    console.error("Error in discount generation process:", error);

    // Generate a code anyway for display purposes
    const displayCode = generateDiscountCode();

    return json({
      success: false,
      code: displayCode,
      isAutomatic: false,
      error: "Could not create automatic discount: " + error.message
    });
  }
}
