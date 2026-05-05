import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    token_id: {
      type: String,
      required: true,
      unique: true,
    },
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    expires_at: {
      type: Date,
      required: true,
    },
    revoked_at: {
      type: Date,
      required: false,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: false,
    },
  },
);

export const RefreshToken = mongoose.model(
  "RefreshToken",
  refreshTokenSchema,
);
