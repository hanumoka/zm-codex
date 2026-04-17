# 현재 상태: Phase 7 완료 — 핵심 모듈(A~G) 구현 완료
> 최종 업데이트: 2026-04-17

## Phase 0 완료 (프로젝트 초기화)
- [x] 프로젝트 구조 설계 + 기술 스택 확정 (2026-04-16)
- [x] .claude/ 구조 생성 (settings, rules 5, agents 5, hooks 6, memory 2, skills 3)
- [x] docs/ 관리 문서 구조
- [x] docker-compose.yml (pgvector:pg17, 포트 30432)
- [x] BE/FE 프로젝트 골격 (FastAPI + Vite/React)
- [x] Mock 프로토타입 7페이지

## Phase 1 완료 (기반 + 양방향 연동 골격)
- [x] DB 모델 — projects, documents, hook_events 테이블 (2026-04-16)
- [x] Hook Receiver — POST /api/hooks/events 엔드포인트 (2026-04-16)
- [x] SSE 브로드캐스터 — GET /api/stream/events (2026-04-16)
- [x] 프로젝트 등록 API — POST /api/v1/projects + 자동 문서 스캔 (30개 문서) (2026-04-16)
- [x] 문서 목록 API — GET /api/v1/projects/:id/documents (12가지 유형 자동 분류) (2026-04-16)
- [x] FE 실시간 이벤트 피드 — SSE 구독 + Dashboard LiveEventFeed (2026-04-16)
- [x] settings.json HTTP 훅 추가 — PreToolUse, PostToolUse, SessionStart, Stop (2026-04-16)

## Phase 2 완료 (워크플로우 관리자)
- [x] DB 모델 — workflows, workflow_instances, step_executions 테이블 (2026-04-16)
- [x] 워크플로우 CRUD API — POST/GET/PATCH/DELETE /api/v1/workflows (2026-04-16)
- [x] 인스턴스 관리 API — POST/GET/PATCH /api/v1/workflows/:id/instances (2026-04-16)
- [x] 개발 워크플로우 생성 (7 nodes, 7 edges, 스킬/에이전트 매핑) (2026-04-16)
- [x] 버그수정 워크플로우 생성 (7 nodes, 7 edges) (2026-04-16)
- [x] FE @xyflow/react 노드 파이프라인 에디터 (2026-04-16)
- [x] FE 칸반 뷰 (대기/진행/완료/실패 4열) (2026-04-16)
- [x] 뷰 토글 (파이프라인 ↔ 칸반) — Zustand 공유 스토어 (2026-04-16)
- [x] 실시간 노드 하이라이트 (현재 실행 노드 표시) (2026-04-16)

## Phase 3 완료 (메모리 엔진)
- [x] DB 모델 — memory_chunks 테이블 + Vector(384) + HNSW cosine 인덱스 (2026-04-16)
- [x] 임베딩 서비스 — sentence-transformers all-MiniLM-L6-v2 lazy loading (2026-04-16)
- [x] 청킹 서비스 — 800자 단위, 100자 오버랩, paragraph 경계 분할 (2026-04-16)
- [x] 인제스트 API — POST /api/v1/memories/ingest (30 파일 → 45 청크) (2026-04-16)
- [x] 검색 API — GET /api/v1/memories/search (벡터 코사인 유사도) (2026-04-16)
- [x] 상태 API — GET /api/v1/memories/status (2026-04-16)
- [x] FE 메모리 검색 페이지 — 실제 API 연동 (Mock 교체) (2026-04-16)

## Phase 4 완료 (설정 동기화 + 변경 추적)
- [x] 설정 비교 서비스 — .claude/ 디렉토리 양 프로젝트 비교 (same/different/missing) (2026-04-16)
- [x] 설정 비교 API — GET /api/v1/config/compare (2026-04-16)
- [x] 변경 추적 API — GET /api/v1/changes (git log + 문서 변경 + 훅 이벤트 통합 타임라인) (2026-04-16)
- [x] FE Changes 페이지 — 실제 API 연동 (Mock 교체) (2026-04-16)

