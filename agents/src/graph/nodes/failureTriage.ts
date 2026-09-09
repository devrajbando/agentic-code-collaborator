import type { GraphStateType } from "../state.js";

export async function failureTriageNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[failure_triage] classifying execution failure (placeholder)");

  return {
    failureTriage: {
      category: "runtime_error",
      diagnosis: "placeholder diagnosis",
    },
  };
}