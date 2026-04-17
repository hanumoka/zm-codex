# Module C: Memory Engine

## 개요
MemPalace에서 영감을 받은 시맨틱 벡터 검색 기반 기억 시스템.
PostgreSQL + pgvector로 구현.

## 핵심 수치 (MemPalace 참조)
- 청크 크기: 800자, 오버랩: 100자
- 최소 청크: 50자 (이하 무시)
- 최대 파일: 10MB
- 임베딩: all-MiniLM-L6-v2 (384d)
- 검색: BM25 (40%) + 벡터 유사도 (60%) 하이브리드
- 목표 recall: 96%+ R@5

## DB 스키마 (초안)

```sql
-- 메모리 청크 (MemPalace의 Drawer)
CREATE TABLE memory_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    wing VARCHAR(128),           -- 카테고리 (프로젝트명 등)
    room VARCHAR(128),           -- 세부 분류 (모듈명, 세션 등)
    content TEXT NOT NULL,        -- 원문 (verbatim)
    embedding vector(384),        -- pgvector 벡터
    source_file VARCHAR(512),     -- 원본 파일 경로
    chunk_index INTEGER,          -- 청크 인덱스
    entities TEXT,                -- 세미콜론 구분 엔티티
    filed_at TIMESTAMPTZ DEFAULT NOW(),
    source_mtime DOUBLE PRECISION
);

-- HNSW 인덱스
CREATE INDEX idx_chunks_embedding ON memory_chunks
    USING hnsw (embedding vector_cosine_ops);
```

## API 설계

```
POST   /api/v1/memories/ingest             # 문서 수집 (청킹+임베딩+저장)
GET    /api/v1/memories/search?q=...        # 시맨틱 검색
GET    /api/v1/memories/search?q=...&wing=  # 필터링 검색
GET    /api/v1/memories/status              # 메모리 통계
```

## 참조
- MemPalace `searcher.py`: BM25 + 벡터 하이브리드 알고리즘
- MemPalace `miner.py`: 800자 청킹 + paragraph 경계 분할
- MemPalace `palace.py`: closet 인덱스 (Phase 5에서 고려)
