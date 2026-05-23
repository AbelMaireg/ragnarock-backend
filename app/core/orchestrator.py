import logging

from app.core.config import get_settings
from app.schemas.requirement import AgentInput, OrchestratorOutput

logger = logging.getLogger(__name__)


def _memory_enabled() -> bool:
    return bool(get_settings().database_url)


class Orchestrator:
    """
    Thin dispatch layer between the processor and the LangGraph router.
    All agent logic lives in app/core/graph/. The orchestrator's only job is
    to call run_graph with the right agent_type and return the result.
    """

    async def run(self, agent_input: AgentInput, agent_type: str = "requirements") -> OrchestratorOutput:
        from app.core.graph.router import run_graph

        logger.info(
            "Orchestrator | dispatching | agent_type=%s | project_id=%s",
            agent_type,
            agent_input.project_id,
        )

        return await run_graph(agent_input, agent_type)
