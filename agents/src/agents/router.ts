/**
 * Router / Intent Agent
 * ---------------------
 * Classifies an incoming collaboration event (edit diff / inline comment /
 * explicit chat command) into which downstream agents actually need to run:
 *   { needs_docs, needs_error_check, needs_snippet }
 *
 * Design notes:
 * - Uses the FAST LLM chain (already built) via callWithFallback, not the
 *   quality chain — this sits on the hot path of every event.
 * - Output is schema-validated with Zod so a malformed/partial LLM response
 *   never silently corrupts the graph's routing decision.
 * - Confidence score drives the low-confidence HITL toggle (default OFF):
 *   below the threshold, the router doesn't guess — it flags the event for
 *   a quick user confirm/correct instead of branching blindly.
 *
 * Matches the real `agents/src/llm/fallback.ts` + `types.ts`:
 * - `callWithFallback(chain, options)` returns `FallbackResult`
 *   (`{ result: LLMCallResult, providerName, attemptedProviders }`) —
 *   the actual text lives at `result.result.content`.
 * - `buildFastChain(groq, gemini, openrouter)` takes the three adapter
 *   instances and returns the ordered chain — it does NOT construct
 *   adapters itself, so the fast chain is passed into this module rather
 *   than built inside it (keeps this file adapter-instantiation-agnostic).
 * - `LLMCallOptions` uses `systemPrompt`/`userPrompt`, not a single `prompt`.
 *
 * ASSUMPTION still open: LangGraph node signature
 * `(state: GraphState) => Promise<Partial<GraphState>>` — swap `GraphState`
 * for whatever your actual shared graph state type is called.
 */

import { z } from "zod";
import { callWithFallback } from "../llm/fallback";
import type { LLMProviderAdapter } from "../llm/types";

// ---------- Types ----------

export interface RouterInput {
  /** Raw text of the event to classify. */
  eventText: string;
  /** "edit_diff" | "comment" | "chat_command" */
  eventType: "edit_diff" | "comment" | "chat_command";
  /** Optional surrounding code context, trimmed to a reasonable window. */
  contextSnippet?: string;
}

const RouterOutputSchema = z.object({
  needs_docs: z.boolean(),
  needs_error_check: z.boolean(),
  needs_snippet: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(280), // short — this is a fast/cheap classification, not an essay
});

export type RouterOutput = z.infer<typeof RouterOutputSchema>;

export interface RouterResult extends RouterOutput {
  /** True if confidence fell below threshold and the HITL toggle is on. */
  needsUserConfirmation: boolean;
}

// ---------- Config ----------

const LOW_CONFIDENCE_THRESHOLD = 0.55;

/** Off by default per the controllable-autonomy design requirement. */
export const ROUTER_HITL_ENABLED_DEFAULT = false;

// ---------- Prompt ----------

function buildRouterPrompt(input: RouterInput): string {
  return `You are the intent router for a real-time collaborative code editor's agent system.

Classify the event below into which downstream agents should run. Respond with ONLY a JSON object, no prose, no markdown fences:
{
  "needs_docs": boolean,        // does this event warrant generating/updating documentation?
  "needs_error_check": boolean, // does this event look like it could contain a bug/error worth checking?
  "needs_snippet": boolean,     // is the user asking for or would benefit from a code snippet/suggestion?
  "confidence": number,         // 0.0-1.0, your confidence in this classification as a whole
  "reasoning": string           // one short sentence, max ~30 words
}

Event type: ${input.eventType}

Event content:
"""
${input.eventText}
"""
${input.contextSnippet ? `\nSurrounding code context:\n"""\n${input.contextSnippet}\n"""` : ""}

Guidelines:
- A comment like "why is this failing" or a stack-trace-looking diff -> needs_error_check.
- A request like "explain this function" or a public API change with no docstring -> needs_docs.
- A comment like "give me a helper for X" or "how would I write..." -> needs_snippet.
- Multiple flags can be true at once. All three can be false for trivial/no-op events (e.g. whitespace-only diffs) — in that case set confidence high, since "nothing needed" is itself a confident classification.
- Lower confidence if the event is ambiguous, very short, or could plausibly mean several things.`;
}

