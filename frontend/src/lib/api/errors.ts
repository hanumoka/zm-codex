export function extractApiMessage(e: unknown): string {
  if (!(e instanceof Error)) return "요청 처리 중 오류가 발생했습니다";
  const match = /API Error (\d+): (.+)/.exec(e.message);
  if (!match) return e.message;
  const [, status, body] = match;
  try {
    const parsed = JSON.parse(body ?? "") as { detail?: string };
    if (parsed.detail) return `(${status}) ${parsed.detail}`;
  } catch {
    // not JSON
  }
  return e.message;
}
