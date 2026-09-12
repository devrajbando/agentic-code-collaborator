import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import AppNavbar from "../components/AppNavbar";
import FileTree, { type FileNode } from "../components/project/FileTree";
import CodeEditorPane, { type CodeEditorPaneHandle, type OpenFile } from "../components/project/CodeEditorPane";
import VersionControlPanel, { type Commit } from "../components/project/VersionControlPanel";
import { socket } from "../services/socket";
import { useCurrentUser } from "../context/CurrentUserContext";
import CommitDetailModal from "../components/project/CommitDetailModal";
import { useAgentPipeline } from "../hooks/useAgentPipeline";
import { AgentDock } from "../components/project/AgentDock";
import type { GeneratorDraft } from "../types/agent";
import { API_BASE_URL } from '../lib/apiConfig';
const fileContents: Record<string, string> = {
  "auth.ts": `function verifyToken(token) {
  // checks signature and expiry
  return jwt.verify(token, SECRET);
}

export { verifyToken };`,
  "webhooks.ts": `export async function handleWebhook(req, res) {
  const event = req.body;
  // route by event type
  res.status(200).send("ok");
}`,
  "index.ts": `import express from "express";
import { verifyToken } from "./routes/auth";

const app = express();
app.listen(3000);`,
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function addNodeRecursive(nodes: FileNode[], parentId: string | null, newNode: FileNode): FileNode[] {
  if (parentId === null) {
    return [...nodes, newNode];
  }
  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...(node.children ?? []), newNode] };
    }
    if (node.children) {
      return { ...node, children: addNodeRecursive(node.children, parentId, newNode) };
    }
    return node;
  });
}

function renameNodeRecursive(nodes: FileNode[], id: string, newName: string): FileNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return { ...node, name: newName };
    }
    if (node.children) {
      return { ...node, name: node.name, children: renameNodeRecursive(node.children, id, newName) };
    }
    return node;
  });
}

function deleteNodeRecursive(nodes: FileNode[], id: string): FileNode[] {
  return nodes.filter((node) => {
    if (node.id === id) return false;
    if (node.children) {
      node.children = deleteNodeRecursive(node.children, id);
    }
    return true;
  });
}

