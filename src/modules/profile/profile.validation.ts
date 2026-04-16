import { z } from "zod";

export const createProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
});