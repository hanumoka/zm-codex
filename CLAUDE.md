@.claude/memory/MEMORY.md

# CLAUDE.md - zm-codex 프로젝트 가이드

> **Claude Code 전용 종합 관리 시스템**
> **최종 업데이트**: 2026-04-16

---

## 프로젝트 개요

**zm-codex**는 Claude Code로 개발할 때 발생하는 복합적 문제를 해결하는 **종합 관리 시스템**입니다.

### 해결하는 문제
1. **셋팅 효율화** — 여러 프로젝트의 Claude Code 설정을 중앙에서 관리
2. **문서 정리** — Claude Code에서 발생하는 방대한 문서를 구조화하여 시각화
3. **워크플로우 자동화** — 작업 flow를 자동화하고 스스로 고도화
4. **표준 문서 뷰** — 변경이력, 정책, 설계구조, 스키마, API spec 등 프레젠테이션
5. **파이프라인 가시성** — 요구사항 분석 → task 분리 → 구현 → 완료 전 과정 추적
6. **메모리 검색** — MemPalace 영감의 시맨틱 벡터 검색 기반 기억 시스템
7. **요구사항 검증** — 잘못된 요구사항에 대한 자동 감지 및 대응

### 영감
- **MemPalace** — 시맨틱 검색, 청킹, 레이어드 메모리 아키텍처
- **zm-v3** — Claude Code 셋팅 패턴, 훅 시스템, 에이전트 위임, 정책 레지스트리

---

## 작업 방식

> Claude Code 자율 개발 → 사용자 리뷰. 커밋은 사용자 요청 시만.

1. **효율성 우선**: 빠른 구현 집중
2. **코드 품질**: TypeScript strict (FE), Python type hints (BE)
3. **문서화**: 중요 결정 즉시 문서 반영
4. **점진적 개발**: 기능 단위 커밋, 동작 확인 후 다음 진행

---

## 기술 스택

| 영역 | 핵심 기술 |
|------|----------|
| **BE** | Python 3.11+, FastAPI, SQLAlchemy 2.0 async, asyncpg |
| **DB** | PostgreSQL 17 + pgvector (HNSW cosine), Docker 컨테이너 |
| **임베딩** | sentence-transformers all-MiniLM-L6-v2 (384d, 로컬) |
| **FE** | Vite, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| **상태** | TanStack Query (서버), Zustand (클라이언트) |
| **실시간** | SSE (Server-Sent Events) |
| **파일감시** | watchfiles (Rust 기반) |

### 포트 규칙
- **BE**: 30100 (FastAPI)
- **FE**: 30200 (Vite dev server)
- **DB**: 30432 (PostgreSQL)

---

## 프로젝트 구조

```
zm-codex/
├── backend/                  # FastAPI 백엔드
│   ├── app/
│   │   ├── api/              # API 라우터
│   │   ├── core/             # 설정, DB, 임베딩
│   │   ├── models/           # SQLAlchemy 모델
│   │   ├── services/         # 비즈니스 로직
│   │   └── main.py           # FastAPI 앱 진입점
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/                 # Vite + React 프론트엔드
│   ├── src/
│   │   ├── components/       # UI 컴포넌트
│   │   ├── pages/            # 페이지
│   │   ├── lib/              # API 클라이언트, 유틸
│   │   └── stores/           # Zustand 스토어
│   ├── package.json
│   └── vite.config.ts
├── docs/                     # 프로젝트 관리 문서
│   ├── project/              # PRD, 로드맵
│   ├── session/              # 세션 추적
│   ├── features/             # 기능별 상세
│   └── archive/              # 완료 이력
├── .claude/                  # Claude Code 설정
│   ├── settings.json
│   ├── agents/
│   ├── hooks/
│   ├── memory/
│   ├── rules/
│   └── skills/
├── docker-compose.yml        # PostgreSQL + pgvector
├── CLAUDE.md                 # (이 파일)
└── .gitignore
```

---

## 핵심 모듈 (7개)

| 모듈 | 역할 | 우선순위 |
|------|------|---------|
| **A. Document Manager** | 문서 스캔/파싱/분류/트리뷰 | Phase 1 |
| **B. Pipeline Tracker** | 요구사항→구현→완료 파이프라인 칸반 | Phase 4 |
| **C. Memory Engine** | pgvector 시맨틱 검색 (MemPalace 방식) | Phase 2 |
| **D. Config Sync** | 멀티프로젝트 Claude Code 설정 동기화 | Phase 4 |
| **E. Change Tracker** | git+문서 통합 타임라인, 드리프트 감지 | Phase 3 |
| **F. File Watcher** | 실시간 파일 감시 + 자동 인덱싱 | Phase 5 |
| **G. MCP Server** | Claude Code 직접 호출 도구 | Phase 5 |

---

## 에이전트 위임 규칙

| 작업 유형 | 위임 에이전트 | 모델 |
|----------|------------|------|
| BE 구현 (API/Service) | `be-developer` | sonnet |
| FE 구현 (페이지/컴포넌트) | `fe-developer` | sonnet |
| 코드 리뷰 | `code-reviewer` | sonnet |
| 빌드 검증 | `build-checker` | haiku |
| 문서 갱신 | `doc-updater` | haiku |

---

## Git 관리

```
<type>(<scope>): <subject>
<body> (선택)
Co-Authored-By: Claude Code <noreply@anthropic.com>
```
**Type**: feat, fix, refactor, docs, test, chore
**Scope**: be, fe, docs, memory, pipeline, config, mcp

---

## 코딩 스타일

### Backend (Python)
- Type hints 필수, `Any` 금지
- async/await 패턴 일관 사용
- Pydantic v2 모델로 요청/응답 검증
- SQLAlchemy 2.0 스타일 (select(), async session)

### Frontend (TypeScript)
- `"strict": true` 필수, `any` 금지
- Tailwind CSS v4 클래스 (인라인 스타일 금지)
- shadcn/ui 컴포넌트 우선
- API 호출은 lib/api/ 클라이언트 사용

---

## 필수 프로토콜

### Work Completion Protocol
작업 완료 시 문서 자동 갱신:
| 작업 유형 | 갱신 대상 |
|----------|----------|
| feature | docs/session/current-phase.md + docs/project/prd.md |
| bugfix | .claude/rules/known-mistakes.md (M-NNN) |
| docs | 해당 문서만 |

### Mistake Recording Protocol
실수 지적 시:
1. `.claude/rules/known-mistakes.md`에 M-NNN 추가
2. [BLOCK] 수준이면 `.claude/hooks/mistake-guard.sh`에도 패턴 추가

---

*프로젝트: zm-codex (Claude Code 종합 관리 시스템)*
*상태: **Phase 7 완료 — PRD 전체 구현 완료***
*작업 모드: Claude 자율 개발 + 사용자 리뷰*
