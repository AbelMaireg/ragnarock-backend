"""Shared google-genai Client construction for Vertex (ADC) mode."""

from functools import lru_cache

from google import genai
from google.genai.types import HttpOptions

from app.core.config import get_settings


@lru_cache
def get_vertex_genai_client() -> genai.Client:
    """
    Vertex AI client using Application Default Credentials (ADC).
    Requires GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION when Vertex mode is on.
    """
    settings = get_settings()
    project = (settings.google_cloud_project or "").strip()
    if not project:
        raise ValueError(
            "GOOGLE_CLOUD_PROJECT is required when GOOGLE_GENAI_USE_VERTEXAI is true.",
        )
    location = (settings.google_cloud_location or "global").strip()
    return genai.Client(
        vertexai=True,
        project=project,
        location=location,
        http_options=HttpOptions(api_version="v1"),
    )


def clear_vertex_client_cache() -> None:
    """For tests or reload scenarios."""
    get_vertex_genai_client.cache_clear()
