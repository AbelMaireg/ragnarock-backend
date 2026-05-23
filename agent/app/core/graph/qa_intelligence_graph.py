from __future__ import annotations

import logging

from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type

from app.core.graph.state import GraphState
from app.core.llm.factory import get_llm_provider
from app.schemas.qa_intelligence import QaTestBreakdown

logger = logging.getLogger(__name__)

_llm = get_llm_provider()


@retry(
    stop=stop_after_attempt(2),
    wait=wait_fixed(1),
    retry=retry_if_exception_type((ValueError,)),
    reraise=True,
)
async def _call_llm(job) -> QaTestBreakdown:
    from app.agents.qa_intelligence_agent import _SYSTEM_PROMPT, build_user_prompt, parse_qa_response

    user_prompt = build_user_prompt(job)

    logger.info(
        "QaIntelligenceNode | provider=%s | features=%d | functional_reqs=%d | arch_context=%s",
        _llm.provider_name,
        len(job.partial_srs.features),
        len(job.partial_srs.functional_requirements),
        "yes" if job.arch_context else "no",
    )

    raw = await _llm.generate(_SYSTEM_PROMPT, user_prompt)
    return parse_qa_response(raw)


async def qa_intelligence_node(state: GraphState) -> GraphState:
    """
    LangGraph node for the QA Intelligence Agent.
    One-shot: reads qa_job from state, produces a QaTestBreakdown.
    """
    job = state.get("qa_job")
    if job is None:
        raise ValueError("QaIntelligenceNode | 'qa_job' missing from graph state")

    result = await _call_llm(job)
    return {**state, "result": result}
