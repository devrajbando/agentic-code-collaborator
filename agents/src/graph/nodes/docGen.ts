import type { GraphStateType } from "../state.js";
import type { GeneratorDraft } from "@rcc/types";

export async function docGenNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[doc_gen] generating documentation draft, attempt", state.attemptNumber);

  const draft: GeneratorDraft = {
    agentType: "doc_gen",
    content: "placeholder generated documentation",
    toolsUsed: [],
    attemptNumber: state.attemptNumber,
  };

  return { drafts: [draft] };
}