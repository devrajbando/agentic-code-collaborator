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

    // Critic decision. Verdicts now carry agentType (see critic.ts), so this
    // checks ALL of the current attempt's verdicts, not just the last one,
    // and retries only the specific branch(es) that were actually rejected --
    // replacing the old hardcoded-to-doc_gen placeholder.
    .addConditionalEdges("critic", (state: GraphStateType) => {
      const currentAttemptDrafts = state.drafts.filter((d) => d.attemptNumber === state.attemptNumber);
      // criticNode emits exactly one verdict per current-attempt draft, in the
      // same call that produced this state update, so the last N verdicts
      // (N = number of current-attempt drafts) are this attempt's verdicts.
      const currentVerdicts = state.criticVerdicts.slice(-currentAttemptDrafts.length);

      const allAccepted = currentVerdicts.length > 0 && currentVerdicts.every((v) => v.accepted);

      if (allAccepted) {
        // Only snippets need sandbox execution.
        const hasSnippetDraft = currentAttemptDrafts.some((d) => d.agentType === "snippet_gen");
        return hasSnippetDraft ? "executor" : END;
      }

      if (state.attemptNumber >= 3) {
        return END; // graceful failure -- handled by caller checking status
      }

      // Retry only the branch(es) whose verdict was rejected this attempt.
      const rejected = currentVerdicts.filter((v) => !v.accepted).map((v) => v.agentType);
      const retryTargets = rejected.filter((t) =>
        t === "error_check" || t === "doc_gen" || t === "snippet_gen",
      );
      return retryTargets.length > 0 ? retryTargets : ["doc_gen"];
    }, {
      executor: "executor",
      error_check: "error_check",
      doc_gen: "doc_gen",
      snippet_gen: "snippet_gen",
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

    // Retry always targets snippet_gen here -- not a placeholder like before,
    // confirmed correct: the executor only ever runs snippet_gen drafts (see
    // "Only snippets need sandbox execution" above), so a failed execution
    // can only ever have come from snippet_gen.
    .addConditionalEdges("failure_triage", (state: GraphStateType) => {
      if (state.attemptNumber >= 3) return END;
      return "snippet_gen";
    }, {
      [END]: END,
      snippet_gen: "snippet_gen",
    });

  return graph.compile();
}