// packages/types/schemas/spec.ts — sibling to packages/types/schemas/router.ts.
// Re-export from the package index the same way RouterOutputSchema/RouterOutput are.

import { z } from "zod";

export const SpecObjectSchema = z.object({
  // One SpecObject per active branch (docs / errorCheck / snippet) for this userEvent.
  agentType: z.enum(["docs", "errorCheck", "snippet"]),

  // Concrete, checkable requirements the eventual draft must satisfy — written by an
  // LLM call that only ever sees the raw userEvent, never the router's reasoning or
  // the generator's draft. This is what makes the later Critic check "independent":
  // it diffs the draft against something derived from the original request, not
  // against a second read of the same generation context.
  requirements: z.array(z.string()).min(1),

  // Always "userEvent" today — reserved so a future extractor variant (e.g. one that
  // also incorporates session memory) can't silently be mistaken for this one.
  derivedFrom: z.literal("userEvent"),

  // 0 reserved for the graceful-failure fallback path (mirrors RouterOutput's
  // confidence:0 convention), distinct from a genuine low-confidence LLM answer.
  confidence: z.number().min(0).max(1),

  reasoning: z.string(),
});

export type SpecObject = z.infer<typeof SpecObjectSchema>;