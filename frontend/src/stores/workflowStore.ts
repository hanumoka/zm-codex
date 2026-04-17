import { create } from "zustand";
import { api } from "../lib/api/client";

export interface WorkflowNode {
  id: string;
  label: string;
  type: string;
  skill?: string;
  agent?: string;
  hook?: string;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface Workflow {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  workflow_type: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface StepExecution {
  id: string;
  node_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  output: string | null;
}

export interface WorkflowInstance {
  id: string;
  workflow_id: string;
  title: string;
  current_node: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  steps: StepExecution[];
}

export interface TemplateInfo {
  template_name: string;
  name: string;
  workflow_type: string;
  description: string;
  nodes_count: number;
  edges_count: number;
}

export interface WorkflowCreatePayload {
  project_id: string;
  name: string;
  description?: string | null;
  workflow_type?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export interface WorkflowPatchPayload {
  name?: string;
  description?: string | null;
}

export interface InstancePatchPayload {
  current_node?: string;
  status?: string;
}

export interface ExportResult {
  status: string;
  file_path: string;
}

export interface ImportStats {
  status: string;
  created: number;
  updated: number;
  skipped: number;
}

type ViewMode = "pipeline" | "kanban";

interface WorkflowState {
  workflows: Workflow[];
  selectedWorkflowId: string | null;
  instances: WorkflowInstance[];
  /** Instance whose progress drives pipeline/kanban highlight. Null → auto-pick first active. */
  highlightedInstanceId: string | null;
  viewMode: ViewMode;

  setViewMode: (mode: ViewMode) => void;
  setSelectedWorkflow: (id: string | null) => void;
  setHighlightedInstance: (id: string | null) => void;
  fetchWorkflows: (projectId: string) => Promise<void>;
  fetchInstances: (workflowId: string) => Promise<void>;
  listTemplates: () => Promise<TemplateInfo[]>;
  createFromTemplate: (projectId: string, templateName: string) => Promise<Workflow>;
  createWorkflow: (payload: WorkflowCreatePayload) => Promise<Workflow>;
  updateWorkflow: (id: string, patch: WorkflowPatchPayload) => Promise<Workflow>;
  deleteWorkflow: (id: string) => Promise<void>;
  createInstance: (workflowId: string, title: string) => Promise<WorkflowInstance>;
  updateInstance: (
    workflowId: string,
    instanceId: string,
    patch: InstancePatchPayload,
  ) => Promise<WorkflowInstance>;
  deleteInstance: (workflowId: string, instanceId: string) => Promise<void>;
  exportWorkflow: (id: string) => Promise<ExportResult>;
  importWorkflows: (projectId: string) => Promise<ImportStats>;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  selectedWorkflowId: null,
  instances: [],
  highlightedInstanceId: null,
  viewMode: "pipeline",

  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedWorkflow: (id) => set({ selectedWorkflowId: id, highlightedInstanceId: null }),
  setHighlightedInstance: (id) => set({ highlightedInstanceId: id }),

  fetchWorkflows: async (projectId) => {
    const data = await api.get<Workflow[]>(`/v1/workflows?project_id=${projectId}`);
    set({ workflows: data });
    if (data.length > 0 && !get().selectedWorkflowId) {
      set({ selectedWorkflowId: data[0]!.id });
    }
  },

  fetchInstances: async (workflowId) => {
    const data = await api.get<WorkflowInstance[]>(`/v1/workflows/${workflowId}/instances`);
    set((s) => ({
      instances: data,
      // Drop highlight if the selected instance is no longer in the new list.
      highlightedInstanceId:
        s.highlightedInstanceId && data.some((i) => i.id === s.highlightedInstanceId)
          ? s.highlightedInstanceId
          : null,
    }));
  },

  listTemplates: async () => {
    return await api.get<TemplateInfo[]>("/v1/workflows/templates");
  },

  createFromTemplate: async (projectId, templateName) => {
    const wf = await api.post<Workflow>("/v1/workflows/from-template", {
      project_id: projectId,
      template_name: templateName,
    });
    set((s) => ({ workflows: [...s.workflows, wf], selectedWorkflowId: wf.id }));
    return wf;
  },

  createWorkflow: async (payload) => {
    const wf = await api.post<Workflow>("/v1/workflows", payload);
    set((s) => ({ workflows: [...s.workflows, wf], selectedWorkflowId: wf.id }));
    return wf;
  },

  updateWorkflow: async (id, patch) => {
    const wf = await api.patch<Workflow>(`/v1/workflows/${id}`, patch);
    set((s) => ({
      workflows: s.workflows.map((w) => (w.id === id ? wf : w)),
    }));
    return wf;
  },

  deleteWorkflow: async (id) => {
    await api.del(`/v1/workflows/${id}`);
    set((s) => {
      const remaining = s.workflows.filter((w) => w.id !== id);
      const wasSelected = s.selectedWorkflowId === id;
      const nextSelected = wasSelected ? (remaining[0]?.id ?? null) : s.selectedWorkflowId;
      // Clear instances if the deleted workflow was the active selection —
      // the [selectedWorkflowId] effect only re-fetches when the new id is
      // non-null, so without this they'd linger as orphans.
      return {
        workflows: remaining,
        selectedWorkflowId: nextSelected,
        instances: wasSelected ? [] : s.instances,
        highlightedInstanceId: wasSelected ? null : s.highlightedInstanceId,
      };
    });
  },

  createInstance: async (workflowId, title) => {
    const inst = await api.post<WorkflowInstance>(
      `/v1/workflows/${workflowId}/instances`,
      { workflow_id: workflowId, title },
    );
    set((s) => ({ instances: [inst, ...s.instances] }));
    return inst;
  },

  updateInstance: async (workflowId, instanceId, patch) => {
    const inst = await api.patch<WorkflowInstance>(
      `/v1/workflows/${workflowId}/instances/${instanceId}`,
      patch,
    );
    set((s) => ({
      instances: s.instances.map((i) => (i.id === instanceId ? inst : i)),
    }));
    return inst;
  },

  deleteInstance: async (workflowId, instanceId) => {
    await api.del(`/v1/workflows/${workflowId}/instances/${instanceId}`);
    set((s) => ({
      instances: s.instances.filter((i) => i.id !== instanceId),
      highlightedInstanceId:
        s.highlightedInstanceId === instanceId ? null : s.highlightedInstanceId,
    }));
  },

  exportWorkflow: async (id) => {
    return await api.post<ExportResult>(`/v1/workflows/${id}/export`, {});
  },

  importWorkflows: async (projectId) => {
    const stats = await api.post<ImportStats>(
      `/v1/workflows/import?project_id=${projectId}`,
      {},
    );
    // Refresh the workflow list so new/updated entries appear without a page reload.
    const data = await api.get<Workflow[]>(`/v1/workflows?project_id=${projectId}`);
    set((s) => ({
      workflows: data,
      selectedWorkflowId: s.selectedWorkflowId && data.some((w) => w.id === s.selectedWorkflowId)
        ? s.selectedWorkflowId
        : (data[0]?.id ?? null),
    }));
    return stats;
  },
}));
