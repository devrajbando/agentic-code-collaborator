import { GeneratorDraftSchema, type GeneratorDraft } from "@rcc/types";
import { callWithFallback, buildQualityChain } from "../../llm/fallback.js";
import { createGroqProvider } from "../../llm/providers/groq.js";
import { createGeminiProvider } from "../../llm/providers/gemini.js";
import { createOpenRouterProvider } from "../../llm/providers/openrouter.js";
import { retrieveSimilarSnippets } from "../../tools/snippetRetrieval.js";
import type { GraphStateType } from "../state.js";

const SYSTEM_PROMPT = `You are the Snippet-Gen agent for a real-time collaborative code editor's AI pipeline.
Respond with ONLY a raw JSON object, no markdown fences, no preamble, matching exactly this shape:
{"content": string}
"content" is the generated code snippet only -- no markdown fences, no prose, no explanation outside the code itself.
Ground the snippet strictly in the requirements given. Past accepted snippets are style/pattern references only -- never copy one if it doesn't fit the current requirements.`;

function extractJson(raw: string): string {
  // Backstop in case a provider ignores the "no fences" instruction
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : raw).trim();
}

// Quality chain per Section 3: correctness-sensitive, same order as errorCheck.ts
const qualityChain = buildQualityChain(
  createGeminiProvider(),
  createOpenRouterProvider(),
  createGroqProvider(),
);

export async function snippetGenNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { userEvent, attemptNumber, specs } = state;
  const snippetSpec = specs.find((s) => s.agentType === "snippet_gen");

  const retrieved = await retrieveSimilarSnippets(userEvent);
  const examplesBlock = retrieved.length
    ? retrieved
        .map((r, i) => `Example ${i + 1} (distance ${r.distance.toFixed(3)}):\n// ${r.description}\n${r.code}`)
        .join("\n\n")
    : "No sufficiently similar past-accepted snippets found -- generate from the requirements alone.";

  const requirementsBlock = snippetSpec?.requirements.length
    ? snippetSpec.requirements.map((r) => `- ${r}`).join("\n")
    : "(no explicit requirements extracted -- infer from the user event directly)";

  const userPrompt = `Requirements:\n${requirementsBlock}\n\nPast accepted snippets (reference only):\n${examplesBlock}\n\nUser event:\n${userEvent}`;

  let draft: GeneratorDraft;

  try {
    const { result } = await callWithFallback(qualityChain, {
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJson(result.content));
    } catch {
      draft = {
        agentType: "snippet_gen",
        content: `Snippet-Gen LLM (${result.provider}) returned unparsable JSON. Raw: ${result.content.slice(0, 200)}`,
        toolsUsed: retrieved.length ? ["pgvector-retrieval"] : [],
        attemptNumber,
      };
      const validated = GeneratorDraftSchema.safeParse(draft);
      return { drafts: [validated.success ? validated.data : draft] };
    }

    draft = {
      agentType: "snippet_gen",
      content: (parsed as { content?: unknown }).content as string,
      toolsUsed: [...(retrieved.length ? ["pgvector-retrieval"] : []), `llm:${result.provider}`],
      attemptNumber,
    };
  } catch (err) {
    // callWithFallback throws when every provider in the chain is exhausted
    draft = {
      agentType: "snippet_gen",
      content: `Snippet-Gen failed: all quality-chain providers exhausted. ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`,
      toolsUsed: retrieved.length ? ["pgvector-retrieval"] : [],
      attemptNumber,
    };
    const validated = GeneratorDraftSchema.safeParse(draft);
    return { drafts: [validated.success ? validated.data : draft] };
  }

  const validated = GeneratorDraftSchema.safeParse(draft);
  if (!validated.success) {
    return {
      drafts: [
        {
          agentType: "snippet_gen",
          content: `Snippet-Gen agent produced an invalid draft and could not complete this attempt. Validation errors: ${validated.error.message.slice(0, 200)}`,
          toolsUsed: [],
          attemptNumber,
        },
      ],
    };
  }

  return { drafts: [validated.data] };
}