// ---------- Core classification ----------

function parseRouterResponse(raw: string): RouterOutput {
  // Defensive: strip markdown fences in case the model ignores the instruction.
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Router: LLM response was not valid JSON: ${cleaned.slice(0, 200)}`);
  }

  const result = RouterOutputSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new Error(`Router: LLM response failed schema validation: ${result.error.message}`);
  }
  return result.data;
}

/**
 * Classifies an event using the given fast chain (build it once with
 * `buildFastChain(groq, gemini, openrouter)` at graph-construction time
 * and pass it in — this module doesn't instantiate adapters itself).
 *
 * Throws on empty/malformed LLM output rather than silently defaulting to
 * "run everything" or "run nothing" — callers (the graph node below)
 * decide what a throw means for recovery/attempt state. Note that
 * `callWithFallback` itself already throws if every provider in the chain
 * is exhausted or returns empty content, so this mainly guards against a
 * non-empty-but-malformed (non-JSON / schema-invalid) response.
 */
export async function classifyIntent(
  input: RouterInput,
  fastChain: LLMProviderAdapter[],
): Promise<RouterOutput> {
  const userPrompt = buildRouterPrompt(input);

  const { result } = await callWithFallback(fastChain, {
    userPrompt,
    timeoutMs: 4_000, // hot-path classification — keep this snappy
  });

  return parseRouterResponse(result.content);
}

/**
 * Wraps classification with the low-confidence HITL toggle.
 * `hitlEnabled` should be read from user/session settings — defaults OFF.
 */
export async function routeEvent(
  input: RouterInput,
  fastChain: LLMProviderAdapter[],
  hitlEnabled: boolean = ROUTER_HITL_ENABLED_DEFAULT,
): Promise<RouterResult> {
  const classification = await classifyIntent(input, fastChain);
  const needsUserConfirmation =
    hitlEnabled && classification.confidence < LOW_CONFIDENCE_THRESHOLD;

  return { ...classification, needsUserConfirmation };
}

// ---------- LangGraph node ----------
// Adjust `GraphState` to your actual shared graph state type/import.

export interface GraphState {
  event: RouterInput;
  /** Pre-built once at graph-construction time via buildFastChain(groq, gemini, openrouter). */
  fastChain: LLMProviderAdapter[];
  settings?: { routerHitlEnabled?: boolean };
  routerResult?: RouterResult;
  pendingUserConfirmation?: { type: "router_low_confidence"; result: RouterResult };
  // ...other fields owned by later nodes (spec, docs, errorCheck, snippet, critic, etc.)
}

export async function routerNode(state: GraphState): Promise<Partial<GraphState>> {
  const hitlEnabled = state.settings?.routerHitlEnabled ?? ROUTER_HITL_ENABLED_DEFAULT;
  const result = await routeEvent(state.event, state.fastChain, hitlEnabled);

  if (result.needsUserConfirmation) {
    // Surface to the user instead of branching silently. The graph should
    // pause here (conditional edge) until the user confirms/corrects.
    return {
      routerResult: result,
      pendingUserConfirmation: { type: "router_low_confidence", result },
    };
  }

  return { routerResult: result };
}

/**
 * Conditional-edge helper for LangGraph's `addConditionalEdges`.
 * Returns the names of the branches to take next based on the router's flags.
 * Wire this up as: graph.addConditionalEdges("router", routerBranchSelector, {...})
 */
export function routerBranchSelector(state: GraphState): string[] {
  if (state.pendingUserConfirmation) {
    return ["await_user_confirmation"];
  }

  const r = state.routerResult;
  if (!r) return ["await_user_confirmation"]; // defensive fallback, should not happen

  const branches: string[] = [];
  if (r.needs_docs) branches.push("doc_gen");
  if (r.needs_error_check) branches.push("error_check");
  if (r.needs_snippet) branches.push("snippet_gen");

  return branches.length > 0 ? branches : ["no_op"];
}