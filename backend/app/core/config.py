from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://codex:codex_local_dev@localhost:30432/zm_codex"

    # Server
    host: str = "0.0.0.0"
    port: int = 30100

    # Embedding
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dim: int = 384

    # Chunking (MemPalace reference)
    chunk_size: int = 800
    chunk_overlap: int = 100
    min_chunk_size: int = 50
    max_file_size: int = 10 * 1024 * 1024  # 10MB

    # Search (MemPalace reference)
    vector_weight: float = 0.6
    bm25_weight: float = 0.4

    # File Watcher
    watcher_debounce_ms: int = 500
    watcher_auto_reindex: bool = True

    model_config = {"env_prefix": "CODEX_"}


settings = Settings()
