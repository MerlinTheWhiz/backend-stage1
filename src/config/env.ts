import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3000,
  MONGODB_URI: process.env.MONGODB_URI as string,
};
