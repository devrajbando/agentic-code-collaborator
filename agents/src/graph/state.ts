import { Annotation } from "@langchain/langgraph";
import type {
  RouterOutput,
  SpecObject,
  GeneratorDraft,
  CriticVerdict,
  ExecutorResult,
  FailureTriage,
  LLMProvider,
} from "@rcc/types";

export const GraphState = Annotation.Root({
  // Input
  sessionId: Annotation<string>(),
  userEvent: Annotation<string>(), // raw edit diff / comment / chat command

  // Router
  routerOutput: Annotation<RouterOutput | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  // Independent spec (one per active branch)
  specs: Annotation<SpecObject[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),

  // Generator drafts, keyed implicitly by agentType inside each draft
  drafts: Annotation<GeneratorDraft[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  // Critic verdicts, one per draft per attempt
  criticVerdicts: Annotation<CriticVerdict[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  // Executor result (only for snippet branch)
  executorResult: Annotation<ExecutorResult | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  // Failure triage, if executor failed
  failureTriage: Annotation<FailureTriage | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  // Recovery tracking
  attemptNumber: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 1,
  }),
  currentProvider: Annotation<LLMProvider | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  // HITL toggles (default OFF per spec)
  hitlEnabled: Annotation<{ lowConfidence: boolean; attempt3Rejection: boolean }>({
    reducer: (_prev, next) => next,
    default: () => ({ lowConfidence: false, attempt3Rejection: false }),
  }),

  // Terminal state
    status: Annotation<"pending" | "success" | "graceful_failure" | "awaiting_hitl_router">({
    reducer: (_prev, next) => next,
    default: () => "pending",
  }),
  finalResult: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
});

export type GraphStateType = typeof GraphState.State;