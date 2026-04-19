import { useEffect, useState, useCallback } from "react";
import {
  Eye,
  Play,
  Square,
  FileEdit,
  FilePlus2,
  FileX2,
  AlertTriangle,
  Loader2,
  Activity,
  Clock,
} from "lucide-react";
import { api, subscribeSSE } from "../lib/api/client";
import type { SSEEvent } from "../lib/api/client";
import { clsx } from "clsx";
import { usePageTour } from "../hooks/usePageTour";

interface WatcherStatus {
  project_id: string;
  project_path: string;
  active: boolean;
  started_at: string | null;
  changes_count: number;
  last_change_at: string | null;
  recent_changes: FileChange[];
}

interface FileChange {
  file_path: string;
  change_type: string;
  action: string;
  timestamp: string;
}

interface DriftReport {
  commit_hash: string;
  commit_subject: string;
  commit_timestamp: string;
  code_files_changed: string[];
  doc_files_changed: string[];
  suggested_docs: string[];
  has_drift: boolean;
}

interface DriftResponse {
  project_id: string;
  total_commits_analyzed: number;
  drift_count: number;
  reports: DriftReport[];
}

const changeTypeConfig: Record<string, { icon: typeof FileEdit; color: string; label: string }> = {
  created: { icon: FilePlus2, color: "text-emerald-400", label: "NEW" },
  modified: { icon: FileEdit, color: "text-amber-400", label: "MOD" },
  deleted: { icon: FileX2, color: "text-red-400", label: "DEL" },
};

const fallbackChange = { icon: FileEdit, color: "text-zinc-400", label: "?" };

