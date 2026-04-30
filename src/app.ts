import express from "express";
import cors from "cors";
import session from "express-session";
import { router } from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { requestLogger } from "./middlewares/logging.middleware";

const app = express();

app.use(
  cors({
    origin: process.env.WEB_URL || "http://localhost:3001",
    credentials: true,
  }),
);

app.use(express.json());

app.use(requestLogger);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-session-secret",
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
    },
  }),
);

app.use("/api", router);

app.use(errorMiddleware);

export default app;
