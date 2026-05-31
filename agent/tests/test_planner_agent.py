import json
import pytest

from app.agents.planner_agent import build_user_prompt, parse_planner_response
from app.schemas.queue import AiPlannerJob
from app.schemas.requirement import PartialSrs, Feature
from app.schemas.planner import TaskBreakdown


def make_job_with_feature():
    srs = PartialSrs(
        project_name="Test Project",
        summary="Short summary",
        features=[Feature(feature_id="feat_001", name="Login", description="Allow users to sign in")],
    )
    job = AiPlannerJob(
        job_id="job-1",
        project_id="proj-1",
        organization_id="org-1",
        user_id="user-1",
        partial_srs=srs,
        queued_at="2026-05-31T00:00:00Z",
    )
    return job


def test_build_user_prompt_includes_project_and_feature():
    job = make_job_with_feature()
    prompt = build_user_prompt(job)
    assert "Project: Test Project" in prompt
    assert "feat_001" in prompt
    assert "Features:" in prompt


def test_parse_planner_response_success():
    payload = {
        "status": "planner_complete",
        "projectName": "Test Project",
        "tasks": [
            {
                "featureId": "feat_001",
                "title": "Implement login",
                "description": "Add username/password login",
                "priority": "high",
                "phase": "build",
                "labels": ["backend", "auth"],
                "dependsOn": [],
                "executionOrder": 1,
                "effortEstimate": "m",
            }
        ],
    }
    raw = json.dumps(payload)
    tb = parse_planner_response(raw)
    assert isinstance(tb, TaskBreakdown)
    assert tb.project_name == "Test Project"
    assert len(tb.tasks) == 1
    assert tb.tasks[0].feature_id == "feat_001"


def test_parse_planner_response_invalid_json_raises():
    with pytest.raises(ValueError):
        parse_planner_response("not a json")


def test_parse_planner_response_wrong_status_raises():
    raw = json.dumps({"status": "something_else"})
    with pytest.raises(ValueError):
        parse_planner_response(raw)
