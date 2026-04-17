"""BM25 keyword search — used alongside vector search for hybrid ranking."""

import re

from rank_bm25 import BM25Okapi


def tokenize(text: str) -> list[str]:
    """Simple whitespace + punctuation tokenizer."""
    return re.findall(r"\w+", text.lower())


def build_bm25_index(texts: list[str]) -> BM25Okapi:
    """Build a BM25Okapi index from a list of text strings."""
    tokenized = [tokenize(t) for t in texts]
    return BM25Okapi(tokenized)


def score_bm25(bm25: BM25Okapi, query: str) -> list[float]:
    """Calculate BM25 scores for a query against the indexed documents."""
    query_tokens = tokenize(query)
    scores: list[float] = bm25.get_scores(query_tokens).tolist()
    return scores


def normalize_scores(scores: list[float]) -> list[float]:
    """Normalize scores to 0-1 range (min-max normalization)."""
    if not scores:
        return []
    max_score = max(scores)
    if max_score == 0:
        return [0.0] * len(scores)
    return [s / max_score for s in scores]
