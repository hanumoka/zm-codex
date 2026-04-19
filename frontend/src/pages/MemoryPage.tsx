import { useState } from "react";
import { Search, Sparkles, FileText, Clock, ArrowUpDown, Database, Loader2 } from "lucide-react";
import { api } from "../lib/api/client";
import { clsx } from "clsx";
import { usePageTour } from "../hooks/usePageTour";

interface MemoryResult {
  id: string;
  wing: string;
  room: string;
  content: string;
  source_file: string;
  chunk_index: number;
  similarity: number;
  filed_at: string;
}

interface SearchResponse {
  query: string;
  results: MemoryResult[];
  total: number;
}

interface MemoryStatus {
  total_chunks: number;
  wings: Record<string, number>;
  embedding_model: string;
  embedding_dim: number;
  chunk_size: number;
}

export function MemoryPage() {
  usePageTour("memory");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemoryResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<MemoryStatus | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [selectedWing, setSelectedWing] = useState<string>("all");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ query, limit: "10" });
      if (selectedWing !== "all") params.set("wing", selectedWing);
      const data = await api.get<SearchResponse>(`/v1/memories/search?${params}`);
      setResults(data.results);
      setSearched(true);
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleIngest = async () => {
    setIngesting(true);
    try {
      const projects = await api.get<{ id: string }[]>("/v1/projects");
      if (projects.length > 0) {
        await api.post("/v1/memories/ingest", { project_id: projects[0]!.id });
        await loadStatus();
      }
    } catch (e) {
      console.error("Ingest failed:", e);
    } finally {
      setIngesting(false);
    }
  };

  const loadStatus = async () => {
    try {
      const data = await api.get<MemoryStatus>("/v1/memories/status");
      setStatus(data);
    } catch {
      // ignore
    }
  };

  // Load status on mount
  if (status === null) {
    loadStatus();
  }

  const wings = status ? ["all", ...Object.keys(status.wings)] : ["all"];

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Memory Search</h1>
        <p className="text-sm text-zinc-500 mt-1">
          pgvector 시맨틱 벡터 검색으로 프로젝트의 모든 기억을 검색합니다
        </p>
      </div>

      {/* Status Bar */}
      {status && (
        <div className="mb-4 flex items-center gap-4 text-xs text-zinc-500" data-tour="memory-status">
          <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {status.total_chunks} 청크</span>
          <span>{status.embedding_model} ({status.embedding_dim}d)</span>
          <span>청크 크기: {status.chunk_size}자</span>
          <button
            onClick={handleIngest}
            disabled={ingesting}
            data-tour="memory-ingest"
            className="ml-auto px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-400 transition flex items-center gap-1"
          >
            {ingesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
            {ingesting ? "인제스트 중..." : "문서 인제스트"}
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-6" data-tour="memory-search">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="자연어로 검색하세요... (예: 'backend architecture', 'security rules', 'workflow')"
              className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-medium transition flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            검색
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-3" data-tour="memory-wing-filter">
          <span className="text-xs text-zinc-500">Wing:</span>
          {wings.map((w) => (
            <button
              key={w}
              onClick={() => setSelectedWing(w)}
              className={clsx(
                "px-2.5 py-1 rounded-lg text-xs transition",
                selectedWing === w ? "bg-violet-500/20 text-violet-400" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
              )}
            >
              {w === "all" ? "전체" : w}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 text-xs text-zinc-500">
            <ArrowUpDown className="w-3 h-3" />
            벡터 코사인 유사도 정렬
          </div>
        </div>
      </div>

      {/* Search Info */}
      {searched && (
        <div className="mb-4 text-sm text-zinc-500">
          <span className="text-violet-400 font-medium">{results.length}개</span> 결과 — 검색어: &quot;{query}&quot;
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {results.map((result) => (
          <div key={result.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 text-xs font-medium">{result.wing}</span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs">{result.room}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-emerald-400">{(result.similarity * 100).toFixed(1)}%</div>
                  <div className="text-[10px] text-zinc-600">유사도</div>
                </div>
                <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${result.similarity * 100}%` }} />
                </div>
              </div>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed mb-3 whitespace-pre-wrap">{result.content}</p>
            <div className="flex items-center gap-4 text-xs text-zinc-600">
              <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {result.source_file}</span>
              <span>chunk #{result.chunk_index}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(result.filed_at).toLocaleDateString("ko-KR")}</span>
            </div>
          </div>
        ))}
      </div>

      {searched && results.length === 0 && (
        <div className="text-center py-12 text-zinc-600">
          <Search className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
          <p>검색 결과가 없습니다</p>
          <p className="text-sm mt-1">다른 키워드를 시도하거나, 먼저 &quot;문서 인제스트&quot;를 실행하세요</p>
        </div>
      )}

      {/* How it works */}
      <div className="mt-8 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5" data-tour="memory-how-it-works">
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Memory Engine 작동 방식 (MemPalace 참조)</h3>
        <div className="grid grid-cols-4 gap-4 text-xs text-zinc-500">
          <div className="bg-zinc-900 rounded-lg p-3">
            <div className="text-violet-400 font-medium mb-1">1. 수집</div>
            문서를 800자 단위로 청킹 (100자 오버랩, paragraph 경계 분할)
          </div>
          <div className="bg-zinc-900 rounded-lg p-3">
            <div className="text-cyan-400 font-medium mb-1">2. 임베딩</div>
            all-MiniLM-L6-v2 (384d) 로컬 벡터화 — API 불필요
          </div>
          <div className="bg-zinc-900 rounded-lg p-3">
            <div className="text-emerald-400 font-medium mb-1">3. 저장</div>
            PostgreSQL pgvector HNSW 인덱스 (cosine)
          </div>
          <div className="bg-zinc-900 rounded-lg p-3">
            <div className="text-amber-400 font-medium mb-1">4. 검색</div>
            벡터 코사인 유사도 정렬, 98-99% recall
          </div>
        </div>
      </div>
    </div>
  );
}
