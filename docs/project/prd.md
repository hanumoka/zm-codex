# zm-codex PRD (Product Requirements Document)
> 최종 업데이트: 2026-04-17

## 1. 비전

Claude Code로 개발하는 모든 프로젝트에서 발생하는 문서/설정/워크플로우 관리 문제를 해결하는 **종합 관리 시스템**.

## 2. 핵심 모듈

### Module A: Document Manager (문서 관리자) — Phase 1 완료
- [x] 프로젝트 등록 (경로 지정) — POST /api/v1/projects
- [x] `.claude/`, `docs/` 디렉토리 스캔 — 30개 문서, 12가지 유형 자동 분류
- [x] 마크다운 파싱 + 메타데이터 추출 (frontmatter, 링크, 날짜)
- [x] 트리 뷰 UI (FE DocumentsPage)
- [x] 마크다운 뷰어 (react-markdown + remark-gfm)
- [x] 코드-문서 양방향 링크 배지 (Phase 7)
- [ ] 표준 문서 유형별 전용 뷰 (정책 테이블, 스키마 ERD 등) — **deferred** (Mock 존재, 고도화 과제)

### Module B: Workflow Manager (워크플로우 관리자) — Phase 2 + 5b + 7 유지보수 완료
- [x] 워크플로우 CRUD API — POST/GET/PATCH/DELETE /api/v1/workflows
- [x] 인스턴스 관리 API — POST/GET/PATCH /api/v1/workflows/:id/instances
- [x] @xyflow/react 노드 파이프라인 에디터 (n8n 스타일)
- [x] 칸반 보드 뷰 (대기/진행/완료/실패 4열)
- [x] 뷰 토글 (파이프라인 ↔ 칸반) — Zustand 공유 스토어
- [x] 스킬/에이전트 매핑 (각 노드에 Claude Code 스킬/에이전트 연결)
- [x] 워크플로우 자동 판단 (커밋 패턴 기반) — Phase 5b (services/workflow_classifier.py)
- [x] .claude/workflows/*.md 양방향 파일 동기화 — Phase 5b (services/workflow_sync.py)
- [x] 번들 템플릿 시드 — services/seed.py + 4종 .md(bugfix/deployment/development/review 7노드)
  + GET /workflows/templates + POST /workflows/from-template (Phase 7 유지보수)
- [x] 이름 중복 체크 — POST /workflows, PATCH /{id}의 동일 프로젝트 내 이름 409 (Phase 7 유지보수)
- [x] 삭제 시 export .md 동반 제거 — 경로 가드 + 재Import 부활 방지 (Phase 7 유지보수)
- [x] FE UI 완성 — WorkflowCreateButton(템플릿 픽커/수동/가져오기), WorkflowEditActions(내보내기/리네임/삭제),
  InstancePanel(생성 + status 4-way + current_node 드롭다운 + Radar 하이라이트 토글) (Phase 7 유지보수)
- [x] SSE 양방향 연결 — workflow_created/updated/deleted, instance_created/updated 브로드캐스트 +
  WorkflowPage 구독으로 다른 탭 변이 자동 반영 (Phase 7 유지보수)

### Module C: Memory Engine (메모리 엔진) — Phase 3 + 6 완료
- [x] 문서 청킹 (800자, 100자 오버랩, paragraph 경계 분할)
- [x] pgvector 벡터 저장 (Vector(384) + HNSW cosine 인덱스)
- [x] 시맨틱 검색 API (벡터 코사인 유사도)
- [x] 검색 UI (실제 API 연동)
- [x] sentence-transformers all-MiniLM-L6-v2 임베딩 (로컬, API 불필요)
- [x] BM25 하이브리드 가중치 (BM25 40% + 벡터 60%) — Phase 6
- [x] 공유 인제스트 서비스 (services/ingest.py) — sync_documents와 /memories/ingest 공통화
- [x] sync_documents 실행 시 변경 파일 자동 청킹+임베딩 (인라인)

### Module D: Config Sync (설정 동기화) — Phase 4 + 5b + 6 완료
- [x] 멀티 프로젝트 설정 비교 — GET /api/v1/config/compare
- [x] .claude/ 디렉토리 파일별 same/different/missing 분류
- [x] 템플릿 기반 초기화 — Phase 6 (services/template.py, POST /config/templates/{generate,apply})
- [x] 설정 변경 이력 추적 — Phase 5b (ConfigChange 테이블 + GET /config/history)

### Module E: Change Tracker (변경 추적기) — Phase 4 + 5 + 7 완료
- [x] git log + 문서 변경 + 훅 이벤트 통합 타임라인 — GET /api/v1/changes
- [x] FE Changes 페이지 (실제 API 연동)
- [x] 드리프트 감지 경고 — Phase 5 (services/drift.py, GET /watcher/drift)
- [x] 코드 커밋 ↔ 문서 양방향 링크 — Phase 7 (code_doc_links 테이블, services/linking.py)
- [x] 커밋별 linked_documents 필드 확장 — Phase 7

### Module F: File Watcher (파일 감시) — Phase 5 완료
- [x] 실시간 파일 감시 (watchfiles.awatch 비동기) — services/watcher.py
- [x] 변경 시 자동 인덱싱 (sync_single_file → ingest_document)
- [x] SSE 실시간 알림 (file_changed, drift_detected, watcher_started/stopped)
- [x] 프로젝트별 독립 감시 태스크 (FileWatcherManager)
- [x] FE Watcher 페이지 (실시간 피드 + 감시 컨트롤 + 드리프트 패널)

### Module G: MCP/Channel Server (Claude Code 통합) — Phase 5 + 6 완료
- [x] MCP 서버 (JSON-RPC 2.0 Streamable HTTP) — POST /api/v1/mcp
- [x] MCP 도구 5종: search_memories, list_documents, get_workflow_status, update_step_status, get_project_summary
- [x] Channel 서버 (asyncio.Queue 기반 Web→Claude Code 역방향 큐) — Phase 6
- [x] Channel API: POST send, GET poll, GET status, GET history
- [x] HTTP Hook Receiver — Phase 1 (POST /api/hooks/events)

## 3. 완료된 기능

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 0 | 프로젝트 초기화, Claude Code 셋팅 | **완료** |
| Phase 1 | 양방향 연동 골격 (Hook Receiver + SSE + 프로젝트 스캔) | **완료** |
| Phase 2 | 워크플로우 관리자 (@xyflow/react 노드 + 칸반 이중 뷰) | **완료** |
| Phase 3 | 메모리 엔진 (pgvector 시맨틱 검색) | **완료** |
| Phase 4 | 설정 동기화 + 변경 추적 | **완료** |
| Phase 5 | File Watcher + MCP Server + Drift Detection | **완료** |
| Phase 5b | 워크플로우 자동판단/양방향 동기화, 설정 변경 이력 | **완료** |
| Phase 6 | BM25 하이브리드, 템플릿, Channel 서버 | **완료** |
| Phase 7 | 문서 뷰어 확장 + 코드-문서 양방향 링크 | **완료** |
| Phase 7 유지보수 | 워크플로우 번들 템플릿 시드 + FE CRUD/인스턴스/하이라이트/export·import/SSE + pytest 13건 | **완료** |

## 4. 핵심 모듈 구현 완료. 추가 고도화(Module A 표준 뷰 등)는 사용자 피드백 기반으로 진행.

## 5. 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-16 | PRD 초기 작성 |
| 2026-04-16 | Phase 0~4 완료 상태 반영, 모듈별 체크리스트 갱신 |
| 2026-04-17 | Phase 5/5b/6/7 완료 상태 반영, 미구현으로 남아있던 항목 실제 구현 경로와 대조하여 일괄 갱신 |
| 2026-04-17 | Module B 워크플로우 관리자 Phase 7 유지보수 — 번들 템플릿 시드, FE CRUD/인스턴스/export·import UI, 중복 체크, SSE 연결, pytest 13건 반영 |
