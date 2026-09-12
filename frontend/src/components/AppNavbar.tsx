import { useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCurrentUser } from "../context/CurrentUserContext";

type Collaborator = { id: string; initials: string; name: string };

// Still mocked — this is the live-presence list (who else is currently in
// this project/file), a separate feature from account authentication.
const collaborators: Collaborator[] = [
  { id: "1", initials: "P", name: "Priya" },
  { id: "2", initials: "M", name: "Marcus" },
];

const overflowCount = 2;

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AppNavbar({
  projectName,
  branchOrPage,
  projectId,
}: {
  projectName: string;
  branchOrPage: string;
  projectId?: string;
}) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const { user, isLoading, logout } = useCurrentUser();
  const navigate = useNavigate();

  const accountInitials =
    user ? initialsFromName(user.name) : "";

  const accountColor =
    user?.color ?? "var(--color-glow-teal)";

  const accountLabel =
    user ? `Your account (${user.name})` : "Account";

  const handleSearchKeyDown = (
    e: KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Escape") {
      e.currentTarget.blur();
    }
  };

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <nav className="flex h-14 items-center justify-between border-b border-hairline bg-canvas px-5">
      {/* Left: brand + breadcrumb */}
      <div className="flex min-w-0 items-center gap-5">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 rounded-sm text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
        >
          <span
            className="h-4.5 w-4.5 rounded-sm bg-primary"
            aria-hidden="true"
          />
          synqCode
        </Link>

        <span
          className="h-5 w-px shrink-0 bg-hairline"
          aria-hidden="true"
        />

        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="truncate font-medium text-ink">
            {projectName}
          </span>

          <span className="text-mute" aria-hidden="true">
            /
          </span>

          <span className="truncate text-mute">
            {branchOrPage}
          </span>
        </div>
      </div>

      {/* Center: search */}
      <div className="mx-8 hidden w-full max-w-90 md:block">
        <label htmlFor="global-search" className="sr-only">
          Search projects and files
        </label>

        <div
          className={`flex items-center gap-2 rounded-sm border bg-canvas-soft px-2.5 py-1.5 transition-colors duration-150 ${
            searchFocused
              ? "border-body-strong"
              : "border-hairline"
          }`}
        >
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0 text-mute"
          >
            <circle cx="11" cy="11" r="7" />
            <line
              x1="21"
              y1="21"
              x2="16.65"
              y2="16.65"
            />
          </svg>

          <input
            id="global-search"
            type="text"
            name="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search projects, files…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onKeyDown={handleSearchKeyDown}
            className="min-w-0 flex-1 truncate bg-transparent text-[13px] text-body-strong placeholder:text-mute focus:outline-none"
          />

          <kbd className="shrink-0 rounded-sm border border-hairline bg-canvas px-1.5 py-px font-mono text-[11px] text-mute">
            &#8984;&nbsp;K
          </kbd>
        </div>
      </div>

      {/* Right: presence + actions */}
      <div className="flex shrink-0 items-center gap-3.5">
        {/* Collaborators */}
        <div
          className="flex items-center"
          role="group"
          aria-label="Active collaborators"
        >
          {collaborators.map((c) => (
            <div
              key={c.id}
              role="img"
              aria-label={c.name}
              title={c.name}
              className="-ml-2 flex h-6.5 w-6.5 items-center justify-center rounded-full border-2 border-canvas bg-canvas-soft text-[11px] font-semibold text-body-strong first:ml-0"
            >
              {c.initials}
            </div>
          ))}

          {overflowCount > 0 && (
            <div
              role="img"
              aria-label={`${overflowCount} more collaborators`}
              title={`${overflowCount} more`}
              className="-ml-2 flex h-6.5 w-6.5 items-center justify-center rounded-full border-2 border-canvas bg-canvas-soft text-[11px] font-semibold text-body-strong"
            >
              +{overflowCount}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-7.5 w-7.5 items-center justify-center rounded-full text-body-strong transition-colors duration-150 hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>

          <span
            className="absolute right-1.75 top-1.5 h-1.5 w-1.5 rounded-full bg-glow-coral"
            aria-hidden="true"
          />
        </button>


      {/* Settings */}
        {projectId && (
          <Link
            to={`/project/${projectId}/settings`}
            aria-label="Project Settings"
            className="flex h-7.5 w-7.5 items-center justify-center rounded-full text-body-strong transition-colors duration-150 hover:bg-canvas-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
          >
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a2 2 0 0 0-1.51 1z" />
            </svg>
          </Link>
        )}

        {/* Account */}
        <div className="relative">
          <button
            type="button"
            aria-label={accountLabel}
            aria-expanded={accountMenuOpen}
            disabled={isLoading}
            onClick={() =>
              setAccountMenuOpen((open) => !open)
            }
            title={user?.name}
            style={{
              backgroundColor: isLoading
                ? "var(--color-canvas-soft)"
                : accountColor,
            }}
            className="flex h-7.5 w-7.5 items-center justify-center rounded-full text-xs font-semibold text-on-primary transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong active:scale-95 disabled:cursor-default disabled:hover:scale-100"
          >
            {isLoading ? (
              <span className="h-3 w-3 animate-pulse rounded-full bg-mute" />
            ) : (
              accountInitials
            )}
          </button>

          {accountMenuOpen && user && (
            <div className="absolute right-0 top-10 z-50 w-60 rounded-md border border-hairline bg-canvas p-1.5 shadow-lg">
              <div className="border-b border-hairline px-3 py-2.5">
                <p className="truncate text-sm font-medium text-ink">
                  {user.name}
                </p>

                <p className="truncate text-xs text-mute">
                  {user.email}
                </p>
              </div>

              <Link
                to="/dashboard"
                onClick={() => setAccountMenuOpen(false)}
                className="mt-1 block rounded-sm px-3 py-2 text-sm text-body-strong transition-colors hover:bg-canvas-soft hover:text-ink"
              >
                Dashboard
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-0.5 w-full rounded-sm px-3 py-2 text-left text-sm text-body-strong transition-colors hover:bg-canvas-soft hover:text-ink"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}