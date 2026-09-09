import type { GraphStateType } from "../state.js";
import type { GeneratorDraft } from "@rcc/types";

export async function snippetGenNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[snippet_gen] generating snippet, attempt", state.attemptNumber);

  const draft: GeneratorDraft = {
    agentType: "snippet_gen",
    content: "placeholder generated snippet",
    toolsUsed: [],
    attemptNumber: state.attemptNumber,
  };

  return { drafts: [draft] };
}