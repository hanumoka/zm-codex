"""Workflow auto-detection — classifies commit patterns into workflow types."""

import asyncio
import re
import subprocess
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow import Workflow

# Commit message patterns → workflow_type mapping
COMMIT_PATTERNS: list[tuple[re.Pattern[str], str, float]] = [
    (re.compile(r"^feat(\(|:|\s)", re.IGNORECASE), "development", 0.9),
    (re.compile(r"^add(\(|:|\s)", re.IGNORECASE), "development", 0.8),
    (re.compile(r"^implement", re.IGNORECASE), "development", 0.8),
    (re.compile(r"^fix(\(|:|\s)", re.IGNORECASE), "bugfix", 0.9),
    (re.compile(r"^hotfix", re.IGNORECASE), "bugfix", 0.95),
    (re.compile(r"^bug", re.IGNORECASE), "bugfix", 0.8),
    (re.compile(r"^refactor(\(|:|\s)", re.IGNORECASE), "development", 0.7),
    (re.compile(r"^docs(\(|:|\s)", re.IGNORECASE), "custom", 0.7),
    (re.compile(r"^deploy", re.IGNORECASE), "deployment", 0.9),
    (re.compile(r"^release", re.IGNORECASE), "deployment", 0.85),
    (re.compile(r"^review", re.IGNORECASE), "review", 0.8),
    (re.compile(r"^chore(\(|:|\s)", re.IGNORECASE), "custom", 0.5),
    (re.compile(r"^test(\(|:|\s)", re.IGNORECASE), "development", 0.6),
]


@dataclass
class ClassificationResult:
    detected_type: str
    confidence: float
    matching_workflow_id: str | None
    commits_analyzed: int
    commit_subjects: list[str]


async def classify_workflow(
    db: AsyncSession,
    project_id: uuid.UUID,
    project_path: str,
    since_commits: int = 5,
) -> ClassificationResult:
    """Analyze recent commits and classify the likely workflow type."""
    subjects = await asyncio.to_thread(_get_recent_subjects, project_path, since_commits)

    if not subjects:
        return ClassificationResult(
            detected_type="custom",
            confidence=0.0,
            matching_workflow_id=None,
            commits_analyzed=0,
            commit_subjects=[],
        )

    # Score each workflow type
    type_scores: dict[str, list[float]] = {}
    for subject in subjects:
        for pattern, wf_type, confidence in COMMIT_PATTERNS:
            if pattern.search(subject):
                type_scores.setdefault(wf_type, []).append(confidence)
                break

    if not type_scores:
        return ClassificationResult(
            detected_type="custom",
            confidence=0.3,
            matching_workflow_id=None,
            commits_analyzed=len(subjects),
            commit_subjects=subjects,
        )

    # Pick the type with highest average confidence * count weight
    best_type = "custom"
    best_score = 0.0
    for wf_type, scores in type_scores.items():
        avg_confidence = sum(scores) / len(scores)
        count_weight = min(len(scores) / len(subjects), 1.0)
        score = avg_confidence * (0.6 + 0.4 * count_weight)
        if score > best_score:
            best_score = score
            best_type = wf_type

    # Find matching workflow in DB
    result = await db.execute(
        select(Workflow).where(
            Workflow.project_id == project_id,
            Workflow.workflow_type == best_type,
        )
    )
    matching = result.scalar_one_or_none()

    return ClassificationResult(
        detected_type=best_type,
        confidence=round(best_score, 3),
        matching_workflow_id=str(matching.id) if matching else None,
        commits_analyzed=len(subjects),
        commit_subjects=subjects,
    )


def _get_recent_subjects(project_path: str, limit: int) -> list[str]:
    """Get recent commit subjects."""
    try:
        result = subprocess.run(
            ["git", "log", f"--max-count={limit}", "--pretty=format:%s"],
            cwd=project_path,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=10,
        )
        if result.returncode != 0 or result.stdout is None:
            return []
        return [line.strip() for line in result.stdout.strip().split("\n") if line.strip()]
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return []
