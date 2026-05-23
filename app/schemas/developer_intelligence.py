from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class DevIntelligenceResponse(BaseModel):
    """
    Response from the Developer Intelligence Agent.
    Always conversational — a direct answer grounded in the project SRS.
    """
    status: Literal["answer"] = "answer"
    answer: str = Field(..., description="The agent's full response to the developer's question")
    references: list[str] = Field(
        default_factory=list,
        description="SRS feature names or requirement IDs this answer draws from",
    )
    follow_up_suggestions: list[str] = Field(
        default_factory=list,
        max_length=3,
        description="Optional follow-up questions the developer might want to ask next",
    )
