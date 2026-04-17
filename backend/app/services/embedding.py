"""Embedding service using sentence-transformers (local, no API key needed)."""

from app.core.config import settings

_model = None


def get_model():
    """Lazy-load the embedding model (first call downloads ~90MB)."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(settings.embedding_model)
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of texts. Returns list of float vectors."""
    model = get_model()
    embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
    return embeddings.tolist()


def embed_single(text: str) -> list[float]:
    """Generate embedding for a single text."""
    return embed_texts([text])[0]
