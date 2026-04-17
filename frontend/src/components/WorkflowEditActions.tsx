import { useEffect, useState } from "react";
import { Pencil, Trash2, Loader2, Download } from "lucide-react";
import { clsx } from "clsx";
import { useWorkflowStore, type Workflow } from "../stores/workflowStore";
import { extractApiMessage } from "../lib/api/errors";
import { ModalShell } from "./ModalShell";

type Action = "rename" | "delete" | "export" | null;

interface Props {
  workflow: Workflow;
}

export function WorkflowEditActions({ workflow }: Props) {
  const [action, setAction] = useState<Action>(null);

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <>
      <button
        type="button"
        onClick={stop(() => setAction("export"))}
        title=".claude/workflows로 내보내기"
        className="p-0.5 rounded text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800/50 transition"
      >
        <Download className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={stop(() => setAction("rename"))}
        title="이름 수정"
        className="p-0.5 rounded text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800/50 transition"
      >
        <Pencil className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={stop(() => setAction("delete"))}
        title="삭제"
        className="p-0.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800/50 transition"
      >
        <Trash2 className="w-3 h-3" />
      </button>
      {action === "rename" && (
        <RenameModal workflow={workflow} onClose={() => setAction(null)} />
      )}
      {action === "delete" && (
        <DeleteConfirmModal workflow={workflow} onClose={() => setAction(null)} />
      )}
      {action === "export" && (
        <ExportModal workflow={workflow} onClose={() => setAction(null)} />
      )}
    </>
  );
}

function RenameModal({ workflow, onClose }: { workflow: Workflow; onClose: () => void }) {
  const { updateWorkflow } = useWorkflowStore();
  const [name, setName] = useState(workflow.name);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setName(workflow.name); }, [workflow.name]);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && trimmed !== workflow.name && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateWorkflow(workflow.id, { name: trimmed });
      onClose();
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="워크플로우 이름 수정" onClose={onClose}>
      {error && <div className="text-sm text-red-400 mb-3">{error}</div>}
      <label className="block">
        <span className="block text-xs text-zinc-400 mb-1">이름</span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) handleSubmit(); }}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50"
        />
      </label>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600"
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition",
            "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/40",
            !canSubmit && "opacity-50 cursor-not-allowed"
          )}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />} 저장
        </button>
      </div>
    </ModalShell>
  );
}

function DeleteConfirmModal({ workflow, onClose }: { workflow: Workflow; onClose: () => void }) {
  const { deleteWorkflow } = useWorkflowStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await deleteWorkflow(workflow.id);
      onClose();
    } catch (e) {
      setError(extractApiMessage(e));
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="워크플로우 삭제" onClose={onClose}>
      {error && <div className="text-sm text-red-400 mb-3">{error}</div>}
      <p className="text-sm text-zinc-300">
        <span className="text-zinc-100 font-medium">{workflow.name}</span> 워크플로우를 삭제합니다.
      </p>
      <p className="text-xs text-zinc-500 mt-2">
        연결된 인스턴스와 실행 이력도 함께 사라지며, 복구할 수 없습니다.
      </p>
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
          disabled={submitting}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition",
            "bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40",
            submitting && "opacity-60 cursor-not-allowed"
          )}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />} 삭제
        </button>
      </div>
    </ModalShell>
  );
}

function ExportModal({ workflow, onClose }: { workflow: Workflow; onClose: () => void }) {
  const { exportWorkflow } = useWorkflowStore();
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "loading" } | { kind: "success"; path: string } | { kind: "error"; msg: string }
  >({ kind: "idle" });

  const handleExport = async () => {
    setState({ kind: "loading" });
    try {
      const r = await exportWorkflow(workflow.id);
      setState({ kind: "success", path: r.file_path });
    } catch (e) {
      setState({ kind: "error", msg: extractApiMessage(e) });
    }
  };

  return (
    <ModalShell title="워크플로우 내보내기" onClose={onClose}>
      <p className="text-sm text-zinc-300">
        <span className="text-zinc-100 font-medium">{workflow.name}</span> 정의를
        <code className="mx-1 text-xs text-zinc-400">.claude/workflows/</code>
        하위에 Markdown 파일로 기록합니다.
      </p>
      <p className="text-xs text-zinc-500 mt-2">
        이후 다른 프로젝트에서 Import로 불러오거나, Claude Code가 직접 참조할 수 있습니다.
      </p>

      {state.kind === "success" && (
        <div className="mt-4 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-md p-2">
          기록 완료: <code className="text-emerald-300">{state.path}</code>
        </div>
      )}
      {state.kind === "error" && (
        <div className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md p-2">
          {state.msg}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600"
        >
          {state.kind === "success" ? "닫기" : "취소"}
        </button>
        {state.kind !== "success" && (
          <button
            onClick={handleExport}
            disabled={state.kind === "loading"}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition",
              "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40",
              state.kind === "loading" && "opacity-60 cursor-not-allowed",
            )}
          >
            {state.kind === "loading" && <Loader2 className="w-4 h-4 animate-spin" />} 내보내기
          </button>
        )}
      </div>
    </ModalShell>
  );
}
