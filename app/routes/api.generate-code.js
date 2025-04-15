import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { createDiscount, generateDiscountCode } from "../models/DiscountCode.server";
import { prisma } from "../db.server";

/**
 * API endpoint to generate a new discount code
 * This will be called by the theme app extension
 */
export async function loader({ request }) {
  try {
    const { admin, session } = await authenticate.public.appProxy(request);
    const shop = session.shop;

    // Get the settings for this shop
    const settings = await prisma.discountBarSettings.findFirst({
      where: { shopId: shop }
    });

    // Generate a unique discount code
    const code = generateDiscountCode();

    // Create the discount in Shopify
    await createDiscount(session, {
      code,
      percentage: settings?.discountPercentage || 15
    });

    // Store the generated code
    await prisma.discountCode.create({
      data: {
        shopId: shop,
        code,
        discountPercentage: settings?.discountPercentage || 15
      }
    });

    return json({
      success: true,
      code
    });
  } catch (error) {
    console.error("Error generating discount code:", error);

    // Generate a code anyway, even if we can't save it to Shopify
    // This ensures the discount bar still works
    const code = generateDiscountCode();

    return json({
      success: false,
      code,
      error: "Could not create official discount code"
    });
  }
}
