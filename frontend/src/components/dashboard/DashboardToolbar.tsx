const filters = [
  { value: "all", label: "All" },
  { value: "owned", label: "Owned by you" },
  { value: "shared", label: "Shared with you" },
  { value: "archived", label: "Archived" },
] as const;

export default function DashboardToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  filter,
  onFilterChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
  filter: string;
  onFilterChange: (v: string) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="flex min-w-[220px] max-w-[340px] flex-1 items-center gap-2 rounded-sm border border-hairline bg-canvas-soft px-3 py-2">
        <label htmlFor="dashboard-search" className="sr-only">
          Search projects
        </label>
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-mute">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          id="dashboard-search"
          type="text"
          name="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search projects…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-body-strong placeholder:text-mute focus:outline-none"
        />
      </div>

      <label htmlFor="dashboard-sort" className="sr-only">
        Sort projects
      </label>
      <select
        id="dashboard-sort"
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="rounded-sm border border-hairline bg-canvas-soft px-2.5 py-2 text-[13px] text-body-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
      >
        <option value="updated">Sort: Last updated</option>
        <option value="name">Sort: Name (A–Z)</option>
        <option value="role">Sort: Your role</option>
      </select>

      <div className="ml-auto flex gap-1.5" role="group" aria-label="Filter projects">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => onFilterChange(f.value)}
            className={`rounded-full px-3 py-1.5 text-[13px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong ${
              filter === f.value
                ? "bg-primary font-medium text-on-primary"
                : "border border-hairline text-body hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}