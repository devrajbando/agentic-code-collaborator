import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ConfirmModal from "./ConfirmModal";

export type Project = {
  id: string;
  name: string;
  role: "admin" | "member";
  branch: string;
  fileCount: number;
  commitCount: number;
  collaborators: { id: string; initials: string; name: string }[];
  overflowCount?: number;
  updatedLabel: string;
};

export default function ProjectCard({
  project,
  onLeave,
  onDelete,
}: {
  project: Project;
  onLeave: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"leave" | "delete" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <>
      <div className="group relative flex flex-col gap-3.5 rounded-md border border-hairline bg-canvas-soft p-5 transition-shadow duration-200 hover:shadow-[0_0_0_1px_var(--color-glow-teal),0_0_24px_-8px_var(--color-glow-teal)] motion-reduce:hover:shadow-none">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Link
              to={`/project/${project.id}`}
              className="rounded-sm text-[15px] font-medium text-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
            >
              {project.name}
            </Link>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                project.role === "admin"
                  ? "bg-glow-coral/20 text-[#e0a08c]"
                  : "border border-hairline text-mute"
              }`}
            >
              {project.role === "admin" ? "Admin" : "Member"}
            </span>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label={`More actions for ${project.name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-sm px-1.5 py-1 text-mute transition-colors duration-150 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
            >
              &#8942;
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-8 z-10 w-40 rounded-sm border border-hairline bg-canvas py-1 shadow-lg"
              >
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmAction("leave");
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-body-strong hover:bg-canvas-soft"
                >
                  Leave project
                </button>
                {project.role === "admin" && (
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmAction("delete");
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-[#e0a08c] hover:bg-canvas-soft"
                  >
                    Delete project
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 font-mono text-xs text-mute [font-variant-numeric:tabular-nums]">
          <span>{project.branch}</span>
          <span>{project.fileCount} files</span>
          <span>{project.commitCount} commits</span>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex" aria-label="Active collaborators" role="group">
            {project.collaborators.map((c) => (
              <div
                key={c.id}
                role="img"
                aria-label={c.name}
                title={c.name}
                className="-ml-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-canvas-soft bg-canvas text-[10px] font-semibold text-body-strong first:ml-0"
              >
                {c.initials}
              </div>
            ))}
            {!!project.overflowCount && (
              <div
                role="img"
                aria-label={`${project.overflowCount} more collaborators`}
                title={`${project.overflowCount} more`}
                className="-ml-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-canvas-soft bg-canvas text-[10px] font-semibold text-body-strong"
              >
                +{project.overflowCount}
              </div>
            )}
          </div>
          <span className="text-xs text-mute">{project.updatedLabel}</span>
        </div>
      </div>

      <ConfirmModal
        open={confirmAction === "leave"}
        title={`Leave ${project.name}?`}
        description="You'll lose access to this project's files and history until someone re-invites you."
        confirmLabel="Leave project"
        onConfirm={() => {
          onLeave(project.id);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmModal
        open={confirmAction === "delete"}
        title={`Delete ${project.name}?`}
        description="This permanently deletes the project, its file history, and removes access for every member. This can't be undone."
        confirmLabel="Delete project"
        onConfirm={() => {
          onDelete(project.id);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}