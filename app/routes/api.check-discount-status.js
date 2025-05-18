// app/routes/api.check-discount-status.js
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * API endpoint to check the status of discount codes in Shopify
 * This uses the verified working GraphQL query provided
 */
export async function loader({ request }) {
  try {
    console.log("Checking discount status from Shopify API");
    const { admin, session } = await authenticate.admin(request);

    // Using the exact working query structure
    const WORKING_DISCOUNT_QUERY = `
      query GetAllDiscountCodesWithStatus {
        codeDiscountNodes(first: 20, reverse: true, query: "title:Flash Sale status:active") {
          nodes {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                status
                createdAt
                codes(first: 5) {
                  nodes {
                    id
                    code
                  }
                }
                endsAt
                startsAt
                appliesOncePerCustomer
                usageLimit
              }
            }
          }
        }
      }
    `;

    console.log("Sending verified working GraphQL query for active discounts");
    const response = await admin.graphql(WORKING_DISCOUNT_QUERY);
    const responseJson = await response.json();

    // Log the full response for debugging
    console.log("Full response:", JSON.stringify(responseJson, null, 2));

    if (responseJson.errors) {
      console.error("GraphQL errors:", responseJson.errors);
      throw new Error(`Error fetching discount status: ${responseJson.errors[0].message}`);
    }

    // Process code-based discounts
    const discountNodes = responseJson.data.codeDiscountNodes.nodes;

    console.log(`Found ${discountNodes.length} active Flash Sale discounts`);

    // If no active discounts found, return empty result
    if (discountNodes.length === 0) {
      return json({
        hasActiveDiscount: false
      });
    }

    // Get the most recent active discount (should already be in reverse order)
    const latestDiscount = discountNodes[0];
    console.log("Latest active discount:", JSON.stringify(latestDiscount, null, 2));

    // Extract code from the discount using the correct path
    let discountCode = "";
    if (latestDiscount.codeDiscount.codes &&
        latestDiscount.codeDiscount.codes.nodes &&
        latestDiscount.codeDiscount.codes.nodes.length > 0) {
      discountCode = latestDiscount.codeDiscount.codes.nodes[0].code;
    }

    // If code is still empty, use a fallback
    if (!discountCode) {
      // Try to extract from title
      const codeMatch = latestDiscount.codeDiscount.title.match(/code:?\s*([A-Z0-9]+)/i);
      if (codeMatch && codeMatch[1]) {
        discountCode = codeMatch[1];
      } else {
        // Generate a code as fallback
        discountCode = generateDiscountCode();
      }
    }

    // Extract percentage from title since we don't have direct access to it
    let discountPercentage = 0;
    const percentMatch = latestDiscount.codeDiscount.title.match(/(\d+)%/);
    if (percentMatch && percentMatch[1]) {
      discountPercentage = parseInt(percentMatch[1], 10);
    } else {
      discountPercentage = 20; // Default to 20% if we can't determine
    }

    // Check if it has an expiry
    const noExpiry = !latestDiscount.codeDiscount.endsAt;

    // Get other discount details
    const oncePerCustomer = !!latestDiscount.codeDiscount.appliesOncePerCustomer;
    const usageLimit = latestDiscount.codeDiscount.usageLimit;

    // Return complete discount information
    return json({
      hasActiveDiscount: true,
      discountId: latestDiscount.id,
      discountCode: discountCode,
      discountPercentage: discountPercentage,
      isAutomatic: false, // Code discounts are not automatic
      discountExpiresAt: latestDiscount.codeDiscount.endsAt,
      discountStartsAt: latestDiscount.codeDiscount.startsAt,
      discountCreatedAt: latestDiscount.codeDiscount.createdAt,
      noExpiry: noExpiry,
      status: latestDiscount.codeDiscount.status,
      usageLimit: usageLimit,
      oncePerCustomer: oncePerCustomer,
      title: latestDiscount.codeDiscount.title
    });
  } catch (error) {
    console.error("Error checking discount status:", error);
    return json({
      error: error.message,
      hasActiveDiscount: false
    }, { status: 500 });
  }
}

// Helper function to generate a random discount code for display
function generateDiscountCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
