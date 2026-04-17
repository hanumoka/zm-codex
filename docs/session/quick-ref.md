# zm-codex Quick Reference
> 1페이지 프로젝트 요약 (세션 시작 시 필독). 최종 갱신: 2026-04-17

## 프로젝트
- **이름**: zm-codex
- **목적**: Claude Code 전용 종합 관리 시스템
- **스택**: FastAPI (BE) + Vite/React (FE) + PostgreSQL/pgvector (DB)
- **상태**: Phase 7 + 유지보수 완료 — 핵심 모듈(A~G) + 워크플로우 관리자 전면 완성(BE/FE 양방향, 번들 템플릿·CRUD·export/import·SSE 동기화·pytest 13건).

## 포트
- BE: 30100 | FE: 30200 | DB: 30432

## 핵심 모듈 (7개)
A. Document Manager | B. Workflow Manager | C. Memory Engine
D. Config Sync | E. Change Tracker | F. File Watcher | G. MCP/Channel Server

## BE 라우터 (11개)
hooks, projects, stream, workflows, memories, config, changes, dashboard, watcher, mcp, channel

## FE 페이지 (8개 + Layout)
Dashboard, Documents, Workflow, Memory, Config, Changes, Watcher, Policies

## 핵심 파일
- `CLAUDE.md` — 프로젝트 가이드
- `.claude/memory/MEMORY.md` — 프로젝트 수치 + 학습
- `.claude/memory/policy-registry.md` — 확정 정책
- `.claude/rules/known-mistakes.md` — 반복 실수 레지스트리 (M-NNN)
- `docs/session/current-phase.md` — 현재 작업 상태
- `docs/project/prd.md` — 기능 목록 + 모듈별 완료 상태
- `docs/project/roadmap.md` — Phase별 로드맵
