---
paths:
  - "backend/**/*.py"
---

# Backend (FastAPI) 규칙

## 핵심 규칙
- Type hints 필수, `Any` 금지
- async/await 패턴 일관 사용
- Pydantic v2 모델로 요청/응답 검증
- SQLAlchemy 2.0 스타일 (select(), async session)
- 의존성 주입은 FastAPI Depends() 사용
- 환경변수는 pydantic-settings로 관리

## 네이밍
- 파일명: snake_case (documents.py, memory_engine.py)
- 클래스: PascalCase (DocumentService, MemoryEngine)
- 함수: snake_case (get_documents, search_memories)
- 라우터: `/api/v1/{resource}` REST 패턴

## 디렉토리 구조
```
backend/app/
├── api/           # 라우터 (documents.py, memories.py, ...)
├── core/          # 설정, DB 세션, 임베딩 엔진
├── models/        # SQLAlchemy ORM 모델
├── schemas/       # Pydantic 스키마
├── services/      # 비즈니스 로직
└── main.py        # FastAPI 앱 진입점
```

## pgvector 규칙
- 벡터 컬럼: `Vector(384)` 타입
- 인덱스: HNSW with `vector_cosine_ops`
- 유사도 조회: `1 - (embedding <=> query_vector)` (cosine distance)
- 임베딩 생성은 서비스 레이어에서 (라우터에서 직접 금지)

## 에러 처리
- HTTPException으로 일관된 에러
- 응답 형식: `{"success": bool, "data": any, "error": str | null}`
