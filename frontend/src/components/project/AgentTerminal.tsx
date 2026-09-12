import { useEffect, useRef } from "react";
import type { ExecutionLogEntry } from "../../types/agent";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function AgentTerminal({ entries }: { entries: ExecutionLogEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-[12px] text-mute">
        No sandbox runs yet — accept or trigger a snippet suggestion to see output here.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3 font-mono text-[12px] leading-[18px]">
      {entries.map((entry) => {
        const { executorResult, failureTriage } = entry;
        const ok = executorResult.exitCode === 0;
        return (
          <div key={entry.id} className="mb-3">
            <div className="text-mute">
              <span className="text-[var(--color-glow-teal)]">❯</span> {entry.prompt}
              <span className="ml-2 text-[10px]">{formatTime(entry.finishedAt)}</span>
            </div>
            {executorResult.stdout && (
              <pre className="whitespace-pre-wrap text-body-strong">{executorResult.stdout}</pre>
            )}
            {executorResult.stderr && (
              <pre className="whitespace-pre-wrap text-glow-coral">{executorResult.stderr}</pre>
            )}
            {failureTriage?.classification && (
              <p className="mt-0.5 text-mute">
                <span className="text-body-strong">{failureTriage.classification.replace("_", " ")}:</span>{" "}
                {failureTriage.diagnosis}
              </p>
            )}
            <div className={ok ? "text-[var(--color-glow-teal)]" : "text-glow-coral"}>
              exit {executorResult.exitCode} · {executorResult.durationMs}ms
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} className="flex items-center text-mute">
        <span className="text-[var(--color-glow-teal)]">❯</span>
        <span className="ml-1 h-3.5 w-1.5 bg-mute motion-safe:animate-pulse motion-reduce:opacity-60" />
      </div>
    </div>
  );
}