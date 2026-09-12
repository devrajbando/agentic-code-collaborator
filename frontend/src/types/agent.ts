// Mirrors agents/src/graph/state.ts + packages/types/schemas/*.
// NOT verified against the real Zod schemas (frontend can't import the
// backend workspace package directly) — inferred from prompt.md's prose
// descriptions, same caveat AgentChatPanel's file header already flagged
// for GeneratorDraftSchema. Single-point-of-fix if the real shapes differ.

export type AgentType =
  | "router"
  | "spec_extractor"
  | "doc_gen"
  | "error_check"
  | "snippet_gen"
  | "critic"
  | "executor"
  | "failure_triage";

export interface RouterOutput {
  needsDocs: boolean;
  needsErrorCheck: boolean;
  needsSnippet: boolean;
  confidence: number;
  reasoning: string;
}

export interface GeneratorDraft {
  agentType: AgentType;
  content: string;
  toolsUsed: string[];
  attemptNumber: number;
}

export interface CriticVerdict {
  agentType: AgentType;
  attemptNumber?: number;
  accepted: boolean;
  reason: string;
}

export interface ExecutorResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  signal: string | null;
}

export interface FailureTriage {
  classification: "timeout" | "resource_limit" | "runtime_error" | "assertion_mismatch";
  diagnosis: string;
}

export type PipelineStatus =
  | "pending"
  | "success"
  | "graceful_failure"
  | "awaiting_hitl_router"
  | "awaiting_hitl_critic_reject"
  | "worker_failed";

export interface AgentResultPayload {
    jobId: string;
  sessionId: string;
  status: PipelineStatus;
  routerOutput: RouterOutput | null;
  drafts: GeneratorDraft[];
  criticVerdicts: CriticVerdict[];
  executorResult: ExecutorResult | null;
  failureTriage: FailureTriage | null;
  attemptNumber: number;
  error?: string;
}

// Only the content-producing agents ever need a card in the UI.
export const CONTENT_AGENT_TYPES: AgentType[] = ["doc_gen", "error_check", "snippet_gen"];

export const AGENT_LABELS: Record<AgentType, string> = {
  router: "Router",
  spec_extractor: "Spec Extractor",
  doc_gen: "Documentation",
  error_check: "Error Check",
  snippet_gen: "Snippet",
  critic: "Critic",
  executor: "Sandbox Executor",
  failure_triage: "Failure Triage",
};

/** Keeps only each agent's most recent attempt, since `drafts`/`criticVerdicts`
 *  accumulate full retry history (appending reducers in state.ts). */
export function latestByAgent<T extends { agentType: AgentType; attemptNumber?: number }>(
  items: T[]
): T[] {
  const byAgent = new Map<AgentType, T>();
  for (const item of items) {
    const existing = byAgent.get(item.agentType);
    if (!existing || (item.attemptNumber ?? 0) >= (existing.attemptNumber ?? 0)) {
      byAgent.set(item.agentType, item);
    }
  }
  return [...byAgent.values()];
}

// ...append to the existing file...

export interface ExecutionLogEntry {
  id: string;
  prompt: string;
  finishedAt: number;
  executorResult: ExecutorResult;
  failureTriage: FailureTriage | null;
}

export function buildExecutionLog(
  jobs: { id: string | null; prompt: string; finishedAt: number | null; result: AgentResultPayload | null }[]
): ExecutionLogEntry[] {
  return jobs
    .filter((j): j is typeof j & { finishedAt: number; result: AgentResultPayload } =>
      Boolean(j.finishedAt && j.result?.executorResult)
    )
    .map((j) => ({
      id: j.id ?? String(j.finishedAt),
      prompt: j.prompt,
      finishedAt: j.finishedAt,
      executorResult: j.result.executorResult!,
      failureTriage: j.result.failureTriage,
    }))
    .sort((a, b) => a.finishedAt - b.finishedAt);
}