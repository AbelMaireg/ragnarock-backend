import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine

from app.core.config import get_settings
from app.memory.embeddings import embed

logger = logging.getLogger(__name__)

# Chunk types stored in memory
CHUNK_TYPE_SRS = "srs"
CHUNK_TYPE_CLARIFICATION = "clarification"
CHUNK_TYPE_DECISION = "decision"

_engine: AsyncEngine | None = None


def _get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        url = get_settings().database_url
        # asyncpg requires postgresql+asyncpg:// scheme
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        _engine = create_async_engine(url, echo=False)
    return _engine


async def ensure_table() -> None:
    """Create the project_memory table and pgvector extension if they don't exist."""
    engine = _get_engine()
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS project_memory (
                id          TEXT PRIMARY KEY,
                project_id  TEXT NOT NULL,
                type        TEXT NOT NULL,
                content     TEXT NOT NULL,
                embedding   vector(768),
                created_at  TIMESTAMPTZ NOT NULL
            )
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS project_memory_project_idx
            ON project_memory (project_id)
        """))
    logger.info("project_memory table ready")


async def store_chunk(
    project_id: str,
    chunk_type: str,
    content: str,
) -> None:
    """Embed and store a single text chunk for a project."""
    vector = await embed(content)
    engine = _get_engine()
    async with engine.begin() as conn:
        await conn.execute(
            text("""
                INSERT INTO project_memory (id, project_id, type, content, embedding, created_at)
                VALUES (:id, :project_id, :type, :content, :embedding, :created_at)
            """),
            {
                "id": str(uuid.uuid4()),
                "project_id": project_id,
                "type": chunk_type,
                "content": content,
                "embedding": str(vector),
                "created_at": datetime.now(timezone.utc),
            },
        )
    logger.info("Stored %s chunk for project %s", chunk_type, project_id)


async def store_srs(project_id: str, srs_json: str) -> None:
    await store_chunk(project_id, CHUNK_TYPE_SRS, srs_json)


async def store_clarification(project_id: str, questions: list[str], answers: list[str]) -> None:
    """Store each Q&A pair as a single chunk so retrieval is granular."""
    for q, a in zip(questions, answers):
        content = f"Question: {q}\nAnswer: {a}"
        await store_chunk(project_id, CHUNK_TYPE_CLARIFICATION, content)
