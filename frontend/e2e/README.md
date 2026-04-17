# Frontend E2E Tests (Playwright)

> `@playwright/test` 기반 실제 브라우저(Chromium) + 실제 BE 통합 테스트.
> API·페이지 양 축을 커버한다.

## 실행 전제

두 서버가 **반드시 사전 기동**되어 있어야 한다. `e2e/fixtures/servers.ts`의 preflight fixture가
`GET /api/v1/health`를 찔러 200이 아니면 테스트 전체를 hard-fail 시킨다.

| 서버 | 포트 | 기동 명령 |
|------|------|----------|
| PostgreSQL + pgvector | 30432 | `docker compose up -d` |
| FastAPI (BE) | 30100 | `cd backend && uvicorn app.main:app --port 30100` |
| Vite dev (FE) | 30200 | `cd frontend && npm run dev` |

Playwright는 FE를 `http://localhost:30200` 기준으로 Navigation하므로 FE도 떠 있어야 한다.
BE URL은 `ZM_BE_URL` / FE URL은 `ZM_FE_URL` 환경 변수로 오버라이드 가능.

또한 pytest와 동일하게 **`zm-codex` 프로젝트가 DB에 등록되어 있어야 한다** (fixtures/api.ts의
`project` fixture는 첫 프로젝트를 잡고 없으면 에러를 낸다). 등록 방법은
`backend/tests/README.md` 참고.

## 실행

```bash
cd frontend
npm run test:e2e           # 전체 (headless)
npm run test:e2e:ui        # Playwright UI 모드
npm run test:e2e:headed    # 브라우저 창 보이기
npm run test:e2e:api       # e2e/api/ 만 (BE 직접 호출, FE 불필요)
npm run test:e2e:pages     # e2e/pages/ 만 (FE 네비게이션 포함)
npm run test:e2e:report    # 최근 HTML 리포트 열기
```

## 테스트 파일 구성

### `e2e/api/` — BE HTTP 계약 검증 (FE 미필요)
| 파일 | 대상 |
|------|------|
| `projects.api.spec.ts` | 프로젝트 등록/목록 |
| `workflows.api.spec.ts` | 워크플로우 CRUD + 인스턴스 + auto-detect |
| `memories.api.spec.ts` | 인제스트·검색 |
| `config.api.spec.ts` | 설정 비교 |
| `changes.api.spec.ts` | 통합 타임라인 |
| `watcher.api.spec.ts` | 파일 감시 시작/정지 |
| `dashboard.api.spec.ts` | 대시보드 통계 |
| `hooks.api.spec.ts` | 훅 이벤트 수신 |
| `channel.api.spec.ts` | 역방향 채널 |

### `e2e/pages/` — FE 페이지 네비게이션 + UI 인터랙션
| 파일 | 대상 |
|------|------|
| `dashboard.spec.ts`·`documents.spec.ts`·`memory.spec.ts` | 기본 페이지 렌더 |
| `workflow.spec.ts` | 헤더, 뷰 토글, 자동 감지 |
| **`workflow-create.spec.ts`** | 템플릿 픽커 · 직접 입력 · 409 인라인 (2026-04-17 추가) |
| **`workflow-edit.spec.ts`** | hover→연필/휴지통 액션 · 리네임/삭제 모달 · Export 모달 |
| **`workflow-instance.spec.ts`** | `+ 인스턴스` · 노드 전진 · 상태 3-way · Radar 하이라이트 |
| `config.spec.ts`·`changes.spec.ts`·`watcher.spec.ts`·`policies.spec.ts` | 그 외 페이지 |

### `e2e/mcp/`·`e2e/sse/`
MCP JSON-RPC 및 SSE 연결/이벤트 검증.

## 공용 유틸

### `utils/cleanup.ts::e2eTitle(suffix)`
`[e2e-<timestamp>-<rand>-<suffix>]` 형식 고유 이름. 같은 프로젝트 DB에서 여러 테스트 동시 실행
또는 실패 잔재를 나중에 구분/정리하기 위함.

### `fixtures/api.ts::be` / `project`
- `be`: BE 30100 베이스의 `APIRequestContext` — `be.post("/api/v1/workflows", {...})` 형태로 직접 호출
- `project`: zm-codex 프로젝트 record — 없으면 에러로 hard-fail

## 구현 메모

### Pill 선택자
워크플로우 selector pill은 `<div>` 컨테이너 내부에 `<button>{name} {N} nodes</button>`
구조라서 `page.getByRole("button", { name: /wfName/ })`로 내부 버튼에 접근 가능.
편집 아이콘(`<button title="이름 수정">` 등)은 같은 컨테이너의 형제로 `getByTitle`로 접근.

### 테스트 데이터 정리
각 테스트는 `try/finally`의 `finally` 블록에서 `be.delete(/api/v1/workflows/<id>)`를
호출해 자신이 만든 row를 지운다. BE의 `delete_workflow`는 대응 `.claude/workflows/<slug>.md`
파일도 함께 제거하므로 파일 잔재 걱정은 덜 수 있다.

### Preflight hard-fail
첫 테스트에서 `BE preflight failed: /api/v1/health returned ...`가 보이면,
BE가 안 떠 있거나 DB 연결이 안 된 상태. 상위 전제 3개 체크 → 재실행.

## 참고
- 상위 README: `../../CLAUDE.md`
- BE pytest: `../../backend/tests/README.md`
- 실수 레지스트리: `../../.claude/rules/known-mistakes.md`
