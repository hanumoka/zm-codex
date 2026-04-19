import { useEffect, useState } from "react";
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, Clock, Tag, Loader2, GitCommitHorizontal, Link2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../lib/api/client";
import { clsx } from "clsx";
import { usePageTour } from "../hooks/usePageTour";

interface ApiDocument {
  id: string;
  file_path: string;
  file_name: string;
  doc_type: string | null;
  file_size: number;
  last_modified: string | null;
}

interface DocContentResponse {
  id: string;
  file_path: string;
  file_name: string;
  doc_type: string | null;
  content: string | null;
  last_modified: string | null;
}

interface DocLink {
  id: string;
  commit_hash: string;
  commit_subject: string;
  link_type: string;
  confidence: number;
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  docType?: string;
  docId?: string;
  children: TreeNode[];
}

const docTypeColors: Record<string, { bg: string; text: string; label: string }> = {
  memory: { bg: "bg-cyan-500/10", text: "text-cyan-400", label: "Memory" },
  policy: { bg: "bg-green-500/10", text: "text-green-400", label: "Policy" },
  rule: { bg: "bg-orange-500/10", text: "text-orange-400", label: "Rule" },
  mistakes: { bg: "bg-red-500/10", text: "text-red-400", label: "Mistakes" },
  agent: { bg: "bg-violet-500/10", text: "text-violet-400", label: "Agent" },
  skill: { bg: "bg-pink-500/10", text: "text-pink-400", label: "Skill" },
  hook: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Hook" },
  prd: { bg: "bg-blue-500/10", text: "text-blue-400", label: "PRD" },
  roadmap: { bg: "bg-indigo-500/10", text: "text-indigo-400", label: "Roadmap" },
  session: { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Session" },
  feature: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Feature" },
  archive: { bg: "bg-zinc-500/10", text: "text-zinc-400", label: "Archive" },
  config: { bg: "bg-slate-500/10", text: "text-slate-400", label: "Config" },
};

function buildTree(docs: ApiDocument[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", type: "folder", children: [] };

  for (const doc of docs) {
    const parts = doc.file_path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isFile = i === parts.length - 1;

      if (isFile) {
        current.children.push({
          name: part,
          path: doc.file_path,
          type: "file",
          docType: doc.doc_type ?? undefined,
          docId: doc.id,
          children: [],
        });
      } else {
        let folder = current.children.find((c) => c.type === "folder" && c.name === part);
        if (!folder) {
          folder = { name: part, path: parts.slice(0, i + 1).join("/"), type: "folder", children: [] };
          current.children.push(folder);
        }
        current = folder;
      }
    }
  }

  // Sort: folders first, then files
  const sortChildren = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortChildren);
  };
  sortChildren(root);

  return root.children;
}

