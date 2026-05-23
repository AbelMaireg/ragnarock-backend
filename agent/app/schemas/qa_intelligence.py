from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


TestType = Literal["unit", "integration", "e2e"]


class TestCase(BaseModel):
    id: str = Field(..., description="Stable ID e.g. tc_001")
    type: TestType
    title: str
    preconditions: list[str] = Field(default_factory=list)
    steps: list[str]
    expected_result: str = Field(alias="expectedResult")
    requirement_id: str | None = Field(default=None, alias="requirementId")

    model_config = {"populate_by_name": True}


class TestSuite(BaseModel):
    feature_id: str = Field(alias="featureId")
    feature_name: str = Field(alias="featureName")
    acceptance_criteria: list[str] = Field(default_factory=list, alias="acceptanceCriteria")
    test_cases: list[TestCase] = Field(alias="testCases")

    model_config = {"populate_by_name": True}


class QaTestBreakdown(BaseModel):
    status: Literal["qa_complete"] = "qa_complete"
    project_name: str = Field(alias="projectName")
    test_suites: list[TestSuite] = Field(alias="testSuites")

    model_config = {"populate_by_name": True}
