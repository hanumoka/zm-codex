import { useEffect, useState } from "react";
import { FileText, Loader2, FolderOpen, History, FilePlus2, FileEdit, FileX2, Copy } from "lucide-react";
import { api } from "../lib/api/client";
import { clsx } from "clsx";
import { usePageTour } from "../hooks/usePageTour";

interface ConfigChangeEntry {
  id: string;
  file_path: string;
  change_type: string;
  detected_at: string | null;
}

interface ApiDocument {
  id: string;
  file_path: string;
  file_name: string;
  doc_type: string | null;
  file_size: number;
  last_modified: string | null;
}

export function ConfigPage() {
  usePageTour("config");
  const [docs, setDocs] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [configHistory, setConfigHistory] = useState<ConfigChangeEntry[]>([]);
  const [templateSummary, setTemplateSummary] = useState<Record<string, number> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const projects = await api.get<{ id: string; name: string }[]>("/v1/projects");
        if (projects.length > 0) {
          const pid = projects[0]!.id;
          setProjectId(pid);
          setProjectName(projects[0]!.name);
          const allDocs = await api.get<ApiDocument[]>(`/v1/projects/${pid}/documents`);
          setDocs(allDocs.filter((d) => d.file_path.startsWith(".claude/")));

          // Fetch config change history
          try {
            const history = await api.get<{ changes: ConfigChangeEntry[] }>(`/v1/config/history?project_id=${pid}`);
            setConfigHistory(history.changes);
          } catch {
            // history may be empty
          }
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return <div className="p-6 flex items-center gap-2 text-zinc-500"><Loader2 className="w-4 h-4 animate-spin" /> 설정 로딩 중...</div>;
  }

  // Group by doc_type
  const grouped: Record<string, ApiDocument[]> = {};
  for (const doc of docs) {
    const type = doc.doc_type ?? "other";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(doc);
  }

  const typeLabels: Record<string, { label: string; color: string }> = {
    agent: { label: "Agents", color: "text-violet-400" },
    rule: { label: "Rules", color: "text-orange-400" },
    mistakes: { label: "Known Mistakes", color: "text-red-400" },
    hook: { label: "Hooks", color: "text-amber-400" },
    skill: { label: "Skills", color: "text-pink-400" },
    memory: { label: "Memory", color: "text-cyan-400" },
    policy: { label: "Policy", color: "text-green-400" },
    config: { label: "Config Files", color: "text-slate-400" },
    other: { label: "Other", color: "text-zinc-400" },
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Config Sync</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {projectName} 프로젝트의 Claude Code 설정 현황
          </p>
        </div>
        <button
          onClick={async () => {
            if (!projectId) return;
            setGenerating(true);
            try {
              const res = await api.post<{ total_files: number; summary: Record<string, number> }>(`/v1/config/template/generate?project_id=${projectId}`, {});
              setTemplateSummary(res.summary);
            } catch { /* ignore */ }
            finally { setGenerating(false); }
          }}
          disabled={generating || !projectId}
          data-tour="config-template"
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition",
            "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20",
            (generating || !projectId) && "opacity-50 cursor-not-allowed"
          )}
        >
          <Copy className="w-4 h-4" /> {generating ? "생성 중..." : "템플릿 생성"}
        </button>
      </div>

      {/* Template Summary */}
      {templateSummary && (
        <div className="mb-6 bg-violet-500/5 border border-violet-500/20 rounded-xl p-4">
          <h3 className="text-sm font-medium text-violet-400 mb-2">생성된 템플릿</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(templateSummary).map(([cat, count]) => (
              <div key={cat} className="px-3 py-1 bg-zinc-800 rounded text-xs text-zinc-300">
                {cat}: <span className="text-violet-400 font-medium">{count}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-2">다른 프로젝트를 등록하면 이 템플릿을 적용할 수 있습니다</p>
        </div>
      )}

      {/* Summary */}
      <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4" data-tour="config-summary">
        <div className="flex items-center gap-4 mb-3">
          <FolderOpen className="w-5 h-5 text-violet-400" />
          <span className="font-medium text-zinc-200">.claude/ 디렉토리</span>
          <span className="text-xs text-zinc-500 ml-auto">{docs.length}개 파일</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(grouped).sort((a, b) => b[1].length - a[1].length).map(([type, items]) => {
            const info = typeLabels[type] ?? typeLabels.other!;
            return (
              <div key={type} className="px-3 py-1.5 bg-zinc-800 rounded-lg text-sm flex items-center gap-2">
                <span className={info.color}>{info.label}</span>
                <span className="text-zinc-200 font-medium">{items.length}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <div className="mb-6 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-zinc-300 mb-2">Config Sync가 해결하는 문제</h3>
        <div className="text-xs text-zinc-500 space-y-1">
          <p>- 여러 프로젝트에서 Claude Code 설정(rules, agents, hooks)이 각각 다르게 관리됨</p>
          <p>- 한 프로젝트에서 발견한 좋은 패턴을 다른 프로젝트에 적용하기 어려움</p>
          <p>- 두 번째 프로젝트를 등록하면 <span className="text-violet-400">프로젝트 간 설정 비교</span>가 활성화됩니다</p>
        </div>
      </div>

      {/* Config Change History */}
      {configHistory.length > 0 && (
        <div className="mb-6" data-tour="config-history">
          <h3 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" /> 설정 변경 이력
          </h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="max-h-[200px] overflow-y-auto divide-y divide-zinc-800">
              {configHistory.map((entry) => {
                const Icon = entry.change_type === "created" ? FilePlus2 : entry.change_type === "deleted" ? FileX2 : FileEdit;
                const color = entry.change_type === "created" ? "text-emerald-400" : entry.change_type === "deleted" ? "text-red-400" : "text-amber-400";
                return (
                  <div key={entry.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                    <Icon className={clsx("w-3.5 h-3.5 shrink-0", color)} />
                    <span className="font-mono text-xs text-zinc-300 truncate flex-1">{entry.file_path}</span>
                    <span className="text-xs text-zinc-600 shrink-0">
                      {entry.detected_at ? new Date(entry.detected_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* File List by Type */}
      <div data-tour="config-file-list">
      {Object.entries(grouped).sort((a, b) => {
        const order = ["agent", "rule", "mistakes", "hook", "skill", "memory", "policy", "config"];
        return order.indexOf(a[0]) - order.indexOf(b[0]);
      }).map(([type, items]) => {
        const info = typeLabels[type] ?? typeLabels.other!;
        return (
          <div key={type} className="mb-4">
            <h3 className={clsx("text-sm font-medium mb-2", info.color)}>{info.label} ({items.length})</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {items.map((doc) => (
                    <tr key={doc.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-zinc-600" />
                          <span className="font-mono text-xs text-zinc-300">{doc.file_path}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-500 text-right w-24">
                        {doc.file_size > 1024 ? `${(doc.file_size / 1024).toFixed(1)}KB` : `${doc.file_size}B`}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-600 text-right w-32">
                        {doc.last_modified ? new Date(doc.last_modified).toLocaleDateString("ko-KR") : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
