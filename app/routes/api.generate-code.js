// app/routes/api.generate-code.js
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Generate a random discount code
 */
function generateDiscountCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * API endpoint to create an automatic discount
 *
 * NOTE: This endpoint is no longer used in the main app flow, as discount creation
 * has been moved directly into the app._index.jsx action handler to avoid authentication issues.
 * This file is kept for reference or in case you want to revert to an API-based approach.
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

    // Get percentage from header or use default
    const percentageHeader = request.headers.get('X-Discount-Percentage');
    const percentage = percentageHeader ? parseInt(percentageHeader, 10) : 15;

    console.log(`Creating ${percentage}% discount for shop:`, shop);

    // Fixed 15 minutes duration
    const durationMinutes = 15;

    // Generate a display code for UI
    const displayCode = generateDiscountCode();
    console.log("Generated display code:", displayCode);

    // Calculate expiry time (current time + 15 minutes)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60000);

    // Create the automatic discount in Shopify
    const CREATE_DISCOUNT_MUTATION = `
      mutation discountAutomaticBasicCreate($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
        discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
          automaticDiscountNode {
            id
            automaticDiscount {
              ... on DiscountAutomaticBasic {
                title
                startsAt
                endsAt
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    // Convert percentage to decimal (e.g., 10% becomes 0.1)
    const decimalPercentage = parseFloat(percentage) / 100;

    const variables = {
      automaticBasicDiscount: {
        title: `Flash Sale - ${percentage}% Off (${now.getTime()})`,
        startsAt: now.toISOString(),
        endsAt: expiresAt.toISOString(),
        minimumRequirement: {
          subtotal: {
            greaterThanOrEqualToSubtotal: "0.01"
          }
        },
        customerGets: {
          value: {
            percentage: decimalPercentage
          },
          items: {
            all: true
          }
        },
        combinesWith: {
          productDiscounts: false,
          shippingDiscounts: true,
          orderDiscounts: false
        }
      }
    };

    console.log("Creating discount with variables:", JSON.stringify(variables));

    const response = await admin.graphql(CREATE_DISCOUNT_MUTATION, {
      variables,
    });

    const responseJson = await response.json();
    console.log("Discount creation response:", JSON.stringify(responseJson));

    if (responseJson.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(responseJson.errors)}`);
    }

    const { userErrors } = responseJson.data.discountAutomaticBasicCreate;
    if (userErrors && userErrors.length > 0) {
      throw new Error(`User errors: ${JSON.stringify(userErrors)}`);
    }

    const discountId = responseJson.data.discountAutomaticBasicCreate.automaticDiscountNode.id;

    // Save successful discount to database
    try {
      await prisma.discountCode.create({
        data: {
          shopId: shop,
          code: displayCode,
          discountPercentage: percentage,
          isAutomatic: true,
          discountId: discountId,
          expiresAt
        }
      });
      console.log("Discount saved to database");
    } catch (dbError) {
      console.error("Error saving discount to database:", dbError);
      // Continue even if DB save fails
    }

    return json({
      success: true,
      code: displayCode,
      isAutomatic: true,
      percentage: percentage,
      discountId: discountId,
      expiresAt: expiresAt.toISOString()
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
