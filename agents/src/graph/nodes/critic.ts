import type { GraphStateType } from "../state.js";
import type { CriticVerdict } from "@rcc/types";

export async function criticNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[critic] reviewing draft(s), attempt", state.attemptNumber);

  // Placeholder — always accepts for now, so the graph can run end-to-end
  const verdict: CriticVerdict = {
    accepted: true,
    reason: "placeholder — auto-accept until Critic agent is implemented",
    unmetRequirements: [],
  };

  return { criticVerdicts: [verdict] };
}