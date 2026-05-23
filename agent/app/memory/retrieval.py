import logging
from dataclasses import dataclass

from sqlalchemy import text

from app.memory.vector_store import _get_engine

logger = logging.getLogger(__name__)


@dataclass
class MemoryChunk:
    chunk_type: str
    content: str
    similarity: float


async def retrieve_all_for_project(project_id: str) -> list[MemoryChunk]:
    """
    Fetch every memory chunk stored for this project, ordered by recency.
    Per-project memory is small (one SRS + a few dozen Q&A pairs), so a full
    fetch is cheaper and more complete than similarity search, which can miss
    relevant past decisions when the query doesn't happen to match them.
    """
    engine = _get_engine()

    async with engine.connect() as conn:
        rows = await conn.execute(
            text("""
                SELECT type, content
                FROM project_memory
                WHERE project_id = :project_id
                ORDER BY created_at ASC
            """),
            {"project_id": project_id},
        )
        results = rows.fetchall()

    chunks = [
        MemoryChunk(chunk_type=row.type, content=row.content, similarity=1.0)
        for row in results
    ]
    logger.info("Retrieved %d memory chunks for project %s", len(chunks), project_id)
    return chunks
