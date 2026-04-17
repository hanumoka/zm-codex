# zm-codex Quick Reference
> 1페이지 프로젝트 요약 (세션 시작 시 필독)

## 프로젝트
- **이름**: zm-codex
- **목적**: Claude Code 전용 종합 관리 시스템
- **스택**: FastAPI (BE) + Vite/React (FE) + PostgreSQL/pgvector (DB)
- **상태**: Phase 0 — 프로젝트 초기화

## 포트
- BE: 30100 | FE: 30200 | DB: 30432

## 핵심 모듈 (7개)
A. Document Manager | B. Pipeline Tracker | C. Memory Engine
D. Config Sync | E. Change Tracker | F. File Watcher | G. MCP Server

## 핵심 파일
- `CLAUDE.md` — 프로젝트 가이드
- `.claude/memory/MEMORY.md` — 프로젝트 수치 + 학습
- `.claude/memory/policy-registry.md` — 확정 정책
- `docs/session/current-phase.md` — 현재 작업 상태
- `docs/project/prd.md` — 기능 목록 + 로드맵
