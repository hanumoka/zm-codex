import { useEffect, useState, useCallback } from "react";
import { FileText, KanbanSquare, Shield, AlertTriangle, Bot, Zap, Radio, Database, GitBranch } from "lucide-react";
import { api, subscribeSSE, type SSEEvent } from "../lib/api/client";

interface DashboardStats {
  documents: number;
  memories: number;
  workflows: number;
  instances: number;
  hook_events: number;
  agents: number;
  rules: number;
  hooks: number;
  skills: number;
  policies: number;
  doc_types: Record<string, number>;
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: typeof FileText; label: string; value: number | string; sub: string; color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-sm text-zinc-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-zinc-100">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{sub}</div>
    </div>
  );
}

function LiveEventFeed() {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [connected, setConnected] = useState(false);

  const handleEvent = useCallback((event: SSEEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    setConnected(true);
    const unsubscribe = subscribeSSE("/stream/events", handleEvent);
    return () => { unsubscribe(); setConnected(false); };
  }, [handleEvent]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400" />
          실시간 이벤트 피드
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded ${connected ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
          {connected ? "SSE 연결됨" : "연결 안됨"}
        </span>
      </div>
      {events.length === 0 ? (
        <div className="text-sm text-zinc-600 py-4 text-center">
          Claude Code에서 HTTP 훅 이벤트를 수신 대기 중...
          <div className="text-xs mt-2 text-zinc-700">Claude Code 세션을 시작하면 여기에 실시간으로 이벤트가 표시됩니다.</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {events.map((event, i) => (
            <div key={`${event.timestamp}-${i}`} className="flex items-start gap-3 text-sm">
              <span className="px-2 py-0.5 rounded text-xs font-medium shrink-0 bg-emerald-500/10 text-emerald-400">
                {typeof event.data.event_name === "string" ? event.data.event_name : event.type}
              </span>
              <div className="flex-1 min-w-0">
                {typeof event.data.tool_name === "string" && <span className="text-zinc-300 font-mono text-xs">{event.data.tool_name}</span>}
                {typeof event.data.session_id === "string" && <span className="text-zinc-600 text-xs ml-2">session: {event.data.session_id.slice(0, 8)}</span>}
              </div>
              <span className="text-xs text-zinc-600 shrink-0">{new Date(event.timestamp).toLocaleTimeString("ko-KR")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const projects = await api.get<{ id: string; name: string }[]>("/v1/projects");
        if (projects.length > 0) {
          setProjectName(projects[0]!.name);
          const s = await api.get<DashboardStats>(`/v1/dashboard/stats?project_id=${projects[0]!.id}`);
          setStats(s);
        }
      } catch { /* API not ready */ }
    })();
  }, []);

  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {projectName ? <>프로젝트 <span className="text-violet-400 font-medium">{projectName}</span>의 전체 현황</> : "프로젝트를 등록하세요"}
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard icon={FileText} label="문서" value={stats.documents} sub={`${Object.keys(stats.doc_types).length}가지 유형`} color="#8b5cf6" />
            <StatCard icon={Database} label="메모리 청크" value={stats.memories} sub="pgvector 시맨틱 검색" color="#06b6d4" />
            <StatCard icon={GitBranch} label="워크플로우" value={stats.workflows} sub={`인스턴스 ${stats.instances}개`} color="#22c55e" />
            <StatCard icon={Zap} label="훅 이벤트" value={stats.hook_events} sub="Claude Code에서 수신" color="#f97316" />
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard icon={Bot} label="에이전트" value={stats.agents} sub=".claude/agents/" color="#ec4899" />
            <StatCard icon={Shield} label="규칙" value={stats.rules} sub=".claude/rules/" color="#eab308" />
            <StatCard icon={KanbanSquare} label="스킬" value={stats.skills} sub=".claude/skills/" color="#6366f1" />
            <StatCard icon={AlertTriangle} label="정책" value={stats.policies} sub="policy-registry.md" color="#ef4444" />
          </div>

          {/* Document Type Breakdown */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-medium text-zinc-300 mb-3">문서 유형 분포</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.doc_types).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <div key={type} className="px-3 py-1.5 bg-zinc-800 rounded-lg text-sm flex items-center gap-2">
                  <span className="text-zinc-400">{type}</span>
                  <span className="text-zinc-200 font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!stats && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-600 mb-6">
          <Database className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
          <p>프로젝트를 등록하면 통계가 표시됩니다</p>
          <p className="text-xs mt-1">POST /api/v1/projects 로 프로젝트를 등록하세요</p>
        </div>
      )}

      {/* Live Event Feed */}
      <LiveEventFeed />
    </div>
  );
}
