---
paths:
  - "frontend/**/*.tsx"
  - "frontend/**/*.ts"
---

# Frontend (React) 규칙

## 핵심 규칙
- Tailwind CSS v4 클래스 사용 (인라인 스타일 금지)
- shadcn/ui + Radix UI 컴포넌트 우선
- API 호출은 lib/api/ 클라이언트 사용
- Zustand 스토어는 stores/ 디렉토리
- TypeScript strict mode, any 금지

## 상태 관리
- **서버 상태**: TanStack Query (API 데이터 캐싱, refetch)
- **클라이언트 상태**: Zustand (UI 상태, 설정)

## 컴포넌트 패턴
- 컴포넌트 파일: PascalCase (DocumentTree.tsx)
- 유틸/훅: camelCase (useDocuments.ts)
- 페이지: pages/ 디렉토리, 라우팅은 react-router

## 마크다운 렌더링
- react-markdown + remark-gfm 사용
- 코드 블록 하이라이팅: rehype-highlight
- 테이블: GFM 테이블 지원 필수

## 자주 발생하는 위반
- window./document. 접근: SSR 없으므로 괜찮지만, 컴포넌트 마운트 후 접근 권장
- API 응답: response.data 패턴 확인 (FastAPI 래핑 구조)
