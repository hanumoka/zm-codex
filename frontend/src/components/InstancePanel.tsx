import { useState } from "react";
import { Plus, ChevronDown, Loader2, Play, Pause, CheckCircle2 } from "lucide-react";
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
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
              onToggle={() =>
                setExpandedId((id) => (id === inst.id ? null : inst.id))
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
};

function InstanceCard({
  workflow,
  instance,
  expanded,
  onToggle,
}: {
  workflow: Workflow;
  instance: WorkflowInstance;
  expanded: boolean;
  onToggle: () => void;
}) {
  const badge = STATUS_BADGE[instance.status] ?? STATUS_BADGE.active!;

  return (
    <div
      className={clsx(
        "rounded-lg border transition",
        expanded
          ? "bg-zinc-900 border-zinc-700 w-full"
          : "bg-zinc-800 border-zinc-800 hover:border-zinc-700",
      )}
    >
      <button
        onClick={onToggle}
        className="w-full px-3 py-1.5 text-sm text-zinc-300 flex items-center gap-2"
      >
        <div className={clsx("w-2 h-2 rounded-full", badge.dot)} />
        <span className="font-medium">{instance.title}</span>
        <span className="text-xs text-zinc-600">@ {instance.current_node ?? "-"}</span>
        <ChevronDown
          className={clsx(
            "w-3 h-3 text-zinc-500 ml-auto transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
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
  const { updateInstance } = useWorkflowStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const statusBtn = (key: "active" | "blocked" | "completed", Icon: typeof Play, color: string) => (
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
          {workflow.nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label} ({n.id})
            </option>
          ))}
        </select>
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
