import { useId, useState, type FormEvent } from "react";

export type FileNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
};
export type Commit = {
  id: string;
  shortHash: string;
  message: string;
  authorInitials: string;
  authorName: string;
  relativeTime: string;
  fileTreeSnapshot?: FileNode[]; // <-- Add this
};
export default function VersionControlPanel({
  branches,
  activeBranch,
  onBranchChange,
  commits,
  hasPendingChanges,
  onCommit,
  onSelectCommit
}: {
  branches: string[];
  activeBranch: string;
  onBranchChange: (branch: string) => void;
  commits: Commit[];
  hasPendingChanges: boolean;
  onCommit: (message: string) => void;
  onSelectCommit?: (commit: Commit) => void;
}) {
  const branchId = useId();
  const [message, setMessage] = useState("");

  const handleCommit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    onCommit(trimmed);
    setMessage("");
  };

  return (
    <div className="flex h-full flex-col border-l border-hairline bg-canvas">
      <div className="border-b border-hairline p-4">
        <label htmlFor={branchId} className="mb-1.5 block text-xs font-medium text-mute">
          Branch
        </label>
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-glow-teal shadow-[0_0_6px_var(--color-glow-teal)]"
          />
          <select
            id={branchId}
            value={activeBranch}
            onChange={(e) => onBranchChange(e.target.value)}
            className="w-full rounded-sm border border-hairline bg-canvas-soft px-2 py-1.5 font-mono text-[13px] text-body-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
          >
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={handleCommit} className="border-b border-hairline p-4">
        <label htmlFor="commit-message" className="mb-1.5 block text-xs font-medium text-mute">
          Commit message
        </label>
        <textarea
          id="commit-message"
          name="commitMessage"
          rows={2}
          placeholder="Describe what changed…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mb-2 w-full resize-none rounded-sm border border-hairline bg-canvas-soft px-2.5 py-2 text-[13px] text-ink placeholder:text-mute focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
        />
        <button
          type="submit"
          disabled={!message.trim() || !hasPendingChanges}
          className="w-full rounded-sm bg-primary py-2 text-[13px] font-medium text-on-primary transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong disabled:opacity-40"
        >
          {hasPendingChanges ? "Commit changes" : "No changes to commit"}
        </button>
      </form>

      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="mb-3 text-xs font-medium text-mute">History</h3>
        <ol className="relative border-l border-hairline pl-4">
          {commits.map((commit) => (
            <li 
            key={commit.id} 
            onClick={() => onSelectCommit?.(commit)}
            className="relative mb-4 last:mb-0 cursor-pointer rounded p-1 transition-colors hover:bg-canvas-soft"
            title="Click to view this snapshot"
          >
            <span
              aria-hidden="true"
              className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border-2 border-canvas bg-hairline"
            />
            <p className="mb-1 text-[13px] leading-tight text-body-strong">{commit.message}</p>
            <p className="flex items-center gap-1.5 font-mono text-[11px] text-mute [font-variant-numeric:tabular-nums]">
              <span
                role="img"
                aria-label={commit.authorName}
                title={commit.authorName}
                className="flex h-4 w-4 items-center justify-center rounded-full bg-canvas-soft text-[8px] font-semibold text-body-strong"
              >
                {commit.authorInitials}
              </span>
              {commit.shortHash} &middot; {commit.relativeTime}
            </p>
          </li>
          ))}
        </ol>
      </div>
    </div>
  );
}