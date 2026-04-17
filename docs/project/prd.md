# zm-codex PRD (Product Requirements Document)
> 최종 업데이트: 2026-04-16

## 1. 비전

Claude Code로 개발하는 모든 프로젝트에서 발생하는 문서/설정/워크플로우 관리 문제를 해결하는 **종합 관리 시스템**.

## 2. 핵심 모듈

### Module A: Document Manager (문서 관리자) — Phase 1 완료
- [x] 프로젝트 등록 (경로 지정) — POST /api/v1/projects
- [x] `.claude/`, `docs/` 디렉토리 스캔 — 30개 문서, 12가지 유형 자동 분류
- [x] 마크다운 파싱 + 메타데이터 추출 (frontmatter, 링크, 날짜)
- [x] 트리 뷰 UI (FE DocumentsPage)
- [x] 마크다운 뷰어 (react-markdown + remark-gfm)
- [ ] 표준 문서 유형별 뷰 (정책 테이블, 스키마 ERD 등) — Mock만 존재

### Module B: Workflow Manager (워크플로우 관리자) — Phase 2 완료
- [x] 워크플로우 CRUD API — POST/GET/PATCH/DELETE /api/v1/workflows
- [x] 인스턴스 관리 API — POST/GET/PATCH /api/v1/workflows/:id/instances
- [x] @xyflow/react 노드 파이프라인 에디터 (n8n 스타일)
- [x] 칸반 보드 뷰 (대기/진행/완료/실패 4열)
- [x] 뷰 토글 (파이프라인 ↔ 칸반) — Zustand 공유 스토어
- [x] 스킬/에이전트 매핑 (각 노드에 Claude Code 스킬/에이전트 연결)
- [ ] 워크플로우 자동 판단 (커밋 패턴 기반) — Phase 5
- [ ] .claude/workflows/*.md 양방향 파일 동기화 — Phase 5

### Module C: Memory Engine (메모리 엔진) — Phase 3 완료
- [x] 문서 청킹 (800자, 100자 오버랩, paragraph 경계 분할)
- [x] pgvector 벡터 저장 (Vector(384) + HNSW cosine 인덱스)
- [x] 시맨틱 검색 API (벡터 코사인 유사도)
- [x] 검색 UI (실제 API 연동)
- [x] sentence-transformers all-MiniLM-L6-v2 임베딩 (로컬, API 불필요)
- [ ] BM25 하이브리드 가중치 적용 — 추후 고도화

### Module D: Config Sync (설정 동기화) — Phase 4 완료
- [x] 멀티 프로젝트 설정 비교 — GET /api/v1/config/compare
- [x] .claude/ 디렉토리 파일별 same/different/missing 분류
- [ ] 템플릿 기반 초기화 — Phase 5
- [ ] 설정 변경 이력 추적 — Phase 5

### Module E: Change Tracker (변경 추적기) — Phase 4 완료
- [x] git log + 문서 변경 + 훅 이벤트 통합 타임라인 — GET /api/v1/changes
- [x] FE Changes 페이지 (실제 API 연동)
- [ ] 코드 커밋 ↔ 문서 양방향 링크 — Phase 5
- [ ] 드리프트 감지 경고 — Phase 5

### Module F: File Watcher (파일 감시) — 미구현
- [ ] 실시간 파일 감시 (watchfiles)
- [ ] 변경 시 자동 인덱싱
- [ ] SSE 실시간 알림

### Module G: MCP/Channel Server (Claude Code 통합) — 미구현
- [ ] MCP 서버 (Claude Code → Web)
- [ ] Channel 서버 (Web → Claude Code)
- [ ] HTTP Hook Receiver — Phase 1에서 구현 완료

## 3. 완료된 기능

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 0 | 프로젝트 초기화, Claude Code 셋팅 | **완료** |
| Phase 1 | 양방향 연동 골격 (Hook Receiver + SSE + 프로젝트 스캔) | **완료** |
| Phase 2 | 워크플로우 관리자 (@xyflow/react 노드 + 칸반 이중 뷰) | **완료** |
| Phase 3 | 메모리 엔진 (pgvector 시맨틱 검색) | **완료** |
| Phase 4 | 설정 동기화 + 변경 추적 | **완료** |
| Phase 5 | Channel 서버 + 고도화 | 대기 |

## 4. 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-16 | PRD 초기 작성 |
| 2026-04-16 | Phase 0~4 완료 상태 반영, 모듈별 체크리스트 갱신 |
