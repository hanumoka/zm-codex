import { useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  Position,
  MarkerType,
  Handle,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { KanbanSquare, GitBranch, Play, Bot, Zap, CircleDot, CheckCircle2, Clock, AlertCircle, Sparkles } from "lucide-react";
import { api, subscribeSSE, type SSEEvent } from "../lib/api/client";
import { useWorkflowStore, type WorkflowNode, type WorkflowInstance } from "../stores/workflowStore";
import { WorkflowCreateButton } from "../components/WorkflowCreateButton";
import { WorkflowEditActions } from "../components/WorkflowEditActions";
import { InstancePanel } from "../components/InstancePanel";
import { clsx } from "clsx";

// ── Custom Node Component ──

const nodeTypeColors: Record<string, { bg: string; border: string; icon: typeof Play }> = {
  start: { bg: "bg-emerald-500/10", border: "border-emerald-500/40", icon: Play },
  step: { bg: "bg-violet-500/10", border: "border-violet-500/40", icon: CircleDot },
  decision: { bg: "bg-amber-500/10", border: "border-amber-500/40", icon: GitBranch },
  end: { bg: "bg-zinc-500/10", border: "border-zinc-500/40", icon: CheckCircle2 },
};

type WorkflowNodeData = WorkflowNode & { stepStatus?: string };

function WorkflowNodeComponent({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as WorkflowNodeData;
  const style = nodeTypeColors[d.type] ?? nodeTypeColors.step!;
  const Icon = style.icon;

  const statusBorder =
    d.stepStatus === "running" ? "ring-2 ring-emerald-400 ring-offset-1 ring-offset-zinc-950" :
    d.stepStatus === "completed" ? "ring-2 ring-zinc-600 ring-offset-1 ring-offset-zinc-950" :
    "";

  return (
    <div className={clsx(
      "px-4 py-3 rounded-xl border min-w-[140px] text-center",
      style.bg, style.border, statusBorder
    )}>
      <Handle type="target" position={Position.Left} className="!bg-zinc-600 !w-2 !h-2" />
      <div className="flex items-center justify-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-200">{d.label}</span>
      </div>
      {(d.skill ?? d.agent ?? d.hook) && (
        <div className="flex items-center justify-center gap-1 mt-1">
          {d.skill && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />{d.skill}</span>}
          {d.agent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 flex items-center gap-0.5"><Bot className="w-2.5 h-2.5" />{d.agent}</span>}
        </div>
      )}
      {d.stepStatus && (
        <div className={clsx("text-[10px] mt-1",
          d.stepStatus === "running" && "text-emerald-400",
          d.stepStatus === "completed" && "text-zinc-500",
          d.stepStatus === "failed" && "text-red-400",
          d.stepStatus === "pending" && "text-zinc-600",
        )}>
          {d.stepStatus === "running" ? "실행 중" : d.stepStatus === "completed" ? "완료" : d.stepStatus === "failed" ? "실패" : "대기"}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-zinc-600 !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = { workflowNode: WorkflowNodeComponent };

// ── Pipeline View ──

function PipelineView({ workflow, activeInstance }: { workflow: typeof useWorkflowStore extends never ? never : ReturnType<typeof useWorkflowStore.getState>["workflows"][0]; activeInstance: WorkflowInstance | undefined }) {
  const nodes: Node[] = workflow.nodes.map((n) => {
    const stepStatus = activeInstance?.steps.find((s) => s.node_id === n.id)?.status;
    return {
      id: n.id,
      type: "workflowNode",
      position: n.position,
      data: { ...n, stepStatus },
    };
  });

  const edges: Edge[] = workflow.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.condition,
    type: "smoothstep",
    animated: activeInstance?.current_node === e.source,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#71717a" },
    style: { stroke: "#3f3f46", strokeWidth: 2 },
    labelStyle: { fill: "#71717a", fontSize: 10 },
  }));

  return (
    <div className="h-[calc(100vh-220px)] bg-zinc-950 rounded-xl border border-zinc-800">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background color="#27272a" gap={20} />
        <Controls className="!bg-zinc-900 !border-zinc-700 !text-zinc-400 [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-400" />
        <MiniMap
          nodeColor="#3f3f46"
          maskColor="rgba(0,0,0,0.7)"
          className="!bg-zinc-900 !border-zinc-800"
        />
      </ReactFlow>
    </div>
  );
}

// ── Kanban View ──

const kanbanColumns = [
  { status: "pending", label: "대기", color: "border-zinc-600", icon: Clock },
  { status: "running", label: "진행 중", color: "border-violet-500", icon: Play },
  { status: "completed", label: "완료", color: "border-emerald-500", icon: CheckCircle2 },
  { status: "failed", label: "실패", color: "border-red-500", icon: AlertCircle },
];

function KanbanView({ workflow, instances }: { workflow: ReturnType<typeof useWorkflowStore.getState>["workflows"][0]; instances: WorkflowInstance[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {kanbanColumns.map((col) => {
        const ColIcon = col.icon;
        // Group instances by their step statuses
        const cards = instances.flatMap((inst) =>
          inst.steps
            .filter((s) => s.status === col.status)
            .map((s) => {
              const node = workflow.nodes.find((n: WorkflowNode) => n.id === s.node_id);
              return { step: s, node, instance: inst };
            })
        );

        return (
          <div key={col.status} className="min-w-[240px] w-[240px] shrink-0">
            <div className={clsx("flex items-center gap-2 mb-3 pb-2 border-b-2", col.color)}>
              <ColIcon className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-medium text-zinc-300">{col.label}</h3>
              <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">{cards.length}</span>
            </div>
            <div className="space-y-2">
              {cards.map((card) => (
                <div key={card.step.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition">
                  <div className="text-sm font-medium text-zinc-200 mb-1">{card.node?.label ?? card.step.node_id}</div>
                  <div className="text-xs text-zinc-500 mb-2">{card.instance.title}</div>
                  {card.node?.agent && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 inline-flex items-center gap-0.5">
                      <Bot className="w-2.5 h-2.5" />{card.node.agent}
                    </span>
                  )}
                  {card.node?.skill && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 inline-flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" />{card.node.skill}
                    </span>
                  )}
                </div>
              ))}
              {cards.length === 0 && (
                <div className="text-xs text-zinc-700 text-center py-6 border border-dashed border-zinc-800 rounded-lg">비어 있음</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ──

interface AutoDetectResult {
  detected_type: string;
  confidence: number;
  matching_workflow_id: string | null;
  commits_analyzed: number;
  commit_subjects: string[];
}

export function WorkflowPage() {
  const { workflows, selectedWorkflowId, instances, highlightedInstanceId, viewMode, setViewMode, setSelectedWorkflow, fetchWorkflows, fetchInstances } = useWorkflowStore();
  const [loading, setLoading] = useState(true);
  const [autoDetect, setAutoDetect] = useState<AutoDetectResult | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch workflows for the first project
    (async () => {
      try {
        const projects = await api.get<{ id: string }[]>("/v1/projects");
        if (projects.length > 0) {
          setProjectId(projects[0]!.id);
          await fetchWorkflows(projects[0]!.id);
        }
      } catch {
        // API not available — use empty state
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchWorkflows]);

  useEffect(() => {
    if (selectedWorkflowId) {
      fetchInstances(selectedWorkflowId);
    }
  }, [selectedWorkflowId, fetchInstances]);

  // Cross-tab / other-client sync: refetch on workflow/instance mutations.
  useEffect(() => {
    if (!projectId) return;
    const onEvent = (evt: SSEEvent) => {
      const t = evt.type;
      if (t === "workflow_created" || t === "workflow_updated" || t === "workflow_deleted") {
        void fetchWorkflows(projectId);
      } else if (t === "instance_created" || t === "instance_updated" || t === "instance_deleted") {
        const current = useWorkflowStore.getState().selectedWorkflowId;
        if (current) void fetchInstances(current);
      }
    };
    return subscribeSSE("/stream/events", onEvent);
  }, [projectId, fetchWorkflows, fetchInstances]);

  const handleAutoDetect = async () => {
    if (!projectId) return;
    setDetecting(true);
    try {
      const result = await api.get<AutoDetectResult>(`/v1/workflows/auto-detect?project_id=${projectId}`);
      setAutoDetect(result);
      if (result.matching_workflow_id) {
        setSelectedWorkflow(result.matching_workflow_id);
      }
    } catch {
      // auto-detect failed
    } finally {
      setDetecting(false);
    }
  };

  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);
  const activeInstance =
    instances.find((i) => i.id === highlightedInstanceId) ??
    instances.find((i) => i.status === "active");

  if (loading) {
    return <div className="p-6 text-zinc-500">워크플로우 로딩 중...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Workflow Manager</h1>
          <p className="text-sm text-zinc-500 mt-1">워크플로우를 정의하고, 실행 상태를 모니터링합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <WorkflowCreateButton projectId={projectId} />
          <button
            onClick={handleAutoDetect}
            disabled={detecting || !projectId}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition",
              "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20",
              (detecting || !projectId) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Sparkles className="w-4 h-4" /> {detecting ? "분석 중..." : "자동 감지"}
          </button>
          <button
            onClick={() => setViewMode("pipeline")}
            className={clsx("px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition",
              viewMode === "pipeline" ? "bg-violet-500/20 text-violet-400" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
            )}
          >
            <GitBranch className="w-4 h-4" /> 파이프라인
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={clsx("px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition",
              viewMode === "kanban" ? "bg-violet-500/20 text-violet-400" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
            )}
          >
            <KanbanSquare className="w-4 h-4" /> 칸반
          </button>
        </div>
      </div>

      {/* Auto-detect Result */}
      {autoDetect && (
        <div className="mb-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1 text-sm">
            <span className="text-zinc-300">감지된 워크플로우: </span>
            <span className="text-amber-400 font-medium">{autoDetect.detected_type}</span>
            <span className="text-zinc-500 ml-2">(신뢰도 {(autoDetect.confidence * 100).toFixed(0)}%, {autoDetect.commits_analyzed}개 커밋 분석)</span>
          </div>
          <button onClick={() => setAutoDetect(null)} className="text-xs text-zinc-600 hover:text-zinc-400">닫기</button>
        </div>
      )}

      {/* Workflow Selector */}
      {workflows.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className={clsx(
                "group inline-flex items-center rounded-lg text-sm transition border",
                selectedWorkflowId === wf.id
                  ? "bg-violet-500/20 text-violet-400 border-violet-500/30"
                  : "bg-zinc-800 text-zinc-500 hover:text-zinc-300 border-zinc-700"
              )}
            >
              <button
                type="button"
                onClick={() => setSelectedWorkflow(wf.id)}
                className="px-3 py-1.5 text-left"
              >
                {wf.name}
                <span className="ml-2 text-xs text-zinc-600">{wf.nodes.length} nodes</span>
              </button>
              <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                <WorkflowEditActions workflow={wf} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Instances */}
      {selectedWorkflow && <InstancePanel workflow={selectedWorkflow} instances={instances} />}

      {/* View */}
      {selectedWorkflow ? (
        viewMode === "pipeline" ? (
          <PipelineView workflow={selectedWorkflow} activeInstance={activeInstance} />
        ) : (
          <KanbanView workflow={selectedWorkflow} instances={instances} />
        )
      ) : (
        <div className="text-center py-20 text-zinc-600">
          <GitBranch className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <p>등록된 워크플로우가 없습니다</p>
          <p className="text-sm mt-1">프로젝트를 먼저 등록하고 워크플로우를 생성하세요</p>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-zinc-300 mb-2">워크플로우 매니저가 해결하는 문제</h3>
        <div className="grid grid-cols-3 gap-4 text-xs text-zinc-500">
          <div className="bg-zinc-900 rounded-lg p-3">
            <div className="text-violet-400 font-medium mb-1">멀티 워크플로우</div>
            기획, 개발, 버그수정, 배포 등 여러 워크플로우를 한 프로젝트에서 동시 관리
          </div>
          <div className="bg-zinc-900 rounded-lg p-3">
            <div className="text-cyan-400 font-medium mb-1">이중 뷰</div>
            같은 데이터를 n8n 노드 파이프라인 + 칸반 보드 두 가지로 시각화
          </div>
          <div className="bg-zinc-900 rounded-lg p-3">
            <div className="text-emerald-400 font-medium mb-1">스킬/에이전트 매핑</div>
            각 워크플로우 노드에 Claude Code 스킬, 에이전트, 훅을 직접 연결
          </div>
        </div>
      </div>
    </div>
  );
}
