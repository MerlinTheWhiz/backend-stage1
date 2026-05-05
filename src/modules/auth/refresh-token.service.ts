import { JWTUtils } from "../../utils/jwt";
import { JWTPayload } from "../user/user.types";
import { RefreshToken } from "./refresh-token.model";

export class RefreshTokenService {
  static async issueToken(userId: string): Promise<string> {
    const { token, tokenId } = JWTUtils.generateRefreshToken(userId);

    await RefreshToken.create({
      token_id: tokenId,
      user_id: userId,
      expires_at: JWTUtils.getRefreshTokenExpiry(),
    });

    return token;
  }

  static async issueAuthTokens(payload: JWTPayload): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const access_token = JWTUtils.generateAccessToken(payload);
    const refresh_token = await this.issueToken(payload.userId);

    return { access_token, refresh_token };
  }

  static async rotateToken(
    token: string,
    payload: JWTPayload,
  ): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const refreshPayload = JWTUtils.verifyRefreshToken(token);

    const storedToken = await RefreshToken.findOne({
      token_id: refreshPayload.tokenId,
      user_id: refreshPayload.userId,
      revoked_at: null,
      expires_at: { $gt: new Date() },
    });

    if (!storedToken) {
      throw new Error("Invalid or expired refresh token");
    }

    storedToken.revoked_at = new Date();
    await storedToken.save();

    return this.issueAuthTokens(payload);
  }

  static async revokeToken(token: string): Promise<void> {
    const refreshPayload = JWTUtils.verifyRefreshToken(token);

    await RefreshToken.updateOne(
      {
        token_id: refreshPayload.tokenId,
        user_id: refreshPayload.userId,
        revoked_at: null,
      },
      {
        revoked_at: new Date(),
      },
    );
  }
}
