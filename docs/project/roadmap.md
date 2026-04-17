# zm-codex 로드맵
> 최종 업데이트: 2026-04-17

## Phase 0: 프로젝트 초기화 — 완료
- [x] 프로젝트 구조 설계
- [x] 기술 스택 확정 (FastAPI + Vite/React + PostgreSQL/pgvector)
- [x] Claude Code 셋팅 (.claude/ 구조)
- [x] 관리 문서 구조 (docs/)
- [x] docker-compose.yml (PostgreSQL + pgvector)
- [x] BE 프로젝트 골격 (FastAPI)
- [x] FE 프로젝트 골격 (Vite + React)

## Phase 1: 양방향 연동 골격 — 완료
- [x] DB 모델 (projects, documents, hook_events)
- [x] Hook Receiver + SSE 브로드캐스터
- [x] 프로젝트 등록 + 문서 자동 스캔 API
- [x] FE 실시간 이벤트 피드
- [x] settings.json HTTP 훅 추가

## Phase 2: 워크플로우 관리자 — 완료
- [x] DB 모델 (workflows, workflow_instances, step_executions)
- [x] 워크플로우 CRUD + 인스턴스 관리 API
- [x] @xyflow/react 노드 파이프라인 에디터
- [x] 칸반 보드 뷰 + 뷰 토글

## Phase 3: 메모리 엔진 — 완료
- [x] pgvector 테이블 + HNSW 인덱스
- [x] sentence-transformers 임베딩 (로컬)
- [x] 문서 청킹 (800자) + 시맨틱 검색 API
- [x] FE 검색 페이지 (실제 API 연동)

## Phase 4: 설정 동기화 + 변경 추적 — 완료
- [x] 설정 비교 API (멀티프로젝트)
- [x] 변경 추적 API (git + 문서 + 훅 통합)
- [x] FE Changes 페이지 (실제 API 연동)

## Phase 5: File Watcher + MCP Server — 완료
- [x] sync 서비스 추출 (services/sync.py)
- [x] 파일 감시 + 자동 인덱싱 (watchfiles.awatch)
- [x] 드리프트 감지 (services/drift.py, GET /watcher/drift)
- [x] MCP 서버 (JSON-RPC 2.0 Streamable HTTP, 5개 도구)
- [x] FE Watcher 페이지 + SSE 이벤트 확장

## Phase 5b: 워크플로우 자동화 + 설정 이력 — 완료
- [x] 워크플로우 자동 판단 (커밋 패턴 기반)
- [x] .claude/workflows/*.md 양방향 파일 동기화
- [x] 설정 변경 이력 DB + API (config_changes 테이블)
- [x] FE 워크플로우 자동 감지 버튼 + 설정 이력 섹션

## Phase 6: Channel 서버 + 템플릿 + BM25 — 완료
- [x] BM25 하이브리드 검색 (BM25 40% + 벡터 60%)
- [x] 템플릿 생성/적용 서비스 (.claude/ 구조 추출·주입)
- [x] Channel 서버 (Web→Claude Code 역방향 큐, asyncio.Queue)
- [x] FE 템플릿 생성 버튼 + channel_message SSE

## Phase 7: 문서 뷰어 + 코드-문서 링크 — 완료
- [x] CodeDocLink 모델 (code_doc_links 테이블)
- [x] 자동 링크 탐지 서비스 (경로 + 키워드 매칭)
- [x] Changes 타임라인에 linked_documents 필드 확장
- [x] FE DocumentsPage 관련 커밋 섹션 + ChangesPage 문서 배지

## Phase 7 유지보수: 워크플로우 관리자 완성 — 완료 (2026-04-17)
- [x] 번들 템플릿 시드 API (bugfix/deployment/development/review, 경쟁 상황 409, NULL byte 가드)
- [x] FE 생성/리네임/삭제/인스턴스 생성·진행/cancelled/export/import UI
- [x] 다중 인스턴스 파이프라인 하이라이트 선택 (Radar 토글)
- [x] 이름 중복 체크 (create + rename) + SSE 양방향(workflow_*/instance_*) 연결
- [x] 삭제 시 export .md 동반 제거 (재Import 부활 방지)
- [x] pytest 회귀 13건 (backend/tests/ — CRUD·템플릿·중복·export/import)
- [x] Playwright 신규 E2E 3 스펙 (workflow-create/-edit/-instance)

## 이후 계획 (고도화 — 사용자 피드백 기반)
- [ ] Module A: 표준 문서 유형별 전용 뷰 (정책 테이블, 스키마 ERD 등)
- [ ] 초기 sync_documents 임베딩 부하 완화 (백그라운드 태스크화 or 배치)
- [ ] 다수 프로젝트 동시 관리 UX 개선
