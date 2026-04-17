#!/bin/bash
# PreCompact 훅: 컨텍스트 압축 전 상태 보존

COMPACT_DIR=".claude/compact-snapshots"
mkdir -p "$COMPACT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT="$COMPACT_DIR/snapshot_${TIMESTAMP}.md"

{
  echo "# Compact Snapshot - $TIMESTAMP"
  echo ""
  echo "## 수정 파일 목록"
  git diff --name-only 2>/dev/null
  echo ""
  echo "## 미커밋 변경 요약"
  git diff --stat 2>/dev/null
} > "$SNAPSHOT"

echo "Compact snapshot saved: $SNAPSHOT"
exit 0
