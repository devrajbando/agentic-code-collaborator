import { z } from "zod";

export const CriticVerdictSchema = z.object({
  accepted: z.boolean(),
  reason: z.string(), // required whether accepted or rejected — feeds attempt 2 context if rejected
  unmetRequirements: z.array(z.string()).default([]), // subset of SpecObject.checklist items not satisfied
});
export type CriticVerdict = z.infer<typeof CriticVerdictSchema>;