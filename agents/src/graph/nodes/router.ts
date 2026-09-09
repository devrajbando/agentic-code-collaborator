import { RouterOutputSchema, type RouterOutput } from "@rcc/types";
import { callWithFallback, buildFastChain } from "../../llm/fallback.js";
import { createGroqProvider } from "../../llm/providers/groq.js";
import { createGeminiProvider } from "../../llm/providers/gemini.js";
import { createOpenRouterProvider } from "../../llm/providers/openrouter.js";
import type { GraphStateType } from "../state.js";

const LOW_CONFIDENCE_THRESHOLD = 0.6;

const SYSTEM_PROMPT = `You are the intent router for a real-time collaborative code editor's AI pipeline.
Given a single user event (an edit diff, an inline comment, or an explicit chat command), classify which downstream agents are needed:
- needsDocs: true if the user wants documentation/docstrings/comments generated or updated.
- needsErrorCheck: true if the user wants errors, bugs, or lint issues checked/fixed.
- needsSnippet: true if the user wants a code snippet generated (new function, refactor, boilerplate, etc.).
Multiple can be true at once. Set confidence between 0 and 1 reflecting how sure you are. Give a one-sentence reasoning.

Respond with ONLY a raw JSON object, no markdown fences, no preamble, matching exactly this shape:
{"needsDocs": boolean, "needsErrorCheck": boolean, "needsSnippet": boolean, "confidence": number, "reasoning": string}`;

function extractJson(raw: string): string {
  // Backstop in case a provider ignores the "no fences" instruction
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : raw).trim();
}

// Adapters are stateless factories — safe to construct once per process
const fastChain = buildFastChain(
  createGroqProvider(),
  createGeminiProvider(),
  createOpenRouterProvider(),
);

function fallbackRouterOutput(reason: string): RouterOutput {
  // Graceful failure per Section 3 recovery model: never blank-error the graph,
  // default to the safest single branch (docs) with confidence 0 so it's visibly
  // distinguishable from a real low-confidence LLM answer.
  return {
    needsDocs: true,
    needsErrorCheck: false,
    needsSnippet: false,
    confidence: 0,
    reasoning: reason,
  };
}

export async function routerNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { result } = await callWithFallback(fastChain, {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: state.userEvent,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(result.content));
  } catch {
    return {
      routerOutput: fallbackRouterOutput(
        `Router LLM (${result.provider}) returned unparsable JSON; defaulted to docs. Raw: ${result.content.slice(0, 200)}`,
      ),
    };
  }

  const validated = RouterOutputSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      routerOutput: fallbackRouterOutput(
        `Router LLM (${result.provider}) output failed schema validation; defaulted to docs. Errors: ${validated.error.message.slice(0, 200)}`,
      ),
    };
  }

  const routerOutput = validated.data;

  // Controllable autonomy: low-confidence HITL toggle, default OFF (state.hitlEnabled.lowConfidence).
  if (routerOutput.confidence < LOW_CONFIDENCE_THRESHOLD && state.hitlEnabled.lowConfidence) {
    return { routerOutput, status: "awaiting_hitl_router" };
  }

  return { routerOutput };
}