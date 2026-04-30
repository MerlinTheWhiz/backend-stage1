import { Request, Response } from "express";
import { Session } from "express-session";
import { OAuthUtils } from "../../utils/oauth";
import { UserService } from "../user/user.service";
import { JWTUtils } from "../../utils/jwt";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";

export class AuthController {
  static async githubAuth(req: Request, res: Response): Promise<void> {
    try {
      const { state, codeVerifier, codeChallenge } = OAuthUtils.generatePKCE();

      // Save to session
      (req.session as any) = (req.session as any) || {};
      (req.session as any).codeVerifier = codeVerifier;
      (req.session as any).state = state;

      // Force save session before redirect
      req.session.save((err: any) => {
        if (err) {
          res.status(500).json({
            status: "error",
            message: "Failed to save session",
          });
          return;
        }

        const authURL = OAuthUtils.getGitHubOAuthURL(state, codeChallenge);
        res.redirect(authURL);
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to initiate OAuth flow",
      });
    }
  }

  static async githubCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state } = req.query;

      // Validate required parameters
      if (!code || !state) {
        res.status(400).json({
          status: "error",
          message: "Missing required OAuth parameters",
        });
        return;
      }

      // Validate parameter types and formats
      if (typeof code !== "string" || typeof state !== "string") {
        res.status(400).json({
          status: "error",
          message: "Invalid parameter format",
        });
        return;
      }

      // Validate code format (GitHub authorization codes are typically 20-40 characters)
      if (code.length < 20 || code.length > 40) {
        res.status(400).json({
          status: "error",
          message: "Invalid authorization code format",
        });
        return;
      }

      const session = req.session as any;
      const storedState = session?.state;
      const codeVerifier = session?.codeVerifier;

      if (!storedState || storedState !== state) {
        res.status(400).json({
          status: "error",
          message: "Invalid state parameter",
        });
        return;
      }

      if (!codeVerifier) {
        res.status(400).json({
          status: "error",
          message: "Missing code verifier",
        });
        return;
      }

      const tokenData = await OAuthUtils.exchangeCodeForToken(
        code as string,
        codeVerifier,
      );
      const githubUser = await OAuthUtils.getGitHubUser(tokenData.access_token);
      const user = await UserService.createOrUpdateUser(githubUser);

      const tokens = JWTUtils.generateTokens({
        userId: user.id,
        githubId: user.github_id,
        username: user.username,
        role: user.role,
      });

      if (
        req.headers["user-agent"]?.includes("curl") ||
        req.query.format === "json"
      ) {
        res.json({
          status: "success",
          data: {
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              avatar_url: user.avatar_url,
            },
            ...tokens,
          },
        });
      } else {
        res.cookie("access_token", tokens.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 3 * 60 * 1000, // 3 minutes
        });

        res.cookie("refresh_token", tokens.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 5 * 60 * 1000, // 5 minutes
        });

        res.redirect(
          process.env.WEB_REDIRECT_URL || "http://localhost:3001/dashboard",
        );
      }

      delete (session as any).codeVerifier;
      delete (session as any).state;
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to complete OAuth flow",
      });
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        res.status(400).json({
          status: "error",
          message: "Refresh token required",
        });
        return;
      }

      const payload = JWTUtils.verifyRefreshToken(refresh_token);
      const user = await UserService.findById(payload.userId);

      if (!user || !user.is_active) {
        res.status(403).json({
          status: "error",
          message: "User not found or inactive",
        });
        return;
      }

      const tokens = JWTUtils.generateTokens({
        userId: user.id,
        githubId: user.github_id,
        username: user.username,
        role: user.role,
      });

      res.json({
        status: "success",
        ...tokens,
      });
    } catch (error) {
      res.status(401).json({
        status: "error",
        message: "Invalid or expired refresh token",
      });
    }
  }

  static async githubCLICallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state, codeVerifier } = req.query;

      if (!code || !state || !codeVerifier) {
        res.status(400).json({
          status: "error",
          message: "Missing code, state, or codeVerifier parameter",
        });
        return;
      }

      // Exchange code for token using PKCE
      const tokenData = await OAuthUtils.exchangeCodeForToken(
        code as string,
        codeVerifier as string,
      );
      const githubUser = await OAuthUtils.getGitHubUser(tokenData.access_token);
      const user = await UserService.createOrUpdateUser(githubUser);

      const tokens = JWTUtils.generateTokens({
        userId: user.id,
        githubId: user.github_id,
        username: user.username,
        role: user.role,
      });

      res.json({
        status: "success",
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            avatar_url: user.avatar_url,
          },
          ...tokens,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "Failed to complete OAuth flow",
      });
    }
  }

  static async githubDeviceAuth(req: Request, res: Response): Promise<void> {
    try {
      const deviceCodeData = await OAuthUtils.initiateDeviceCodeFlow();

      res.json({
        status: "success",
        data: deviceCodeData,
      });
    } catch (error: any) {
      res.status(400).json({
        status: "error",
        message: error.message || "Failed to initiate device flow",
      });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Enforce POST method for logout
      if (req.method !== "POST") {
        res.status(405).json({
          status: "error",
          message: "Method not allowed. Use POST for logout.",
        });
        return;
      }

      const { refresh_token } = req.body;

      if (refresh_token) {
        try {
          JWTUtils.verifyRefreshToken(refresh_token);
        } catch (error) {
          // Token is already invalid, continue with logout
        }
      }

      res.clearCookie("access_token");
      res.clearCookie("refresh_token");

      res.json({
        status: "success",
        message: "Logged out successfully",
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to logout",
      });
    }
  }
}
