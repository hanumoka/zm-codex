---
name: 개발 워크플로우
type: development
---

# 개발 워크플로우

신규 기능 개발의 표준 7단계 흐름. 요구사항 조사부터 배포까지.

## Nodes

| ID | Label | Type | Skill | Agent | Hook |
|-----|-------|------|-------|-------|------|
| research | 요구사항 조사 | start |  |  |  |
| design | 설계 | step |  |  |  |
| implement | 구현 | step |  | be-developer |  |
| test | 테스트 | step |  | build-checker |  |
| review | 코드 리뷰 | step |  | code-reviewer |  |
| docs | 문서 갱신 | step |  | doc-updater |  |
| deploy | 배포 | end |  |  |  |

## Edges

| Source | Target | Condition |
|--------|--------|-----------|
| research | design |  |
| design | implement |  |
| implement | test |  |
| test | review |  |
| review | docs |  |
| docs | deploy |  |
