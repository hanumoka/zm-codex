# zm-codex 로드맵
> 최종 업데이트: 2026-04-16

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

## Phase 5: Channel 서버 + 고도화 — 대기
- [ ] Channel MCP 서버 (Node.js, Web→Claude Code 메시지 주입)
- [ ] MCP 도구 (Claude Code→Web 워크플로우 조작)
- [ ] 워크플로우 자동 판단 (커밋 패턴 기반)
- [ ] .claude/workflows/*.md 양방향 파일 동기화
- [ ] 파일 감시 + 자동 인덱싱 (watchfiles)
- [ ] 드리프트 감지
