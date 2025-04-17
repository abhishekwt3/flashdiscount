import { GraphqlQueryError } from "@shopify/shopify-api";

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
 * Create a discount in Shopify Admin API
 */
export async function createDiscount(session, { code, percentage }) {
  try {
    const CREATE_DISCOUNT_MUTATION = `
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                summary
                status
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

    const response = await session.admin.graphql(CREATE_DISCOUNT_MUTATION, {
      variables: {
        basicCodeDiscount: {
          title: `Auto-generated discount: ${code}`,
          code,
          startsAt: new Date().toISOString(),
          customerSelection: {
            all: true,
          },
          customerGets: {
            value: {
              percentageValue: parseFloat(percentage),
            },
            items: {
              all: true,
            },
          },
        },
      },
    });

    const responseJson = await response.json();

    if (responseJson.errors) {
      throw new Error(responseJson.errors[0].message);
    }

    const { userErrors } = responseJson.data.discountCodeBasicCreate;
    if (userErrors.length > 0) {
      throw new Error(userErrors[0].message);
    }

    return responseJson.data.discountCodeBasicCreate.codeDiscountNode;
  } catch (error) {
    if (error instanceof GraphqlQueryError) {
      throw new Error(
        `${error.message}\n${JSON.stringify(error.response, null, 2)}`
      );
    }
    throw error;
  }
}

/**
 * Create an automatic discount in Shopify Admin API that applies automatically
 * and expires after a specified duration
 */
export async function createAutomaticDiscount(session, { percentage, durationMinutes = 15 }) {
  try {
    // Calculate expiry time (current time + duration in minutes)
    const now = new Date();
    const endsAt = new Date(now.getTime() + durationMinutes * 60000);

    const CREATE_AUTOMATIC_DISCOUNT_MUTATION = `
      mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
        discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
          automaticAppDiscount {
            discountId
            title
            status
            startsAt
            endsAt
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await session.admin.graphql(CREATE_AUTOMATIC_DISCOUNT_MUTATION, {
      variables: {
        automaticAppDiscount: {
          title: `Limited Time Offer - ${percentage}% Off Everything`,
          startsAt: now.toISOString(),
          endsAt: endsAt.toISOString(),
          status: "ACTIVE",
          customerGets: {
            value: {
              percentageValue: parseFloat(percentage),
            },
            items: {
              all: true
            }
          },
          customerSelection: {
            all: true
          }
        },
      },
    });

    const responseJson = await response.json();

    if (responseJson.errors) {
      throw new Error(responseJson.errors[0].message);
    }

    const { userErrors } = responseJson.data.discountAutomaticAppCreate;
    if (userErrors.length > 0) {
      throw new Error(userErrors[0].message);
    }

    return responseJson.data.discountAutomaticAppCreate.automaticAppDiscount;
  } catch (error) {
    if (error instanceof GraphqlQueryError) {
      throw new Error(
        `${error.message}\n${JSON.stringify(error.response, null, 2)}`
      );
    }
    throw error;
  }
}
