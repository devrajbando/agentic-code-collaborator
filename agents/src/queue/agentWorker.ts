import { Worker, Job } from "bullmq";
import { getRedisConnection } from "./connection.js";
import { AGENT_QUEUE_NAME, AgentJobData, JOB_WALL_CLOCK_BUDGET_MS } from "./agentQueue.js";
import { buildGraph } from "../graph/buildGraph.js";

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
      return withWallClockBudget(
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
    },
    { connection: getRedisConnection() },
  );

  worker.on("failed", (job, err) => {
    console.error(`[agent-worker] job ${job?.id} failed:`, err.message);
  });

  return worker;
}