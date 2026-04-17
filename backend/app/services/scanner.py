"""Scan .claude/ and docs/ directories for documents."""

import hashlib
import os
from datetime import datetime, timezone
from pathlib import Path


# Document type detection based on path and filename patterns
DOC_TYPE_PATTERNS: dict[str, list[str]] = {
    "memory": ["memory/", "MEMORY.md"],
    "policy": ["policy-registry", "policy"],
    "rule": ["rules/"],
    "mistakes": ["known-mistakes", "mistakes"],
    "agent": ["agents/"],
    "skill": ["skills/"],
    "hook": ["hooks/"],
    "prd": ["prd.md"],
    "roadmap": ["roadmap.md"],
    "session": ["session/", "current-phase", "quick-ref"],
    "feature": ["features/"],
    "archive": ["archive/"],
    "config": ["settings.json", ".mcp.json"],
}

SCANNABLE_EXTENSIONS = {
    ".md", ".txt", ".json", ".yaml", ".yml", ".toml",
    ".sh", ".py", ".ts", ".tsx", ".js",
}

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", "postgres-data",
}


def detect_doc_type(file_path: str) -> str | None:
    """Detect document type from file path patterns."""
    normalized = file_path.replace("\\", "/")
    for doc_type, patterns in DOC_TYPE_PATTERNS.items():
        for pattern in patterns:
            if pattern in normalized:
                return doc_type
    return None


def compute_hash(content: str) -> str:
    """SHA-256 hash of content for change detection."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def scan_directory(project_path: str) -> list[dict]:
    """Scan a project directory for .claude/ and docs/ documents.

    Returns list of dicts with: file_path, file_name, doc_type, content, file_size, last_modified
    """
    root = Path(project_path)
    if not root.exists():
        raise FileNotFoundError(f"Project path not found: {project_path}")

    # Scan these directories
    scan_targets = [
        root / ".claude",
        root / "docs",
        root / "zm-claude-docs",  # zm-v3 pattern
    ]
    # Also include root-level files like CLAUDE.md
    root_files = ["CLAUDE.md", "AGENTS.md", "CLAUDE.local.md"]

    results: list[dict] = []

    # Scan root-level files
    for fname in root_files:
        fpath = root / fname
        if fpath.is_file():
            results.append(read_file_info(fpath, project_path))

    # Scan target directories
    for target in scan_targets:
        if not target.is_dir():
            continue
        for dirpath, dirnames, filenames in os.walk(target):
            # Skip unwanted directories
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]

            for fname in filenames:
                fpath = Path(dirpath) / fname
                if fpath.suffix.lower() not in SCANNABLE_EXTENSIONS:
                    continue
                results.append(read_file_info(fpath, project_path))

    return results


def read_file_info(fpath: Path, project_path: str) -> dict:
    """Read file info and content."""
    relative = str(fpath.relative_to(project_path)).replace("\\", "/")
    stat = fpath.stat()

    try:
        content = fpath.read_text(encoding="utf-8", errors="replace")
    except (OSError, PermissionError):
        content = None

    return {
        "file_path": relative,
        "file_name": fpath.name,
        "doc_type": detect_doc_type(relative),
        "content": content,
        "content_hash": compute_hash(content) if content else None,
        "file_size": stat.st_size,
        "last_modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc),
    }
