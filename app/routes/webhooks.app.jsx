import { authenticate } from "../shopify.server";

/**
 * General webhook handler for all incoming webhook requests
 * Validates HMAC signatures and routes to the appropriate handler
 */
export const action = async ({ request }) => {
  try {
    // The authenticate.webhook method will validate the HMAC signature
    // If validation fails, it throws an error that we can catch
    await authenticate.webhook(request);

    // If we get here, HMAC validation passed
    // We'll let the specific topic handlers process the request
    // Return a 200 response as a fallback if no specific handler matches
    return new Response(null, { status: 200 });

  } catch (error) {
    console.error(`Webhook authentication failed: ${error.message}`);

    // Return a 401 Unauthorized response for invalid HMAC signatures
    // This is what Shopify is looking for in its validation test
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "HMAC validation failed"
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
};

// Also handle GET requests, returning 401 for unauthenticated access
export const loader = async ({ request }) => {
  return new Response(
    JSON.stringify({
      error: "Unauthorized",
      message: "Direct access to webhook endpoints is not allowed"
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
};
