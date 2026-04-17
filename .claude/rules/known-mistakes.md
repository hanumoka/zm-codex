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

<!--
## 등록 양식

### M-NNN [BLOCK|WARN] — 제목
- **현상**: 무엇이 잘못되었는지
- **원인**: 왜 발생했는지
- **올바른 접근**: 어떻게 해야 하는지
- **감지 방법**: 어떻게 발견할 수 있는지
- **발생일**: YYYY-MM-DD
-->
