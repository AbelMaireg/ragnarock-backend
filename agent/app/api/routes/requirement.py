import logging

from fastapi import APIRouter

from app.api.docs.requirement_docs import HEALTH_DOC
from app.core.orchestrator import _memory_enabled

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ai",
    tags=["Health"],
)


@router.get(
    "/health",
    summary="Health check",
    description=HEALTH_DOC,
    tags=["Health"],
    include_in_schema=True,
)
async def health():
    return {"status": "ok", "memory_enabled": _memory_enabled()}
