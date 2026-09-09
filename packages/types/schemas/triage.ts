import { z } from "zod";

export const FailureCategorySchema = z.enum([
  "timeout",
  "runtime_error",
  "assertion_mismatch",
  "resource_limit",
]);

export const FailureTriageSchema = z.object({
  category: FailureCategorySchema,
  diagnosis: z.string(), // short, targeted — NEVER the raw stack trace
});
export type FailureTriage = z.infer<typeof FailureTriageSchema>;