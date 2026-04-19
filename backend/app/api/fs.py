"""Filesystem browse API — directory traversal for project path selection."""

import string
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/fs", tags=["fs"])


class FsEntry(BaseModel):
    name: str
    path: str
    is_dir: bool


class FsBrowseResponse(BaseModel):
    current: str
    parent: str | None
    entries: list[FsEntry]


def _list_drives() -> list[FsEntry]:
    """Return available Windows drives as FsEntry list."""
    entries: list[FsEntry] = []
    for letter in string.ascii_uppercase:
        drive = Path(f"{letter}:/")
        if drive.exists():
            entries.append(
                FsEntry(name=f"{letter}:", path=f"{letter}:/", is_dir=True)
            )
    return entries


def _normalise(p: Path) -> str:
    """Return POSIX-style path string with forward slashes."""
    return p.as_posix()


@router.get("/browse", response_model=FsBrowseResponse)
async def browse(path: str = "") -> FsBrowseResponse:
    """Browse filesystem directory.

    - path가 없으면 Windows 드라이브 목록 반환
    - 존재하지 않는 경로 → 404
    - entries는 디렉토리 우선, 이름 알파벳순
    """
    # 드라이브 목록 모드
    if not path:
        return FsBrowseResponse(
            current="",
            parent=None,
            entries=_list_drives(),
        )

    # path traversal 방지: realpath로 심볼릭 링크 해소
    resolved = Path(path).resolve()

    if not resolved.exists():
        raise HTTPException(status_code=404, detail=f"Path not found: {path}")

    if not resolved.is_dir():
        raise HTTPException(status_code=400, detail=f"Not a directory: {path}")

    # 부모 경로 계산 (드라이브 루트이면 None)
    parent_path = resolved.parent
    parent_str: str | None
    if parent_path == resolved:
        # 드라이브 루트(예: C:/)는 자기 자신이 부모
        parent_str = None
    else:
        parent_str = _normalise(parent_path)

    # 디렉토리 항목 수집
    entries: list[FsEntry] = []
    try:
        children = list(resolved.iterdir())
    except PermissionError:
        children = []

    dirs: list[FsEntry] = []
    files: list[FsEntry] = []
    for child in children:
        try:
            is_dir = child.is_dir()
        except PermissionError:
            continue
        entry = FsEntry(
            name=child.name,
            path=_normalise(child),
            is_dir=is_dir,
        )
        if is_dir:
            dirs.append(entry)
        else:
            files.append(entry)

    dirs.sort(key=lambda e: e.name.lower())
    files.sort(key=lambda e: e.name.lower())
    entries = dirs + files

    return FsBrowseResponse(
        current=_normalise(resolved),
        parent=parent_str,
        entries=entries,
    )
