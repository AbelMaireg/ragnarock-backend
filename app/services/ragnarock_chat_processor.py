from __future__ import annotations

import json
import logging
import re

from app.agents.ragnarock_agent import _build_system_prompt, build_user_prompt, detect_intent
from app.core.llm.factory import get_llm_provider
from app.schemas.ragnarock_chat import (
    RagnarockChatFailedResult,
    RagnarockChatJob,
    RagnarockChatSucceededResult,
)

logger = logging.getLogger(__name__)


def _unwrap_json(text: str) -> str:
    """If the LLM returned JSON, extract a readable string from it."""
    stripped = text.strip()
    if not stripped.startswith("{"):
        return stripped
    try:
        data = json.loads(stripped)
        parts = [v for v in data.values() if isinstance(v, str)]
        return " ".join(parts) if parts else stripped
    except json.JSONDecodeError:
        return stripped


def _strip_quotes(text: str, project_name: str) -> str:
    """Remove curly/straight quotes the model wraps around the project name."""
    # Match both straight quotes and curly quotes around the project name
    escaped = re.escape(project_name)
    return re.sub(
        rf'["‘’“”′″]({escaped})["‘’“”′″]',
        r"\1",
        text,
    )


class RagnarockChatProcessor:
    async def process_job(self, job: RagnarockChatJob) -> RagnarockChatSucceededResult:
        logger.info(
            "RagnarockChatProcessor | project_id=%s | job_id=%s",
            job.project_id,
            job.job_id,
        )

        # 1. Intent detection (free — no LLM call)
        detected_action = detect_intent(job.message)

        # 2. Always go through the LLM — for action commands it generates a contextual
        #    conversational response; detected_action is attached so the frontend panel activates.
        system_prompt = _build_system_prompt(job.project_snapshot)
        user_prompt = build_user_prompt(job.message)

        raw = await get_llm_provider().generate(system_prompt, user_prompt)
        answer = _strip_quotes(_unwrap_json(raw), job.project_snapshot.name)

        logger.info(
            "RagnarockChatProcessor | project_id=%s | answer_len=%d",
            job.project_id,
            len(answer),
        )

        return RagnarockChatSucceededResult(
            jobId=job.job_id,
            projectId=job.project_id,
            userId=job.user_id,
            sessionId=job.session_id,
            answer=answer,
            detectedAction=detected_action,
        )
