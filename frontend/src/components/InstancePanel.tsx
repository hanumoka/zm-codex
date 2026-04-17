import { useState } from "react";
import { Plus, ChevronDown, Loader2, Play, Pause, CheckCircle2, Ban, Radar, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import {
  useWorkflowStore,
  type Workflow,
  type WorkflowInstance,
} from "../stores/workflowStore";
import { extractApiMessage } from "../lib/api/errors";
import { ModalShell } from "./ModalShell";

interface Props {
  workflow: Workflow;
  instances: WorkflowInstance[];
}

export function InstancePanel({ workflow, instances }: Props) {
  const { highlightedInstanceId, setHighlightedInstance } = useWorkflowStore();
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Effective highlight: explicit pick, or first active fallback.
  const effectiveHighlightId =
    (highlightedInstanceId && instances.some((i) => i.id === highlightedInstanceId)
      ? highlightedInstanceId
      : instances.find((i) => i.status === "active")?.id) ?? null;

  return (
    <div className="mb-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-zinc-500">실행 중인 인스턴스</h3>
        <button
          onClick={() => setCreating(true)}
          className="px-2 py-1 rounded-md text-xs flex items-center gap-1 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 border border-violet-500/30 transition"
        >
          <Plus className="w-3 h-3" /> 인스턴스
        </button>
      </div>

      {instances.length === 0 ? (
        <div className="text-xs text-zinc-600 py-3 text-center border border-dashed border-zinc-800 rounded-lg">
          실행 중인 인스턴스가 없습니다
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {instances.map((inst) => (
            <InstanceCard
              key={inst.id}
              workflow={workflow}
              instance={inst}
              expanded={expandedId === inst.id}
              highlighted={effectiveHighlightId === inst.id}
              isExplicitHighlight={highlightedInstanceId === inst.id}
              onToggle={() =>
                setExpandedId((id) => (id === inst.id ? null : inst.id))
              }
              onToggleHighlight={() =>
                setHighlightedInstance(highlightedInstanceId === inst.id ? null : inst.id)
              }
            />
          ))}
        </div>
      )}

      {creating && (
        <CreateInstanceModal
          workflow={workflow}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}

// ── Instance Card (collapsible) ──

const STATUS_BADGE: Record<string, { color: string; dot: string; label: string }> = {
  active: { color: "bg-emerald-400", dot: "bg-emerald-400", label: "진행 중" },
  blocked: { color: "bg-amber-400", dot: "bg-amber-400", label: "차단" },
  completed: { color: "bg-zinc-500", dot: "bg-zinc-500", label: "완료" },
  cancelled: { color: "bg-red-400", dot: "bg-red-400", label: "취소" },
};

function InstanceCard({
  workflow,
  instance,
  expanded,
  highlighted,
  isExplicitHighlight,
  onToggle,
  onToggleHighlight,
}: {
  workflow: Workflow;
  instance: WorkflowInstance;
  expanded: boolean;
  highlighted: boolean;
  isExplicitHighlight: boolean;
  onToggle: () => void;
  onToggleHighlight: () => void;
}) {
  const badge = STATUS_BADGE[instance.status] ?? STATUS_BADGE.active!;

  return (
    <div
      className={clsx(
        "rounded-lg border transition",
        expanded
          ? "bg-zinc-900 border-zinc-700 w-full"
          : "bg-zinc-800 hover:border-zinc-700",
        highlighted ? "border-violet-500/50 ring-1 ring-violet-500/20" : "border-zinc-800",
      )}
    >
      <div className="flex items-center">
        <button
          onClick={onToggle}
          className="flex-1 min-w-0 px-3 py-1.5 text-sm text-zinc-300 flex items-center gap-2 text-left"
        >
          <span className={clsx("w-2 h-2 rounded-full inline-block shrink-0", badge.dot)} />
          <span className="font-medium truncate">{instance.title}</span>
          <span className="text-xs text-zinc-600 shrink-0">@ {instance.current_node ?? "-"}</span>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleHighlight(); }}
          title={isExplicitHighlight ? "파이프라인 하이라이트 해제" : "파이프라인에 표시"}
          className={clsx(
            "p-1.5 transition shrink-0",
            isExplicitHighlight ? "text-violet-300" : highlighted ? "text-violet-500/60" : "text-zinc-600 hover:text-zinc-400",
          )}
        >
          <Radar className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          title={expanded ? "접기" : "펼치기"}
          className="p-1.5 pr-2 text-zinc-500 hover:text-zinc-300 shrink-0"
        >
          <ChevronDown
            className={clsx("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")}
          />
        </button>
      </div>
      {expanded && <InstanceControls workflow={workflow} instance={instance} />}
    </div>
  );
}

function InstanceControls({
  workflow,
  instance,
}: {
  workflow: Workflow;
  instance: WorkflowInstance;
}) {
  const { updateInstance, deleteInstance } = useWorkflowStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const patch = async (body: { status?: string; current_node?: string }) => {
    setSubmitting(true);
    setError(null);
    try {
      await updateInstance(workflow.id, instance.id, body);
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const statusBtn = (key: "active" | "blocked" | "completed" | "cancelled", Icon: typeof Play, color: string) => (
    <button
      onClick={() => patch({ status: key })}
      disabled={submitting || instance.status === key}
      className={clsx(
        "px-2 py-1 rounded-md text-xs flex items-center gap-1 border transition",
        instance.status === key
          ? `${color} border-current`
          : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600",
        submitting && "opacity-60 cursor-not-allowed",
      )}
    >
      <Icon className="w-3 h-3" />
      {STATUS_BADGE[key]?.label}
    </button>
  );

  return (
    <div className="border-t border-zinc-800 p-3 space-y-3">
      {error && <div className="text-xs text-red-400">{error}</div>}

      <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">상태</div>
        <div className="flex items-center gap-1.5">
          {statusBtn("active", Play, "bg-emerald-500/15 text-emerald-300")}
          {statusBtn("blocked", Pause, "bg-amber-500/15 text-amber-300")}
          {statusBtn("completed", CheckCircle2, "bg-zinc-500/15 text-zinc-300")}
          {statusBtn("cancelled", Ban, "bg-red-500/15 text-red-300")}
          {submitting && <Loader2 className="w-3 h-3 animate-spin text-zinc-500 ml-1" />}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5">현재 노드</div>
        <select
          value={instance.current_node ?? ""}
          onChange={(e) => patch({ current_node: e.target.value })}
          disabled={submitting}
          className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/50 disabled:opacity-60"
        >
          {instance.current_node == null && (
            <option value="" disabled>— 노드 선택 —</option>
          )}
          {workflow.nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label} ({n.id})
            </option>
          ))}
        </select>
      </div>

      <div className="pt-1 border-t border-zinc-800/60 flex items-center justify-end gap-2">
        {confirmDelete ? (
          <>
            <span className="text-[11px] text-zinc-500">이 인스턴스를 삭제할까요?</span>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={submitting}
              className="px-2 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-200"
            >
              취소
            </button>
            <button
              onClick={async () => {
                setSubmitting(true);
                setError(null);
                try {
                  await deleteInstance(workflow.id, instance.id);
                  // Note: no onClose needed — the card itself disappears from
                  // the parent list when `instances` state drops it.
                } catch (e) {
                  setError(extractApiMessage(e));
                  setSubmitting(false);
                  setConfirmDelete(false);
                }
              }}
              disabled={submitting}
              className="px-2 py-0.5 text-[11px] text-red-300 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-md flex items-center gap-1"
            >
              {submitting && <Loader2 className="w-3 h-3 animate-spin" />} 확정
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={submitting}
            title="이 인스턴스 삭제"
            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800/50 transition disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Create Instance Modal ──

function CreateInstanceModal({
  workflow,
  onClose,
}: {
  workflow: Workflow;
  onClose: () => void;
}) {
  const { createInstance } = useWorkflowStore();
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = title.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await createInstance(workflow.id, trimmed);
      onClose();
    } catch (e) {
      setError(extractApiMessage(e));
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="인스턴스 생성" onClose={onClose}>
      {error && <div className="text-sm text-red-400 mb-3">{error}</div>}
      <p className="text-xs text-zinc-500 mb-3">
        워크플로우 <span className="text-zinc-300">{workflow.name}</span>의 새 실행 인스턴스를 시작합니다.
        start 노드부터 자동으로 진행됩니다.
      </p>
      <label className="block">
        <span className="block text-xs text-zinc-400 mb-1">제목 *</span>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) handleSubmit(); }}
          placeholder="예: 2026-04-18 버그 수정 작업"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
        />
      </label>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onClose}
          disabled={submitting}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 disabled:opacity-50"
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition",
            "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/40",
            !canSubmit && "opacity-50 cursor-not-allowed",
          )}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />} 생성
        </button>
      </div>
    </ModalShell>
  );
}
