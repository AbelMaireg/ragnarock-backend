from __future__ import annotations

import logging

from langgraph.graph import StateGraph, END

from app.core.graph.state import GraphState
from app.core.graph.requirement_graph import requirement_node
from app.core.graph.developer_intelligence_graph import developer_intelligence_node
from app.core.graph.planner_graph import planner_node
from app.core.graph.qa_intelligence_graph import qa_intelligence_node
from app.schemas.requirement import AgentInput, OrchestratorOutput
from app.schemas.planner import TaskBreakdown
from app.schemas.qa_intelligence import QaTestBreakdown
from app.schemas.queue import AiPlannerJob, AiQaIntelligenceJob

logger = logging.getLogger(__name__)

# ─── Agent type constants ─────────────────────────────────────────────────────

AGENT_REQUIREMENTS = "requirements"
AGENT_DEVELOPER_INTELLIGENCE = "developer_intelligence"
AGENT_PLANNER = "planner"
AGENT_QA_INTELLIGENCE = "qa_intelligence"

# Phase 4 — remaining agents:
# AGENT_CHANGE_IMPACT = "change_impact"

_KNOWN_AGENTS = {AGENT_REQUIREMENTS, AGENT_DEVELOPER_INTELLIGENCE, AGENT_PLANNER, AGENT_QA_INTELLIGENCE}


def _route(state: GraphState) -> str:
    """
    Conditional edge: reads agent_type from state and returns the node name to
    execute next. Unknown types fall back to the requirements agent and log a warning.
    """
    agent_type = state.get("agent_type", AGENT_REQUIREMENTS)
    if agent_type not in _KNOWN_AGENTS:
        logger.warning(
            "Router | unknown agent_type='%s' — falling back to requirements",
            agent_type,
        )
        return AGENT_REQUIREMENTS
    return agent_type


def _build_graph() -> StateGraph:
    graph = StateGraph(GraphState)

    # ── Register nodes ────────────────────────────────────────────────────────
    graph.add_node(AGENT_REQUIREMENTS, requirement_node)
    graph.add_node(AGENT_DEVELOPER_INTELLIGENCE, developer_intelligence_node)
    graph.add_node(AGENT_PLANNER, planner_node)
    graph.add_node(AGENT_QA_INTELLIGENCE, qa_intelligence_node)

    # ── Entry point: conditional router decides which node runs first ─────────
    graph.set_conditional_entry_point(
        _route,
        {
            AGENT_REQUIREMENTS: AGENT_REQUIREMENTS,
            AGENT_DEVELOPER_INTELLIGENCE: AGENT_DEVELOPER_INTELLIGENCE,
            AGENT_PLANNER: AGENT_PLANNER,
            AGENT_QA_INTELLIGENCE: AGENT_QA_INTELLIGENCE,
        },
    )

    # ── Each agent node goes straight to END ──────────────────────────────────
    graph.add_edge(AGENT_REQUIREMENTS, END)
    graph.add_edge(AGENT_DEVELOPER_INTELLIGENCE, END)
    graph.add_edge(AGENT_PLANNER, END)
    graph.add_edge(AGENT_QA_INTELLIGENCE, END)

    return graph


# Compiled once at import time — reused for every job
_graph = _build_graph().compile()


async def run_graph(agent_input: AgentInput, agent_type: str) -> OrchestratorOutput:
    """Entry point for conversational agents (requirements, developer_intelligence)."""
    initial_state: GraphState = {
        "agent_input": agent_input,
        "agent_type": agent_type,
        "result": None,
        "error": None,
    }

    final_state: GraphState = await _graph.ainvoke(initial_state)

    if final_state.get("result") is None:
        raise ValueError(
            f"Graph produced no result for agent_type='{agent_type}'"
        )

    return final_state["result"]


async def run_planner_graph(job: AiPlannerJob) -> TaskBreakdown:
    """Entry point for the one-shot Project Planner Agent."""
    initial_state: GraphState = {
        "agent_input": None,  # type: ignore[assignment]
        "agent_type": AGENT_PLANNER,
        "result": None,
        "error": None,
        "planner_job": job,
    }

    final_state: GraphState = await _graph.ainvoke(initial_state)

    if final_state.get("result") is None:
        raise ValueError("Planner graph produced no result")

    return final_state["result"]  # type: ignore[return-value]


async def run_qa_graph(job: AiQaIntelligenceJob) -> QaTestBreakdown:
    """Entry point for the one-shot QA Intelligence Agent."""
    initial_state: GraphState = {
        "agent_input": None,  # type: ignore[assignment]
        "agent_type": AGENT_QA_INTELLIGENCE,
        "result": None,
        "error": None,
        "qa_job": job,
    }

    final_state: GraphState = await _graph.ainvoke(initial_state)

    if final_state.get("result") is None:
        raise ValueError("QA graph produced no result")

    return final_state["result"]  # type: ignore[return-value]
