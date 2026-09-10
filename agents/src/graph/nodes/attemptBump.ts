import type { GraphStateType } from "../state.js";

// Pure state increment. Kept as its own node because conditional edge
// functions cannot update state themselves -- only nodes can. Registered
// twice in buildGraph.ts under different node names (attempt_bump for the
// critic-retry path, attempt_bump_snippet for the failure-triage retry
// path) since each needs a different destination after bumping.
export async function attemptBumpNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  return { attemptNumber: state.attemptNumber + 1 };
}