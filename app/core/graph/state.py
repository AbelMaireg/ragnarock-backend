from __future__ import annotations

from typing import Any
from typing_extensions import TypedDict, NotRequired

from app.schemas.requirement import AgentInput, OrchestratorOutput


class GraphState(TypedDict):
    """
    Shared state that flows through every node in every agent graph.

    - agent_input:  the fully-prepared input for conversational agents (requirements, dev intelligence)
    - agent_type:   routing key — determines which graph node handles this job
    - result:       the validated output produced by the agent node; None until set
    - error:        non-fatal error message if something went wrong inside a node
    - planner_job:  raw AiPlannerJob for the one-shot planner node (no agent_input needed)
    - qa_job:       raw AiQaIntelligenceJob for the one-shot QA node
    """
    agent_input: AgentInput
    agent_type: str
    result: OrchestratorOutput | None
    error: str | None
    planner_job: NotRequired[Any]
    qa_job: NotRequired[Any]
