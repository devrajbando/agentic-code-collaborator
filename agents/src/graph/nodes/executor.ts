import type { GraphStateType } from "../state.js";
import type { ExecutorResult } from "@rcc/types";
import { jdoodleExecute } from "../../tools/jdoodleClient.js";

const LANGUAGE = process.env.JDOODLE_LANGUAGE ?? "typescript";
const VERSION_INDEX = process.env.JDOODLE_VERSION_INDEX ?? "1";

export async function executorNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const snippetDraft = state.drafts
    .filter((d) => d.agentType === "snippet_gen" && d.attemptNumber === state.attemptNumber)
    .at(-1); // most recent snippet_gen draft this attempt

  if (!snippetDraft) {
    // Shouldn't happen -- executor is only reached when critic accepted a
    // snippet_gen draft -- but fail gracefully rather than throwing.
    return {
      executorResult: { stdout: "", stderr: "executor reached with no snippet_gen draft for the current attempt", exitCode: 1, durationMs: 0, signal: null },
    };
  }

  const startedAt = Date.now();

  try {
    const response = await jdoodleExecute({
      language: LANGUAGE,
      versionIndex: VERSION_INDEX,
      script: snippetDraft.content,
    });

    // JDoodle has no separate compile-phase stderr and no signal field -- it
    // folds everything into `output`/`error`. isExecutionSuccess is the
    // clearest available signal for exitCode; fall back to statusCode !== 200
    // if that field is ever absent.
    const succeeded = response.isExecutionSuccess ?? response.statusCode === 200;

    const result: ExecutorResult = {
      stdout: succeeded ? response.output : "",
      stderr: succeeded ? "" : (response.error ?? response.output ?? "JDoodle execution failed"),
      exitCode: succeeded ? 0 : 1,
      durationMs: Date.now() - startedAt,
      signal: null, // JDoodle's contract has no equivalent to Piston's signal-killed distinction
    };

    return { executorResult: result };
  } catch (err) {
    return {
      executorResult: {
        stdout: "",
        stderr: `JDoodle execution failed: ${err instanceof Error ? err.message.slice(0, 300) : String(err)}`,
        exitCode: 1,
        durationMs: Date.now() - startedAt,
        signal: null,
      },
    };
  }
}