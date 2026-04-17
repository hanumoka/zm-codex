#!/bin/bash
# PreToolUse 훅: 알려진 실수 패턴 차단
# 매칭: Bash|Write|Edit

# 현재는 차단 패턴 없음. 실수 발견 시 아래에 추가.
# 형식:
# if echo "$TOOL_INPUT" | grep -qE "위험패턴"; then
#   echo "BLOCK: M-NNN 설명" >&2
#   exit 1
# fi

exit 0
