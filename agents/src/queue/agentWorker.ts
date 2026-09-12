import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { getRedisConnection } from "./connection.js";
import { JOB_WALL_CLOCK_BUDGET_MS } from "./agentQueue.js";
import { AGENT_QUEUE_NAME, type AgentJobData } from "@rcc/types";
import { buildGraph } from "../graph/buildGraph.js";

// Dedicated publisher client for cross-process broadcasting
const publisher = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

class WallClockBudgetExceededError extends Error {
  constructor(ms: number) {
    super(`Job exceeded the ${ms}ms wall-clock budget`);
  }
}

function withWallClockBudget<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new WallClockBudgetExceededError(ms)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

export function startAgentWorker() {
  const graph = buildGraph();

  const worker = new Worker<AgentJobData>(
    AGENT_QUEUE_NAME,
    async (job: Job<AgentJobData>) => {
      const { sessionId, userEvent, currentFileContent } = job.data;
      // graceful_failure / awaiting_hitl_* are valid terminal graph outcomes,
      // not job failures -- returned normally so BullMQ marks this
      // "completed". Only a thrown error (timeout above, or a real crash
      // inside invoke()) surfaces as a BullMQ job failure.
      const result = await withWallClockBudget(
        graph.invoke(
          { sessionId, userEvent, currentFileContent },
          {
            runName: `agent-run-${job.id}`,
            metadata: { sessionId, jobId: job.id, attemptsMadeByBullMQ: job.attemptsMade },
            tags: ["agent-graph"],
          },
        ),
        JOB_WALL_CLOCK_BUDGET_MS,
      );

      // Publish the result through Redis pub/sub to the socket server
      try {
       await publisher.publish(
        "rcc:agent-results",
        JSON.stringify({ sessionId, jobId: job.id, result })
      );
        console.log(`[agent-worker] Published result for session/project: ${sessionId}`);
      } catch (pubErr) {
        console.error(`[agent-worker] Failed to publish agent result for job ${job.id}:`, pubErr);
      }

      return result;
    },
    { connection: getRedisConnection() },
  );

  worker.on("failed", (job, err) => {
    console.error(`[agent-worker] job ${job?.id} failed:`, err.message);
    if (!job) return;
    publisher.publish(
  "rcc:agent-results",
  JSON.stringify({
    sessionId: job.data.sessionId,
    jobId: job.id,
    result: {status: "worker_failed",
        routerOutput: null,
        drafts: [],
        criticVerdicts: [],
        executorResult: null,
        failureTriage: null,
        attemptNumber: 0,
        error: err.message, },
  }),
).then(() => {
  console.log(`[agent-worker] Published failure notice for job ${job.id}`);
}).catch((pubErr) => {
  console.error(`[agent-worker] Failed to publish failure notice for job ${job.id}:`, pubErr);
});
  });

  return worker;
}