## Phase 5 완료 (File Watcher + MCP Server)
- [x] sync 서비스 추출 — services/sync.py (sync_documents, sync_single_file) (2026-04-16)
- [x] File Watcher 서비스 — services/watcher.py FileWatcherManager (watchfiles 기반) (2026-04-16)
- [x] Watcher API — POST start/stop, GET status/changes (2026-04-16)
- [x] Drift Detection — services/drift.py (git 커밋 vs 문서 변경 비교) (2026-04-16)
- [x] Drift API — GET /api/v1/watcher/drift (2026-04-16)
- [x] MCP Server — POST /api/v1/mcp/ (JSON-RPC 2.0, 5개 도구) (2026-04-16)
- [x] FE SSE 이벤트 확장 — file_changed, drift_detected, watcher_started/stopped (2026-04-16)
- [x] FE Watcher 페이지 — 실시간 변경 피드 + 감시 컨트롤 + 드리프트 패널 (2026-04-16)
- [x] 라우팅/네비게이션 — /watcher 추가, 푸터 Phase 5 갱신 (2026-04-16)
- [x] 빌드 검증 — BE Python import + FE tsc --noEmit 통과 (2026-04-16)

## Phase 5b 완료 (잔여 기능)
- [x] 워크플로우 자동 판단 — services/workflow_classifier.py (커밋 패턴 분석) (2026-04-16)
- [x] 워크플로우 자동 판단 API — GET /api/v1/workflows/auto-detect (2026-04-16)
- [x] .claude/workflows/*.md 양방향 동기화 — services/workflow_sync.py (export/import) (2026-04-16)
- [x] 워크플로우 export/import API — POST export, POST import (2026-04-16)
- [x] Watcher 연동 — workflows/ 변경 시 auto-import, .claude/ 변경 시 config 이력 기록 (2026-04-16)
- [x] 설정 변경 이력 DB — models/config_history.py (ConfigChange 테이블) (2026-04-16)
- [x] 설정 변경 이력 API — GET /api/v1/config/history (2026-04-16)
- [x] FE 워크플로우 자동 감지 버튼 — WorkflowPage (2026-04-16)
- [x] FE 설정 변경 이력 섹션 — ConfigPage (2026-04-16)
- [x] 빌드 검증 — BE + FE 통과 (2026-04-16)

## Phase 6 완료 (Channel 서버 + 템플릿 + BM25)
- [x] BM25 하이브리드 검색 — rank_bm25 + vector 60:40 가중 합산 (2026-04-16)
- [x] 검색 스키마 확장 — vector_score, keyword_score 필드 추가 (2026-04-16)
- [x] 템플릿 생성 서비스 — services/template.py (generate/apply) (2026-04-16)
- [x] 템플릿 API — POST generate, POST apply (2026-04-16)
- [x] Channel 서비스 — services/channel.py (asyncio.Queue 기반 세션별 큐) (2026-04-16)
- [x] Channel API — POST send, GET poll, GET status, GET history (2026-04-16)
- [x] FE 템플릿 생성 버튼 — ConfigPage (2026-04-16)
- [x] FE SSE channel_message 이벤트 추가 (2026-04-16)
- [x] 빌드 검증 — BE + FE 통과 (2026-04-16)

## Phase 7 완료 (문서 뷰어 + 코드-문서 링크)
- [x] CodeDocLink 모델 — code_doc_links 테이블 (commit ↔ document 양방향) (2026-04-16)
- [x] 자동 링크 탐지 서비스 — services/linking.py (경로 매칭 + 키워드 매칭) (2026-04-16)
- [x] 링크 API — POST links/detect, GET documents/{id}/links (2026-04-16)
- [x] Changes 타임라인 확장 — 커밋별 linked_documents 필드 추가 (2026-04-16)
- [x] FE 문서 뷰어 관련 커밋 섹션 — DocumentsPage (2026-04-16)
- [x] FE 커밋 관련 문서 배지 — ChangesPage (2026-04-16)
- [x] 빌드 검증 — BE + FE 통과 (2026-04-16)

## 전체 상태
핵심 모듈(A~G) 구현 완료. 아래 항목은 deferred (고도화 과제):
- Module A: 표준 문서 유형별 전용 뷰 (정책 테이블, 스키마 ERD 등) — Mock만 존재
- sync_documents 인라인 임베딩 부하 완화 (대규모 프로젝트 등록 시 백그라운드화 검토)

## Phase 7 이후 유지보수 (2026-04-17)
- [x] 공유 인제스트 서비스 추출 — services/ingest.py (sync_documents + /memories/ingest 공통화)
- [x] IngestRequest 스키마 정리 — 무시되던 wing/room 필드 제거
- [x] MCP search_memories 도구 설명에 "pure vector (non-hybrid)" 명시
- [x] prd.md / roadmap.md / quick-ref.md 전면 동기화
