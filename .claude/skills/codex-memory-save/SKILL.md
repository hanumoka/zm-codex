---
name: codex-memory-save
description: 작업 완료 후 메모리/문서 자동 갱신
user-invocable: true
argument-hint: "feature|bugfix|docs [작업명]"
---

작업 완료 후 관련 문서를 자동으로 갱신합니다.

## 워크플로우

### 1단계: 작업 유형 판단

$ARGUMENTS에서 유형 추출:
- **feature**: 기능 구현 완료
- **bugfix**: 버그 수정 완료
- **docs**: 문서 변경

### 2단계: git diff 분석

`git diff --name-only`로 변경 파일 확인, 변경 범위 파악.

### 3단계: 문서 갱신

| 작업 유형 | 갱신 대상 |
|----------|----------|
| feature | docs/session/current-phase.md + docs/project/prd.md + MEMORY.md 수치 |
| bugfix | .claude/rules/known-mistakes.md + MEMORY.md 반복실수 |
| docs | 해당 문서만 |

### 4단계: 갱신 보고

변경된 문서 목록 + 갱신 내용 요약 출력.