export function WatcherPage() {
  usePageTour("watcher");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [watcherStatus, setWatcherStatus] = useState<WatcherStatus | null>(null);
  const [liveChanges, setLiveChanges] = useState<FileChange[]>([]);
  const [driftData, setDriftData] = useState<DriftResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    (async () => {
      try {
        const projects = await api.get<{ id: string; name: string }[]>("/v1/projects");
        if (projects.length > 0) {
          const pid = projects[0]!.id;
          setProjectId(pid);

          // Fetch watcher status
          const statuses = await api.get<WatcherStatus[]>(`/v1/watcher/status?project_id=${pid}`);
          if (statuses.length > 0) {
            setWatcherStatus(statuses[0]!);
            setLiveChanges(statuses[0]!.recent_changes || []);
          }

          // Fetch drift report
          try {
            const drift = await api.get<DriftResponse>(`/v1/watcher/drift?project_id=${pid}`);
            setDriftData(drift);
          } catch {
            // Drift may fail if no git history
          }
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // SSE subscription for live changes
  const handleEvent = useCallback((event: SSEEvent) => {
    if (event.type === "file_changed") {
      const raw = event.data.changes;
      if (Array.isArray(raw) && raw.length > 0) {
        const changes = raw as FileChange[];
        setLiveChanges((prev) => [...changes, ...prev].slice(0, 100));
        setWatcherStatus((prev) =>
          prev ? { ...prev, changes_count: prev.changes_count + changes.length, last_change_at: new Date().toISOString() } : prev
        );
      }
    } else if (event.type === "watcher_started") {
      setWatcherStatus((prev) =>
        prev ? { ...prev, active: true, started_at: new Date().toISOString() } : prev
      );
    } else if (event.type === "watcher_stopped") {
      setWatcherStatus((prev) =>
        prev ? { ...prev, active: false } : prev
      );
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeSSE("/stream/events", handleEvent);
    return () => unsubscribe();
  }, [handleEvent]);

  const handleStart = async () => {
    if (!projectId) return;
    setActionLoading(true);
    try {
      const status = await api.post<WatcherStatus>("/v1/watcher/start", { project_id: projectId });
      setWatcherStatus(status);
    } catch {
      // Failed to start
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!projectId) return;
    setActionLoading(true);
    try {
      await api.post<{ status: string }>("/v1/watcher/stop", { project_id: projectId });
      setWatcherStatus((prev) => prev ? { ...prev, active: false } : prev);
    } catch {
      // Failed to stop
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-zinc-500">
        <Loader2 className="w-4 h-4 animate-spin" /> 파일 감시 상태 로딩 중...
      </div>
    );
  }

  const isActive = watcherStatus?.active ?? false;
  const driftReports = driftData?.reports?.filter((r) => r.has_drift) ?? [];

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">File Watcher</h1>
          <p className="text-sm text-zinc-500 mt-1">
            실시간 파일 감시 + 자동 인덱싱 + 드리프트 감지
          </p>
        </div>
        <button
          onClick={isActive ? handleStop : handleStart}
          disabled={actionLoading || !projectId}
          data-tour="watcher-toggle"
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition",
            isActive
              ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20",
            (actionLoading || !projectId) && "opacity-50 cursor-not-allowed"
          )}
        >
          {actionLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isActive ? (
            <Square className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {isActive ? "감시 중지" : "감시 시작"}
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6" data-tour="watcher-status">
        <StatusCard
          icon={Eye}
          label="상태"
          value={isActive ? "감시 중" : "중지됨"}
          color={isActive ? "text-emerald-400" : "text-zinc-500"}
        />
        <StatusCard
          icon={Activity}
          label="감지된 변경"
          value={String(watcherStatus?.changes_count ?? 0)}
          color="text-violet-400"
        />
        <StatusCard
          icon={Clock}
          label="마지막 변경"
          value={watcherStatus?.last_change_at ? formatAgo(watcherStatus.last_change_at) : "-"}
          color="text-cyan-400"
        />
        <StatusCard
          icon={AlertTriangle}
          label="드리프트 경고"
          value={String(driftReports.length)}
          color={driftReports.length > 0 ? "text-amber-400" : "text-zinc-500"}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Live Change Feed */}
        <div className="col-span-2" data-tour="watcher-feed">
          <h2 className="text-lg font-semibold text-zinc-200 mb-3">실시간 변경 피드</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {liveChanges.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">
                <Eye className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                <p className="text-sm">감지된 파일 변경이 없습니다</p>
                <p className="text-xs mt-1">감시를 시작하면 변경 사항이 여기에 표시됩니다</p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto divide-y divide-zinc-800">
                {liveChanges.map((change, i) => {
                  const config = changeTypeConfig[change.change_type] ?? fallbackChange;
                  const Icon = config.icon;
                  const time = change.timestamp ? new Date(change.timestamp) : null;

                  return (
                    <div
                      key={`${change.file_path}-${change.timestamp}-${i}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/50 transition"
                    >
                      <Icon className={clsx("w-4 h-4 shrink-0", config.color)} />
                      <span className={clsx("px-1.5 py-0.5 rounded text-[10px] font-medium", config.color, `${config.color}/10`)}>
                        {config.label}
                      </span>
                      <span className="text-sm text-zinc-300 truncate flex-1 font-mono">
                        {change.file_path}
                      </span>
                      {time && (
                        <span className="text-xs text-zinc-600 shrink-0">
                          {time.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Drift Detection Panel */}
        <div data-tour="watcher-drift">
          <h2 className="text-lg font-semibold text-zinc-200 mb-3">드리프트 감지</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {driftReports.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                <p className="text-sm">드리프트 없음</p>
                <p className="text-xs mt-1">코드와 문서가 동기화되어 있습니다</p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto divide-y divide-zinc-800">
                {driftReports.map((report) => (
                  <div key={report.commit_hash} className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-mono text-xs text-amber-400">{report.commit_hash}</span>
                    </div>
                    <p className="text-sm text-zinc-300 mb-1">{report.commit_subject}</p>
                    <div className="text-xs text-zinc-500">
                      <span>코드 {report.code_files_changed.length}개 변경, 문서 미갱신</span>
                    </div>
                    {report.suggested_docs.length > 0 && (
                      <div className="mt-1.5">
                        <span className="text-[10px] text-zinc-600">갱신 필요:</span>
                        {report.suggested_docs.slice(0, 3).map((doc) => (
                          <div key={doc} className="text-[10px] text-zinc-500 truncate font-mono">{doc}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={clsx("w-4 h-4", color)} />
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <div className={clsx("text-lg font-bold", color)}>{value}</div>
    </div>
  );
}

function formatAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}초 전`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
