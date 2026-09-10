// agents/src/testEnqueue.ts
import { enqueueAgentJob } from "./queue/agentQueue.js";

async function main() {
  const job = await enqueueAgentJob({
    sessionId: "test-session",
    userEvent: "Add a docstring to this function",
    currentFileContent: "function add(a, b) {\n  return a + b;\n}\n",
  });

  console.log("Enqueued job:", job.id);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});