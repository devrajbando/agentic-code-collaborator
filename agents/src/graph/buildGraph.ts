import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState, GraphStateType } from "./state.js";
import { routerNode } from "./nodes/router.js";
import { specExtractorNode } from "./nodes/specExtractor.js";
import { errorCheckNode } from "./nodes/errorCheck.js";
import { docGenNode } from "./nodes/docGen.js";
import { snippetGenNode } from "./nodes/snippetGen.js";
import { criticNode } from "./nodes/critic.js";
import { executorNode } from "./nodes/executor.js";
import { failureTriageNode } from "./nodes/failureTriage.js";

export function buildGraph() {
  const graph = new StateGraph(GraphState)
    .addNode("router", routerNode)
    .addNode("spec_extractor", specExtractorNode)
    .addNode("error_check", errorCheckNode)
    .addNode("doc_gen", docGenNode)
    .addNode("snippet_gen", snippetGenNode)
    .addNode("critic", criticNode)
    .addNode("executor", executorNode)
    .addNode("failure_triage", failureTriageNode)

    .addEdge(START, "router")
    .addEdge("router", "spec_extractor")

    // Fan out to whichever branches the router selected.
    // Placeholder: always goes to doc_gen for now, since routerNode is a stub.
    .addConditionalEdges("spec_extractor", (state: GraphStateType) => {
      const branches: string[] = [];
      if (state.routerOutput?.needsErrorCheck) branches.push("error_check");
      if (state.routerOutput?.needsDocs) branches.push("doc_gen");
      if (state.routerOutput?.needsSnippet) branches.push("snippet_gen");
      return branches.length > 0 ? branches : ["doc_gen"];
    })

    .addEdge("error_check", "critic")
    .addEdge("doc_gen", "critic")
    .addEdge("snippet_gen", "critic")

    // Critic decision: accept -> continue; reject -> retry (max 3 attempts) or graceful failure
    .addConditionalEdges("critic", (state: GraphStateType) => {
      const latestVerdict = state.criticVerdicts[state.criticVerdicts.length - 1];
      if (latestVerdict?.accepted) {
        // Only snippets need sandbox execution
        const hasSnippetDraft = state.drafts.some((d) => d.agentType === "snippet_gen");
        return hasSnippetDraft ? "executor" : END;
      }
      if (state.attemptNumber >= 3) {
        return END; // graceful failure — handled by caller checking status
      }
      // Retry: route back to whichever branch produced the rejected draft
      // Placeholder routing — real logic keys off which branch's spec was unmet
      return "doc_gen";
    }, {
      executor: "executor",
      doc_gen: "doc_gen",
      [END]: END,
    })

    .addConditionalEdges("executor", (state: GraphStateType) => {
      const result = state.executorResult;
      if (result && result.exitCode === 0) return END;
      return "failure_triage";
    }, {
      [END]: END,
      failure_triage: "failure_triage",
    })

    .addConditionalEdges("failure_triage", (state: GraphStateType) => {
      if (state.attemptNumber >= 3) return END;
      return "snippet_gen"; // retry with triage diagnosis attached
    }, {
      [END]: END,
      snippet_gen: "snippet_gen",
    });

  return graph.compile();
}