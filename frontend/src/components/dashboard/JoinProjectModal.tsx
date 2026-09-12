import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface JoinProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinProjectModal({ isOpen, onClose }: JoinProjectModalProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:4000/api/projects/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Invalid invite code or project not found");
      }

      const project = await res.json();
      onClose();
      navigate(`/project/${project.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-hairline bg-canvas p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink">Join Project</h2>
        <p className="mt-1 text-sm text-body-strong mb-6">
          Enter an invite code to collaborate on an existing workspace.
        </p>

        {error && (
          <div role="alert" className="mb-4 rounded-sm bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium text-ink mb-1">
              Invite Code
            </label>
            <input
              id="inviteCode"
              type="text"
              autoFocus
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-sm border border-hairline bg-canvas-soft px-3 py-2 text-sm font-mono text-ink placeholder:text-mute focus:border-primary focus:outline-none transition-colors"
              placeholder="e.g. sq-9x7f2a"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-sm px-4 py-2 text-sm font-medium text-body-strong transition-colors hover:bg-canvas-soft hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !inviteCode.trim()}
              className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
            >
              {isSubmitting ? "Joining..." : "Join Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}