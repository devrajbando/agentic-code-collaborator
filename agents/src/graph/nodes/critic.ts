// agents/src/graph/nodes/critic.ts
import { CriticVerdictSchema, type CriticVerdict } from "@rcc/types";
import { callWithFallback, buildQualityChain } from "../../llm/fallback.js";
import { createGroqProvider } from "../../llm/providers/groq.js";
import { createGeminiProvider } from "../../llm/providers/gemini.js";
import { createOpenRouterProvider } from "../../llm/providers/openrouter.js";
import type { GraphStateType } from "../state.js";

const qualityChain = buildQualityChain(
  createGeminiProvider(),
  createOpenRouterProvider(),
  createGroqProvider(),
);

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : raw).trim();
}

const SYSTEM_PROMPT = `You are the Critic for a real-time collaborative code editor's AI pipeline.
Check a generated draft against requirements extracted independently, before the draft existed. Do not be swayed by the draft's own framing of what it accomplished -- check strictly against the requirements list.
Respond with ONLY a raw JSON object, no markdown fences, no preamble, matching exactly this shape:
{"accepted": boolean, "reason": string, "unmetRequirements": string[]}
"unmetRequirements" must be the exact requirement strings from the list that are not satisfied -- empty array if all are met.`;

export async function criticNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const currentDrafts = state.drafts.filter((d) => d.attemptNumber === state.attemptNumber);

  if (currentDrafts.length === 0) {
    return { criticVerdicts: [] };
  }

  const verdicts: CriticVerdict[] = [];

  for (const draft of currentDrafts) {
    const spec = state.specs.find((s) => s.agentType === draft.agentType);
    const requirements = spec?.requirements ?? [];

    const userPrompt = `Requirements:\n${
      requirements.length ? requirements.map((r) => `- ${r}`).join("\n") : "(none extracted -- judge against the original user event directly)"
    }\n\nOriginal user event:\n${state.userEvent}\n\nDraft to check:\n${draft.content}`;

    let rawVerdict: unknown = null;
    let providerLabel = "unknown";

    try {
      const { result } = await callWithFallback(qualityChain, { systemPrompt: SYSTEM_PROMPT, userPrompt });
      providerLabel = result.provider;
      try {
        rawVerdict = JSON.parse(extractJson(result.content));
      } catch {
        rawVerdict = null;
      }
    } catch (err) {
      providerLabel = err instanceof Error ? err.message.slice(0, 100) : String(err);
      rawVerdict = null;
    }

    const validated = rawVerdict
      ? CriticVerdictSchema.safeParse({ agentType: draft.agentType, ...rawVerdict as object })
      : { success: false as const };

    if (validated.success) {
      verdicts.push(validated.data);
    } else {
      // Default-reject on any critic failure (unparsable JSON, schema mismatch,
      // or provider exhaustion): an unevaluated draft fails safe rather than
      // silently shipping as if verified -- see Section 6 for the tradeoff.
      verdicts.push({
        agentType: draft.agentType,
        accepted: false,
        reason: `Critic could not produce a valid verdict for ${draft.agentType} (provider: ${providerLabel}); defaulting to rejected.`,
        unmetRequirements: requirements,
      });
    }
  }

  return { criticVerdicts: verdicts };
}