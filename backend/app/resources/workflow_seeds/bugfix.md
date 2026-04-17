---
name: 버그수정 워크플로우
type: bugfix
---

# 버그수정 워크플로우

이슈 발견부터 검증·배포까지의 7단계 버그 대응 흐름.

## Nodes

| ID | Label | Type | Skill | Agent | Hook |
|-----|-------|------|-------|-------|------|
| triage | 이슈 분류 | start |  |  |  |
| reproduce | 재현 | step |  |  |  |
| isolate | 원인 분석 | step |  |  |  |
| fix | 수정 | step |  | be-developer |  |
| test | 단위 테스트 | step |  | build-checker |  |
| verify | 통합 검증 | step |  | code-reviewer |  |
| deploy | 배포 | end |  |  |  |

## Edges

| Source | Target | Condition |
|--------|--------|-----------|
| triage | reproduce |  |
| reproduce | isolate |  |
| isolate | fix |  |
| fix | test |  |
| test | verify |  |
| verify | deploy |  |
