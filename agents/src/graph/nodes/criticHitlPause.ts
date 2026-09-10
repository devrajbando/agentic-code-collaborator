import type { GraphStateType } from "../state.js";

// Attempt-3 HITL toggle (state.hitlEnabled.attempt3Rejection, default OFF):
// when the final attempt is rejected and this toggle is on, mark a distinct
// status instead of silently falling through to graceful failure. Mirrors
// the existing "awaiting_hitl_router" pattern -- and inherits the same
// limitation flagged for it: this only makes the status distinguishable.
// Actual pause/resume (halting execution and later resuming with a user
// decision) is not built -- that's real frontend/job-runner work
// (Roadmap item 13), not something a single node can do alone.
export async function criticHitlPauseNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  return { status: "awaiting_hitl_critic_reject" };
}