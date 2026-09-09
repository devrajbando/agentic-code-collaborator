import { z } from "zod";
import { AgentTypeSchema } from "./agentTypes.js";

export const SpecObjectSchema = z.object({
  agentType: AgentTypeSchema,
  requirements: z.array(z.string()).min(1),
  derivedFrom: z.literal("userEvent"),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});
export type SpecObject = z.infer<typeof SpecObjectSchema>;