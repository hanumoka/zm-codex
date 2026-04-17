---
paths:
  - "**/*"
---

# 알려진 실수 레지스트리

> 실수 발견 시 여기에 M-NNN 형식으로 기록. [BLOCK] 수준은 mistake-guard.sh에도 추가.
> MEMORY.md는 개괄 요약, 이 파일이 단일 출처(Source of Truth).

## 실수 목록

### M-001 [WARN] Windows 경로 백슬래시 — curl JSON 파싱 에러
- **현상**: `curl -d '{"path":"C:\\Users\\..."}'`가 셸/JSON 인코딩에서 이중 이스케이프 충돌로 실패
- **원인**: Windows 경로의 `\`가 JSON escape와 충돌
- **올바른 접근**: Python `httpx`로 테스트하거나 `/` 구분자 사용
- **감지 방법**: 수동 API 검증 시 400/422 응답 확인
- **발생일**: 2026-04-16 (Phase 1 프로젝트 등록 API 검증)

### M-002 [BLOCK] React peer dependency 충돌 (React 19)
- **현상**: `@hello-pangea/dnd`, `react-arborist` 등이 React 19와 peer 충돌 → 설치 실패 또는 런타임 에러
- **원인**: 라이브러리가 React 17/18까지만 peer 범위 선언
- **올바른 접근**: 라이브러리 도입 전 React 19 호환 확인. DnD/트리 뷰는 필요 시 직접 구현 또는 `@xyflow/react` 등 호환 라이브러리로 대체
- **감지 방법**: `npm install` 경고, `npm ls react`로 중복 확인
- **발생일**: 2026-04-16 (Phase 1/2 FE 스캐폴딩)

### M-003 [BLOCK] 미사용 변수로 tsc 빌드 실패
- **현상**: `tsconfig.json`의 `noUnusedParameters: true` 때문에 `.map((item, i) => ...)` 에서 `i`를 안 쓰면 빌드 실패
- **원인**: strict 설정 + 의도치 않은 파라미터 캡처
- **올바른 접근**: 인자 제거하거나 `_` 접두사 사용
- **감지 방법**: `build-checker` 에이전트의 `npx tsc --noEmit`에서 조기 발견
- **발생일**: 2026-04-16 (Phase 2 WorkflowPage 구현)

### M-004 [WARN] HTML `<button>` 안에 `<div>` 중첩
- **현상**: React 개발 모드에서 `validateDOMNesting` 경고. 브라우저는 자동 복구하지만 접근성 도구 경고 + 브라우저별 파싱 차이 가능
- **원인**: `<button>`은 phrasing content만 허용하는데 block-level `<div>`를 자식으로 넣음 (상태 dot 렌더링 등)
- **올바른 접근**: inline 요소 (`<span className="inline-block">`)로 교체, 혹은 button을 `<div role="button">`로 변경
- **감지 방법**: `npm run dev`로 띄운 뒤 콘솔 warning, 또는 React 19 strict 모드
- **발생일**: 2026-04-17 (Phase 7 유지보수 InstancePanel 코드 리뷰)

### M-005 [WARN] Controlled `<select>`의 value/option 불일치
- **현상**: React가 `Warning: <select> received value=X but no <option> with that value`. UI는 첫 option을 표시하지만 실제 상태는 ""
- **원인**: `instance.current_node`가 nullable인데 `value={instance.current_node ?? ""}`로 묶고, options에는 빈 문자열 값이 없어 미스매치
- **올바른 접근**: nullable 값이 올 수 있으면 `<option value="" disabled>— 선택 —</option>` placeholder 추가
- **감지 방법**: 브라우저 콘솔 warning, 또는 초기 렌더 후 사용자가 선택을 바꿨는데 `onChange`가 첫 번째 실제 변경에서만 의도대로 발동하는 현상
- **발생일**: 2026-04-17 (Phase 7 유지보수 InstancePanel 코드 리뷰)

### M-006 [BLOCK] pytest-asyncio 이벤트 루프 스코프 미지정 → 앱 전역 asyncpg 엔진 충돌
- **현상**: 테스트 실행 시 "another operation is in progress" 또는 "attached to a different loop" 에러가 아무렇게나 튀어나옴. pytest가 테스트마다 새 event loop를 만드는데 앱의 모듈 수준 asyncpg 엔진은 첫 루프에 바인딩되므로 이후 테스트에서 cross-loop 참조가 일어남
- **원인**: pytest-asyncio 0.23+ 기본값이 function-scope loop
- **올바른 접근**: `pyproject.toml [tool.pytest.ini_options]`에 `asyncio_default_fixture_loop_scope = "session"`과 `asyncio_default_test_loop_scope = "session"` 둘 다 지정. 또는 테스트 전용 엔진 교체(NullPool 등)로 루프 바인딩 해소
- **감지 방법**: `pytest -v` 첫 실행에서 테스트 2~3개 이상이 랜덤하게 실패, fixture의 `async_session()` 또는 ASGI 경유 DB 호출이 시발점
- **발생일**: 2026-04-17 (Phase 7 유지보수 pytest 인프라 도입)

### M-007 [WARN] API 엔드포인트 검증 대칭성 누락
- **현상**: 동일 도메인의 여러 진입로(POST A, POST B, PATCH C) 중 일부만 중복/가드를 검증하고 나머지는 통과시킴 → 사용자가 진입로를 바꾸는 것만으로 규칙을 우회
- **원인**: 변경 A를 추가할 때 관련 진입로를 그리드로 훑지 않음
- **올바른 접근**: 새 검증이 생기면 같은 리소스의 모든 쓰기 진입점(Create/Update/Import/From-template) 표로 나열하고 각각 같은 계약(409/404 등)을 가지도록 동기화
- **감지 방법**: 새 UI가 실수로 "A에선 중복 거부되고 B에선 조용히 통과"처럼 보이면 의심
- **발생일**: 2026-04-17 (워크플로우 이름 중복 검증 — from-template만 409, POST/PATCH는 누수됐음)

<!--
## 등록 양식

### M-NNN [BLOCK|WARN] — 제목
- **현상**: 무엇이 잘못되었는지
- **원인**: 왜 발생했는지
- **올바른 접근**: 어떻게 해야 하는지
- **감지 방법**: 어떻게 발견할 수 있는지
- **발생일**: YYYY-MM-DD
-->
