---
name: 리뷰 워크플로우
type: review
---

# 리뷰 워크플로우

코드 리뷰 7단계 — 범위 파악부터 머지 준비까지. 변경의 의도 이해 → 정적 품질
점검 → 의미 검토 → 개선 제안 → 논의 반영 → 재확인 → 승인 흐름.

## Nodes

| ID | Label | Type | Skill | Agent | Hook |
|-----|-------|------|-------|-------|------|
| scope | 변경 범위 파악 | start |  |  |  |
| static | 정적 분석 (lint/type) | step |  | build-checker |  |
| semantic | 의미/설계 리뷰 | step |  | code-reviewer |  |
| suggest | 개선안 제안 | step |  |  |  |
| discuss | 작성자 논의 | decision |  |  |  |
| refine | 반영·재확인 | step |  | code-reviewer |  |
| approve | 승인 | end |  |  |  |

## Edges

| Source | Target | Condition |
|--------|--------|-----------|
| scope | static |  |
| static | semantic |  |
| semantic | suggest |  |
| suggest | discuss |  |
| discuss | refine | 수정 필요 |
| discuss | approve | 즉시 승인 |
| refine | approve |  |
