# Backend Regression Tests

> `pytest` + `pytest-asyncio` + `httpx.ASGITransport` 기반 회귀 테스트.
> FastAPI 앱을 in-process로 호출하므로 별도 uvicorn 기동은 불필요하지만,
> **실제 개발 DB (PostgreSQL 30432)에 붙어 동작**한다.

## 실행 전제

1. **PostgreSQL + pgvector 기동** (포트 30432)
   ```bash
   docker compose up -d
   ```
2. **`zm-codex` 프로젝트가 DB에 등록되어 있어야 함** — `tests/conftest.py::zm_project` 픽스처가
   `SELECT * FROM projects WHERE name='zm-codex'`로 조회한다. 없으면 모든 테스트가 assert 실패.
   ```bash
   # 한 번만 실행해두면 됨
   curl -X POST http://localhost:30100/api/v1/projects \
     -H 'Content-Type: application/json' \
     -d '{"name":"zm-codex","path":"C:/Users/.../project/zm-codex"}'
   ```
3. **dev 의존성 설치** (pytest, pytest-asyncio, httpx)
   ```bash
   pip install -e ".[dev]"
   ```

## 실행

```bash
cd backend
python -m pytest tests/           # 전체
python -m pytest tests/ -v        # verbose
python -m pytest tests/test_workflow_crud.py::test_duplicate_name_returns_409  # 단일 테스트
```

## 테스트 파일 구성

| 파일 | 대상 | 케이스 수 |
|------|------|----------|
| `test_workflow_templates.py` | 번들 .md 시드 API, from-template 409·404, path traversal/NULL byte | 6 |
| `test_workflow_crud.py` | CRUD, 이름 중복, rename 충돌, 인스턴스 생성/전진/삭제, export·import | 8 |
| `test_mcp_workflow_tools.py` | MCP `create_workflow_from_template`, `create_instance`, `update_step_status` JSON-RPC 왕복 | 6 |

## 구현 메모 (주요 함정)

### 이벤트 루프 스코프
앱의 `app.core.database.engine`은 모듈 import 시 생성되어 **처음 사용된 이벤트 루프에 바인딩**된다.
pytest-asyncio 0.23+ 기본값(function-scope loop)과 결합하면 두 번째 테스트부터
`"another operation in progress"` 또는 `"attached to a different loop"`이 폭발한다.

해결: `pyproject.toml [tool.pytest.ini_options]`에
```toml
asyncio_default_fixture_loop_scope = "session"
asyncio_default_test_loop_scope = "session"
```
둘 다 지정. (known-mistakes.md M-006)

### 테스트 데이터 정리
`tests/conftest.py::tracker` 픽스처에 워크플로우 id를 `append`해두면 teardown에서
`DELETE /api/v1/workflows/<id>`로 정리한다. `delete_workflow`가 동일 슬러그의
`.claude/workflows/<slug>.md`도 같이 지우므로 파일 잔재도 함께 제거된다.

템플릿 테스트처럼 파일을 추가로 만드는 경우에만 try/finally에서 명시적으로
`os.remove`가 필요하다.

### 테스트가 실제 DB에 쓰는 점에 주의
- 각 테스트는 고유한 `[pytest-<uuid>]` 접두 이름으로 row를 만들어 충돌을 피한다.
- 테스트 실행 중 앱을 브라우저로 열면, 테스트가 만든 임시 워크플로우가 잠깐 섞여 보일 수 있다.
- 테스트 실패 시 `[pytest-...]` row가 남을 수 있다. 주기적으로
  `SELECT * FROM workflows WHERE name LIKE '[pytest-%'` 확인 권장.

## 참고
- 상위 README: `C:/Users/amagr/project/zm-codex/CLAUDE.md`
- Playwright (FE) 테스트: `frontend/e2e/README.md`
- 실수 레지스트리: `.claude/rules/known-mistakes.md`
