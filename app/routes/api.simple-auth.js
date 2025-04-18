// app/routes/api.simple-auth.js
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  try {
    console.log("Starting simple auth test");

    // Log the request details
    console.log("Request URL:", request.url);
    console.log("Request method:", request.method);
    console.log("Request headers:", [...request.headers.entries()]);

    try {
      // Try to authenticate with more detailed logging
      console.log("Attempting authentication...");
      const result = await authenticate.admin(request);

      // Log what we get back
      console.log("Authentication result type:", typeof result);
      console.log("Authentication result keys:", Object.keys(result));

      if (result.session) {
        console.log("Session found:", {
          shop: result.session.shop,
          hasToken: !!result.session.accessToken
        });
      } else {
        console.log("No session in result");
      }

      // Return success
      return new Response(JSON.stringify({
        success: true,
        message: "Authentication successful"
      }), {
        headers: {
          "Content-Type": "application/json"
        }
      });
    } catch (authError) {
      // If it's a Response object, log it and return it
      if (authError instanceof Response) {
        console.log("Received Response object from authenticate.admin()");
        console.log("Response status:", authError.status);
        console.log("Response type:", authError.type);

        try {
          // Try to clone and read the response body
          const clonedResponse = authError.clone();
          const body = await clonedResponse.text();
          console.log("Response body:", body);
        } catch (readError) {
          console.log("Could not read response body:", readError.message);
        }

        // This is actually a redirect from the authenticate method,
        // so we should return it to allow the redirect to happen
        return authError;
      }

      // Otherwise log and return the error
      console.error("Authentication error:", authError);
      return new Response(JSON.stringify({
        success: false,
        errorType: authError.constructor.name,
        error: authError.message,
        stack: authError.stack
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
  } catch (error) {
    // General error handling
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({
      success: false,
      errorType: error.constructor.name,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
}
