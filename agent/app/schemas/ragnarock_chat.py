from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.queue import QueueModel


# ─── Job sent from NestJS → FastAPI worker ───────────────────────────────────

class ConversationTurn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    role: Literal["user", "assistant"]
    content: str


class RagnarockChatJob(QueueModel):
    job_type: Literal["ragnarock_chat"] = Field(default="ragnarock_chat", alias="jobType")
    job_id: str = Field(alias="jobId")
    project_id: str = Field(alias="projectId")
    organization_id: str = Field(alias="organizationId")
    user_id: str = Field(alias="userId")
    session_id: str = Field(alias="sessionId")
    message: str
    history: list[ConversationTurn] = Field(default_factory=list)
    project_snapshot: ProjectSnapshot = Field(alias="projectSnapshot")
    attempts: int = 0
    queued_at: str = Field(alias="queuedAt")


# ─── Project context snapshot (built by NestJS, consumed by AI) ──────────────

class TaskSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    title: str
    status: str
    phase: str | None = None
    priority: str
    assignee_name: str | None = Field(default=None, alias="assigneeName")


class DocSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    title: str
    type: str
    status: str


class MemberSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    user_id: str = Field(alias="userId")
    name: str | None = None
    email: str | None = None
    role: str
    personas: list[str] = Field(default_factory=list)


class ActivitySummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    action: str
    entity_type: str = Field(alias="entityType")
    actor_name: str | None = Field(default=None, alias="actorName")
    created_at: str = Field(alias="createdAt")


class ProjectSnapshot(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    project_id: str = Field(alias="projectId")
    name: str
    description: str | None = None
    status: str
    has_srs: bool = Field(alias="hasSrs")
    srs_summary: str | None = Field(default=None, alias="srsSummary")
    tasks: list[TaskSummary] = Field(default_factory=list)
    docs: list[DocSummary] = Field(default_factory=list)
    members: list[MemberSummary] = Field(default_factory=list)
    recent_activity: list[ActivitySummary] = Field(default_factory=list, alias="recentActivity")


# ─── Results pushed back to NestJS ───────────────────────────────────────────

class RagnarockChatSucceededResult(QueueModel):
    job_id: str = Field(alias="jobId")
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
    session_id: str = Field(alias="sessionId")
    status: Literal["ragnarock_chat_succeeded"] = "ragnarock_chat_succeeded"
    answer: str
    detected_action: DetectedAction | None = Field(default=None, alias="detectedAction")


class RagnarockChatFailedResult(QueueModel):
    job_id: str = Field(alias="jobId")
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
    session_id: str = Field(alias="sessionId")
    status: Literal["ragnarock_chat_failed"] = "ragnarock_chat_failed"
    error: str


# ─── Detected action (intent routing) ────────────────────────────────────────

class DetectedAction(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    type: Literal["generate_srs", "generate_plan", "generate_doc", "none"]
    doc_type: str | None = Field(default=None, alias="docType")
    confirmation_text: str = Field(alias="confirmationText")
