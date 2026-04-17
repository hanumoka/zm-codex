# zm-codex Project Memory
> 시스템 프롬프트 자동 로드 (200줄 한도). 최종 갱신: 2026-04-17 (Phase 7 + 유지보수 완료 — 핵심 모듈 A~G 구현 + 워크플로우 관리자 전면 완성, Module A 전용 뷰 deferred)

## 프로젝트 수치 (항상 최신 유지)
- BE: FastAPI **11 라우터** | FE: React 8 페이지 + 1 레이아웃
- DB: PostgreSQL + pgvector 9 테이블 (memory_chunks 포함, code_doc_links 포함) | 임베딩: 384d HNSW cosine
- 등록 프로젝트: 1 (zm-codex) | 스캔 문서: 30개 (12가지 유형)
- 워크플로우: DB 실측 0개 (zm-codex, 2026-04-17) · 번들 템플릿 4종 사용 가능 (bugfix/deployment/development/review) | 인스턴스: 0개
- 소스 파일: BE 49 Python (app/) + 5 pytest 파일 (tests/) | FE 19 TS/TSX (src/) + 26 Playwright 스펙 (e2e/)
- 에이전트: 5개 | 규칙: 5개 | 훅: 6+HTTP | 스킬: 3개
- MCP 도구: 7개 (search_memories, list_documents, get_workflow_status, update_step_status, get_project_summary, create_workflow_from_template, create_instance)
- 테스트: 통합 테스트 수동 검증 (Phase 1, 2), 빌드 검증 통과 (Phase 5~7), pytest 회귀 20건 (backend/tests/ — 워크플로우 CRUD·템플릿·export/import·인스턴스 DELETE·MCP 도구)

## 반복 실수 TOP (절대 반복 금지)
1. **Windows 경로 백슬래시** → curl JSON에서 \\ 파싱 에러. Python httpx로 테스트하거나 / 사용
2. **React peer dependency 충돌** → React 19와 호환 안 되는 라이브러리 사전 확인 필수
3. **미사용 변수** → tsconfig noUnusedParameters=true로 빌드 실패. map((item, i) → i 안 쓰면 제거
4. **button 내부 div** → React validateDOMNesting 경고. 상태 dot 등은 `<span inline-block>`으로
5. **controlled select 값/옵션 미스매치** → nullable state 묶을 때 placeholder `<option value="" disabled>` 필수
6. **pytest-asyncio loop scope 미지정** → 전역 asyncpg 엔진 cross-loop 충돌. pyproject에 `asyncio_default_fixture_loop_scope`+`asyncio_default_test_loop_scope`=session
7. **엔드포인트 검증 비대칭** → 같은 리소스의 쓰기 진입로 여럿이면 같은 계약(409/404 등)을 모두 걸기

## Phase 5 이후 신규 모듈 (Phase 5 / 5b / 6 / 7)
- **File Watcher** (P5): watchfiles.awatch 기반 비동기 파일 감시, 프로젝트별 독립 태스크, SSE 브로드캐스트
- **MCP Server** (P5): JSON-RPC 2.0 Streamable HTTP, FastAPI 라우터로 구현 (별도 SDK 불필요). `search_memories`는 순수 벡터(non-hybrid)
- **Drift Detection** (P5): git 커밋의 코드 vs 문서 변경 비교, 미갱신 경고
- **Sync Service** (P5): _sync_documents 추출 → services/sync.py (watcher/projects 공유)
- **Ingest Service** (유지보수): services/ingest.py — 청킹+임베딩 공통 로직. sync.py와 /memories/ingest가 공유. sync_documents는 변경 파일만 인라인 재인덱싱
- **Workflow Classifier** (P5b): 커밋 패턴(feat/fix/docs 등) 분석 → workflow_type 자동 분류
- **Workflow Sync** (P5b): .claude/workflows/*.md ↔ DB 양방향 동기화 (export/import)
- **Config History** (P5b): .claude/ 파일 변경 시 config_changes 테이블에 이력 자동 기록
- **BM25 Hybrid** (P6): rank_bm25 + vector cosine 60:40 가중 합산 (GET /memories/search 한정; MCP search_memories는 미적용)
- **Template Init** (P6): .claude/ 구조를 템플릿으로 추출 → 다른 프로젝트에 적용
- **Channel Server** (P6): asyncio.Queue 기반 Web→Claude Code 역방향 메시지 큐 (send/poll/status/history)
- **Code-Doc Linking** (P7): 커밋↔문서 양방향 자동 링크 (경로 매칭 + 키워드 매칭, confidence 점수)
- **Workflow Seed** (유지보수): services/seed.py — 번들 .md 템플릿(bugfix/deployment/development/review) 7노드 규모를 프로젝트의 .claude/workflows/로 복사 + import_single_workflow_file() 재사용으로 DB 임포트. NULL 바이트 필터, "updated" 경쟁 상황 409 처리. `GET /workflows/templates`, `POST /workflows/from-template`. FE 생성/리네임/삭제/export/import/인스턴스 UI, 이름 중복 409, 삭제 시 export .md 동반 제거, SSE 양방향(workflow_*/instance_*) 연결 완비. MCP에 create_workflow_from_template, create_instance 2종 추가 (기존 update_step_status는 advance 역할 유지)

## 핵심 아키텍처 결정
- **DB 통합**: PostgreSQL + pgvector 단일 DB (ChromaDB + SQLite 대신)
- **양방향 연동**: Claude Code HTTP 훅 → FastAPI → SSE → Web 대시보드
- **워크플로우 이중 뷰**: @xyflow/react 노드 파이프라인 + 칸반 보드 (Zustand 공유 스토어)
- **임베딩**: sentence-transformers all-MiniLM-L6-v2 (384d, 로컬, API 불필요)
- **검색**: BM25 + 벡터 하이브리드 (60:40 가중치, MemPalace 참조)
- **BE 프레임워크**: FastAPI + SQLAlchemy 2.0 async + asyncpg
- **FE 프레임워크**: Vite + React 19 + @xyflow/react + Tailwind v4

## Key Learnings
- curl로 Windows 경로 전송 시 JSON 파싱 에러 → Python httpx 사용
- @hello-pangea/dnd, react-arborist는 React 19와 peer 충돌 → 직접 구현 또는 대체
- settings.json HTTP 훅 추가 시 기존 command 훅과 병렬 가능 (같은 이벤트에 여러 훅)
- Vite proxy로 /api → localhost:30100 포워딩하면 CORS 없이 개발 가능

## 참조 프로젝트
- **MemPalace**: C:\Users\amagr\Downloads\mempalace-develop\mempalace-develop
- **zm-v3**: C:\Users\amagr\hanumoka\projects\zm-v3
