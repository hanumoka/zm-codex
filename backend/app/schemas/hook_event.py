from pydantic import BaseModel


class HookEventPayload(BaseModel):
    """Payload received from Claude Code HTTP hooks."""

    session_id: str | None = None
    hook_event_name: str
    tool_name: str | None = None
    tool_input: dict | None = None
    tool_response: dict | None = None
    tool_use_id: str | None = None
    cwd: str | None = None
    transcript_path: str | None = None
    permission_mode: str | None = None
    source: str | None = None  # SessionStart source (startup/compact/resume)
    model: str | None = None

    model_config = {"extra": "allow"}


class HookEventResponse(BaseModel):
    """Response sent back to Claude Code."""

    continue_: bool = True

    model_config = {"populate_by_name": True}
