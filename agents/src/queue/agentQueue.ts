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
export const JOB_WALL_CLOCK_BUDGET_MS = 60_000;

function buildIdempotencyKey(data: AgentJobData): string {
  const hash = createHash("sha256")
    .update(`${data.sessionId}:${data.userEvent}:${data.currentFileContent}`)
    .digest("hex");
  return `agent-${hash}`;
}

export async function enqueueAgentJob(data: AgentJobData) {
  return agentQueue.add(AGENT_QUEUE_NAME, data, {
    jobId: buildIdempotencyKey(data),
    attempts: 1,
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  });
}