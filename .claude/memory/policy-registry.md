# zm-codex 정책 레지스트리 (SSOT)
> 확정된 아키텍처/기술/제품/제약 정책. 변경 시 사유 + 날짜 필수.

## ARCH — 아키텍처 정책

| ID | 정책 | 확정일 | 사유 |
|----|------|--------|------|
| ARCH-01 | BE: FastAPI (Python), FE: Vite+React (TypeScript) | 2026-04-16 | MemPalace 호환 + 사용자 React 경험 |
| ARCH-02 | DB: PostgreSQL 17 + pgvector 단일 통합 | 2026-04-16 | 하이브리드 쿼리, 트랜잭션 일관성, 운영 단순화 |
| ARCH-03 | 임베딩: all-MiniLM-L6-v2 (384d), 로컬 실행 | 2026-04-16 | API 불필요, MemPalace와 동일 모델 |
| ARCH-04 | 로컬 전용 실행, 로그인/인증 없음 | 2026-04-16 | 개인 개발 도구 |
| ARCH-05 | MCP Server로 Claude Code 직접 통합 | 2026-04-16 | MemPalace 29도구 패턴 참조 |

## TECH — 기술 정책

| ID | 정책 | 확정일 | 사유 |
|----|------|--------|------|
| TECH-01 | Python type hints 필수, Any 금지 | 2026-04-16 | 코드 품질 |
| TECH-02 | TypeScript strict mode, any 금지 | 2026-04-16 | 코드 품질 |
| TECH-03 | SQLAlchemy 2.0 async + asyncpg | 2026-04-16 | 성능 (1400 req/s) |
| TECH-04 | SSE (Server-Sent Events) 실시간 통신 | 2026-04-16 | WebSocket 대비 단순, 단방향 충분 |
| TECH-05 | 문서 청킹 800자, 오버랩 100자 | 2026-04-16 | MemPalace 벤치마크 검증 수치 |

## CONST — 제약 정책

| ID | 정책 | 확정일 | 사유 |
|----|------|--------|------|
| CONST-01 | 포트: BE=30100, FE=30200, DB=30432 | 2026-04-16 | zm-v3 포트와 충돌 방지 |
| CONST-02 | Docker 컨테이너 1개 (pgvector만) | 2026-04-16 | 로컬 도구, 최소 인프라 |

## 폐기된 정책

(아직 없음)
