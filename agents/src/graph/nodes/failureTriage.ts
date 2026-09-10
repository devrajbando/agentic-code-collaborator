import { FailureTriageSchema, type FailureTriage } from "@rcc/types";
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

// Matches executor.ts's RUN_TIMEOUT_MS. A duration at/past this is almost
// certainly Piston's run_timeout killing the process, not a genuine runtime
// error -- but this is a heuristic, not a direct signal (see flag below).
const TIMEOUT_THRESHOLD_MS = 5000;

const SYSTEM_PROMPT = `You are the Failure Triage agent for a real-time collaborative code editor's AI pipeline.
A generated code snippet failed execution in a sandbox. Classify the failure and produce a SHORT, targeted diagnosis -- never the raw stack trace, never quote large blocks of stderr verbatim. Distill it into what actually went wrong and what to fix.
Respond with ONLY a raw JSON object, no markdown fences, no preamble, matching exactly this shape:
{"category": "runtime_error" | "assertion_mismatch" | "resource_limit", "diagnosis": string}
(Do not use "timeout" -- that case is handled separately, before you're called.)`;

export async function failureTriageNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const result = state.executorResult;

  if (!result) {
    return {
      failureTriage: { category: "runtime_error", diagnosis: "Failure triage reached with no executorResult to classify." },
    };
  }

  // Fast path: no LLM call needed, and Piston's own signal info isn't
  // available to check directly (see flag below).
  if (result.signal === "SIGKILL" || result.signal === "SIGTERM") {
    if (result.durationMs >= TIMEOUT_THRESHOLD_MS * 0.9) {
      return {
        failureTriage: {
          category: "timeout",
          diagnosis: `Execution was killed (${result.signal}) after ${result.durationMs}ms, at or near the ${TIMEOUT_THRESHOLD_MS}ms run timeout. Check for an infinite loop, unresolved promise, or blocking operation.`,
        },
      };
    }
    return {
      failureTriage: {
        category: "resource_limit",
        diagnosis: `Execution was killed (${result.signal}) after only ${result.durationMs}ms -- well under the ${TIMEOUT_THRESHOLD_MS}ms timeout, consistent with the sandbox's memory limit being exceeded rather than a hang.`,
      },
    };
  }

  const userPrompt = `Exit code: ${result.exitCode}\nDuration: ${result.durationMs}ms\n\nstdout:\n${result.stdout.slice(0, 1000)}\n\nstderr:\n${result.stderr.slice(0, 1000)}`;

  let triage: FailureTriage;
  try {
    const { result: llmResult } = await callWithFallback(qualityChain, { systemPrompt: SYSTEM_PROMPT, userPrompt });

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJson(llmResult.content));
    } catch {
      return {
        failureTriage: {
          category: "runtime_error",
          diagnosis: `Triage LLM (${llmResult.provider}) returned unparsable JSON; defaulting to runtime_error for exit code ${result.exitCode}.`,
        },
      };
    }

    const validated = FailureTriageSchema.safeParse(parsed);
    if (!validated.success) {
      return {
        failureTriage: {
          category: "runtime_error",
          diagnosis: `Triage LLM (${llmResult.provider}) output failed schema validation; defaulting to runtime_error. Errors: ${validated.error.message.slice(0, 150)}`,
        },
      };
    }
    triage = validated.data;
  } catch (err) {
    triage = {
      category: "runtime_error",
      diagnosis: `Failure triage LLM call failed: all quality-chain providers exhausted. ${err instanceof Error ? err.message.slice(0, 150) : String(err)}`,
    };
  }

  return { failureTriage: triage };
}