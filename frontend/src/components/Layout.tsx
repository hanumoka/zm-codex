import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, FileText, Search, Shield, GitCommitHorizontal, Settings, ChevronDown, GitBranch, Eye, Plus, X, Loader2, Trash2, AlertTriangle, HelpCircle, Folder, FolderOpen, ArrowLeft, Check, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api/client";
import { useTourStore } from "../stores/tourStore";
import { useTour } from "../hooks/useTour";
import { clsx } from "clsx";

interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
}

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
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Reset state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Delete project state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Tour
  const { hasCompletedOnboarding, isActive: tourActive } = useTourStore();
  const { startTourFlow } = useTour();

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.get<ProjectInfo[]>("/v1/projects");
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]!.id);
      }
    } catch {
      // API not ready yet
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  // Auto-start tour on first visit
  useEffect(() => {
    if (!loading && !hasCompletedOnboarding && !tourActive) {
      const timer = setTimeout(startTourFlow, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, hasCompletedOnboarding, tourActive, startTourFlow]);

  const project = projects.find((p) => p.id === selectedProject);

  const handleProjectAdded = (newProject: ProjectInfo) => {
    setProjects((prev) => [...prev, newProject]);
    setSelectedProject(newProject.id);
    setShowAddModal(false);
  };

  const handleDevReset = async () => {
    setResetting(true);
    try {
      await api.post("/v1/dev/reset", {});
      useTourStore.getState().resetTourState();
      setProjects([]);
      setSelectedProject(null);
      setShowResetConfirm(false);
    } catch {
      // silently fail
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setDeletingProjectId(projectId);
    setDeleteError(null);
    try {
      await api.del(`/v1/projects/${projectId}`);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (selectedProject === projectId) {
        const remaining = projects.filter((p) => p.id !== projectId);
        setSelectedProject(remaining.length > 0 ? remaining[0]!.id : null);
      }
      setShowDeleteConfirm(null);
    } catch {
      setDeleteError("프로젝트 삭제에 실패했습니다.");
    } finally {
      setDeletingProjectId(null);
    }
  };

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
        <div className="px-3 py-3 border-b border-zinc-800" data-tour="project-selector">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>프로젝트 로딩 중...</span>
            </div>
          ) : projects.length === 0 ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-zinc-700 hover:border-violet-500 hover:bg-violet-500/5 transition text-sm text-zinc-400 hover:text-violet-400"
            >
              <Plus className="w-4 h-4" />
              <span>프로젝트 등록하기</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setProjectOpen(!projectOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition text-sm"
              >
                <div className="text-left min-w-0">
                  <div className="font-medium text-zinc-200">{project?.name ?? "프로젝트 선택"}</div>
                  <div className="text-xs text-zinc-500 truncate max-w-[160px]">{project?.path ?? ""}</div>
                </div>
                <ChevronDown className={clsx("w-4 h-4 text-zinc-500 transition shrink-0", projectOpen && "rotate-180")} />
              </button>
              {projectOpen && (
                <div className="mt-1 bg-zinc-900 rounded-lg border border-zinc-700 overflow-hidden">
                  {projects.map((p) => (
                    <div key={p.id} className="flex items-center group">
                      <button
                        onClick={() => { setSelectedProject(p.id); setProjectOpen(false); }}
                        className={clsx("flex-1 text-left px-3 py-2 text-sm hover:bg-zinc-800 transition min-w-0",
                          p.id === selectedProject ? "text-violet-400 bg-zinc-800/50" : "text-zinc-300"
                        )}
                      >
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-zinc-600 truncate">{p.path}</div>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(p.id); setProjectOpen(false); }}
                        className="px-2 py-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0"
                        title="프로젝트 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => { setShowAddModal(true); setProjectOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:text-violet-400 hover:bg-zinc-800 border-t border-zinc-800 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    프로젝트 추가
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-tour={`nav-${item.to.slice(1)}`}
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
        <div className="px-3 py-3 border-t border-zinc-800 space-y-1.5">
          <button
            onClick={startTourFlow}
            data-tour="tour-restart-btn"
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-violet-500 hover:text-violet-400 hover:bg-violet-500/10 border border-violet-900/40 transition text-xs"
          >
            <HelpCircle className="w-3 h-3" />
            가이드 다시 보기
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-amber-600 hover:text-amber-500 hover:bg-amber-500/10 border border-amber-900/40 transition text-xs"
          >
            <Trash2 className="w-3 h-3" />
            Dev Reset
          </button>
          <div className="px-1 pt-1 text-xs text-zinc-600">
            <div>Phase 7 — All Modules Complete</div>
            <div className="mt-0.5">pgvector 0.8.2 | Port 30432</div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-zinc-950">
        <Outlet context={{ project, selectedProject }} />
      </main>

      {/* Add Project Modal */}
      {showAddModal && (
        <AddProjectModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleProjectAdded}
        />
      )}

      {/* Dev Reset Confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowResetConfirm(false)} />
          <div className="relative bg-zinc-900 border border-amber-700/50 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-semibold text-zinc-100">전체 데이터 초기화</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-5">
              모든 프로젝트, 문서, 메모리, 워크플로우, 이벤트 데이터가 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:bg-zinc-800 transition"
              >
                취소
              </button>
              <button
                onClick={() => void handleDevReset()}
                disabled={resetting}
                className={clsx(
                  "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2",
                  resetting
                    ? "bg-amber-800 text-amber-300 cursor-not-allowed"
                    : "bg-amber-600 text-white hover:bg-amber-500"
                )}
              >
                {resetting && <Loader2 className="w-4 h-4 animate-spin" />}
                {resetting ? "초기화 중..." : "초기화 확인"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation */}
      {showDeleteConfirm && (() => {
        const targetProject = projects.find((p) => p.id === showDeleteConfirm);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => { setShowDeleteConfirm(null); setDeleteError(null); }} />
            <div className="relative bg-zinc-900 border border-red-700/50 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h2 className="text-base font-semibold text-zinc-100">프로젝트 삭제</h2>
              </div>
              <p className="text-sm text-zinc-400 mb-1">
                <span className="font-semibold text-zinc-200">{targetProject?.name}</span> 프로젝트를 삭제합니다.
              </p>
              <p className="text-sm text-zinc-500 mb-5">
                모든 문서, 메모리, 워크플로우 데이터가 삭제됩니다. 실제 파일은 삭제되지 않습니다.
              </p>
              {deleteError && (
                <div className="px-3 py-2 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {deleteError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(null); setDeleteError(null); }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:bg-zinc-800 transition"
                >
                  취소
                </button>
                <button
                  onClick={() => void handleDeleteProject(showDeleteConfirm)}
                  disabled={deletingProjectId === showDeleteConfirm}
                  className={clsx(
                    "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2",
                    deletingProjectId === showDeleteConfirm
                      ? "bg-red-900 text-red-300 cursor-not-allowed"
                      : "bg-red-600 text-white hover:bg-red-500"
                  )}
                >
                  {deletingProjectId === showDeleteConfirm && <Loader2 className="w-4 h-4 animate-spin" />}
                  {deletingProjectId === showDeleteConfirm ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// --- Directory Browser Types ---
interface FsEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

interface FsBrowseResponse {
  current: string;
  parent: string | null;
  entries: FsEntry[];
}

// --- Directory Browser Component ---
function DirectoryBrowser({ onSelect }: { onSelect: (path: string) => void }) {
  const [browseData, setBrowseData] = useState<FsBrowseResponse | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const browse = useCallback(async (path?: string) => {
    setBrowseLoading(true);
    setBrowseError(null);
    try {
      const query = path ? `?path=${encodeURIComponent(path)}` : "";
      const data = await api.get<FsBrowseResponse>(`/v1/fs/browse${query}`);
      setBrowseData(data);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    } catch {
      setBrowseError("디렉토리를 불러오지 못했습니다.");
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  // 초기 로드 (드라이브 목록)
  useEffect(() => {
    void browse();
  }, [browse]);

  // 현재 경로를 breadcrumb 세그먼트로 분리
  const breadcrumbs: { label: string; path: string }[] = [];
  if (browseData?.current) {
    const parts = browseData.current.replace(/\\/g, "/").split("/").filter(Boolean);
    parts.forEach((part, idx) => {
      const segPath = parts.slice(0, idx + 1).join("/");
      // Windows 드라이브 처리 (C:)
      const fullPath = segPath.includes(":") ? segPath : `/${segPath}`;
      breadcrumbs.push({ label: part, path: fullPath });
    });
  }

  const dirs = browseData?.entries.filter((e) => e.is_dir) ?? [];
  const files = browseData?.entries.filter((e) => !e.is_dir) ?? [];

  return (
    <div className="mt-3 border border-zinc-700 rounded-lg bg-zinc-950 overflow-hidden">
      {/* 툴바 */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-800 bg-zinc-900">
        <button
          type="button"
          disabled={!browseData?.parent || browseLoading}
          onClick={() => browseData?.parent && void browse(browseData.parent)}
          className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="상위 폴더"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-none text-xs">
          {browseData?.current ? (
            breadcrumbs.map((crumb, idx) => (
              <span key={crumb.path} className="flex items-center gap-0.5 shrink-0">
                {idx > 0 && <ChevronRight className="w-3 h-3 text-zinc-600" />}
                <button
                  type="button"
                  onClick={() => void browse(crumb.path)}
                  className="px-1 py-0.5 rounded text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 transition truncate max-w-[120px]"
                  title={crumb.path}
                >
                  {crumb.label}
                </button>
              </span>
            ))
          ) : (
            <span className="px-1 text-zinc-600">드라이브 목록</span>
          )}
        </div>

        {browseLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500 shrink-0" />}
      </div>

      {/* 파일 목록 */}
      <div ref={scrollRef} className="max-h-[320px] overflow-y-auto">
        {browseError ? (
          <div className="px-4 py-3 text-sm text-red-400">{browseError}</div>
        ) : browseLoading && !browseData ? (
          <div className="flex items-center justify-center py-6 text-zinc-600 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>로딩 중...</span>
          </div>
        ) : dirs.length === 0 && files.length === 0 ? (
          <div className="px-4 py-3 text-sm text-zinc-600">폴더가 없습니다.</div>
        ) : (
          <ul>
            {dirs.map((entry) => (
              <li key={entry.path}>
                <button
                  type="button"
                  onDoubleClick={() => void browse(entry.path)}
                  onClick={() => onSelect(entry.path)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-violet-300 transition text-left group"
                  title={`클릭: 선택 | 더블클릭: 진입`}
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:text-amber-300" />
                  <span className="truncate flex-1">{entry.name}</span>
                  <span className="text-xs text-zinc-600 group-hover:text-zinc-500 shrink-0">더블클릭 진입</span>
                </button>
              </li>
            ))}
            {files.map((entry) => (
              <li key={entry.path}>
                <div className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 cursor-default">
                  <Folder className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                  <span className="truncate">{entry.name}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 선택 버튼 */}
      {browseData?.current && (
        <div className="px-3 py-2 border-t border-zinc-800 bg-zinc-900">
          <button
            type="button"
            onClick={() => onSelect(browseData.current)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-700/50 text-violet-400 hover:text-violet-300 text-xs font-medium transition"
          >
            <Check className="w-3.5 h-3.5" />
            이 폴더 선택: <span className="font-mono truncate max-w-[200px]">{browseData.current}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// --- AddProjectModal ---
function AddProjectModal({ onClose, onAdded }: { onClose: () => void; onAdded: (p: ProjectInfo) => void }) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBrowser, setShowBrowser] = useState(true);

  const canSubmit = name.trim().length > 0 && path.trim().length > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const created = await api.post<ProjectInfo>("/v1/projects", {
        name: name.trim(),
        path: path.trim(),
      });
      onAdded(created);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "등록 실패";
      if (msg.includes("400")) {
        setError("경로가 존재하지 않습니다. 유효한 디렉토리 경로를 입력해주세요.");
      } else if (msg.includes("409")) {
        setError("이미 등록된 프로젝트 경로입니다.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBrowserSelect = (selectedPath: string) => {
    setPath(selectedPath);
    if (!name.trim()) {
      const folderName = selectedPath.split("/").filter(Boolean).pop() ?? "";
      setName(folderName);
    }
    setShowBrowser(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">프로젝트 등록</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">프로젝트 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-project"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">프로젝트 경로</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="C:/Users/.../projects/my-project"
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition font-mono min-w-0"
              />
              <button
                type="button"
                onClick={() => setShowBrowser((v) => !v)}
                title="디렉토리 탐색기 열기"
                className={clsx(
                  "px-3 py-2 rounded-lg border text-sm transition shrink-0 flex items-center gap-1.5",
                  showBrowser
                    ? "border-violet-500 bg-violet-500/10 text-violet-400"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                )}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="text-xs">찾아보기</span>
              </button>
            </div>
            <p className="text-xs text-zinc-600 mt-1">실제 존재하는 디렉토리 경로를 입력하거나 탐색기로 선택하세요</p>

            {/* Directory Browser */}
            {showBrowser && (
              <DirectoryBrowser onSelect={handleBrowserSelect} />
            )}
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:bg-zinc-800 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={clsx(
                "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2",
                canSubmit
                  ? "bg-violet-600 text-white hover:bg-violet-500"
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              )}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "등록 중..." : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
