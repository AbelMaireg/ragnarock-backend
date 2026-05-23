import json
import logging

from fastapi import HTTPException

from app.core.orchestrator import Orchestrator, _memory_enabled
from app.schemas.queue import AiRequirementsJob
from app.schemas.requirement import (
    AgentInput,
    ClarificationResponse,
    ConversationTurn,
    OrchestratorOutput,
    PartialSrs,
    ProjectContext,
)
from app.tools.cleaner import clean_text
from app.tools.extractor import extract_url
from app.tools.parser import parse_file_bytes

logger = logging.getLogger(__name__)


class RequirementsProcessor:
    def __init__(self, orchestrator: Orchestrator | None = None):
        self._orchestrator = orchestrator or Orchestrator()

    async def process_job(self, job: AiRequirementsJob) -> OrchestratorOutput:
        if job.type == "url":
            content = await extract_url(job.input)
        elif job.type == "upload":
            if job.upload is None:
                raise ValueError("Upload job is missing upload metadata.")
            from app.services.upload_storage import load_upload_bytes

            file_bytes = await load_upload_bytes(job.upload)
            content = parse_file_bytes(
                filename=job.upload.filename,
                content_type=job.upload.content_type,
                raw_bytes=file_bytes,
            )
        else:
            content = clean_text(job.input)

        return await self.process_content(
            project_id=job.project_id,
            content=content,
            conversation_history=job.conversation_history,
            partial_srs=job.partial_srs,
            project_context=job.project_context,
            agent_type=job.agent_type,
        )

    async def process_content(
        self,
        project_id: str,
        content: str,
        conversation_history: list[ConversationTurn],
        partial_srs: PartialSrs | None = None,
        project_context: ProjectContext | None = None,
        agent_type: str = "requirements",
    ) -> OrchestratorOutput:
        if not content.strip():
            raise ValueError("Input is empty after processing.")

        agent_input = AgentInput(
            project_id=project_id,
            content=content,
            conversation_history=conversation_history,
            partial_srs=partial_srs or PartialSrs(),
            project_context=project_context,
        )

        try:
            result = await self._orchestrator.run(agent_input, agent_type=agent_type)
        except (json.JSONDecodeError, ValueError) as e:
            logger.error("Orchestrator failed after retries: %s", e)
            raise

        if _memory_enabled() and isinstance(result, ClarificationResponse):
            await store_clarifications_from_history(project_id, conversation_history)

        return result


async def store_clarifications_from_history(
    project_id: str,
    history: list[ConversationTurn],
) -> None:
    from app.memory.vector_store import store_clarification

    questions, answers = extract_qa_pairs(history)
    if questions:
        try:
            await store_clarification(project_id, questions, answers)
        except Exception as e:
            logger.warning("Clarification storage failed (non-fatal): %s", e)


def extract_qa_pairs(history: list[ConversationTurn]) -> tuple[list[str], list[str]]:
    questions: list[str] = []
    answers: list[str] = []
    for index, turn in enumerate(history):
        if turn.role == "assistant" and index + 1 < len(history):
            next_turn = history[index + 1]
            if next_turn.role == "user":
                questions.append(turn.content)
                answers.append(next_turn.content)
    return questions, answers


def http_error_from_processing_error(error: Exception) -> HTTPException:
    if isinstance(error, ValueError):
        return HTTPException(status_code=400, detail=str(error))
    return HTTPException(
        status_code=500,
        detail="The AI returned an unexpected response. Please try again.",
    )
