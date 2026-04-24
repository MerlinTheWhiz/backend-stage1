import mongoose from "mongoose";
import { config } from "./env";

export const connectDB = async () => {
  try {
    await mongoose.connect(config.dbUrl, {
        serverSelectionTimeoutMS: 30000,
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection failed", err);
    process.exit(1);
  }
};