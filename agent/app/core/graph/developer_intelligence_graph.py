from __future__ import annotations

import json
import logging

from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type

from app.core.graph.state import GraphState
from app.core.llm.factory import get_llm_provider
from app.schemas.developer_intelligence import DevIntelligenceResponse

logger = logging.getLogger(__name__)

_llm = get_llm_provider()


@retry(
    stop=stop_after_attempt(2),
    wait=wait_fixed(1),
    retry=retry_if_exception_type((json.JSONDecodeError, ValueError)),
    reraise=True,
)
async def _call_llm(agent_input) -> DevIntelligenceResponse:
    from app.agents.developer_intelligence_agent import build_system_prompt, build_user_prompt

    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(agent_input)

    logger.info(
        "DevIntelligenceNode | provider=%s | history_turns=%d | srs_pct=%d",
        _llm.provider_name,
        len(agent_input.conversation_history),
        agent_input.partial_srs.progress_pct(),
    )

    raw = await _llm.generate(system_prompt, user_prompt)
    return _parse(raw)


def _parse(raw: str) -> DevIntelligenceResponse:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error("DevIntelligenceNode | invalid JSON from LLM: %s", raw[:200])
        raise e

    if data.get("status") != "answer":
        raise ValueError(
            f"DevIntelligenceNode | expected status='answer', got '{data.get('status')}'"
        )

    return DevIntelligenceResponse(**data)


async def developer_intelligence_node(state: GraphState) -> GraphState:
    """
    LangGraph node for the Developer Intelligence Agent.
    Reads agent_input from state (including partial_srs as SRS context),
    runs the LLM, writes result back to state.
    """
    agent_input = state["agent_input"]

    # Enrich with vector memory if available (same pattern as requirements node)
    from app.core.config import get_settings
    if get_settings().database_url:
        from app.memory.retrieval import retrieve_all_for_project
        from app.schemas.requirement import RetrievedChunk
        try:
            chunks = await retrieve_all_for_project(project_id=agent_input.project_id)
            retrieved = [
                RetrievedChunk(chunk_type=c.chunk_type, content=c.content, similarity=c.similarity)
                for c in chunks
            ]
            agent_input = agent_input.model_copy(update={"retrieved_memory": retrieved})
        except Exception as e:
            logger.warning("DevIntelligenceNode | memory retrieval failed (non-fatal): %s", e)

    result = await _call_llm(agent_input)

    return {**state, "agent_input": agent_input, "result": result}
