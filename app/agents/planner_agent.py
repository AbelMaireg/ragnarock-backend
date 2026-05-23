from __future__ import annotations

import json

from app.schemas.planner import TaskBreakdown
from app.schemas.queue import AiPlannerJob


_SYSTEM_PROMPT = """You are the Project Planner Agent for Ragnarock, an AI-powered SDLC platform.

Your job is to read a completed Software Requirements Specification (SRS) and produce a
dependency-ordered task breakdown that a development team can execute immediately.

## Output contract

Respond with a single JSON object that matches this schema exactly:

{
  "status": "planner_complete",
  "projectName": "<project name from SRS>",
  "tasks": [
    {
      "featureId": "feat_001",
      "title": "<imperative verb phrase, max 140 chars>",
      "description": "<what to build and why, max 2000 chars>",
      "priority": "low | medium | high | urgent",
      "phase": "discovery | planning | build | test | release",
      "labels": ["<tag>"],
      "dependsOn": ["feat_001"],
      "executionOrder": 1,
      "effortEstimate": "xs | s | m | l | xl"
    }
  ]
}

## Rules

1. Every SRS feature must produce at least one task. Do not skip features.
2. featureId must match the stable IDs from the SRS (feat_001, feat_002, …).
   If the SRS uses names instead of IDs, generate stable IDs: feat_001, feat_002, etc.
3. dependsOn lists featureIds (not task titles) whose tasks must complete first.
   Only add a dependency if it is a genuine blocker — do not over-constrain.
4. executionOrder is 1-based. Tasks with no dependsOn get the lowest numbers.
   Tasks that depend on others get higher numbers. No two tasks share the same order.
5. phase guidance:
   - discovery: research, spike, design decision
   - planning: schema design, API contract definition, architecture decision
   - build: implementation (backend, frontend, integration)
   - test: unit tests, integration tests, E2E tests
   - release: deployment, config, documentation
6. priority guidance:
   - urgent: core auth, data model, foundational APIs
   - high: primary user-facing features
   - medium: supporting features
   - low: nice-to-have, polish, non-blocking improvements
7. effortEstimate guidance:
   - xs: < 1 hour  |  s: 1–4 hours  |  m: ~1 day  |  l: 2–3 days  |  xl: > 3 days
8. labels should be lowercase short strings: e.g. ["backend", "auth", "database", "frontend", "api", "ui"]
9. title must start with an imperative verb: "Implement", "Create", "Add", "Configure", "Write", etc.
10. Return only valid JSON. No markdown fences, no explanation, no preamble.
"""


def build_user_prompt(job: AiPlannerJob) -> str:
    srs = job.partial_srs
    project_name = job.project_context.name if job.project_context else (srs.project_name or "Unknown Project")

    lines: list[str] = [
        f"Project: {project_name}",
    ]

    if srs.summary:
        lines.append(f"\nSummary:\n{srs.summary}")

    if srs.features:
        lines.append("\nFeatures:")
        for i, feat in enumerate(srs.features, start=1):
            feat_id = f"feat_{i:03d}"
            lines.append(f"  {feat_id}: {feat.name} — {feat.description}")

    if srs.functional_requirements:
        lines.append("\nFunctional Requirements:")
        for req in srs.functional_requirements:
            lines.append(f"  - {req}")

    if srs.non_functional_requirements:
        lines.append("\nNon-Functional Requirements:")
        for req in srs.non_functional_requirements:
            lines.append(f"  - {req}")

    if srs.user_roles:
        lines.append(f"\nUser Roles: {', '.join(srs.user_roles)}")

    if srs.out_of_scope:
        lines.append("\nOut of Scope (do not create tasks for these):")
        for item in srs.out_of_scope:
            lines.append(f"  - {item}")

    lines.append(
        "\nGenerate a complete, dependency-ordered task breakdown for this project. "
        "Return only the JSON object."
    )

    return "\n".join(lines)


def parse_planner_response(raw: str) -> TaskBreakdown:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"PlannerAgent | LLM returned invalid JSON: {e}") from e

    if data.get("status") != "planner_complete":
        raise ValueError(
            f"PlannerAgent | expected status='planner_complete', got '{data.get('status')}'"
        )

    return TaskBreakdown.model_validate(data)
