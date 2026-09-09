import { z } from "zod";

export const ExecutorResultSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().int(),
  durationMs: z.number().int().min(0),
});
export type ExecutorResult = z.infer<typeof ExecutorResultSchema>;