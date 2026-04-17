---
name: 배포 워크플로우
type: deployment
---

# 배포 워크플로우

스테이지 검증을 거쳐 프로덕션 배포까지의 5단계 릴리즈 흐름.

## Nodes

| ID | Label | Type | Skill | Agent | Hook |
|-----|-------|------|-------|-------|------|
| review | 릴리즈 리뷰 | start |  | code-reviewer |  |
| build | 빌드 | step |  | build-checker |  |
| stage | 스테이지 배포 | step |  |  |  |
| verify | 스테이지 검증 | step |  |  |  |
| production | 프로덕션 배포 | end |  |  |  |

## Edges

| Source | Target | Condition |
|--------|--------|-----------|
| review | build |  |
| build | stage |  |
| stage | verify |  |
| verify | production |  |
