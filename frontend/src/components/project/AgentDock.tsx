import { useEffect, useMemo, useRef, useState } from "react";
import type { PipelineJob } from "../../hooks/useAgentPipeline";
import {
  AGENT_LABELS,
  CONTENT_AGENT_TYPES,
  latestByAgent,
  type AgentType,
  type GeneratorDraft,
} from "../../types/agent";
import { buildExecutionLog } from "../../types/agent";
import { AgentTerminal } from "./AgentTerminal";

function useElapsedSeconds(startedAt: number | null, active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active || !startedAt) return;
    setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);
  return elapsed;
}

function StatusDot({ tone }: { tone: "idle" | "live" | "success" | "warn" | "error" }) {
  const toneClass = {
    idle: "bg-mute",
    live: "bg-[var(--color-glow-teal)] motion-safe:animate-pulse",
    success: "bg-[var(--color-glow-teal)]",
    warn: "bg-amber-400",
    error: "bg-glow-coral",
  }[tone];
  return <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneClass}`} />;
}

function statusCopy(job: PipelineJob | null): { text: string; tone: "idle" | "live" | "success" | "warn" | "error" } {
  if (!job) return { text: "Ask the agent to add docs, catch bugs, or generate a snippet", tone: "idle" };
  switch (job.status) {
    case "queued":
      return { text: "Queuing…", tone: "live" };
    case "processing":
      return { text: "Working across the agent pipeline…", tone: "live" };
    case "success":
      return { text: "Done", tone: "success" };
    case "graceful_failure":
      return { text: "Finished with a partial result — couldn't fully verify", tone: "warn" };
    case "awaiting_hitl_router":
      return { text: "Paused — low routing confidence", tone: "warn" };
    case "awaiting_hitl_critic_reject":
      return { text: "Paused — a draft was rejected 3 times", tone: "warn" };
    case "transport_error":
      return { text: job.error ?? "Something went wrong sending that", tone: "error" };
    case "worker_failed":
      return { text: job.result?.error ? `Pipeline error — ${job.result.error}` : "Pipeline failed unexpectedly", tone: "error" };
    default:
      return { text: "Idle", tone: "idle" };
  }
}

function DraftCard({
  draft,
  verdict,
  executorResult,
  failureTriage,
  onDecision,
}: {
  draft: GeneratorDraft;
  verdict?: { accepted: boolean; reason: string };
  executorResult?: { stdout: string; stderr: string; exitCode: number } | null;
  failureTriage?: { classification: string; diagnosis: string } | null;
  onDecision: (accepted: boolean, description?: string) => void;
}) {
  const [decided, setDecided] = useState<"accepted" | "rejected" | null>(null);
  const [needsDescription, setNeedsDescription] = useState(false);
  const [description, setDescription] = useState("");
  const descriptionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (needsDescription) descriptionRef.current?.focus();
  }, [needsDescription]);

  const requiresDescription = draft.agentType === "snippet_gen";

  const handleAccept = () => {
    if (requiresDescription && !needsDescription) {
      setNeedsDescription(true);
      return;
    }
    if (requiresDescription && !description.trim()) return;
    onDecision(true, requiresDescription ? description.trim() : undefined);
    setDecided("accepted");
  };

  const handleReject = () => {
    onDecision(false);
    setDecided("rejected");
  };

  return (
    <div className="rounded-md border border-hairline bg-canvas-soft p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-mute">
          {AGENT_LABELS[draft.agentType]}
        </span>
        {verdict && (
          <span
            className={`text-[11px] ${verdict.accepted ? "text-[var(--color-glow-teal)]" : "text-mute"}`}
            title={verdict.reason}
          >
            {verdict.accepted ? "Verified" : "Unverified"}
          </span>
        )}
      </div>

      <pre className="mt-2 max-h-40 overflow-auto rounded-sm border border-hairline bg-canvas p-2.5 font-mono text-[12px] leading-[18px] text-body-strong whitespace-pre-wrap">
        {draft.content}
      </pre>

      {executorResult && (
        <div className="mt-2 rounded-sm border border-hairline bg-canvas p-2 font-mono text-[11px]">
          <div className={executorResult.exitCode === 0 ? "text-[var(--color-glow-teal)]" : "text-glow-coral"}>
            exit {executorResult.exitCode}
          </div>
          {executorResult.stdout && (
            <pre className="mt-1 whitespace-pre-wrap text-body-strong">{executorResult.stdout}</pre>
          )}
          {executorResult.stderr && (
            <pre className="mt-1 whitespace-pre-wrap text-glow-coral">{executorResult.stderr}</pre>
          )}
        </div>
      )}

      {failureTriage?.classification && (
        <p className="mt-2 text-[12px] text-mute">
          <span className="text-body-strong">{failureTriage.classification.replace("_", " ")}:</span>{" "}
          {failureTriage.diagnosis}
        </p>
      )}

      {decided ? (
        <p className="mt-2.5 text-[12px] text-mute">
          {decided === "accepted" ? "Applied to editor and remembered." : "Dismissed."}
        </p>
      ) : (
        <div className="mt-2.5 flex items-center gap-2">
          {needsDescription && (
            <input
              ref={descriptionRef}
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAccept()}
              placeholder="What's this snippet for? (used for future retrieval)"
              aria-label="Describe this snippet before accepting"
              className="min-w-0 flex-1 rounded-sm border border-hairline bg-canvas px-2 py-1 text-[12px] text-body-strong placeholder:text-mute focus:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
            />
          )}
          <button
            type="button"
            onClick={handleAccept}
            disabled={needsDescription && !description.trim()}
            className="shrink-0 rounded-sm bg-primary px-2.5 py-1 text-[12px] font-medium text-on-primary transition-transform duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
          >
            {needsDescription ? "Save & accept" : "Accept"}
          </button>
          {!needsDescription && (
            <button
              type="button"
              onClick={handleReject}
              className="shrink-0 rounded-sm border border-hairline px-2.5 py-1 text-[12px] text-mute transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
            >
              Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentDock({
 job,
  history,
  isBusy,
  onSend,
  onDismiss,
  onDraftDecision,
  activeFileName,
}: {
  job: PipelineJob | null;
  history: PipelineJob[];
  isBusy: boolean;
  onSend: (message: string) => void;
  onDismiss: () => void;
  onDraftDecision: (draft: GeneratorDraft, accepted: boolean, description?: string) => void;
  activeFileName?: string;
}) {
   const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"results" | "terminal">("results");
  const elapsed = useElapsedSeconds(job?.startedAt ?? null, isBusy);
  const { text: statusText, tone } = statusCopy(job);

  const executionLog = useMemo(
    () => buildExecutionLog(job ? [job, ...history] : history),
    [job, history]
  );


  const hasContentToShow = (job && (job.result || job.status === "transport_error")) || executionLog.length > 0;

  // Auto-expand the moment a result lands so it isn't missed under the fold.
  useEffect(() => {
    if (hasContentToShow) setExpanded(true);
  }, [job?.finishedAt]);

  const drafts = useMemo(
    () =>
      job?.result
        ? latestByAgent(job.result.drafts).filter((d) => CONTENT_AGENT_TYPES.includes(d.agentType))
        : [],
    [job?.result]
  );
  const verdicts = useMemo(() => (job?.result ? latestByAgent(job.result.criticVerdicts) : []), [job?.result]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isBusy) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex shrink-0 flex-col border-t border-hairline bg-canvas">
      {/* Expanded results — grows upward, never covers the editor */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: expanded && hasContentToShow ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
  <div
    className={`max-h-64 overflow-y-auto border-b border-hairline transition-opacity duration-200 motion-reduce:transition-none ${
      expanded && hasContentToShow ? "opacity-100" : "opacity-0"
    }`}
  >
    <div className="flex items-center gap-1 border-b border-hairline px-3 py-1.5">
      {(["results", "terminal"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTab(t)}
          className={`rounded-sm px-2 py-1 text-[11px] font-medium capitalize transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong ${
            tab === t ? "bg-canvas-soft text-ink" : "text-mute hover:text-body-strong"
          }`}
        >
          {t}
          {t === "terminal" && executionLog.length > 0 && (
            <span className="ml-1 text-[10px] text-mute">({executionLog.length})</span>
          )}
        </button>
      ))}
    </div>

    <div className="p-3">
      {tab === "terminal" ? (
        <div className="h-56">
          <AgentTerminal entries={executionLog} />
        </div>
      ) : job?.status === "transport_error" ? (
        <p className="text-[12px] text-glow-coral">{job.error}</p>
      ): job?.status === "worker_failed" ? (
  <p className="rounded-sm border border-hairline bg-canvas-soft p-2.5 text-[12px] text-glow-coral">
    The pipeline failed to complete{job.result?.error ? `: ${job.result.error}` : "."} No suggestions were generated for this request — try again.
  </p>
) 
      : (
        <div className="flex flex-col gap-2.5">
          
  {drafts.length === 0 && (
    <p className="text-[12px] text-mute">
      The pipeline finished but didn't route to a content-generating agent for this request.
    </p>
  )}
  {drafts.map((draft) => (
    <DraftCard
      key={draft.agentType}
      draft={draft}
      verdict={verdicts.find((v) => v.agentType === draft.agentType)}
      executorResult={draft.agentType === "snippet_gen" ? job?.result?.executorResult : null}
      failureTriage={draft.agentType === "snippet_gen" ? job?.result?.failureTriage : null}
      onDecision={(accepted, description) => onDraftDecision(draft, accepted, description)}
    />
  ))}
  {(job?.status === "awaiting_hitl_router" || job?.status === "awaiting_hitl_critic_reject") && (
    <p className="rounded-sm border border-hairline bg-canvas-soft p-2.5 text-[12px] text-mute">
      This pipeline run is paused waiting on a human decision — resuming it from here isn't wired up
      yet, so nothing further will happen automatically for this request.
    </p>
  )}
</div>
      )}
    </div>
  </div>
</div>
      </div>

      {/* Collapsed command bar — always visible */}
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div aria-live="polite" className="flex min-w-0 shrink-0 items-center gap-1.5 text-[12px] text-mute">
          <StatusDot tone={tone} />
          <span className="truncate max-w-40">{statusText}</span>
          {isBusy && <span className="font-mono tabular-nums text-mute">{elapsed}s</span>}
        </div>

        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isBusy}
            placeholder={`Ask about ${activeFileName ?? "this project"}…`}
            aria-label="Ask the agent pipeline"
            className="min-w-0 flex-1 rounded-sm border border-hairline bg-canvas-soft px-2.5 py-1.5 text-[13px] text-ink placeholder:text-mute focus:outline-none focus-visible:ring-2 focus-visible:ring-body-strong disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="shrink-0 rounded-sm bg-primary px-3 py-1.5 text-[13px] font-medium text-on-primary transition-transform duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
          >
            {isBusy ? "Working…" : "Send"}
          </button>
        </form>

        {hasContentToShow && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse agent results" : "Expand agent results"}
            className="shrink-0 rounded-sm p-1 text-mute transition-transform duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform duration-150 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}

        {job && !isBusy && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded-sm p-1 text-mute transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}