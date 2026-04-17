import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, FileText, Search, Shield, GitCommitHorizontal, Settings, ChevronDown, GitBranch, Eye } from "lucide-react";
import { useState } from "react";
import { mockProjects } from "../mock/data";
import { clsx } from "clsx";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", desc: "프로젝트 개요" },
  { to: "/documents", icon: FileText, label: "Documents", desc: "문서 관리" },
  { to: "/memory", icon: Search, label: "Memory", desc: "시맨틱 검색" },
  { to: "/workflows", icon: GitBranch, label: "Workflows", desc: "워크플로우 관리" },
  { to: "/policies", icon: Shield, label: "Policies", desc: "정책 레지스트리" },
  { to: "/changes", icon: GitCommitHorizontal, label: "Changes", desc: "변경 추적" },
  { to: "/config", icon: Settings, label: "Config", desc: "설정 동기화" },
  { to: "/watcher", icon: Eye, label: "Watcher", desc: "파일 감시" },
];

export function Layout() {
  const [selectedProject, setSelectedProject] = useState(mockProjects[0]!.id);
  const [projectOpen, setProjectOpen] = useState(false);
  const project = mockProjects.find((p) => p.id === selectedProject)!;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-zinc-800">
          <h1 className="text-lg font-bold text-violet-400">zm-codex</h1>
          <p className="text-xs text-zinc-500">Claude Code Management System</p>
        </div>

        {/* Project Selector */}
        <div className="px-3 py-3 border-b border-zinc-800">
          <button
            onClick={() => setProjectOpen(!projectOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition text-sm"
          >
            <div className="text-left">
              <div className="font-medium text-zinc-200">{project.name}</div>
              <div className="text-xs text-zinc-500 truncate max-w-[160px]">{project.path}</div>
            </div>
            <ChevronDown className={clsx("w-4 h-4 text-zinc-500 transition", projectOpen && "rotate-180")} />
          </button>
          {projectOpen && (
            <div className="mt-1 bg-zinc-900 rounded-lg border border-zinc-700 overflow-hidden">
              {mockProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProject(p.id); setProjectOpen(false); }}
                  className={clsx("w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 transition",
                    p.id === selectedProject ? "text-violet-400 bg-zinc-800/50" : "text-zinc-300"
                  )}
                >
                  {p.name}
                </button>
              ))}
              <button className="w-full text-left px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-800 border-t border-zinc-800">
                + 프로젝트 추가
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition group",
                  isActive
                    ? "bg-violet-500/10 text-violet-400"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-zinc-600 group-hover:text-zinc-500">{item.desc}</div>
              </div>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-800 text-xs text-zinc-600">
          <div>Phase 5 — File Watcher + MCP</div>
          <div className="mt-1">pgvector 0.8.2 | Port 30432</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-zinc-950">
        <Outlet context={{ project, selectedProject }} />
      </main>
    </div>
  );
}
