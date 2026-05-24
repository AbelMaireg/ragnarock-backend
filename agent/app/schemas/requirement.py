from __future__ import annotations
from typing import Literal, Union, Annotated
from pydantic import BaseModel, Field
from app.schemas.developer_intelligence import DevIntelligenceResponse


# ─── Shared primitives ────────────────────────────────────────────────────────

class ConversationTurn(BaseModel):
    role: Literal["assistant", "user"]
    content: str


# ─── Partial SRS — filled incrementally across clarification turns ─────────────

class Feature(BaseModel):
    feature_id: str = Field(
        ...,
        alias="featureId",
        description="Stable ID assigned once, never changed — e.g. feat_001",
    )
    name: str
    description: str

    model_config = {"populate_by_name": True}


class UserStory(BaseModel):
    role: str
    goal: str
    benefit: str


class PartialSrs(BaseModel):
    """SRS sections filled so far. Any field may be None/empty if not yet known."""
    project_name: str | None = None
    summary: str | None = None
    features: list[Feature] = Field(default_factory=list)
    user_roles: list[str] = Field(default_factory=list)
    functional_requirements: list[str] = Field(default_factory=list)
    non_functional_requirements: list[str] = Field(default_factory=list)
    user_stories: list[UserStory] = Field(default_factory=list)
    acceptance_criteria: list[str] = Field(default_factory=list)
    out_of_scope: list[str] = Field(default_factory=list)

    def filled_sections(self) -> list[str]:
        filled = []
        if self.project_name:
            filled.append("project_name")
        if self.summary:
            filled.append("summary")
        if self.features:
            filled.append("features")
        if self.user_roles:
            filled.append("user_roles")
        if self.functional_requirements:
            filled.append("functional_requirements")
        if self.non_functional_requirements:
            filled.append("non_functional_requirements")
        if self.user_stories:
            filled.append("user_stories")
        if self.acceptance_criteria:
            filled.append("acceptance_criteria")
        if self.out_of_scope:
            filled.append("out_of_scope")
        return filled

    def progress_pct(self) -> int:
        total = 9
        return round(len(self.filled_sections()) / total * 100)


# ─── Output models ────────────────────────────────────────────────────────────

class ClarificationResponse(BaseModel):
    status: Literal["needs_clarification"] = "needs_clarification"
    questions: list[str] = Field(..., min_length=1, max_length=3)
    partial_srs: PartialSrs = Field(default_factory=PartialSrs)


class RequirementResponse(BaseModel):
    status: Literal["complete"] = "complete"
    project_name: str
    summary: str
    features: list[Feature]
    functional_requirements: list[str]
    non_functional_requirements: list[str]
    user_stories: list[UserStory]
    acceptance_criteria: list[str]
    out_of_scope: list[str] = Field(default_factory=list)
    business_owner_summary: str = Field(
        ...,
        description="Plain-language explanation of the SRS for the business owner to confirm",
    )


# Union type returned by the orchestrator — NestJS checks `status` to branch
OrchestratorOutput = Annotated[
    Union[ClarificationResponse, RequirementResponse, DevIntelligenceResponse],
    Field(discriminator="status"),
]


# ─── Phase 3 — memory chunk returned from vector search ──────────────────────

class RetrievedChunk(BaseModel):
    chunk_type: str
    content: str
    similarity: float


# ─── Request models ───────────────────────────────────────────────────────────

class RequirementRequest(BaseModel):
    """
    Payload sent by NestJS to initiate or continue a requirement session.

    Phase 3: NestJS no longer needs to pass previous_srs or asked_questions.
    The agent retrieves its own context from the vector memory store.
    NestJS only needs to manage conversation_history for the live session.
    """

    project_id: str = Field(..., description="Project identifier from NestJS")
    input: str = Field(..., description="Text content or URL to analyse")
    type: Literal["text", "url"] = Field(..., description="Input modality")
    conversation_history: list[ConversationTurn] = Field(
        default_factory=list,
        description=(
            "Live session turns only. Empty on the first call. "
            "Append assistant + user turns after each needs_clarification response "
            "and send the full list on the next call. "
            "Reset to [] when starting a new session."
        ),
    )


# ─── Internal agent input ─────────────────────────────────────────────────────

class ProjectContext(BaseModel):
    """Known project metadata passed from the platform."""
    name: str
    description: str | None = None


class AgentInput(BaseModel):
    """Cleaned, normalised input handed to the requirement agent."""

    content: str
    project_id: str
    project_context: ProjectContext | None = None
    conversation_history: list[ConversationTurn] = Field(default_factory=list)
    retrieved_memory: list[RetrievedChunk] = Field(
        default_factory=list,
        description="All past chunks fetched from vector DB by the orchestrator",
    )
    partial_srs: PartialSrs = Field(
        default_factory=PartialSrs,
        description="SRS sections already confirmed in prior turns of this session",
    )


# ─── File upload request ──────────────────────────────────────────────────────

class FileUploadRequest(BaseModel):
    """Form fields that accompany a file upload."""

    project_id: str
    conversation_history_json: str = Field(
        default="[]",
        description=(
            "JSON-encoded ConversationTurn array. "
            "Pass '[]' on first call. Append turns on each subsequent call."
        ),
    )
