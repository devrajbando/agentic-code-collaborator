import { z } from "zod";

export const SpecItemSchema = z.object({
  requirement: z.string(), // e.g. "must handle null input"
  category: z.enum(["correctness", "completeness", "style", "safety"]),
});

export const SpecObjectSchema = z.object({
  branch: z.enum(["doc_gen", "error_check", "snippet_gen"]),
  checklist: z.array(SpecItemSchema).min(1),
});
export type SpecObject = z.infer<typeof SpecObjectSchema>;