import crypto from "crypto";
import axios from "axios";
import { GitHubUser } from "../modules/user/user.types";

export class OAuthUtils {
  static generatePKCE(): {
    state: string;
    codeVerifier: string;
    codeChallenge: string;
  } {
    const state = crypto.randomBytes(32).toString("hex");
    // Generate code_verifier between 43-128 characters (PKCE spec)
    const codeVerifier = crypto
      .randomBytes(32)
      .toString("base64url")
      .slice(0, 128);
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")
      .slice(0, 43); // Ensure exactly 43 characters

    return { state, codeVerifier, codeChallenge };
  }

  static getGitHubOAuthURL(state: string, codeChallenge: string): string {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri =
      process.env.GITHUB_REDIRECT_URI ||
      "http://localhost:3000/api/auth/github/callback";

    if (!clientId) {
      throw new Error("GITHUB_CLIENT_ID environment variable is required");
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "user:email",
      response_type: "code",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  static async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
  ): Promise<{
    access_token: string;
    token_type: string;
    scope: string;
  }> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const redirectUri =
      process.env.GITHUB_REDIRECT_URI ||
      "http://localhost:3000/api/auth/github/callback";

    if (!clientId || !clientSecret) {
      throw new Error("GitHub OAuth credentials not configured");
    }

    try {
      const response = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.error) {
        throw new Error(
          `GitHub OAuth error: ${response.data.error_description}`,
        );
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to exchange code for token: ${error.response?.data?.error_description || error.message}`,
        );
      }
      throw error;
    }
  }

  static async getGitHubUser(accessToken: string): Promise<GitHubUser> {
    try {
      const response = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "Insighta-Labs-Backend",
        },
      });

      const user = response.data;

      if (!user.email) {
        const emailResponse = await axios.get(
          "https://api.github.com/user/emails",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "User-Agent": "Insighta-Labs-Backend",
            },
          },
        );

        const primaryEmail = emailResponse.data.find(
          (email: any) => email.primary && email.verified,
        );
        user.email =
          primaryEmail?.email || `${user.login}@users.noreply.github.com`;
      }

      return {
        id: user.id,
        login: user.login,
        email: user.email,
        avatar_url: user.avatar_url,
        name: user.name,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to fetch GitHub user: ${error.response?.data?.message || error.message}`,
        );
      }
      throw error;
    }
  }

  static async initiateDeviceCodeFlow(): Promise<{
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
  }> {
    const clientId = process.env.GITHUB_CLIENT_ID;

    if (!clientId) {
      throw new Error("GITHUB_CLIENT_ID environment variable is required");
    }

    const response = await axios.post(
      "https://github.com/login/device/code",
      {
        client_id: clientId,
        scope: "user:email",
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  }

  static async pollDeviceToken(deviceCode: string): Promise<{
    access_token: string;
    token_type: string;
    scope: string;
  }> {
    const clientId = process.env.GITHUB_CLIENT_ID;

    if (!clientId) {
      throw new Error("GITHUB_CLIENT_ID environment variable is required");
    }

    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );

    if (response.data.error) {
      throw new Error(`GitHub OAuth error: ${response.data.error_description}`);
    }

    return response.data;
  }
}
