import { Queue } from "bullmq";
import { createHash } from "crypto";
import { getRedisConnection } from "./connection.js";

export const AGENT_QUEUE_NAME = "agent-pipeline";

export const agentQueue = new Queue(AGENT_QUEUE_NAME, { connection: getRedisConnection() });

export interface AgentJobData {
  sessionId: string;
  userEvent: string;
  currentFileContent: string;
}

// Covers the FULL graph run (all internal attempts, all LLM calls, executor,
// triage combined) -- enforced by the worker via Promise.race, not BullMQ's
// own lock/stall settings, which govern something different (worker health).
export const JOB_WALL_CLOCK_BUDGET_MS = 60_000;

function buildIdempotencyKey(data: AgentJobData): string {
  // Deterministic hash of the meaningful content -- an identical resubmission
  // (double-click, client retry-on-network-error) gets the same jobId, so
  // BullMQ treats it as the same job instead of spawning a duplicate graph
  // run. sessionId is included so the same edit in two different sessions
  // still produces two distinct jobs.
  const hash = createHash("sha256")
    .update(`${data.sessionId}:${data.userEvent}:${data.currentFileContent}`)
    .digest("hex");
  return `agent:${hash}`;
}

export async function enqueueAgentJob(data: AgentJobData) {
  return agentQueue.add(AGENT_QUEUE_NAME, data, {
    jobId: buildIdempotencyKey(data),
    // Deliberately no BullMQ-level retry (attempts: 1). The graph's own
    // 3-attempt loop already handles recovery inside invoke() -- a
    // graceful_failure result is a valid, terminal, SUCCESSFUL job outcome,
    // not a signal to run the whole job again. A genuinely crashed job
    // (unhandled exception, DB down) is left to manual investigation rather
        // than an automatic retry, since re-running risks repeating side
    // effects (LLM calls, snippet execution) that already partially happened.
    attempts: 1,
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  });
}