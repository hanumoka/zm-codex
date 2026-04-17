# zm-codex Project Memory
> 시스템 프롬프트 자동 로드 (200줄 한도). 최종 갱신: 2026-04-16 (Phase 7 완료 — PRD 전체 완료)

## 프로젝트 수치 (항상 최신 유지)
- BE: FastAPI **11 라우터** | FE: React 8 페이지 + 1 레이아웃
- DB: PostgreSQL + pgvector 9 테이블 (+code_doc_links) | 메모리 청크: 45개 | 임베딩: 384d HNSW cosine
- 등록 프로젝트: 1 (zm-codex) | 스캔 문서: 30개 (12가지 유형)
- 워크플로우: 2개 (개발 7노드, 버그수정 7노드) | 인스턴스: 1개
- 소스 파일: BE 47 Python + FE 14 TS/TSX
- 에이전트: 5개 | 규칙: 5개 | 훅: 6+HTTP | 스킬: 3개
- MCP 도구: 5개 (search_memories, list_documents, get_workflow_status, update_step_status, get_project_summary)
- 테스트: 통합 테스트 수동 검증 완료 (Phase 1, 2), 빌드 검증 통과 (Phase 5)

## 반복 실수 TOP 5 (절대 반복 금지)
1. **Windows 경로 백슬래시** → curl JSON에서 \\ 파싱 에러. Python httpx로 테스트하거나 / 사용
2. **React peer dependency 충돌** → React 19와 호환 안 되는 라이브러리 사전 확인 필수
3. **미사용 변수** → tsconfig noUnusedParameters=true로 빌드 실패. map((item, i) → i 안 쓰면 제거

## Phase 5 신규 모듈
- **File Watcher**: watchfiles.awatch 기반 비동기 파일 감시, 프로젝트별 독립 태스크, SSE 브로드캐스트
- **MCP Server**: JSON-RPC 2.0 Streamable HTTP, FastAPI 라우터로 구현 (별도 SDK 불필요)
- **Drift Detection**: git 커밋의 코드 vs 문서 변경 비교, 미갱신 경고
- **Sync Service**: _sync_documents 추출 → services/sync.py (watcher/projects 공유)
- **Workflow Classifier**: 커밋 패턴(feat/fix/docs 등) 분석 → workflow_type 자동 분류
- **Workflow Sync**: .claude/workflows/*.md ↔ DB 양방향 동기화 (export/import)
- **Config History**: .claude/ 파일 변경 시 config_changes 테이블에 이력 자동 기록
- **BM25 Hybrid**: rank_bm25 + vector cosine 60:40 가중 합산 (기존 /search 엔드포인트 내부 업그레이드)
- **Template Init**: .claude/ 구조를 템플릿으로 추출 → 다른 프로젝트에 적용
- **Channel Server**: asyncio.Queue 기반 Web→Claude Code 역방향 메시지 큐 (send/poll/status/history)
- **Code-Doc Linking**: 커밋↔문서 양방향 자동 링크 (경로 매칭 + 키워드 매칭, confidence 점수)

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
