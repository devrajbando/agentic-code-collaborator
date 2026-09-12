import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { createHash } from "crypto";
import { AGENT_QUEUE_NAME, AgentJobDataSchema, type AgentJobData } from "@rcc/types";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: REDIS_URL.startsWith("rediss://") ? {} : undefined,
  enableReadyCheck: false,
  family: 0, // let Node pick, avoids forcing IPv6 when only IPv4 route is healthy
});
// const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

const agentQueue = new Queue(AGENT_QUEUE_NAME, { connection });

function buildIdempotencyKey(data: AgentJobData): string {
  const hash = createHash("sha256")
    .update(`${data.sessionId}:${data.userEvent}:${data.currentFileContent}`)
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