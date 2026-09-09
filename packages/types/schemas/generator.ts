import { z } from "zod";
import { AgentTypeSchema } from "./agentTypes.js";

export const GeneratorDraftSchema = z.object({
  agentType: AgentTypeSchema,
  content: z.string(), // the actual doc / error explanation / code snippet
  toolsUsed: z.array(z.string()).default([]), // e.g. ["eslint", "ts-compiler-api", "pgvector-retrieval"]
  attemptNumber: z.number().int().min(1).max(3),
});
export type GeneratorDraft = z.infer<typeof GeneratorDraftSchema>;