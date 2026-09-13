import { SpecObjectSchema, type SpecObject } from "@rcc/types";
import { callWithFallback, buildFastChain } from "../../llm/fallback.js";
import { createGroqProvider } from "../../llm/providers/groq.js";
import { createGeminiProvider } from "../../llm/providers/gemini.js";
import { createOpenRouterProvider } from "../../llm/providers/openrouter.js";
import type { GraphStateType } from "../state.js";

type SpecAgentType = "doc_gen" | "error_check" | "snippet_gen";

// Adapters are stateless factories — safe to construct once per process (matches router.ts).
const fastChain = buildFastChain(
  createGroqProvider(),
  createGeminiProvider(),
  createOpenRouterProvider(),
);

// One system prompt per branch. Deliberately branch-specific rather than one generic
// "extract a spec" prompt, so each spec asks the question a real Critic would ask for
// that agent type. None of these prompts ever see routerOutput.reasoning or any draft —
// that is the entire point of this node.
const SYSTEM_PROMPTS: Record<SpecAgentType, string> = {
    doc_gen: `You are a verification-spec writer for a documentation-generation agent in a code editor's AI pipeline.
This codebase is TypeScript/JavaScript. Generated documentation should follow JSDoc conventions (@param, @returns, @throws, @example) — never require or reference Python-style docstring conventions (Google, NumPy, reST), since those do not apply to this language.
Given a single raw user event (an edit diff, inline comment, or chat command), write a short list of concrete, checkable requirements that any generated documentation/docstrings/comments must satisfy to genuinely address what the user asked for — not how you'd write the docs yourself, just what would make an independent reviewer say "yes, this addresses the request."
Only include a requirement about documenting exceptions/errors if the function's name, event description, or visible signature plausibly suggests it can throw or reject (e.g. parsing, validation, I/O, async operations that can fail) — do not invent this requirement for simple, clearly pure functions.
Respond with ONLY a raw JSON object, no markdown fences, no preamble, matching exactly:
{"requirements": string[], "confidence": number, "reasoning": string}`,

  error_check: `You are a verification-spec writer for an error/lint-checking agent in a code editor's AI pipeline.
Given a single raw user event (an edit diff, inline comment, or chat command), write a short list of concrete, checkable requirements an error-check pass must satisfy — e.g. specific symptoms, behaviors, or code regions the user is flagging — so an independent reviewer can verify the check actually addressed the reported problem, not just that some lint ran.
Respond with ONLY a raw JSON object, no markdown fences, no preamble, matching exactly:
{"requirements": string[], "confidence": number, "reasoning": string}`,

  snippet_gen: `You are a verification-spec writer for a code-snippet-generation agent in a code editor's AI pipeline.
Given a single raw user event (an edit diff, inline comment, or chat command), write a short list of concrete, checkable requirements the generated snippet must satisfy (expected behavior, inputs/outputs, edge cases, naming/signature constraints implied by the request) so an independent reviewer can verify the snippet actually does what was asked, without relying on the generator's own explanation of what it did.
Respond with ONLY a raw JSON object, no markdown fences, no preamble, matching exactly:
{"requirements": string[], "confidence": number, "reasoning": string}`,
};

function extractJson(raw: string): string {
  // Backstop in case a provider ignores the "no fences" instruction (matches router.ts).
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : raw).trim();
}

function fallbackSpec(agentType: SpecAgentType, reason: string): SpecObject {
  // Graceful failure per Section 3 recovery model: never blank-error the graph.
  // A single-requirement, confidence:0 spec still lets the Critic run (against a
  // minimal "addresses the user's request" bar) instead of blocking the branch entirely.
  return {
    agentType,
    requirements: ["Output must plausibly address the original user event."],
    derivedFrom: "userEvent",
    confidence: 0,
    reasoning: reason,
  };
}

async function extractOne(agentType: SpecAgentType, userEvent: string): Promise<SpecObject> {
  const { result } = await callWithFallback(fastChain, {
    systemPrompt: SYSTEM_PROMPTS[agentType],
    userPrompt: userEvent,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(result.content));
  } catch {
    return fallbackSpec(
      agentType,
      `Spec extractor LLM (${result.provider}) returned unparsable JSON for "${agentType}"; defaulted to minimal spec. Raw: ${result.content.slice(0, 200)}`,
    );
  }

  const validated = SpecObjectSchema.safeParse({
    ...(parsed as object),
    agentType,
    derivedFrom: "userEvent",
  });

  if (!validated.success) {
    return fallbackSpec(
      agentType,
      `Spec extractor LLM (${result.provider}) output failed schema validation for "${agentType}"; defaulted to minimal spec. Errors: ${validated.error.message.slice(0, 200)}`,
    );
  }

  return validated.data;
}

export async function specExtractorNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { routerOutput } = state;

  // routerOutput only gates WHICH branches get a spec — it never supplies the content
  // of any spec. Each spec's requirements come from a fresh LLM call over the raw
  // userEvent alone, so a router misclassification of *intent detail* (as opposed to
  // branch selection) can't leak into what the Critic later checks against.
  const activeBranches: SpecAgentType[] = [];
  if (routerOutput?.needsDocs) activeBranches.push("doc_gen");
  if (routerOutput?.needsErrorCheck) activeBranches.push("error_check");
  if (routerOutput?.needsSnippet) activeBranches.push("snippet_gen");

  if (activeBranches.length === 0) {
    // Router produced no active branch (e.g. still in a graceful-failure/default state
    // upstream) — nothing to extract specs for yet.
    return { specs: [] };
  }

  const specs = await Promise.all(
    activeBranches.map((agentType) => extractOne(agentType, state.userEvent)),
  );

  return { specs };
}