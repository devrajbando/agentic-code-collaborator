import { z } from "zod";

export const SNIPPET_ACCEPTANCE_QUEUE_NAME = "snippet-acceptance";

export const SnippetAcceptanceJobDataSchema = z.object({
  content: z.string(),
  description: z.string().min(1),
});
export type SnippetAcceptanceJobData = z.infer<typeof SnippetAcceptanceJobDataSchema>;