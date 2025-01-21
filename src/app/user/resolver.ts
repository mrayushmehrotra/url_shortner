import { prismaClient } from "../../clients/db";
import axios from "axios";
import JWTService from "../../services/jwt";

interface GoogleTokenResult {
  iss?: string;
  nbf?: string;
  aud?: string;
  sub?: string;
  email: string;
  email_verified: string;
  azp?: string;
  name?: string;
  picture?: string;
  given_name: string;
  family_name?: string;
  iat?: string;
  exp?: string;
  jti?: string;
  alg?: string;
  kid?: string;
  typ?: string;
}

const verifyGoogleToken = async function (token: string) {
  if (!token) {
    throw new Error("Token is required.");
  }

  try {
    // Send a request to Google's tokeninfo endpoint
    const googleOauthURL = new URL("https://oauth2.googleapis.com/tokeninfo");
    googleOauthURL.searchParams.set("id_token", token);

    const { data } = await axios.get<GoogleTokenResult>(
      googleOauthURL.toString(),
      {
        responseType: "json",
      },
    );

    // Ensure the response from Google is valid
    if (!data.email) {
      throw new Error("Invalid token response: Missing email.");
    }

    // Find or create the user in the database
    const user = await prismaClient.user.upsert({
      where: { email: data.email },
      update: {}, // no updates if user exists
      create: {
        email: data.email,
        firstName: data.given_name,
        lastName: data.family_name || "", // default to empty if not available
      },
    });

    // Generate the user token
    const userToken = JWTService.generateTokenForUser(user);

    return userToken;
  } catch (error) {
    console.error("Error verifying Google token:", error);
    throw new Error("Failed to verify Google token.");
  }
};

export { verifyGoogleToken };
