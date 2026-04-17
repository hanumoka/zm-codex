---
name: codex-session
description: 세션 시작 시 프로젝트 상태 종합 보고
user-invocable: true
argument-hint: ""
---

현재 프로젝트 상태를 종합적으로 보고합니다.

## 워크플로우

### 1단계: 문서 읽기
- docs/session/current-phase.md (현재 Phase)
- .claude/memory/MEMORY.md (프로젝트 수치)

### 2단계: Git 상태
- `git status` (미커밋 변경)
- `git log --oneline -5` (최근 커밋)

### 3단계: 종합 보고

```
## 세션 상태 보고

### 현재 Phase
[current-phase.md 요약]

### 프로젝트 수치
[MEMORY.md 수치 섹션]

### Git 상태
[미커밋 변경 + 최근 커밋]

### 다음 작업
[current-phase.md에서 미완료 항목]
```
