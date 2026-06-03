from __future__ import annotations

import json

from app.schemas.qa_intelligence import QaTestBreakdown
from app.schemas.queue import AiQaIntelligenceJob


_SYSTEM_PROMPT = """You are the QA Intelligence Agent for Ragnarock, an AI-powered SDLC platform.

Your job is to read a completed Software Requirements Specification (SRS) and produce a
comprehensive test suite for every feature — before a single line of code is written.

## Output contract

Respond with a single JSON object that matches this schema exactly:

{
  "status": "qa_complete",
  "projectName": "<project name>",
  "testSuites": [
    {
      "featureId": "feat_001",
      "featureName": "<feature name>",
      "acceptanceCriteria": [
        "<plain-language statement of what 'done' looks like for this feature>"
      ],
      "testCases": [
        {
          "id": "tc_001",
          "type": "unit | integration | e2e",
          "title": "<concise test title>",
          "preconditions": ["<state that must be true before the test runs>"],
          "steps": ["<step 1>", "<step 2>"],
          "expectedResult": "<what should happen if the feature is implemented correctly>",
          "requirementId": "fr_001"
        }
      ]
    }
  ]
}

## Rules

1. Every SRS feature must have exactly one test suite. Do not skip features.
2. featureId must match the stable IDs from the SRS (feat_001, feat_002, …).
3. Each test suite must have at least 2 acceptance criteria and at least 3 test cases.
4. Test case IDs are globally unique across all suites: tc_001, tc_002, … (continuous counter).
5. requirementId links the test case to its functional requirement (fr_001, fr_002, …).
   Use null if no specific requirement maps to this test.
6. Test type guidance:
   - unit: tests a single function or component in isolation
   - integration: tests interaction between two or more components or services
   - e2e: tests a complete user flow from UI to database and back
7. Every feature must include at least one e2e test covering the happy path.
8. Include edge cases and negative scenarios (invalid input, unauthorized access, boundary conditions).
9. acceptanceCriteria must be readable by a business owner — plain language, no technical jargon.
10. steps must be precise enough for a QA engineer to follow without ambiguity.
11. Return only valid JSON. No markdown fences, no explanation, no preamble.
"""


def build_user_prompt(job: AiQaIntelligenceJob) -> str:
    srs = job.partial_srs
    project_name = (
        job.project_context.name if job.project_context else (srs.project_name or "Unknown Project")
    )

    lines: list[str] = [f"Project: {project_name}"]

    if srs.summary:
        lines.append(f"\nSummary:\n{srs.summary}")

    if srs.features:
        lines.append("\nFeatures:")
        for i, feat in enumerate(srs.features, start=1):
            feat_id = f"feat_{i:03d}"
            lines.append(f"  {feat_id}: {feat.name} — {feat.description}")
            if getattr(feat, "acceptance_criteria", None):
                for criterion in feat.acceptance_criteria:
                    lines.append(f"    • {criterion}")

    if srs.functional_requirements:
        lines.append("\nFunctional Requirements:")
        for i, req in enumerate(srs.functional_requirements, start=1):
            req_id = f"fr_{i:03d}"
            lines.append(f"  {req_id}: {req}")

    if srs.non_functional_requirements:
        lines.append("\nNon-Functional Requirements:")
        for req in srs.non_functional_requirements:
            lines.append(f"  - {req}")

    if srs.user_roles:
        lines.append(f"\nUser Roles: {', '.join(srs.user_roles)}")

    if srs.out_of_scope:
        lines.append("\nOut of Scope (do not generate test cases for these):")
        for item in srs.out_of_scope:
            lines.append(f"  - {item}")

    if job.arch_context:
        lines += [
            "",
            "## Architecture Context (optional — use to make integration and E2E tests more specific)",
            "",
            job.arch_context,
            "",
            "Use the architecture above to:",
            "- Name real API endpoints in E2E test steps where they are defined",
            "- Reference the actual tech stack in integration test preconditions (e.g. seed the PostgreSQL database, stub the Redis cache)",
            "- Align test setup with the real service boundaries described in the architecture",
            "- If the architecture does not mention something, do not invent it — fall back to generic steps",
        ]

    lines.append(
        "\nGenerate a complete test suite for every feature. "
        "Return only the JSON object."
    )

    return "\n".join(lines)


def parse_qa_response(raw: str) -> QaTestBreakdown:
    from app.core.llm.utils import strip_fences
    try:
        data = json.loads(strip_fences(raw))
    except json.JSONDecodeError as e:
        raise ValueError(f"QaIntelligenceAgent | LLM returned invalid JSON: {e}") from e

    if data.get("status") != "qa_complete":
        raise ValueError(
            f"QaIntelligenceAgent | expected status='qa_complete', got '{data.get('status')}'"
        )

    return QaTestBreakdown.model_validate(data)
