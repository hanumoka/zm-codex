import { useEffect, useRef, useState } from "react";
import { Plus, Sparkles, PencilLine, Loader2, Upload } from "lucide-react";
import { clsx } from "clsx";
import { useWorkflowStore, type TemplateInfo } from "../stores/workflowStore";
import { extractApiMessage } from "../lib/api/errors";
import { ModalShell } from "./ModalShell";

type ModalKind = "template" | "manual" | "import" | null;

interface Props {
  projectId: string | null;
}

export function WorkflowCreateButton({ projectId }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const disabled = !projectId;

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          disabled={disabled}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition",
            "bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 border border-violet-500/30",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Plus className="w-4 h-4" /> 생성
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg overflow-hidden z-20">
            <button
              onClick={() => { setMenuOpen(false); setModal("template"); }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" /> 템플릿으로 생성
            </button>
            <button
              onClick={() => { setMenuOpen(false); setModal("manual"); }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
            >
              <PencilLine className="w-4 h-4 text-cyan-400" /> 직접 입력
            </button>
            <button
              onClick={() => { setMenuOpen(false); setModal("import"); }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2 border-t border-zinc-800"
            >
              <Upload className="w-4 h-4 text-emerald-400" /> 파일에서 가져오기
            </button>
          </div>
        )}
      </div>

      {modal === "template" && projectId && (
        <TemplatePickerModal projectId={projectId} onClose={() => setModal(null)} />
      )}
      {modal === "manual" && projectId && (
        <ManualCreateModal projectId={projectId} onClose={() => setModal(null)} />
      )}
      {modal === "import" && projectId && (
        <ImportModal projectId={projectId} onClose={() => setModal(null)} />
      )}
    </>
  );
}

// ── Template Picker Modal ──

function TemplatePickerModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { listTemplates, createFromTemplate } = useWorkflowStore();
  const [templates, setTemplates] = useState<TemplateInfo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await listTemplates();
        setTemplates(data);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "템플릿 목록을 불러오지 못했습니다");
      }
    })();
  }, [listTemplates]);

  const handleCreate = async (t: TemplateInfo) => {
    setBusyName(t.template_name);
    setSubmitError(null);
    try {
      await createFromTemplate(projectId, t.template_name);
      onClose();
    } catch (e) {
      setSubmitError(extractApiMessage(e));
    } finally {
      setBusyName(null);
    }
  };

  return (
    <ModalShell title="템플릿으로 생성" onClose={onClose}>
      {loadError && <div className="text-sm text-red-400 mb-3">{loadError}</div>}
      {submitError && <div className="text-sm text-red-400 mb-3">{submitError}</div>}
      {!templates && !loadError && (
        <div className="text-sm text-zinc-500 flex items-center gap-2 py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> 템플릿 로딩 중...
        </div>
      )}
      {templates && templates.length === 0 && (
        <div className="text-sm text-zinc-500 py-6">사용 가능한 번들 템플릿이 없습니다</div>
      )}
      {templates && templates.length > 0 && (
        <div className="space-y-2">
          {templates.map((t) => (
            <button
              key={t.template_name}
              onClick={() => handleCreate(t)}
              disabled={busyName !== null}
              className={clsx(
                "w-full text-left p-3 rounded-lg border transition",
                "bg-zinc-900 border-zinc-800 hover:border-violet-500/40 hover:bg-zinc-800/50",
                busyName !== null && "opacity-60 cursor-not-allowed"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-zinc-200">{t.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {t.workflow_type} · {t.nodes_count} nodes · {t.edges_count} edges
                  </div>
                  {t.description && (
                    <div className="text-xs text-zinc-600 mt-1 line-clamp-2">{t.description}</div>
                  )}
                </div>
                {busyName === t.template_name && (
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400 shrink-0 ml-3" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

// ── Manual Create Modal ──

function ManualCreateModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { createWorkflow } = useWorkflowStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [workflowType, setWorkflowType] = useState("custom");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await createWorkflow({
        project_id: projectId,
        name: name.trim(),
        description: description.trim() || null,
        workflow_type: workflowType.trim() || "custom",
      });
      onClose();
    } catch (e) {
      setError(extractApiMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="워크플로우 직접 생성" onClose={onClose}>
      {error && <div className="text-sm text-red-400 mb-3">{error}</div>}
      <div className="space-y-3">
        <LabeledInput label="이름 *" value={name} onChange={setName} placeholder="예: 배포 워크플로우" />
        <LabeledInput label="설명" value={description} onChange={setDescription} placeholder="선택 사항" />
        <LabeledInput label="유형" value={workflowType} onChange={setWorkflowType} placeholder="custom" />
      </div>
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
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />} 생성
        </button>
      </div>
    </ModalShell>
  );
}

// ── Import Modal ──

function ImportModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { importWorkflows } = useWorkflowStore();
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "success"; created: number; updated: number; skipped: number }
    | { kind: "error"; msg: string }
  >({ kind: "idle" });

  const handleImport = async () => {
    setState({ kind: "loading" });
    try {
      const r = await importWorkflows(projectId);
      setState({ kind: "success", created: r.created, updated: r.updated, skipped: r.skipped });
    } catch (e) {
      setState({ kind: "error", msg: extractApiMessage(e) });
    }
  };

  return (
    <ModalShell title="파일에서 가져오기" onClose={onClose}>
      <p className="text-sm text-zinc-300">
        프로젝트의 <code className="mx-1 text-xs text-zinc-400">.claude/workflows/*.md</code>
        파일을 스캔해 워크플로우로 DB에 동기화합니다.
      </p>
      <p className="text-xs text-zinc-500 mt-2">
        같은 이름이 있으면 노드/엣지/설명을 덮어쓰고, 파싱 실패한 파일은 건너뜁니다.
      </p>

      {state.kind === "success" && (
        <div className="mt-4 text-xs bg-emerald-500/10 border border-emerald-500/30 rounded-md p-2 text-emerald-300">
          생성 {state.created} · 갱신 {state.updated} · 스킵 {state.skipped}
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
            onClick={handleImport}
            disabled={state.kind === "loading"}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition",
              "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40",
              state.kind === "loading" && "opacity-60 cursor-not-allowed",
            )}
          >
            {state.kind === "loading" && <Loader2 className="w-4 h-4 animate-spin" />} 가져오기
          </button>
        )}
      </div>
    </ModalShell>
  );
}

// ── Shared building blocks ──

function LabeledInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-xs text-zinc-400 mb-1">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
      />
    </label>
  );
}

