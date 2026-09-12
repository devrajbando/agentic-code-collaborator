import { useState } from "react";
import { type Commit } from "./VersionControlPanel";
import { type FileNode } from "./FileTree";

type SnapshotFile = {
  id: string;
  name: string;
  content: string;
};

type DiffLine = {
  type: "added" | "removed" | "unchanged";
  content: string;
};

// Helper to map file path -> content
const getFileMap = (nodes: FileNode[]): Map<string, string> => {
  const map = new Map<string, string>();
  const traverse = (ns: FileNode[]) => {
    for (const node of ns) {
      if (node.type === "file") {
        map.set(node.id, node.content ?? "");
      } else if (node.children) {
        traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return map;
};

// Lightweight line-by-line diff generator
const generateDiff = (oldText: string, newText: string): DiffLine[] => {
  const oldLines = oldText ? oldText.split("\n") : [];
  const newLines = newText ? newText.split("\n") : [];
  const diff: DiffLine[] = [];

  // Simple and clean line comparison mapping
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  // If it's a completely new file
  if (oldLines.length === 0) {
    return newLines.map((l) => ({ type: "added", content: l }));
  }

  let o = 0;
  let n = 0;

  while (o < oldLines.length || n < newLines.length) {
    const oldLine = oldLines[o];
    const newLine = newLines[n];

    if (oldLine === newLine) {
      diff.push({ type: "unchanged", content: oldLine });
      o++;
      n++;
    } else {
      // Check if old line exists later in new lines (it was removed/shifted)
      if (oldLine !== undefined && !newSet.has(oldLine)) {
        diff.push({ type: "removed", content: oldLine });
        o++;
      } 
      // Check if new line exists later in old lines (it was added)
      else if (newLine !== undefined && !oldSet.has(newLine)) {
        diff.push({ type: "added", content: newLine });
        n++;
      } 
      // Fallback for modified lines
      else {
        if (oldLine !== undefined) {
          diff.push({ type: "removed", content: oldLine });
          o++;
        }
        if (newLine !== undefined) {
          diff.push({ type: "added", content: newLine });
          n++;
        }
      }
    }
  }

  return diff;
};

export default function CommitDetailModal({
  commit,
  commits,
  onClose,
}: {
  commit: Commit;
  commits: Commit[];
  onClose: () => void;
}) {
  const currentIndex = commits.findIndex((c) => c.id === commit.id);
  const parentCommit = currentIndex !== -1 ? commits[currentIndex + 1] : undefined;

  const parentFileMap = parentCommit?.fileTreeSnapshot 
    ? getFileMap(parentCommit.fileTreeSnapshot) 
    : new Map<string, string>();

  const extractChangedFiles = (nodes: FileNode[]): (SnapshotFile & { diff: DiffLine[] })[] => {
    let files: (SnapshotFile & { diff: DiffLine[] })[] = [];
    for (const node of nodes) {
      if (node.type === "file") {
        const content = node.content ?? "";
        const parentContent = parentFileMap.get(node.id);

        if (parentContent === undefined || parentContent !== content) {
          const diff = generateDiff(parentContent ?? "", content);
          files.push({
            id: node.id,
            name: node.name,
            content: content,
            diff: diff,
          });
        }
      } else if (node.children) {
        files = [...files, ...extractChangedFiles(node.children)];
      }
    }
    return files;
  };

  const commitFiles = commit.fileTreeSnapshot ? extractChangedFiles(commit.fileTreeSnapshot) : [];
  const [selectedFile, setSelectedFile] = useState<(SnapshotFile & { diff: DiffLine[] }) | null>(null);
  
  const activeFile = selectedFile || commitFiles[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-6">
      <div className="flex h-[80vh] w-[90vw] max-w-5xl flex-col rounded-md border border-hairline bg-canvas shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4 bg-canvas-soft">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-canvas px-2 py-0.5 font-mono text-xs text-mute border border-hairline">
                {commit.shortHash}
              </span>
              <h2 className="text-base font-semibold text-body-strong">{commit.message}</h2>
            </div>
            <p className="text-xs text-mute mt-1">
              Authored by <span className="text-ink font-medium">{commit.authorName}</span> &middot; {commit.relativeTime}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-hairline bg-canvas px-3 py-1.5 text-xs text-mute hover:bg-canvas-soft hover:text-ink transition-colors"
          >
            Close ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid flex-1 grid-cols-[320px_1fr] min-h-0">
          {/* File Explorer sidebar */}
          <div className="border-r border-hairline bg-canvas p-4 overflow-y-auto">
            <h3 className="mb-3 text-[11px] font-semibold text-mute uppercase tracking-wider">
              Changed Files ({commitFiles.length})
            </h3>
            {commitFiles.length === 0 ? (
              <p className="text-xs text-mute italic">No file changes found in this commit snapshot.</p>
            ) : (
              <ul className="space-y-1">
                {commitFiles.map((file) => (
                  <li key={file.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(file)}
                      className={`w-full rounded-sm px-2.5 py-1.5 text-left text-xs font-mono transition-colors truncate ${
                        activeFile?.id === file.id
                          ? "bg-canvas-soft text-ink font-medium"
                          : "text-mute hover:bg-canvas-soft hover:text-body-strong"
                      }`}
                      title={file.id}
                    >
                      {file.id}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Code Diff Viewer Panel */}
          <div className="flex flex-col min-h-0 bg-canvas-soft/30">
            <div className="border-b border-hairline px-4 py-2 font-mono text-xs text-mute bg-canvas flex items-center justify-between">
              <span>Viewing file route: <strong className="text-ink">{activeFile?.id || "None"}</strong></span>
            </div>
            <div className="flex-1 overflow-auto bg-canvas font-mono text-xs">
              {activeFile && activeFile.diff ? (
                <div className="py-2">
                  {activeFile.diff.map((line, idx) => {
                    let bgClass = "bg-transparent text-ink";
                    let prefix = " ";
                    if (line.type === "added") {
                      bgClass = "bg-emerald-500/15 text-emerald-300";
                      prefix = "+";
                    } else if (line.type === "removed") {
                      bgClass = "bg-rose-500/15 text-rose-300";
                      prefix = "-";
                    }

                    return (
                      <div key={idx} className={`flex px-4 py-0.5 leading-relaxed ${bgClass}`}>
                        <span className="w-6 select-none text-mute text-right pr-3">{prefix}</span>
                        <span className="whitespace-pre flex-1">{line.content || " "}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-mute italic">Select a file to inspect its diff.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}