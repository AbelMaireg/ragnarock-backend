import os
import pytest
from httpx import AsyncClient
from asgi_lifespan import LifespanManager

# Ensure LLM factory and worker startup don't require external services during tests
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "true")
os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "test-project")

from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint_returns_ok():
    # Stub worker start/stop to avoid connecting to Redis during app startup
    async def _noop(*_, **__):
        return None

    app.worker.start = _noop
    app.worker.stop = _noop

    async with LifespanManager(app):
        async with AsyncClient(app=app, base_url="http://test") as ac:
            r = await ac.get("/health")
            assert r.status_code == 200
            j = r.json()
            assert j["status"] == "ok"
            assert "memory" in j
