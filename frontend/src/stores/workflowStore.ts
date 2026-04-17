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
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflows: [],
  selectedWorkflowId: null,
  instances: [],
  viewMode: "pipeline",

  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedWorkflow: (id) => set({ selectedWorkflowId: id }),

  fetchWorkflows: async (projectId) => {
    const data = await api.get<Workflow[]>(`/v1/workflows?project_id=${projectId}`);
    set({ workflows: data });
    if (data.length > 0 && !useWorkflowStore.getState().selectedWorkflowId) {
      set({ selectedWorkflowId: data[0]!.id });
    }
  },

  fetchInstances: async (workflowId) => {
    const data = await api.get<WorkflowInstance[]>(`/v1/workflows/${workflowId}/instances`);
    set({ instances: data });
  },
}));
