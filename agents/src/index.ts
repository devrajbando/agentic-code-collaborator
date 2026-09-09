import { buildGraph } from "./graph/buildGraph.js";

async function main() {
  const graph = buildGraph();

  const result = await graph.invoke({
    sessionId: "test-session",
    userEvent: "Add a docstring to this function",
  });

  console.log("Final state:", JSON.stringify(result, null, 2));
}

main().catch(console.error);