// app/models/DiscountCode.server.js

/**
 * Generate a random discount code
 */
export function generateDiscountCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create an automatic discount in Shopify Admin API
 * Using the correct GraphQL mutation structure from Shopify docs
 */
export async function createAutomaticDiscount(admin, { percentage, durationMinutes = 15 }) {
  try {
    console.log(`Creating automatic discount with ${percentage}% off for ${durationMinutes} minutes`);

    // Calculate start and end times
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60000);

    console.log(`Discount period: ${now.toISOString()} to ${expiresAt.toISOString()}`);

    // Prepare title with timestamp to avoid duplicate title errors
    const title = `Flash Sale - ${percentage}% Off (${now.getTime()})`;

    // Convert percentage to decimal (e.g., 10% becomes 0.1)
    const decimalPercentage = parseFloat(percentage) / 100;
    console.log(`Converting ${percentage}% to decimal: ${decimalPercentage}`);

    // The correct mutation based on the latest Shopify API documentation
    const CREATE_AUTOMATIC_DISCOUNT_MUTATION = `#graphql
    mutation discountAutomaticBasicCreate($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
      discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
        automaticDiscountNode {
          id
          automaticDiscount {
            ... on DiscountAutomaticBasic {
              title
              startsAt
              endsAt
              combinesWith {
                productDiscounts
                shippingDiscounts
                orderDiscounts
              }
              minimumRequirement {
                ... on DiscountMinimumSubtotal {
                  greaterThanOrEqualToSubtotal {
                    amount
                    currencyCode
                  }
                }
              }
              customerGets {
                value {
                  ... on DiscountPercentage {
                    percentage
                  }
                }
                items {
                  ... on AllDiscountItems {
                    allItems
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          code
          message
        }
      }
    }`;

    console.log("Sending GraphQL mutation to create automatic discount");

    // Make sure we're passing the admin object directly
    const response = await admin.graphql(
      CREATE_AUTOMATIC_DISCOUNT_MUTATION,
      {
        variables: {
          automaticBasicDiscount: {
            title: title,
            startsAt: now.toISOString(),
            endsAt: expiresAt.toISOString(),
            minimumRequirement: {
              subtotal: {
                greaterThanOrEqualToSubtotal: "0.01"
              }
            },
            customerGets: {
              value: {
                percentage: decimalPercentage // Use the decimal value (0.1 for 10%)
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
        }
      }
    );

    const responseJson = await response.json();
    console.log("Automatic discount creation response:", JSON.stringify(responseJson, null, 2));

    if (responseJson.errors) {
      throw new Error(responseJson.errors[0].message);
    }

    if (!responseJson.data) {
      throw new Error("Invalid response format: missing data object");
    }

    const discountResult = responseJson.data.discountAutomaticBasicCreate;

    if (!discountResult) {
      throw new Error("Invalid response format: missing discountAutomaticBasicCreate");
    }

    const { userErrors } = discountResult;
    if (userErrors && userErrors.length > 0) {
      throw new Error(userErrors[0].message);
    }

    return discountResult.automaticDiscountNode;
  } catch (error) {
    console.error("Error creating automatic discount:", error);
    console.error("Error stack:", error.stack);
    throw new Error(`Failed to create automatic discount: ${error.message || "Unknown error"}`);
  }
}

/**
 * Query Shopify for active discount codes matching our titles
 */
export async function checkActiveDiscounts(admin) {
  try {
    console.log("Checking active discount status from Shopify");

    // Query to get the latest discount codes with "Flash Sale" in the title
    const DISCOUNT_STATUS_QUERY = `
      query GetAllDiscountCodesWithStatus {
        codeDiscountNodes(first: 10, reverse: true, query: "title:Flash Sale") {
          nodes {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                status
                codes(first: 1) {
                  edges {
                    node {
                      code
                    }
                  }
                }
                endsAt
                startsAt
                summary
              }
            }
          }
        }
        automaticDiscountNodes(first: 10, reverse: true, query: "title:Flash Sale") {
          nodes {
            id
            automaticDiscount {
              ... on DiscountAutomaticBasic {
                title
                status
                endsAt
                startsAt
                summary
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(DISCOUNT_STATUS_QUERY);
    const responseJson = await response.json();

    if (responseJson.errors) {
      console.error("GraphQL errors:", responseJson.errors);
      throw new Error(`Error fetching discount status: ${responseJson.errors[0].message}`);
    }

    // Process code-based discounts
    const codeDiscounts = responseJson.data.codeDiscountNodes.nodes;
    // Process automatic discounts
    const automaticDiscounts = responseJson.data.automaticDiscountNodes.nodes;

    // Combine all discounts and sort by creation date (newest first)
    const allDiscounts = [
      ...codeDiscounts.map(node => ({
        id: node.id,
        title: node.codeDiscount.title,
        status: node.codeDiscount.status,
        isAutomatic: false,
        code: node.codeDiscount.codes?.edges[0]?.node?.code || null,
        endsAt: node.codeDiscount.endsAt,
        startsAt: node.codeDiscount.startsAt,
        summary: node.codeDiscount.summary
      })),
      ...automaticDiscounts.map(node => ({
        id: node.id,
        title: node.automaticDiscount.title,
        status: node.automaticDiscount.status,
        isAutomatic: true,
        code: null, // Automatic discounts don't have codes
        endsAt: node.automaticDiscount.endsAt,
        startsAt: node.automaticDiscount.startsAt,
        summary: node.automaticDiscount.summary
      }))
    ];

    // Sort by creation time (assuming newer discounts have larger timestamps in title)
    allDiscounts.sort((a, b) => {
      // Extract timestamps from titles if they exist (assuming format "Flash Sale - X% Off (timestamp)")
      const timestampA = extractTimestampFromTitle(a.title);
      const timestampB = extractTimestampFromTitle(b.title);

      if (timestampA && timestampB) {
        return timestampB - timestampA; // Newest first
      }

      // Fallback to comparing titles
      return a.title.localeCompare(b.title);
    });

    console.log("All discounts:", allDiscounts);

    // Find the most recent active discount
    const activeDiscount = allDiscounts.find(discount => discount.status === "ACTIVE");

    if (activeDiscount) {
      console.log("Found active discount:", activeDiscount);

      // Extract discount percentage from title
      const percentageMatch = activeDiscount.title.match(/(\d+)%/);
      const percentage = percentageMatch ? parseInt(percentageMatch[1], 10) : null;

      // Parse the timestamp and expiry
      let noExpiry = false;
      if (!activeDiscount.endsAt) {
        noExpiry = true;
      }

      // For automatic discounts, we need to use the display code from our settings
      // or generate a random code just for display
      const code = activeDiscount.code ||
                 extractCodeFromTitle(activeDiscount.title) ||
                 generateDiscountCode();

      return {
        hasActiveDiscount: true,
        discountId: activeDiscount.id,
        discountCode: code,
        discountPercentage: percentage,
        isAutomatic: activeDiscount.isAutomatic,
        discountExpiresAt: activeDiscount.endsAt,
        discountStartsAt: activeDiscount.startsAt,
        noExpiry: noExpiry,
        status: activeDiscount.status
      };
    } else {
      console.log("No active discounts found");
      return {
        hasActiveDiscount: false
      };
    }
  } catch (error) {
    console.error("Error checking discount status:", error);
    throw error;
  }
}

/**
 * Get all active discounts from Shopify
 * This is used for testing/debugging
 */
export async function getActiveDiscounts(session) {
  try {
    if (!session || !session.admin) {
      throw new Error("Invalid session or missing admin API access");
    }

    const { admin } = session;

    // Similar query to checkActiveDiscounts, but returns raw data
    const ACTIVE_DISCOUNTS_QUERY = `
      query {
        codeDiscountNodes(first: 10, query: "status:active") {
          nodes {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                status
                codes(first: 1) {
                  edges {
                    node {
                      code
                    }
                  }
                }
              }
            }
          }
        }
        automaticDiscountNodes(first: 10, query: "status:active") {
          nodes {
            id
            automaticDiscount {
              ... on DiscountAutomaticBasic {
                title
                status
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(ACTIVE_DISCOUNTS_QUERY);
    return await response.json();
  } catch (error) {
    console.error("Error fetching active discounts:", error);
    throw error;
  }
}

// Helper function to extract timestamp from discount title
function extractTimestampFromTitle(title) {
  const match = title.match(/\((\d+)\)/);
  return match ? parseInt(match[1], 10) : null;
}

// Helper function to extract code from title if needed
function extractCodeFromTitle(title) {
  // This is a fallback method that assumes the code might be in the title
  // In practice, we should store the code properly in our database
  // This is just a helper in case we need to extract it from the title
  const words = title.split(' ');
  for (const word of words) {
    // Look for all-caps code-like strings (imperfect heuristic)
    if (word.length >= 5 && word === word.toUpperCase() && /^[A-Z0-9]+$/.test(word)) {
      return word;
    }
  }
  return null;
}
