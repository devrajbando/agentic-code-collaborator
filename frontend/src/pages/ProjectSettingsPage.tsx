import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AppNavbar from "../components/AppNavbar";
import { useCurrentUser } from "../context/CurrentUserContext";

type ProjectMember = {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "member";
};

type ProjectDetails = {
  id: string;
  name: string;
  inviteCode: string;
  members: ProjectMember[];
};

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/projects/${projectId}/settings`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load project settings");
        const data = await res.json();
        setProject(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) fetchSettings();
  }, [projectId]);

  const currentUserRole = project?.members.find(m => m.id === user?.id)?.role;
  const isAdmin = currentUserRole === "admin";

  const copyInviteCode = () => {
    if (project?.inviteCode) {
      navigator.clipboard.writeText(project.inviteCode);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    try {
      const res = await fetch(`http://localhost:4000/api/projects/${projectId}/members/${targetUserId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove member");
      
      setProject((prev) => prev ? {
        ...prev,
        members: prev.members.filter(m => m.id !== targetUserId)
      } : null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteOrLeaveProject = async () => {
    const actionText = isAdmin ? "permanently delete this project" : "leave this project";
    if (!window.confirm(`Are you sure you want to ${actionText}?`)) return;

    setIsSubmitting(true);
    try {
      const url = isAdmin 
        ? `http://localhost:4000/api/projects/${projectId}`
        : `http://localhost:4000/api/projects/${projectId}/members/${user?.id}`;

      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Operation failed");

      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      alert(err.message);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex flex-col">
        <AppNavbar projectName="Loading..." branchOrPage="Settings" projectId={projectId} />
        <div className="flex-1 flex items-center justify-center text-mute animate-pulse">
          Loading settings...
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex flex-col">
        <AppNavbar projectName="Error" branchOrPage="Settings" projectId={projectId} />
        <div className="flex-1 flex items-center justify-center text-red-400">
          {error || "Project not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <AppNavbar projectName={project.name} branchOrPage="Settings" projectId={projectId} />

      <main className="mx-auto w-full max-w-3xl px-6 py-10 flex-1">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display-retro mb-1 text-[28px] font-medium tracking-[-0.3px]">
              Project Settings
            </h1>
            <p className="text-sm text-mute">Manage access and workspace configuration.</p>
          </div>
          <Link
            to={`/project/${project.id}`}
            className="rounded-sm border border-hairline px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
          >
            Back to Editor
          </Link>
        </div>

        <div className="space-y-6">
          {/* Invite Code Section */}
          <section className="rounded-md border border-hairline bg-canvas-soft p-6">
            <h2 className="text-base font-medium text-ink mb-1">Invite Code</h2>
            <p className="text-sm text-mute mb-4">
              Share this code with collaborators to grant them access to this workspace.
            </p>
            <div className="flex items-center gap-3">
              <code className="rounded-sm border border-hairline bg-canvas px-4 py-2 font-mono text-sm text-body-strong tracking-widest">
                {project.inviteCode}
              </code>
              <button
                onClick={copyInviteCode}
                className="rounded-sm bg-canvas border border-hairline px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas-soft active:scale-[0.98]"
              >
                Copy
              </button>
            </div>
          </section>

          {/* Members Section */}
          <section className="rounded-md border border-hairline bg-canvas-soft p-6">
            <h2 className="text-base font-medium text-ink mb-1">Collaborators</h2>
            <p className="text-sm text-mute mb-4">
              People with access to view and edit this workspace.
            </p>
            
            <div className="divide-y divide-hairline border-t border-hairline">
              {project.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas border border-hairline text-xs font-medium text-ink">
                      {(member.name || member.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{member.name || member.email}</p>
                      <p className="text-xs text-mute">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono uppercase tracking-widest text-mute">
                      {member.role}
                    </span>
                    {isAdmin && member.id !== user?.id && (
                      <button 
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-sm text-red-400 hover:text-red-300 transition-colors focus-visible:outline-none"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Danger Zone */}
          <section className="rounded-md border border-red-500/20 bg-canvas-soft p-6 mt-10">
            <h2 className="text-base font-medium text-red-400 mb-1">Danger Zone</h2>
            <p className="text-sm text-mute mb-4">
              {isAdmin ? "Permanently delete this project and all its data." : "Leave this project and remove it from your dashboard."}
            </p>
            <button 
              onClick={handleDeleteOrLeaveProject}
              disabled={isSubmitting}
              className="rounded-sm bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : (isAdmin ? "Delete Project" : "Leave Project")}
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}