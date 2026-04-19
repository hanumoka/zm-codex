import { useEffect, useState } from "react";
import { GitCommitHorizontal, FileText, AlertTriangle, Zap, Loader2, Link2 } from "lucide-react";
import { api } from "../lib/api/client";
import { clsx } from "clsx";
import { usePageTour } from "../hooks/usePageTour";

interface ChangeEntry {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  commit?: string;
  files?: string[];
  linked_documents?: string[];
  event_name?: string;
  tool_name?: string;
  doc_type?: string;
  file_path?: string;
}

interface ChangesResponse {
  project_id: string;
  project_name: string;
  timeline: ChangeEntry[];
  total: number;
}

const typeConfig: Record<string, { icon: typeof GitCommitHorizontal; color: string; bg: string; label: string }> = {
  commit: { icon: GitCommitHorizontal, color: "text-violet-400", bg: "bg-violet-500", label: "COMMIT" },
  doc_update: { icon: FileText, color: "text-cyan-400", bg: "bg-cyan-500", label: "DOC" },
  hook_event: { icon: Zap, color: "text-emerald-400", bg: "bg-emerald-500", label: "HOOK" },
};

const fallbackConfig = { icon: AlertTriangle, color: "text-zinc-400", bg: "bg-zinc-500", label: "OTHER" };

export function ChangesPage() {
  usePageTour("changes");
  const [changes, setChanges] = useState<ChangeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const projects = await api.get<{ id: string; name: string }[]>("/v1/projects");
        if (projects.length > 0) {
          const data = await api.get<ChangesResponse>(`/v1/changes?project_id=${projects[0]!.id}&limit=30`);
          setChanges(data.timeline);
          setProjectName(data.project_name);
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="p-6 flex items-center gap-2 text-zinc-500"><Loader2 className="w-4 h-4 animate-spin" /> 변경 이력 로딩 중...</div>;
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6" data-tour="changes-header">
        <h1 className="text-2xl font-bold text-zinc-100">Change Tracker</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {projectName ? `${projectName} — ` : ""}커밋 + 문서 변경 + 훅 이벤트 통합 타임라인
        </p>
      </div>

      {changes.length === 0 ? (
        <div className="text-center py-20 text-zinc-600">
          <GitCommitHorizontal className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <p>변경 이력이 없습니다</p>
          <p className="text-sm mt-1">git 커밋을 생성하거나 Claude Code 세션을 시작하면 여기에 표시됩니다</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-zinc-800" />

          {changes.map((change, i) => {
            const config = typeConfig[change.type] ?? fallbackConfig;
            const Icon = config.icon;
            const date = new Date(change.timestamp);

            return (
              <div key={`${change.timestamp}-${i}`} className="relative flex gap-4 pb-6" data-tour={i === 0 ? "changes-timeline" : undefined}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-zinc-950 bg-zinc-900">
                  <Icon className={clsx("w-4 h-4", config.color)} />
                </div>
                <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", `${config.bg}/10`, config.color)}>
                        {config.label}
                      </span>
                      <h4 className="text-sm font-medium text-zinc-200">{change.title}</h4>
                    </div>
                    <span className="text-xs text-zinc-600 shrink-0">
                      {date.toLocaleDateString("ko-KR")} {date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {change.description && <p className="text-sm text-zinc-400">{change.description}</p>}
                  {change.commit && (
                    <span className="inline-block mt-2 font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">{change.commit}</span>
                  )}
                  {change.files && change.files.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {change.files.slice(0, 5).map((f) => (
                        <span key={f} className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded truncate max-w-[200px]">{f}</span>
                      ))}
                      {change.files.length > 5 && (
                        <span className="text-[10px] text-zinc-600">+{change.files.length - 5} more</span>
                      )}
                    </div>
                  )}
                  {change.linked_documents && change.linked_documents.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1" data-tour={i === 0 ? "changes-linked-docs" : undefined}>
                      <Link2 className="w-3 h-3 text-violet-400" />
                      {change.linked_documents.slice(0, 3).map((doc) => (
                        <span key={doc} className="text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded truncate max-w-[200px]">{doc}</span>
                      ))}
                      {change.linked_documents.length > 3 && (
                        <span className="text-[10px] text-violet-400">+{change.linked_documents.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
