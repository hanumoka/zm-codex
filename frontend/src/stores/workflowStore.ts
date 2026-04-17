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

type ViewMode = "pipeline" | "kanban";

interface WorkflowState {
  workflows: Workflow[];
  selectedWorkflowId: string | null;
  instances: WorkflowInstance[];
  viewMode: ViewMode;

  setViewMode: (mode: ViewMode) => void;
  setSelectedWorkflow: (id: string | null) => void;
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
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  selectedWorkflowId: null,
  instances: [],
  viewMode: "pipeline",

  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedWorkflow: (id) => set({ selectedWorkflowId: id }),

  fetchWorkflows: async (projectId) => {
    const data = await api.get<Workflow[]>(`/v1/workflows?project_id=${projectId}`);
    set({ workflows: data });
    if (data.length > 0 && !get().selectedWorkflowId) {
      set({ selectedWorkflowId: data[0]!.id });
    }
  },

  fetchInstances: async (workflowId) => {
    const data = await api.get<WorkflowInstance[]>(`/v1/workflows/${workflowId}/instances`);
    set({ instances: data });
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
      const nextSelected =
        s.selectedWorkflowId === id
          ? (remaining[0]?.id ?? null)
          : s.selectedWorkflowId;
      return { workflows: remaining, selectedWorkflowId: nextSelected };
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
}));
