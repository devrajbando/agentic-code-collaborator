import { useMemo, useState, useEffect, useCallback } from "react";
import AppNavbar from "../components/AppNavbar";
import DashboardToolbar from "../components/dashboard/DashboardToolbar";
import ProjectCard, { type Project } from "../components/dashboard/ProjectCard";
import CreateOrJoinTile from "../components/dashboard/CreateOrJoinTile";
import CreateProjectModal from "../components/dashboard/CreateProjectModal";
import { JoinProjectModal } from "../components/dashboard/JoinProjectModal";
import { useQueryParam } from "../hooks/useQueryParams";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useQueryParam("q", "");
  const [sort, setSort] = useQueryParam("sort", "updated");
  const [filter, setFilter] = useQueryParam("filter", "all");
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:4000/api/projects", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const visibleProjects = useMemo(() => {
    let list = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

    if (filter === "owned") list = list.filter((p) => p.role === "admin");
    if (filter === "shared") list = list.filter((p) => p.role === "member");
    if (filter === "archived") list = [];

    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "role") list = [...list].sort((a, b) => a.role.localeCompare(b.role));

    return list;
  }, [projects, search, filter, sort]);

  const ownedCount = projects.filter((p) => p.role === "admin").length;

  const handleLeave = (id: string) => setProjects((prev) => prev.filter((p) => p.id !== id));
  const handleDelete = (id: string) => setProjects((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <AppNavbar projectName="Dashboard" branchOrPage="All projects" />

      <main className="mx-auto max-w-content px-6 py-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display-retro mb-1 text-[28px] font-medium tracking-[-0.3px]">
              Projects
            </h1>
            <p className="text-sm text-mute">
              {isLoading ? "Loading projects..." : `${projects.length} projects · ${ownedCount} you own`}
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setJoinOpen(true)}
              className="rounded-sm border border-hairline px-4 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
            >
              Join project
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
            >
              Create project
            </button>
          </div>
        </div>

        <DashboardToolbar
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          filter={filter}
          onFilterChange={setFilter}
        />

        {isLoading ? (
          <div className="rounded-md border border-hairline bg-canvas-soft p-10 text-center text-sm text-mute animate-pulse">
            Loading your workspaces...
          </div>
        ) : visibleProjects.length === 0 && filter !== "all" ? (
          <div className="rounded-md border border-hairline bg-canvas-soft p-10 text-center text-sm text-mute">
            No projects match this filter yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProjects.map((project) => (
              <ProjectCard key={project.id} project={project} onLeave={handleLeave} onDelete={handleDelete} />
            ))}
            <CreateOrJoinTile onCreate={() => setCreateOpen(true)} onJoin={() => setJoinOpen(true)} />
          </div>
        )}
      </main>

      {/* Passing fetchProjects to Modals allows them to trigger a refresh without a full page reload if configured */}
      <CreateProjectModal isOpen={createOpen} onClose={() => { setCreateOpen(false); fetchProjects(); }} />
      <JoinProjectModal isOpen={joinOpen} onClose={() => { setJoinOpen(false); fetchProjects(); }} />
    </div>
  );
}