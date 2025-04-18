import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * Enhanced debug endpoint for investigating discount creation issues
 */
export async function loader({ request }) {
  try {
    console.log("Debug discount endpoint called");

    // Step 1: Authenticate (with detailed error handling)
    let sessionData;
    try {
      const { admin, session } = await authenticate.admin(request);
      sessionData = {
        shop: session.shop,
        accessToken: "****" + (session.accessToken ? session.accessToken.slice(-4) : "none"),
        isOnline: session.isOnline,
        hasToken: !!session.accessToken
      };
      console.log("Authentication successful for shop:", session.shop);
    } catch (authError) {
      console.error("Authentication error:", authError);
      return json({
        success: false,
        stage: "authentication",
        error: authError.message,
        stack: authError.stack
      }, { status: 401 });
    }

    // Step 2: Check permissions with a simple shop query
    try {
      console.log("Testing API connectivity with simple shop query...");
      const { admin, session } = await authenticate.admin(request);

      const SHOP_QUERY = `
        query {
          shop {
            name
            id
          }
        }
      `;

      const response = await admin.graphql(SHOP_QUERY);
      const responseJson = await response.json();

      if (responseJson.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(responseJson.errors)}`);
      }

      console.log("Shop query successful:", responseJson.data.shop.name);
    } catch (shopQueryError) {
      console.error("Shop query error:", shopQueryError);
      return json({
        success: false,
        stage: "shop_query",
        error: shopQueryError.message,
        session: sessionData,
        stack: shopQueryError.stack
      }, { status: 500 });
    }

    // Step 3: Check current discount access
    try {
      console.log("Testing discount API access...");
      const { admin, session } = await authenticate.admin(request);

      const DISCOUNT_QUERY = `
        query {
          discountNodes(first: 1) {
            edges {
              node {
                id
              }
            }
          }
        }
      `;

      const response = await admin.graphql(DISCOUNT_QUERY);
      const responseJson = await response.json();

      if (responseJson.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(responseJson.errors)}`);
      }

      console.log("Discount query successful, found discounts:",
        responseJson.data.discountNodes.edges.length);
    } catch (discountQueryError) {
      console.error("Discount query error:", discountQueryError);
      return json({
        success: false,
        stage: "discount_query",
        error: discountQueryError.message,
        session: sessionData,
        stack: discountQueryError.stack
      }, { status: 500 });
    }

    // Step 4: Attempt to create a new automatic discount
    try {
      console.log("Testing discount creation...");
      const { admin, session } = await authenticate.admin(request);

      // Calculate expiry time (current time + 15 minutes)
      const now = new Date();
      const endsAt = new Date(now.getTime() + 15 * 60000);

      const CREATE_DISCOUNT_MUTATION = `
        mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
          discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
            automaticAppDiscount {
              discountId
              title
              status
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        automaticAppDiscount: {
          title: "Debug Test - 15% Off Everything",
          startsAt: now.toISOString(),
          endsAt: endsAt.toISOString(),
          status: "ACTIVE",
          customerGets: {
            value: {
              percentageValue: 15.0,
            },
            items: {
              all: true
            }
          },
          customerSelection: {
            all: true
          }
        }
      };

      console.log("Sending mutation with variables:", JSON.stringify(variables));

      const response = await admin.graphql(CREATE_DISCOUNT_MUTATION, {
        variables,
      });

      const responseJson = await response.json();
      console.log("Discount creation response:", JSON.stringify(responseJson));

      if (responseJson.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(responseJson.errors)}`);
      }

      const { userErrors } = responseJson.data.discountAutomaticAppCreate;
      if (userErrors && userErrors.length > 0) {
        throw new Error(`User errors: ${JSON.stringify(userErrors)}`);
      }

      return json({
        success: true,
        message: "Successfully created test discount",
        session: sessionData,
        discount: responseJson.data.discountAutomaticAppCreate.automaticAppDiscount
      });
    } catch (createError) {
      console.error("Discount creation error:", createError);
      return json({
        success: false,
        stage: "discount_creation",
        error: createError.message,
        session: sessionData,
        stack: createError.stack
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Unexpected error in debug endpoint:", error);
    return json({
      success: false,
      stage: "unexpected",
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
