// packages/types/schemas/critic.ts
import { z } from "zod";
import { AgentTypeSchema } from "./agentTypes.js";

export const CriticVerdictSchema = z.object({
  agentType: AgentTypeSchema, // which branch's draft this verdict is for
  accepted: z.boolean(),
  reason: z.string(),
  unmetRequirements: z.array(z.string()).default([]),
});
export type CriticVerdict = z.infer<typeof CriticVerdictSchema>;