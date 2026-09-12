import http from "http";
import { startAgentWorker } from "./queue/agentWorker.js";
import { startSnippetAcceptanceWorker } from "./queue/snippetAcceptanceWorker.js";

const worker = startAgentWorker();
const snippetAcceptanceWorker = startSnippetAcceptanceWorker();

console.log("[agent-worker] listening for jobs...");
console.log("[snippet-acceptance-worker] listening for jobs...");

// Minimal HTTP server so Render's free-tier Web Service health check passes.
// The real work happens in the BullMQ workers above; this just keeps the
// service classified as "alive" by Render.
const PORT = process.env.PORT ?? 10000;
const healthServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok" }));
});
healthServer.listen(PORT, () => {
  console.log(`[health-server] listening on port ${PORT}`);
});

async function shutdown() {
  console.log("[agent-worker] shutting down...");
  await Promise.all([worker.close(), snippetAcceptanceWorker.close()]);
  healthServer.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);