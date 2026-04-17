---
paths:
  - "backend/**/*.py"
  - "frontend/**/*.ts"
  - "frontend/**/*.tsx"
---

# 보안 규칙

## 필수 준수
- .env 파일 내용 절대 로그/응답에 노출 금지
- SQL 쿼리는 SQLAlchemy 파라미터 바인딩만 사용 (raw SQL 문자열 금지)
- 파일 경로 접근 시 path traversal 방지 (os.path.realpath + 화이트리스트)
- 사용자 입력을 마크다운 렌더링 시 XSS 방지 (sanitize)
- Docker 볼륨 마운트 시 최소 권한 원칙
