import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issue = err.issues[0];

        const isTypeError = issue.code === "invalid_type";

        return res.status(isTypeError ? 422 : 400).json({
          status: "error",
          message: issue.message
        });
      }

      next(err);
    }
  };