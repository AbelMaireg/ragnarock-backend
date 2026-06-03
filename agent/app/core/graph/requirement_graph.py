from __future__ import annotations

import json
import logging

from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type

from app.core.graph.state import GraphState
from app.core.llm.factory import get_llm_provider
from app.schemas.requirement import (
    ClarificationResponse,
    RequirementResponse,
    OrchestratorOutput,
    RetrievedChunk,
)

logger = logging.getLogger(__name__)

_llm = get_llm_provider()


def _memory_enabled() -> bool:
    from app.core.config import get_settings
    return bool(get_settings().database_url)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_fixed(2),
    retry=retry_if_exception_type((json.JSONDecodeError, ValueError)),
    reraise=True,
)
async def _call_llm(agent_input) -> OrchestratorOutput:
    from app.agents.requirement_agent import build_system_prompt, build_user_prompt

    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(agent_input)

    logger.info(
        "RequirementNode | provider=%s | memory_chunks=%d | history_turns=%d | srs_pct=%d",
        _llm.provider_name,
        len(agent_input.retrieved_memory),
        len(agent_input.conversation_history),
        agent_input.partial_srs.progress_pct(),
    )

    raw = await _llm.generate(system_prompt, user_prompt)
    return _parse(raw)


def _parse(raw: str) -> OrchestratorOutput:
    from app.core.llm.utils import strip_fences
    cleaned = strip_fences(raw)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error("RequirementNode | invalid JSON from LLM: %s", raw[:200])
        raise e

    status = data.get("status")
    if status == "needs_clarification":
        return ClarificationResponse(**data)
    if status == "complete":
        return RequirementResponse(**data)
    raise ValueError(f"RequirementNode | unexpected status: '{status}'")


async def _enrich_with_memory(agent_input):
    from app.memory.retrieval import retrieve_all_for_project

    try:
        chunks = await retrieve_all_for_project(project_id=agent_input.project_id)
        retrieved = [
            RetrievedChunk(
                chunk_type=c.chunk_type,
                content=c.content,
                similarity=c.similarity,
            )
            for c in chunks
        ]
        return agent_input.model_copy(update={"retrieved_memory": retrieved})
    except Exception as e:
        logger.warning("RequirementNode | memory retrieval failed (non-fatal): %s", e)
        return agent_input


async def _store_srs(project_id: str, srs: RequirementResponse) -> None:
    from app.memory.vector_store import store_srs

    try:
        await store_srs(project_id, srs.model_dump_json())
    except Exception as e:
        logger.warning("RequirementNode | SRS storage failed (non-fatal): %s", e)


async def requirement_node(state: GraphState) -> GraphState:
    """
    LangGraph node for the Requirements Agent.
    Reads agent_input from state, runs the LLM, writes result back to state.
    """
    agent_input = state["agent_input"]

    if _memory_enabled():
        agent_input = await _enrich_with_memory(agent_input)

    result = await _call_llm(agent_input)

    if _memory_enabled() and isinstance(result, RequirementResponse):
        await _store_srs(agent_input.project_id, result)

    return {**state, "agent_input": agent_input, "result": result}
