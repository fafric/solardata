import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["admin", "analyst", "reviewer"]).default("analyst"),
});

export const layoutSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  fields: z.array(
    z.object({
      key: z.string().min(1),
      label: z.string().min(1),
      semanticType: z.string().min(1),
      type: z.string().optional(),
      role: z.string().optional(),
      aliases: z.array(z.string()).default([]),
    }),
  ),
});

export const importRecordSchema = z.object({
  batchId: z.string().min(1),
  row: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});
