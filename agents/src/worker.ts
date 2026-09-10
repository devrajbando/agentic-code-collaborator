import { startAgentWorker } from "./queue/agentWorker.js";
import { startSnippetAcceptanceWorker } from "./queue/snippetAcceptanceWorker.js";

const worker = startAgentWorker();
const snippetAcceptanceWorker = startSnippetAcceptanceWorker();

console.log("[agent-worker] listening for jobs...");
console.log("[snippet-acceptance-worker] listening for jobs...");

async function shutdown() {
  console.log("[agent-worker] shutting down...");
  await Promise.all([worker.close(), snippetAcceptanceWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);