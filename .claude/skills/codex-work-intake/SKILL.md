---
name: codex-work-intake
description: 새 작업 접수 시 정책 검증 + 영향분석 + 문서 등록 통합 워크플로우
user-invocable: true
argument-hint: "<작업 설명>"
---

새 작업을 접수하고 5단계 검증 워크플로우를 실행합니다.

## 5단계 워크플로우

### 1단계: 요구사항 구체화 (Ambiguity Check)

$ARGUMENTS 분석:
- **구체적**: 구현 진행 가능 → 주의사항 표시
- **모호함**: 구현 가능 범위 분리 + 미확정 사항 질문
- **추상적**: 구현 거부 + 구체화 질문 3개+

### 2단계: 정책 충돌 검증

`.claude/memory/policy-registry.md`와 교차검증:
- 기존 확정 정책과 충돌 여부 확인
- 충돌 시 사용자에게 알림 + 해결 방안 제시

### 3단계: 영향분석 매트릭스

| 영역 | 영향 여부 | 변경 범위 |
|------|----------|----------|
| BE (backend/) | O/X | [상세] |
| FE (frontend/) | O/X | [상세] |
| DB (models/) | O/X | [상세] |
| 문서 (docs/) | O/X | [상세] |

### 4단계: 문서 등록

- `docs/project/prd.md` — Feature 등록
- `docs/session/current-phase.md` — Phase 항목 추가

### 5단계: 통합 리포트

```
## 작업 접수 리포트

### 요약
- 작업: [작업명]
- 정책 충돌: [있음/없음]

### 영향 범위
[매트릭스 요약]

### 다음 단계
- [ ] [구체적 구현 항목]
```
