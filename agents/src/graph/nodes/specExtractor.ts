import type { GraphStateType } from "../state.js";
import type { SpecObject } from "@rcc/types";

export async function specExtractorNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[spec_extractor] deriving checklist from original request");

  const specs: SpecObject[] = [];
  if (state.routerOutput?.needsDocs) {
    specs.push({
      branch: "doc_gen",
      checklist: [{ requirement: "placeholder requirement", category: "completeness" }],
    });
  }
  // TODO: same pattern for error_check / snippet_gen branches once routed

  return { specs };
}