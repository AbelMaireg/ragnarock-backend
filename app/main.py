import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from scalar_fastapi import get_scalar_api_reference

from app.core.config import get_settings
from app.api.routes.requirement import router as requirement_router
from app.api.docs.api_description import API_DESCRIPTION
from app.queue.requirements_worker import RequirementsQueueWorker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

settings = get_settings()
worker = RequirementsQueueWorker()


@asynccontextmanager
async def lifespan(app: FastAPI):
    log = logging.getLogger(__name__)
    log.info("Starting SDLC AI Service | provider=%s | env=%s", settings.llm_provider, settings.app_env)
    if settings.database_url:
        from app.memory.vector_store import ensure_table
        try:
            await ensure_table()
            log.info("pgvector memory: table ready")
        except Exception as e:
            log.warning("pgvector memory setup failed (continuing without memory): %s", e)
    else:
        log.info("pgvector memory: disabled (DATABASE_URL not set)")
    await worker.start()
    try:
        yield
    finally:
        await worker.stop()


app = FastAPI(
    title="SDLC AI Service",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url="/openapi.json",
    lifespan=lifespan,
    description=API_DESCRIPTION,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ───────────────────────────────────────────────────────────────────
app.include_router(requirement_router)


# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/health", tags=["ops"])
async def health():
    status: dict = {"status": "ok", "llm_provider": settings.llm_provider}
    if settings.database_url:
        from app.memory.vector_store import _get_engine
        from sqlalchemy import text
        try:
            async with _get_engine().connect() as conn:
                row = await conn.execute(text(
                    "SELECT COUNT(*) AS total, "
                    "MAX(created_at) AS last_write "
                    "FROM project_memory"
                ))
                r = row.fetchone()
                status["memory"] = {
                    "status": "ok",
                    "total_chunks": r.total if r else 0,
                    "last_write": str(r.last_write) if r and r.last_write else None,
                }
        except Exception as e:
            status["memory"] = {"status": "error", "detail": str(e)}
    else:
        status["memory"] = {"status": "disabled"}
    return status


# ─── Scalar docs (replaces Swagger UI) ───────────────────────────────────────
@app.get("/docs", include_in_schema=False)
async def scalar_docs():
    return get_scalar_api_reference(
        openapi_url="/openapi.json",
        title="SDLC AI Service — API Docs",
        scalar_theme="purple",
    )
