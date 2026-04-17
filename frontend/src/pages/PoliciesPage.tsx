import { useEffect, useState } from "react";
import { Shield, AlertTriangle, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../lib/api/client";

interface DocContentResponse {
  id: string;
  file_path: string;
  file_name: string;
  doc_type: string | null;
  content: string | null;
}

export function PoliciesPage() {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const projects = await api.get<{ id: string }[]>("/v1/projects");
        if (projects.length > 0) {
          const pid = projects[0]!.id;
          const docs = await api.get<{ id: string; doc_type: string | null }[]>(`/v1/projects/${pid}/documents?doc_type=policy`);
          if (docs.length > 0) {
            const doc = await api.get<DocContentResponse>(`/v1/projects/${pid}/documents/${docs[0]!.id}`);
            setContent(doc.content);
          }
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return <div className="p-6 flex items-center gap-2 text-zinc-500"><Loader2 className="w-4 h-4 animate-spin" /> 정책 로딩 중...</div>;
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Policy Registry</h1>
        <p className="text-sm text-zinc-500 mt-1">
          확정된 아키텍처/기술/제품/제약 정책 — Single Source of Truth
        </p>
      </div>

      {/* Info */}
      <div className="mb-6 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-green-400" />
          <span className="font-medium text-green-400 text-sm">정책 레지스트리 (policy-registry.md)</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-xs text-zinc-500">
          <div className="bg-zinc-900 rounded-lg p-3">
            <div className="text-green-400 font-medium mb-1">SSOT</div>
            정책이 여러 문서에 산재하면 불일치 발생. 이곳이 유일한 진실.
          </div>
          <div className="bg-zinc-900 rounded-lg p-3">
            <div className="text-amber-400 font-medium mb-1">충돌 감지</div>
            새 작업 접수 시 기존 정책과 자동 교차 검증
          </div>
          <div className="bg-zinc-900 rounded-lg p-3">
            <div className="text-red-400 font-medium mb-1">CRITICAL 정책 강제</div>
            BLOCK 수준 정책은 mistake-guard.sh 훅에서 자동 차단
          </div>
        </div>
      </div>

      {/* Policy Content */}
      {content ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="markdown-body text-zinc-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-600">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
          <p>policy-registry.md를 찾을 수 없습니다</p>
          <p className="text-sm mt-1">프로젝트에 .claude/memory/policy-registry.md 파일이 필요합니다</p>
        </div>
      )}
    </div>
  );
}
