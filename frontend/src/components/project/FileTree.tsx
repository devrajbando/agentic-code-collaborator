import { useState, type KeyboardEvent } from "react";

export type FileNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  content?: string; // <-- Add this to hold file content in snapshots
};

const extensionBadge: Record<string, string> = {
  ts: "TS",
  tsx: "TX",
  json: "JS",
  md: "MD",
  css: "CS",
};

function getBadge(name: string) {
  const ext = name.split(".").pop() ?? "";
  return extensionBadge[ext] ?? "•";
}

function FileTreeNode({
  node,
  depth,
  activeFileId,
  expandedIds,
  onToggle,
  onSelectFile,
  onAddNode,
  onRenameNode,
  onDeleteNode,
}: {
  node: FileNode;
  depth: number;
  activeFileId: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectFile: (id: string) => void;
  onAddNode: (parentId: string, type: "file" | "folder", name: string) => void;
  onRenameNode: (id: string, newName: string) => void;
  onDeleteNode: (id: string) => void;
}) {
  const isFolder = node.type === "folder";
  const isExpanded = expandedIds.has(node.id);
  const isActive = node.id === activeFileId;

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [addingType, setAddingType] = useState<"file" | "folder" | null>(null);
  const [newNameValue, setNewNameValue] = useState("");

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== node.name) {
      onRenameNode(node.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleAddSubmit = () => {
    if (newNameValue.trim() && addingType) {
      onAddNode(node.id, addingType, newNameValue.trim());
      setNewNameValue("");
      setAddingType(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, action: "rename" | "add") => {
    if (e.key === "Enter") {
      action === "rename" ? handleRenameSubmit() : handleAddSubmit();
    } else if (e.key === "Escape") {
      if (action === "rename") {
        setRenameValue(node.name);
        setIsRenaming(false);
      } else {
        setAddingType(null);
        setNewNameValue("");
      }
    }
  };

  return (
    <li>
      <div
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        className={`group relative flex w-full items-center gap-2 rounded-sm pr-2 text-left text-[13px] transition-colors duration-150 ${
          isActive ? "bg-canvas-soft text-ink" : "text-body hover:bg-canvas-soft hover:text-body-strong"
        }`}
      >
        <button
          type="button"
          onClick={() => (isFolder ? onToggle(node.id) : onSelectFile(node.id))}
          aria-expanded={isFolder ? isExpanded : undefined}
          className="flex flex-1 items-center gap-2 py-1.5 focus-visible:outline-none min-w-0"
        >
          {isFolder ? (
            <span aria-hidden="true" className="w-3 shrink-0 font-mono text-mute">
              {isExpanded ? "▾" : "▸"}
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="flex h-4 w-6 shrink-0 items-center justify-center rounded-[2px] bg-canvas font-mono text-[9px] font-medium text-mute"
            >
              {getBadge(node.name)}
            </span>
          )}

          {isRenaming ? (
            <input
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => handleKeyDown(e, "rename")}
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-full bg-canvas border border-hairline px-1 text-xs text-ink focus:outline-none focus:border-body-strong"
            />
          ) : (
            <span className="truncate">{node.name}</span>
          )}
        </button>

        {isActive && !isRenaming && (
          <span
            aria-hidden="true"
            className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-glow-teal shadow-[0_0_6px_var(--color-glow-teal)]"
          />
        )}

        {/* Action icons visible on hover */}
        <div className="hidden group-hover:flex items-center gap-1 ml-auto shrink-0">
          {isFolder && (
            <>
              <button
                type="button"
                title="New File"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddingType("file");
                }}
                className="text-mute hover:text-ink px-1 text-xs"
              >
                +🗎
              </button>
              <button
                type="button"
                title="New Folder"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddingType("folder");
                }}
                className="text-mute hover:text-ink px-1 text-xs"
              >
                +📁
              </button>
            </>
          )}
          <button
            type="button"
            title="Rename"
            onClick={(e) => {
              e.stopPropagation();
              setIsRenaming(true);
            }}
            className="text-mute hover:text-ink px-1 text-xs"
          >
            ✎
          </button>
          <button
            type="button"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNode(node.id);
            }}
            className="text-mute hover:text-red-400 px-1 text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Input field when adding a child file/folder */}
      {addingType && (
        <div style={{ paddingLeft: `${12 + (depth + 1) * 14}px` }} className="py-1 pr-2">
          <input
            type="text"
            autoFocus
            placeholder={`New ${addingType} name...`}
            value={newNameValue}
            onChange={(e) => setNewNameValue(e.target.value)}
            onBlur={() => setAddingType(null)}
            onKeyDown={(e) => handleKeyDown(e, "add")}
            className="h-6 w-full bg-canvas border border-hairline px-2 text-xs text-ink placeholder:text-mute focus:outline-none focus:border-body-strong"
          />
        </div>
      )}

      {isFolder && isExpanded && node.children && (
        <ul>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              activeFileId={activeFileId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelectFile={onSelectFile}
              onAddNode={onAddNode}
              onRenameNode={onRenameNode}
              onDeleteNode={onDeleteNode}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function FileTree({
  root,
  activeFileId,
  expandedIds,
  onToggle,
  onSelectFile,
  onAddNode,
  onRenameNode,
  onDeleteNode,
}: {
  root: FileNode[];
  activeFileId: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectFile: (id: string) => void;
  onAddNode: (parentId: string | null, type: "file" | "folder", name: string) => void;
  onRenameNode: (id: string, newName: string) => void;
  onDeleteNode: (id: string) => void;
}) {
  const [rootAddingType, setRootAddingType] = useState<"file" | "folder" | null>(null);
  const [rootNewName, setRootNewName] = useState("");

  const handleRootAddSubmit = () => {
    if (rootNewName.trim() && rootAddingType) {
      onAddNode(null, rootAddingType, rootNewName.trim());
      setRootNewName("");
      setRootAddingType(null);
    }
  };

  return (
    <nav aria-label="Project files" className="flex flex-col h-full overflow-y-auto py-2">
      {/* FileTree Header Actions */}
      <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-hairline text-xs font-mono text-mute">
        <span>EXPLORER</span>
        <div className="flex gap-2">
          <button
            type="button"
            title="New File at Root"
            onClick={() => setRootAddingType("file")}
            className="hover:text-ink"
          >
            +🗎
          </button>
          <button
            type="button"
            title="New Folder at Root"
            onClick={() => setRootAddingType("folder")}
            className="hover:text-ink"
          >
            +📁
          </button>
        </div>
      </div>

      {rootAddingType && (
        <div className="px-3 py-1">
          <input
            type="text"
            autoFocus
            placeholder={`Root ${rootAddingType} name...`}
            value={rootNewName}
            onChange={(e) => setRootNewName(e.target.value)}
            onBlur={() => setRootAddingType(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRootAddSubmit();
              else if (e.key === "Escape") setRootAddingType(null);
            }}
            className="h-6 w-full bg-canvas border border-hairline px-2 text-xs text-ink placeholder:text-mute focus:outline-none focus:border-body-strong"
          />
        </div>
      )}

      <ul className="flex-1">
        {root.map((node) => (
          <FileTreeNode
            key={node.id}
            node={node}
            depth={0}
            activeFileId={activeFileId}
            expandedIds={expandedIds}
            onToggle={onToggle}
            onSelectFile={onSelectFile}
            onAddNode={onAddNode}
            onRenameNode={onRenameNode}
            onDeleteNode={onDeleteNode}
          />
        ))}
      </ul>
    </nav>
  );
}