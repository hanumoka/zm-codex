#!/bin/bash
# SessionStart 훅: 세션 시작 시 컨텍스트 로드

echo "=== zm-codex 세션 시작 ==="
echo "프로젝트: Claude Code 종합 관리 시스템"

# 현재 Phase 확인
if [ -f "docs/session/current-phase.md" ]; then
  head -5 docs/session/current-phase.md
fi

# Git 상태 요약
echo ""
echo "--- Git Status ---"
git status --short 2>/dev/null || echo "(git 미초기화)"

echo "=== 세션 준비 완료 ==="
exit 0
