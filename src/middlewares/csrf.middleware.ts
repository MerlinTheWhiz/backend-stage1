import crypto from "crypto";
import { NextFunction, Request, Response } from "express";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_MAX_AGE = 5 * 60 * 1000;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const csrfCookieOptions = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: CSRF_TOKEN_MAX_AGE,
};

export const issueCsrfToken = (req: Request, res: Response): string => {
  const existingToken = req.cookies?.[CSRF_COOKIE_NAME];
  const token = existingToken || crypto.randomBytes(32).toString("hex");

  res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions);

  return token;
};

export const requireCsrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const hasAuthorizationHeader = Boolean(req.headers.authorization);
  const usingCookieAuth =
    !hasAuthorizationHeader &&
    Boolean(req.cookies?.access_token || req.cookies?.refresh_token);

  if (!usingCookieAuth) {
    next();
    return;
  }

  const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const csrfHeader = req.headers[CSRF_HEADER_NAME];

  if (!csrfCookie || typeof csrfHeader !== "string" || csrfHeader !== csrfCookie) {
    res.status(403).json({
      status: "error",
      message: "CSRF token invalid or missing",
    });
    return;
  }

  next();
};
