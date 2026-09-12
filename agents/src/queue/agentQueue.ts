import { Queue } from "bullmq";
import { createHash } from "crypto";
import { getRedisConnection } from "./connection.js";
import { AGENT_QUEUE_NAME, AgentJobDataSchema, type AgentJobData } from "@rcc/types";

export const agentQueue = new Queue(AGENT_QUEUE_NAME, { connection: getRedisConnection() });

export const JOB_WALL_CLOCK_BUDGET_MS = 100_000;
// export const JOB_WALL_CLOCK_BUDGET_MS = 1000;

export function buildIdempotencyKey(data: AgentJobData): string {
  const bucket = Math.floor(Date.now() / 3000);
  const hash = createHash("sha256")
    .update(`${data.sessionId}:${data.userEvent}:${data.currentFileContent}:${bucket}`)
    .digest("hex");
  return `agent-${hash}`;
}

export async function enqueueAgentJob(data: AgentJobData) {
  const parsed = AgentJobDataSchema.parse(data);
  return agentQueue.add(AGENT_QUEUE_NAME, parsed, {
    jobId: buildIdempotencyKey(parsed),
    attempts: 1,
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  });
}