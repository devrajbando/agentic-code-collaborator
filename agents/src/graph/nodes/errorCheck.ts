import type { GraphStateType } from "../state.js";
import type { GeneratorDraft } from "@rcc/types";

export async function errorCheckNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[error_check] checking for errors, attempt", state.attemptNumber);

  const draft: GeneratorDraft = {
    agentType: "error_check",
    content: "placeholder error-check result",
    toolsUsed: ["linter-placeholder"],
    attemptNumber: state.attemptNumber,
  };

  return { drafts: [draft] };
}