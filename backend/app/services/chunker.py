"""Text chunking service. MemPalace-compatible: 800 chars, 100 char overlap."""

from app.core.config import settings


def chunk_text(content: str, source_file: str) -> list[dict]:
    """Split text into chunks with overlap. MemPalace algorithm reference.

    Returns list of {"content": str, "chunk_index": int}.
    """
    if not content or len(content.strip()) < settings.min_chunk_size:
        return []

    chunks: list[dict] = []
    start = 0
    chunk_index = 0
    text = content.strip()

    while start < len(text):
        end = min(start + settings.chunk_size, len(text))

        if end < len(text):
            # Try to break at paragraph boundary (50%+ of chunk)
            half = start + settings.chunk_size // 2
            para_break = text.rfind("\n\n", half, end)
            if para_break > half:
                end = para_break + 2
            else:
                # Try single newline
                line_break = text.rfind("\n", half, end)
                if line_break > half:
                    end = line_break + 1

        chunk_content = text[start:end].strip()

        if len(chunk_content) >= settings.min_chunk_size:
            chunks.append({
                "content": chunk_content,
                "chunk_index": chunk_index,
            })
            chunk_index += 1

        # Move forward with overlap
        if end >= len(text):
            break
        start = end - settings.chunk_overlap

    return chunks