function TreeNodeComponent({ node, depth, selected, onSelect }: { node: TreeNode; depth: number; selected: string | null; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(depth < 2);

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-zinc-800/50 rounded text-sm transition"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {open ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
          {open ? <FolderOpen className="w-4 h-4 text-amber-400" /> : <Folder className="w-4 h-4 text-amber-400/60" />}
          <span className="text-zinc-300">{node.name}</span>
          <span className="text-xs text-zinc-600 ml-auto">{node.children.length}</span>
        </button>
        {open && node.children.map((child) => (
          <TreeNodeComponent key={child.path} node={child} depth={depth + 1} selected={selected} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  const dt = node.docType ? docTypeColors[node.docType] : null;

  return (
    <button
      onClick={() => node.docId && onSelect(node.docId)}
      className={clsx(
        "w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition",
        selected === node.docId ? "bg-violet-500/10 text-violet-300" : "hover:bg-zinc-800/50 text-zinc-400"
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <FileText className="w-4 h-4 shrink-0" />
      <span className="truncate">{node.name}</span>
      {dt && <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${dt.bg} ${dt.text}`}>{dt.label}</span>}
    </button>
  );
}

export function DocumentsPage() {
  usePageTour("documents");
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState<DocContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [docLinks, setDocLinks] = useState<DocLink[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const projects = await api.get<{ id: string }[]>("/v1/projects");
        if (projects.length > 0) {
          const pid = projects[0]!.id;
          setProjectId(pid);
          const docs = await api.get<ApiDocument[]>(`/v1/projects/${pid}/documents`);
          setTree(buildTree(docs));
        }
      } catch { /* API not ready */ }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedId || !projectId) return;
    setLoadingContent(true);
    setDocLinks([]);
    api.get<DocContentResponse>(`/v1/projects/${projectId}/documents/${selectedId}`)
      .then(setContent)
      .catch(() => setContent(null))
      .finally(() => setLoadingContent(false));

    // Fetch links
    api.get<DocLink[]>(`/v1/projects/${projectId}/documents/${selectedId}/links`)
      .then(setDocLinks)
      .catch(() => setDocLinks([]));
  }, [selectedId, projectId]);

  if (loading) {
    return <div className="p-6 flex items-center gap-2 text-zinc-500"><Loader2 className="w-4 h-4 animate-spin" /> 문서 로딩 중...</div>;
  }

  return (
    <div className="flex h-full">
      {/* File Tree */}
      <div className="w-72 border-r border-zinc-800 overflow-y-auto py-2 shrink-0" data-tour="doc-tree">
        <div className="px-4 py-2 mb-1" data-tour="doc-type-badges">
          <h2 className="text-sm font-semibold text-zinc-300">Document Explorer</h2>
          <p className="text-xs text-zinc-600">{tree.length > 0 ? "실제 프로젝트 문서" : "프로젝트를 등록하세요"}</p>
        </div>
        {tree.map((node) => (
          <TreeNodeComponent key={node.path} node={node} depth={0} selected={selectedId} onSelect={setSelectedId} />
        ))}
      </div>

      {/* Document Viewer */}
      <div className="flex-1 overflow-y-auto" data-tour="doc-viewer">
        {loadingContent ? (
          <div className="flex items-center justify-center h-full text-zinc-500"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : content ? (
          <div className="max-w-4xl p-6">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-800">
              <FileText className="w-5 h-5 text-violet-400" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-zinc-100">{content.file_name}</h2>
                <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {content.last_modified ? new Date(content.last_modified).toLocaleDateString("ko-KR") : "N/A"}</span>
                  {content.doc_type && <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {docTypeColors[content.doc_type]?.label ?? content.doc_type}</span>}
                  <span className="text-zinc-600">{content.file_path}</span>
                </div>
              </div>
              {content.doc_type && docTypeColors[content.doc_type] && (
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${docTypeColors[content.doc_type]!.bg} ${docTypeColors[content.doc_type]!.text}`}>
                  {docTypeColors[content.doc_type]!.label}
                </span>
              )}
            </div>
            {content.content ? (
              <div className="markdown-body text-zinc-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.content}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-zinc-600 text-sm py-8 text-center">내용이 비어있습니다</div>
            )}

            {/* Related Commits */}
            {docLinks.length > 0 && (
              <div className="mt-6 pt-4 border-t border-zinc-800" data-tour="doc-links">
                <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-violet-400" /> 관련 커밋 ({docLinks.length})
                </h3>
                <div className="space-y-1.5">
                  {docLinks.map((link) => (
                    <div key={link.id} className="flex items-center gap-3 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm">
                      <GitCommitHorizontal className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <span className="font-mono text-xs text-violet-400">{link.commit_hash}</span>
                      <span className="text-zinc-300 truncate flex-1">{link.commit_subject}</span>
                      <span className={clsx("px-1.5 py-0.5 rounded text-[10px]",
                        link.link_type === "path_match" ? "bg-emerald-500/10 text-emerald-400" : "bg-cyan-500/10 text-cyan-400"
                      )}>{link.link_type === "path_match" ? "경로" : "키워드"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-600">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
              <p>왼쪽 트리에서 문서를 선택하세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
