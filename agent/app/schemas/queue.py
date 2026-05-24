from __future__ import annotations

from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.requirement import ConversationTurn, OrchestratorOutput, PartialSrs, ProjectContext
from app.schemas.qa_intelligence import TestSuite


class QueueModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class QueuedUpload(QueueModel):
    key: str
    location: str
    filename: str
    content_type: str | None = Field(default=None, alias="contentType")
    size: int


class AiRequirementsJob(QueueModel):
    job_type: Literal["chat_turn"] = Field(default="chat_turn", alias="jobType")
    job_id: str = Field(alias="jobId")
    project_id: str = Field(alias="projectId")
    organization_id: str = Field(alias="organizationId")
    user_id: str = Field(alias="userId")
    session_id: str = Field(alias="sessionId")
    user_message_id: str = Field(alias="userMessageId")
    agent_type: str = Field(default="requirements", alias="agentType")
    type: Literal["text", "url", "upload"]
    input: str
    conversation_history: list[ConversationTurn] = Field(
        default_factory=list,
        alias="conversationHistory",
    )
    upload: QueuedUpload | None = None
    partial_srs: PartialSrs = Field(default_factory=PartialSrs, alias="partialSrs")
    project_context: ProjectContext | None = Field(default=None, alias="projectContext")
    attempts: int = 0
    queued_at: str = Field(alias="queuedAt")


# ─── Architecture document generation (one-shot) ─────────────────────────────

ArchDocType = Literal["sad", "hld", "lld", "adr"]


class AiArchDocJob(QueueModel):
    job_type: Literal["arch_doc"] = Field(alias="jobType")
    job_id: str = Field(alias="jobId")
    project_id: str = Field(alias="projectId")
    organization_id: str = Field(alias="organizationId")
    user_id: str = Field(alias="userId")
    doc_type: ArchDocType = Field(alias="docType")
    layer: str | None = None
    project_context: ProjectContext | None = Field(default=None, alias="projectContext")
    partial_srs: PartialSrs = Field(default_factory=PartialSrs, alias="partialSrs")
    attempts: int = 0
    queued_at: str = Field(alias="queuedAt")


class AiArchDocSucceededResult(QueueModel):
    job_id: str = Field(alias="jobId")
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
    status: Literal["arch_doc_succeeded"] = "arch_doc_succeeded"
    doc_type: ArchDocType = Field(alias="docType")
    layer: str | None = None
    content: str
    title: str


class AiArchDocFailedResult(QueueModel):
    job_id: str = Field(alias="jobId")
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
    status: Literal["arch_doc_failed"] = "arch_doc_failed"
    error: str


# ─── Chat turn results ────────────────────────────────────────────────────────

class AiRequirementsSucceededResult(QueueModel):
    job_id: str = Field(alias="jobId")
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
    session_id: str = Field(alias="sessionId")
    user_message_id: str = Field(alias="userMessageId")
    status: Literal["succeeded"] = "succeeded"
    response: OrchestratorOutput
    attempts: int | None = None


class AiRequirementsFailedResult(QueueModel):
    job_id: str = Field(alias="jobId")
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
    session_id: str = Field(alias="sessionId")
    user_message_id: str = Field(alias="userMessageId")
    status: Literal["failed"] = "failed"
    error: str
    attempts: int | None = None


AiRequirementsResult = Annotated[
    AiRequirementsSucceededResult | AiRequirementsFailedResult,
    Field(discriminator="status"),
]


# ─── Project Planner — one-shot task breakdown ───────────────────────────────

class AiPlannerJob(QueueModel):
    job_type: Literal["planner"] = Field(default="planner", alias="jobType")
    job_id: str = Field(alias="jobId")
    project_id: str = Field(alias="projectId")
    organization_id: str = Field(alias="organizationId")
    user_id: str = Field(alias="userId")
    project_context: ProjectContext | None = Field(default=None, alias="projectContext")
    partial_srs: PartialSrs = Field(default_factory=PartialSrs, alias="partialSrs")
    attempts: int = 0
    queued_at: str = Field(alias="queuedAt")


class AiPlannerSucceededResult(QueueModel):
    job_id: str = Field(alias="jobId")
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
    status: Literal["planner_succeeded"] = "planner_succeeded"
    tasks: list[dict] = Field(default_factory=list)
    completed_at: str | None = Field(default=None, alias="completedAt")


class AiPlannerFailedResult(QueueModel):
    job_id: str = Field(alias="jobId")
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
    status: Literal["planner_failed"] = "planner_failed"
    error: str
    failed_at: str | None = Field(default=None, alias="failedAt")


# ─── QA Intelligence — one-shot test suite generation ────────────────────────

class AiQaIntelligenceJob(QueueModel):
    job_type: Literal["qa_intelligence"] = Field(default="qa_intelligence", alias="jobType")
    job_id: str = Field(alias="jobId")
    project_id: str = Field(alias="projectId")
    organization_id: str = Field(alias="organizationId")
    user_id: str = Field(alias="userId")
    project_context: ProjectContext | None = Field(default=None, alias="projectContext")
    partial_srs: PartialSrs = Field(default_factory=PartialSrs, alias="partialSrs")
    arch_context: str | None = Field(default=None, alias="archContext")
    attempts: int = 0
    queued_at: str = Field(alias="queuedAt")


class AiQaIntelligenceSucceededResult(QueueModel):
    job_id: str = Field(alias="jobId")
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
    status: Literal["qa_intelligence_succeeded"] = "qa_intelligence_succeeded"
    content: str
    title: str
    test_suites: list[TestSuite] = Field(default_factory=list, alias="testSuites")
    completed_at: str | None = Field(default=None, alias="completedAt")


class AiQaIntelligenceFailedResult(QueueModel):
    job_id: str = Field(alias="jobId")
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
    status: Literal["qa_intelligence_failed"] = "qa_intelligence_failed"
    error: str
    failed_at: str | None = Field(default=None, alias="failedAt")


# ─── Ragnarock Chat — project Q&A + intent routing ───────────────────────────
# Full schema lives in app.schemas.ragnarock_chat; only the failure result is
# referenced here for the worker's dead-letter path.

class RagnarockChatFailedResult(QueueModel):
    job_id: str = Field(alias="jobId")
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
    status: Literal["ragnarock_chat_failed"] = "ragnarock_chat_failed"
    error: str
