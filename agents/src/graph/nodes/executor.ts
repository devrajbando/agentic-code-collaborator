import type { GraphStateType } from "../state.js";
import type { ExecutorResult } from "@rcc/types";
import { pistonExecute } from "../../tools/pistonClient.js";

const LANGUAGE = process.env.PISTON_LANGUAGE ?? "typescript";
const VERSION = process.env.PISTON_VERSION ?? "5.0.3";
const RUN_TIMEOUT_MS = 2900;
const COMPILE_TIMEOUT_MS = 2900;

export async function executorNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const snippetDraft = state.drafts
    .filter((d) => d.agentType === "snippet_gen" && d.attemptNumber === state.attemptNumber)
    .at(-1); // most recent snippet_gen draft this attempt

  if (!snippetDraft) {
    // Shouldn't happen -- executor is only reached when critic accepted a
    // snippet_gen draft -- but fail gracefully rather than throwing.
    return {
      executorResult: { stdout: "", stderr: "executor reached with no snippet_gen draft for the current attempt", exitCode: 1, durationMs: 0,signal:null },
    };
  }

  const startedAt = Date.now();

  try {
    const response = await pistonExecute({
      language: LANGUAGE,
      version: VERSION,
      files: [{ name: "snippet.ts", content: snippetDraft.content }],
      run_timeout: RUN_TIMEOUT_MS,
      compile_timeout: COMPILE_TIMEOUT_MS,
    });

    const result: ExecutorResult = {
      stdout: response.run.stdout,
      stderr: response.compile?.stderr ? `${response.compile.stderr}\n${response.run.stderr}` : response.run.stderr,
      exitCode: response.run.code ?? (response.run.signal ? 1 : 0), // signal-killed (e.g. timeout) with no code -> treat as failure
      durationMs: Date.now() - startedAt,
      signal: response.run.signal,
    };

    return { executorResult: result };
  } catch (err) {
    return {
      executorResult: {
        stdout: "",
        stderr: `Piston execution failed: ${err instanceof Error ? err.message.slice(0, 300) : String(err)}`,
        exitCode: 1,
        durationMs: Date.now() - startedAt,
        signal:null
      },
    };
  }
}