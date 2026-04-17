---
name: build-checker
description: BE/FE 빌드 검증. 타입 체크 + 린트 실행.
tools:
  - "Bash(python *)"
  - "Bash(npx tsc *)"
  - "Bash(npm run *)"
  - Read
model: haiku
maxTurns: 10
---

zm-codex 빌드 검증을 수행합니다.

## 검증 순서

1. Backend: `cd backend && python -m pyright` (또는 mypy)
2. Frontend: `cd frontend && npx tsc --noEmit`
3. 에러 발견 시 파일:라인 목록 보고
4. 에러 없으면 "빌드 검증 통과" 보고
