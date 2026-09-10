import { startAgentWorker } from "./queue/agentWorker.js";

const worker = startAgentWorker();

console.log("[agent-worker] listening for jobs...");

async function shutdown() {
  console.log("[agent-worker] shutting down...");
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);