export default function ProjectViewPage() {
  const { projectId } = useParams();
  const { user } = useCurrentUser();

  const [projectName, setProjectName] = useState("Loading...");
  const [expandedIds, setExpandedIds] = useState(new Set(["src", "routes"]));
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState("");
  const [branch, setBranch] = useState("main");
  const [commits, setCommits] = useState<Commit[]>([]);
  const [hasPendingChanges] = useState(true);
  const [fileTree, setFileTree] = useState<FileNode[]>([
    {
      id: "src",
      name: "src",
      type: "folder",
      children: [{ id: "index.ts", name: "index.ts", type: "file" }],
    },
    { id: "package.json", name: "package.json", type: "file" },
  ]);
  const [inspectingCommit, setInspectingCommit] = useState<Commit | null>(null);

  const editorRef = useRef<CodeEditorPaneHandle>(null);
  const { currentJob, history, sendCommand, dismissCurrent, isBusy } = useAgentPipeline(projectId ?? "");


  const handleFileContentChange = (fileId: string, newContent: string) => {
    setOpenFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, content: newContent } : f)));
  };

  const handleSendToAgent = (message: string) => {
    const content =
      editorRef.current?.getActiveContent() ?? openFiles.find((f) => f.id === activeFileId)?.content ?? "";
    sendCommand(message, content);
  };

  const handleDraftDecision = async (draft: GeneratorDraft, accepted: boolean, description?: string) => {
    if (accepted) {
      editorRef.current?.applyResult(draft.content, "cursor");
    }
    try {
      await fetch(`${API_BASE_URL}/api/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessionId: projectId,
          agentType: draft.agentType,
          content: draft.content,
          accepted,
          ...(description ? { description } : {}),
        }),
      });
    } catch (err) {
      console.error("Failed to log suggestion outcome:", err);
    }
  };

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        const settingsRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}/settings`, {
          credentials: "include",
        });
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setProjectName(data.name);
        } else {
          setProjectName("Workspace");
        }

        const treeRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tree`, {
          credentials: "include",
        });
        if (treeRes.ok) {
          const treeData = await treeRes.json();
          if (treeData.tree && treeData.tree.length > 0) {
            setFileTree(treeData.tree);
          }
        }

        const commitsRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}/commits`, {
          credentials: "include",
        });
        if (commitsRes.ok) {
          const commitsData = await commitsRes.json();
          if (commitsData.commits) {
            setCommits(
              commitsData.commits.map((c: any) => ({
                id: c.id,
                shortHash: c.shortHash,
                message: c.message,
                authorInitials: c.authorInitials,
                authorName: c.authorName,
                relativeTime: new Date(c.createdAt).toLocaleTimeString(),
                fileTreeSnapshot: c.fileTreeSnapshot,
              }))
            );
          }
        }
      } catch {
        setProjectName("Workspace");
      }
    };

    if (projectId) fetchProjectData();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    socket.emit("join-project", projectId);

    socket.on("file-tree-updated", (newTree: FileNode[]) => {
      setFileTree(newTree);
    });

    socket.on("commits-updated", (newCommits: Commit[]) => {
      setCommits(newCommits);
    });

    return () => {
      socket.off("file-tree-updated");
      socket.off("commits-updated");
      socket.emit("leave-project", projectId);
    };
  }, [projectId]);

  const persistAndBroadcastTree = async (updatedTree: FileNode[]) => {
    setFileTree(updatedTree);
    socket.emit("file-tree-mutation", { projectId, tree: updatedTree });
    try {
      await fetch(`${API_BASE_URL}/api/projects/${projectId}/tree`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tree: updatedTree }),
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to persist file tree change:", error);
    }
  };

  const handleAddNode = async (parentId: string | null, type: "file" | "folder", name: string) => {
    const newNode: FileNode = {
      id: `${parentId ? parentId + "/" : ""}${name}`,
      name,
      type,
      children: type === "folder" ? [] : undefined,
    };
    const updatedTree = addNodeRecursive(fileTree, parentId, newNode);
    await persistAndBroadcastTree(updatedTree);
  };

  const handleRenameNode = async (id: string, newName: string) => {
    const updatedTree = renameNodeRecursive(fileTree, id, newName);
    await persistAndBroadcastTree(updatedTree);
  };

  const handleDeleteNode = async (id: string) => {
    const updatedTree = deleteNodeRecursive(fileTree, id);
    await persistAndBroadcastTree(updatedTree);
  };

  const toggleFolder = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectCommit = (commit: Commit) => {
    setInspectingCommit(commit);
  };

  const selectFile = (id: string) => {
    setActiveFileId(id);
    setOpenFiles((prev) => {
      if (prev.some((f) => f.id === id)) return prev;
      const content = fileContents[id] ?? "// (empty file)";
      const name = id.split("/").pop() ?? id;
      return [...prev, { id, name, content }];
    });
  };

  const closeTab = (id: string) => {
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (activeFileId === id && next.length > 0) setActiveFileId(next[next.length - 1].id);
      return next;
    });
  };

  const handleCommit = async (message: string) => {
    const shortHash = Math.random().toString(16).slice(2, 8);
    const authorName = user?.name || "You";
    const authorInitials = user ? initialsFromName(user.name) : "YO";

    const parentCommit = commits[0];
    const parentFileMap = new Map<string, string>();

    if (parentCommit?.fileTreeSnapshot) {
      const traverseParent = (ns: FileNode[]) => {
        for (const node of ns) {
          if (node.type === "file") {
            parentFileMap.set(node.id, node.content ?? "");
          } else if (node.children) {
            traverseParent(node.children);
          }
        }
      };
      traverseParent(parentCommit.fileTreeSnapshot);
    }

    const attachContentsToNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.type === "file") {
          const openFile = openFiles.find((f) => f.id === node.id);
          const content = openFile
            ? openFile.content
            : parentFileMap.get(node.id) ?? fileContents[node.id] ?? "// (empty file)";
          return { ...node, content };
        }
        if (node.children) {
          return { ...node, children: attachContentsToNodes(node.children) };
        }
        return node;
      });
    };

    const snapshotWithContent = attachContentsToNodes(fileTree);

    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/commits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          shortHash,
          authorName,
          authorInitials,
          fileTreeSnapshot: snapshotWithContent,
        }),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        const formattedCommit: Commit = {
          id: data.commit.id,
          shortHash: data.commit.shortHash,
          message: data.commit.message,
          authorInitials: data.commit.authorInitials,
          authorName: data.commit.authorName,
          relativeTime: "just now",
          fileTreeSnapshot: data.commit.fileTreeSnapshot,
        };

        const updatedCommits = [formattedCommit, ...commits];
        setCommits(updatedCommits);
        socket.emit("commit-mutation", { projectId, commits: updatedCommits });
      }
    } catch (err) {
      console.error("Failed to submit commit:", err);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-canvas text-ink">
      <AppNavbar projectName={projectName} branchOrPage={branch} projectId={projectId} />
      <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr_280px]">
        <div className="min-h-0 border-r border-hairline bg-canvas">
          <FileTree
            root={fileTree}
            activeFileId={activeFileId}
            expandedIds={expandedIds}
            onToggle={toggleFolder}
            onSelectFile={selectFile}
            onAddNode={handleAddNode}
            onRenameNode={handleRenameNode}
            onDeleteNode={handleDeleteNode}
          />
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1">
            <CodeEditorPane
              ref={editorRef}
              projectId={projectId ?? "unknown-project"}
              openFiles={openFiles}
              activeFileId={activeFileId}
              onSelectTab={setActiveFileId}
              onCloseTab={closeTab}
              onContentChange={handleFileContentChange}
            />
          </div>
          <AgentDock
            job={currentJob}
            history={history}
            isBusy={isBusy}
            onSend={handleSendToAgent}
            onDismiss={dismissCurrent}
            onDraftDecision={handleDraftDecision}
            activeFileName={openFiles.find((f) => f.id === activeFileId)?.name}
          />
        </div>

        <div className="min-h-0">
          <VersionControlPanel
            branches={["main", "develop"]}
            activeBranch={branch}
            onBranchChange={setBranch}
            commits={commits}
            hasPendingChanges={hasPendingChanges}
            onCommit={handleCommit}
            onSelectCommit={handleSelectCommit}
          />
        </div>
      </div>

      {inspectingCommit && (
        <CommitDetailModal commit={inspectingCommit} commits={commits} onClose={() => setInspectingCommit(null)} />
      )}
    </div>
  );
}