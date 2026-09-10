import type { GraphStateType } from "../state.js";

// Single place that decides the graph's terminal status, so every path to
// END goes through here instead of each node/edge setting it independently
// (which is how status ended up stuck at "pending" in the first place).
// Not reached by the critic_hitl_pause path -- that node sets its own
// distinct "awaiting_hitl_critic_reject" status and terminates directly.
export async function finalizeStatusNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  // Snippet branch: executor's result is the authority once it has run.
  if (state.executorResult) {
    return { status: state.executorResult.exitCode === 0 ? "success" : "graceful_failure" };
  }

  // Docs / error-check branch, or a snippet branch that never reached the
  // executor (e.g. attempt-3 exhausted before ever being accepted): fall
  // back to the same allAccepted check criticNode's own edge already uses.
  const currentAttemptDrafts = state.drafts.filter((d) => d.attemptNumber === state.attemptNumber);
  const currentVerdicts = state.criticVerdicts.slice(-currentAttemptDrafts.length);
  const allAccepted = currentVerdicts.length > 0 && currentVerdicts.every((v) => v.accepted);

  return { status: allAccepted ? "success" : "graceful_failure" };
}