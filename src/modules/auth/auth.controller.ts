import { Request, Response } from "express";
import { OAuthUtils } from "../../utils/oauth";
import { JWTUtils } from "../../utils/jwt";
import { UserService } from "../user/user.service";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { issueCsrfToken } from "../../middlewares/csrf.middleware";
import { RefreshTokenService } from "./refresh-token.service";

const ACCESS_TOKEN_COOKIE_MAX_AGE = 3 * 60 * 1000;
const REFRESH_TOKEN_COOKIE_MAX_AGE = 5 * 60 * 1000;

const setAuthCookies = (
  res: Response,
  tokens: { access_token: string; refresh_token: string },
) => {
  res.cookie("access_token", tokens.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE,
  });

  res.cookie("refresh_token", tokens.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
  });
};

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

      const jwtPayload = {
        userId: user.id,
        githubId: user.github_id,
        username: user.username,
        role: user.role,
      };
      const tokens = await RefreshTokenService.issueAuthTokens(jwtPayload);

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
        setAuthCookies(res, tokens);
        issueCsrfToken(req, res);
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
      const refresh_token =
        req.body?.refresh_token || req.cookies?.refresh_token;

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

      const jwtPayload = {
        userId: user.id,
        githubId: user.github_id,
        username: user.username,
        role: user.role,
      };
      const tokens = await RefreshTokenService.rotateToken(
        refresh_token,
        jwtPayload,
      );

      setAuthCookies(res, tokens);
      issueCsrfToken(req, res);

      res.json({
        status: "success",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
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

      const jwtPayload = {
        userId: user.id,
        githubId: user.github_id,
        username: user.username,
        role: user.role,
      };
      const tokens = await RefreshTokenService.issueAuthTokens(jwtPayload);

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

  static async getCurrentUser(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: "error",
          message: "Not authenticated",
        });
        return;
      }

      res.json({
        status: "success",
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to get current user",
      });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const refresh_token =
        req.body?.refresh_token || req.cookies?.refresh_token;

      if (refresh_token) {
        try {
          await RefreshTokenService.revokeToken(refresh_token);
        } catch {
          // Continue clearing client cookies even if the token is already invalid.
        }
      }

      res.clearCookie("access_token");
      res.clearCookie("refresh_token");
      res.clearCookie("csrf_token");

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

  static async getCsrfToken(req: Request, res: Response): Promise<void> {
    const csrfToken = issueCsrfToken(req, res);

    res.json({
      status: "success",
      csrf_token: csrfToken,
    });
  }
}
