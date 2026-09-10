import { z } from "zod";

export const ExecutorResultSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().int(),
  durationMs: z.number().int().min(0),
  signal: z.string().nullable(),
});
export type ExecutorResult = z.infer<typeof ExecutorResultSchema>;