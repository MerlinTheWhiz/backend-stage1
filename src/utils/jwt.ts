import jwt from "jsonwebtoken";
import { v7 as uuidv7 } from "uuid";
import {
  JWTPayload,
  RefreshTokenPayload,
} from "../modules/user/user.types";

const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "fallback-secret-key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret-key";

export class JWTUtils {
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: "3m" });
  }

  static generateRefreshToken(userId: string): {
    token: string;
    tokenId: string;
  } {
    const tokenId = uuidv7();
    const payload: RefreshTokenPayload = {
      userId,
      tokenId,
    };

    const token = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "5m" });

    return { token, tokenId };
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_ACCESS_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error("Invalid access token");
    }
  }

  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
    } catch (error) {
      throw new Error("Invalid refresh token");
    }
  }

  static getAccessTokenExpiry(): Date {
    return new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
  }

  static getRefreshTokenExpiry(): Date {
    return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  }
}
