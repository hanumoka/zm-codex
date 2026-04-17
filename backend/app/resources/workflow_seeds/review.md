---
name: 리뷰 워크플로우
type: review
---

# 리뷰 워크플로우

코드 리뷰 4단계 — 스캔, 분석, 제안, 승인.

## Nodes

| ID | Label | Type | Skill | Agent | Hook |
|-----|-------|------|-------|-------|------|
| scan | 스캔 | start |  |  |  |
| analyze | 분석 | step |  | code-reviewer |  |
| suggest | 개선안 제안 | step |  |  |  |
| approve | 승인 | end |  |  |  |

## Edges

| Source | Target | Condition |
|--------|--------|-----------|
| scan | analyze |  |
| analyze | suggest |  |
| suggest | approve |  |
