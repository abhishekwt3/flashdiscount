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
    const title = `Limited Time Offer - ${percentage}% Off Everything (${now.getTime()})`;

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
