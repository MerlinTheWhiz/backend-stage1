import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    github_id: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    avatar_url: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ["admin", "analyst"],
      default: "analyst",
      required: true,
    },
    is_active: {
      type: Boolean,
      default: true,
      required: true,
    },
    last_login_at: {
      type: Date,
      required: false,
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      },
    },
  },
);

// Indexes are already created by unique: true in schema definition

export const User = mongoose.model("User", userSchema);
