const API_BASE = "/api";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: (path: string) =>
    fetch(`${API_BASE}${path}`, { method: "DELETE" }).then((r) => {
      if (!r.ok) throw new Error(`API Error ${r.status}`);
    }),
};

// SSE subscription helper

const SSE_EVENT_TYPES = [
  "hook_event",
  "project_created",
  "file_changed",
  "drift_detected",
  "watcher_started",
  "watcher_stopped",
  "ingest_complete",
  "channel_message",
  "workflow_created",
  "workflow_updated",
  "workflow_deleted",
  "instance_created",
  "instance_updated",
] as const;

function parseSSE(e: MessageEvent): SSEEvent | null {
  try {
    return JSON.parse(e.data as string) as SSEEvent;
  } catch {
    return null;
  }
}

export function subscribeSSE(
  path: string,
  onEvent: (event: SSEEvent) => void,
): () => void {
  const eventSource = new EventSource(`${API_BASE}${path}`);

  for (const eventType of SSE_EVENT_TYPES) {
    eventSource.addEventListener(eventType, (e) => {
      const data = parseSSE(e as MessageEvent);
      if (data) onEvent(data);
    });
  }

  eventSource.onerror = () => {
    // EventSource auto-reconnects
  };

  return () => eventSource.close();
}

export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}
