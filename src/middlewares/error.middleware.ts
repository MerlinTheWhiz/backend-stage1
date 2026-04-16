import { Request, Response, NextFunction } from "express";

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("ERROR:", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  if (statusCode === 502) {
    return res.status(502).json({
      status: "error",
      message,
    });
  }

  if (statusCode === 404) {
    return res.status(404).json({
      status: "error",
      message,
    });
  }

  if (statusCode === 400 || statusCode === 422) {
    return res.status(statusCode).json({
      status: "error",
      message,
    });
  }

  return res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
};