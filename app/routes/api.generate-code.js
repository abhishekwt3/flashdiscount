import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { createAutomaticDiscount, generateDiscountCode } from "../models/DiscountCode.server";
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * API endpoint to create an automatic discount
 * This will be called by the theme app extension
 */
export async function loader({ request }) {
  console.log("API: Generate code endpoint called");
  console.log("Request URL:", request.url);

  try {
    // First, try to authenticate the request
    console.log("Authenticating request...");
    let authResult;

    try {
      // Try admin authentication
      authResult = await authenticate.admin(request);
      console.log("Admin authentication successful");
    } catch (adminAuthError) {
      console.log("Admin auth failed, trying public authentication:", adminAuthError.message);
      try {
        // Try public authentication as fallback
        authResult = await authenticate.public.appProxy(request);
        console.log("Public app proxy authentication successful");
      } catch (publicAuthError) {
        console.error("All authentication methods failed:", publicAuthError.message);
        throw new Error("Authentication failed: " + publicAuthError.message);
      }
    }

    if (!authResult) {
      console.error("Authentication result is empty");
      throw new Error("Invalid authentication result");
    }

    // Extract admin and session from auth result
    const { admin, session } = authResult;

    if (!admin) {
      console.error("Admin object is missing from authentication result");
      throw new Error("Missing admin API access");
    }

    if (!session) {
      console.error("Session object is missing from authentication result");
      throw new Error("Missing session");
    }

    const shop = session.shop;
    console.log("Authentication successful for shop:", shop);

    // Get the settings for this shop
    console.log("Fetching settings for shop:", shop);
    const settings = await prisma.discountBarSettings.findFirst({
      where: { shopId: shop, isActive: true }
    });

    console.log("Settings found:", settings ? "Yes" : "No");

    // If no active settings are found, use default values
    const percentage = settings?.discountPercentage || 15;
    const durationMinutes = 15; // Fixed 15 minutes duration

    // Generate a display code for UI
    const displayCode = generateDiscountCode();
    console.log("Generated display code:", displayCode);

    // Try to create the automatic discount in Shopify
    console.log(`Attempting to create ${percentage}% discount for ${durationMinutes} minutes`);

    let discount;
    let discountError = null;

    try {
      // Pass the admin object directly (not the session)
      discount = await createAutomaticDiscount(admin, {
        percentage,
        durationMinutes
      });

      console.log("Discount created successfully:", discount);

      // Save successful discount to database
      try {
        await prisma.discountCode.create({
          data: {
            shopId: shop,
            code: displayCode,
            discountPercentage: percentage,
            isAutomatic: true,
            discountId: discount.id,
            expiresAt: new Date(Date.now() + durationMinutes * 60000)
          }
        });
        console.log("Discount saved to database");
      } catch (dbError) {
        console.error("Error saving discount to database:", dbError);
        // Continue even if DB save fails
      }

    } catch (discountCreationError) {
      console.error("Error creating discount:", discountCreationError);
      discountError = discountCreationError.message;

      // Save the failed attempt to database for tracking
      try {
        await prisma.discountCode.create({
          data: {
            shopId: shop,
            code: displayCode,
            discountPercentage: percentage,
            isAutomatic: false,
            expiresAt: new Date(Date.now() + durationMinutes * 60000)
          }
        });
        console.log("Failed discount attempt saved to database");
      } catch (dbError) {
        console.error("Error saving failed discount to database:", dbError);
      }
    }

    return json({
      success: !!discount,
      code: displayCode,
      isAutomatic: true,
      percentage: percentage,
      discount: discount || null,
      error: discountError
    });

  } catch (error) {
    console.error("Error in generate-code endpoint:", error);
    console.error("Error stack:", error.stack);

    // Generate a code anyway for display purposes
    const displayCode = generateDiscountCode();

    return json({
      success: false,
      code: displayCode,
      isAutomatic: false,
      error: `Error: ${error.message || "Unknown error"}`,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
}
