# Module A: Document Manager

## 개요
여러 프로젝트의 Claude Code 문서를 스캔, 파싱, 분류하여 시각화하는 모듈.

## 기능
1. **프로젝트 등록** — 로컬 경로 지정으로 프로젝트 추가
2. **문서 스캔** — `.claude/`, `*-docs/` 디렉토리 자동 탐색
3. **마크다운 파싱** — frontmatter, 링크, 날짜, 태그 추출
4. **트리 뷰** — react-arborist로 파일 구조 시각화
5. **마크다운 뷰어** — react-markdown으로 문서 렌더링
6. **표준 문서 유형별 뷰**:
   - 변경이력 (Changelog) — 타임라인 뷰
   - 주요 정책 (Policy Registry) — 테이블 뷰
   - 설계구조 (Architecture) — 다이어그램 뷰
   - 스키마 (Database Schema) — ERD 뷰
   - API Spec — 엔드포인트 목록 뷰
   - 트러블슈팅 패턴 — 검색 가능 목록
   - 로드맵 — 간트/타임라인 뷰

## API 설계

```
GET    /api/v1/projects                    # 등록된 프로젝트 목록
POST   /api/v1/projects                    # 프로젝트 등록
GET    /api/v1/projects/:id/documents      # 문서 트리
GET    /api/v1/documents/:id               # 문서 내용
GET    /api/v1/documents/:id/metadata      # 문서 메타데이터
```

## 참조
- MemPalace의 Wing/Room/Drawer 계층 구조
- zm-v3의 zm-claude-docs/ 75개 파일 구조
