import type { GraphStateType } from "../state.js";

export async function routerNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[router] classifying:", state.userEvent);

  // Placeholder — real classification comes in roadmap item "Implement Router/Intent agent"
  return {
    routerOutput: {
      needsDocs: true,
      needsErrorCheck: false,
      needsSnippet: false,
      confidence: 0.9,
      reasoning: "placeholder — always routes to docs for now",
    },
  };
}