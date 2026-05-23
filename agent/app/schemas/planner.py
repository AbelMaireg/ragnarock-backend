from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


# Mirrors TaskPriority enum in Prisma schema
TaskPriority = Literal["low", "medium", "high", "urgent"]

# Mirrors TaskPhase enum in Prisma schema
TaskPhase = Literal["discovery", "planning", "build", "test", "release"]

# Status is always backlog for AI-generated tasks — the PM promotes them
TaskStatus = Literal["backlog"]


class PlannerTask(BaseModel):
    """
    One task in the AI-generated breakdown.
    Field names match CreateProjectTaskDto exactly so NestJS can bulk-create
    without any mapping — title, description, priority, phase, labels.
    featureId and dependsOn carry traceability for MCP Phase 5.
    """
    feature_id: str = Field(
        ...,
        alias="featureId",
        description="Stable SRS feature ID this task implements (e.g. feat_001)",
    )
    title: str = Field(..., max_length=140)
    description: str = Field(..., max_length=2000)
    priority: TaskPriority = "medium"
    phase: TaskPhase = "build"
    labels: list[str] = Field(
        default_factory=list,
        description="Free-form labels — e.g. ['backend', 'auth']",
    )
    depends_on: list[str] = Field(
        default_factory=list,
        alias="dependsOn",
        description="feature_id values that must be done before this task can start",
    )
    execution_order: int = Field(
        ...,
        alias="executionOrder",
        description="1-based integer; lower = earlier. Respects depends_on graph.",
    )
    effort_estimate: Literal["xs", "s", "m", "l", "xl"] = Field(
        default="m",
        alias="effortEstimate",
        description="Rough sizing — xs:<1h  s:1-4h  m:1d  l:2-3d  xl:>3d",
    )


class TaskBreakdown(BaseModel):
    """Top-level planner output. Validated by Pydantic before publishing to Redis."""
    status: Literal["planner_complete"] = "planner_complete"
    project_name: str = Field(alias="projectName")
    tasks: list[PlannerTask]
