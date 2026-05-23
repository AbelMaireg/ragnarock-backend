import asyncio

import google.generativeai as legacy_genai
from google.genai import types as genai_types

from app.core.config import get_settings
from app.core.llm.google_genai_runtime import get_vertex_genai_client

_legacy_configured = False


def _ensure_legacy_configured() -> None:
    global _legacy_configured
    if not _legacy_configured:
        key = (get_settings().gemini_api_key or "").strip()
        if not key:
            raise ValueError(
                "GEMINI_API_KEY is required for embeddings when GOOGLE_GENAI_USE_VERTEXAI is false.",
            )
        legacy_genai.configure(api_key=key)
        _legacy_configured = True


def _get_embedding_model_id() -> str:
    return get_settings().embedding_model


async def embed(text: str) -> list[float]:
    """Convert any text into a vector embedding using Gemini's embedding model."""
    settings = get_settings()
    if settings.google_genai_use_vertexai:
        client = get_vertex_genai_client()
        model = _get_embedding_model_id()

        def _call() -> list[float]:
            config = genai_types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT")
            response = client.models.embed_content(
                model=model,
                contents=text,
                config=config,
            )
            if not response.embeddings:
                raise RuntimeError("Embeddings response was empty (Vertex)")
            return list(response.embeddings[0].values)

        return await asyncio.to_thread(_call)

    _ensure_legacy_configured()
    settings = get_settings()
    result = legacy_genai.embed_content(
        model=settings.embedding_model,
        content=text,
        task_type="retrieval_document",
    )
    return result["embedding"]


async def embed_query(text: str) -> list[float]:
    """Embed a search query (uses retrieval_query task type for better search results)."""
    settings = get_settings()
    if settings.google_genai_use_vertexai:
        client = get_vertex_genai_client()
        model = _get_embedding_model_id()

        def _call() -> list[float]:
            config = genai_types.EmbedContentConfig(task_type="RETRIEVAL_QUERY")
            response = client.models.embed_content(
                model=model,
                contents=text,
                config=config,
            )
            if not response.embeddings:
                raise RuntimeError("Embeddings response was empty (Vertex)")
            return list(response.embeddings[0].values)

        return await asyncio.to_thread(_call)

    _ensure_legacy_configured()
    settings = get_settings()
    result = legacy_genai.embed_content(
        model=settings.embedding_model,
        content=text,
        task_type="retrieval_query",
    )
    return result["embedding"]
