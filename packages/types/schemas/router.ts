import { z } from "zod";

export const RouterOutputSchema = z.object({
  needsDocs: z.boolean(),
  needsErrorCheck: z.boolean(),
  needsSnippet: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(), // short explanation, useful for HITL surface + LangSmith traces
});
export type RouterOutput = z.infer<typeof RouterOutputSchema>;