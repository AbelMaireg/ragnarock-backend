from __future__ import annotations

import json
import logging

from app.schemas.queue import AiArchDocJob, AiArchDocSucceededResult

logger = logging.getLogger(__name__)

_DOC_TYPE_LABELS: dict[str, str] = {
    "sad": "Software Architecture Document",
    "hld": "High-Level Design",
    "lld": "Low-Level Design",
    "adr": "Architecture Decision Record",
}


class ArchDocProcessor:
    async def process_job(self, job: AiArchDocJob) -> AiArchDocSucceededResult:
        from app.core.llm.factory import get_llm_provider
        from app.schemas.requirement import PartialSrs

        llm = get_llm_provider()
        srs = job.partial_srs or PartialSrs()

        layer_label = f" ({job.layer})" if job.layer else ""
        doc_label = _DOC_TYPE_LABELS.get(job.doc_type, job.doc_type.upper())
        title = f"{doc_label}{layer_label}"

        system_prompt = _build_system_prompt(job.doc_type)
        user_prompt = _build_user_prompt(job, srs, layer_label)

        logger.info(
            "ArchDocProcessor | doc_type=%s | layer=%s | project=%s",
            job.doc_type,
            job.layer or "—",
            job.project_id,
        )

        raw = await llm.generate(system_prompt, user_prompt)

        # Strip markdown code fences if the LLM wrapped in them
        content = raw.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        # Guard: if the model returned JSON instead of Markdown, convert it
        if content.startswith("{") or content.startswith("["):
            content = _json_to_markdown(content, title)

        return AiArchDocSucceededResult(
            jobId=job.job_id,
            projectId=job.project_id,
            userId=job.user_id,
            docType=job.doc_type,
            layer=job.layer,
            content=content,
            title=title,
        )


def _json_to_markdown(raw: str, title: str) -> str:
    """Convert a JSON-structured document response to Markdown as a fallback."""
    try:
        data = json.loads(raw)
    except Exception:
        return raw  # Not valid JSON either — return as-is

    lines: list[str] = [f"# {data.get('document_type') or title}"]
    if data.get("project_name"):
        lines.append(f"\n**Project:** {data['project_name']}\n")

    sections = data.get("sections") or []
    for section in sections:
        section_title = section.get("title") or ""
        section_content = section.get("content") or ""
        if section_title:
            lines.append(f"\n## {section_title}\n")
        if section_content:
            lines.append(section_content)

    return "\n".join(lines)


def _build_system_prompt(doc_type: str) -> str:
    base = """
You are a senior software architect. Your task is to write a structured technical document for a
software project based on its Software Requirements Specification (SRS).

CRITICAL: Your entire response MUST be plain Markdown text. Do NOT return JSON, XML, or any other
structured data format. Do NOT wrap your response in code fences. Start directly with the document
title as a Markdown H1 heading (e.g. `# Software Architecture Document`), then continue with
sections as H2/H3 headings. Use bullet lists and tables where appropriate.
Every sentence must be specific to this project — no generic boilerplate.
""".strip()

    guides: dict[str, str] = {
        "sad": """
## Document type: Software Architecture Document (SAD)
Sections to include (adapt based on what the SRS covers):
1. Overview and scope
2. Architectural goals and constraints (reference NFRs)
3. System context diagram (describe textually using Mermaid or ASCII)
4. Component breakdown (services, modules, layers)
5. Data flow and integration points
6. Technology stack decisions with justifications
7. Deployment topology
8. Cross-cutting concerns (auth, logging, error handling, security)
""",
        "hld": """
## Document type: High-Level Design (HLD)
Sections to include:
1. System overview
2. Module/service breakdown
3. Interface contracts between components
4. Data models (high-level entity map)
5. External integrations
6. Key design decisions
""",
        "lld": """
## Document type: Low-Level Design (LLD)
Sections to include:
1. Detailed component design
2. Class/entity diagrams described in Mermaid
3. API endpoint specifications
4. Database schema design
5. Algorithm and logic descriptions for complex features
6. Error handling and edge cases
""",
        "adr": """
## Document type: Architecture Decision Record (ADR)
Sections to include:
1. Title and status
2. Context (what problem are we solving?)
3. Decision (what we chose)
4. Rationale (why this over alternatives)
5. Consequences (trade-offs, future implications)
""",
    }

    guide = guides.get(doc_type, "")
    return f"{base}\n\n{guide}".strip()


def _build_user_prompt(job: AiArchDocJob, srs: object, layer_label: str) -> str:
    import json as _json

    parts: list[str] = []

    if job.project_context:
        parts.append(
            f"--- PROJECT ---\n"
            f"Name: {job.project_context.name}\n"
            + (f"Description: {job.project_context.description}" if job.project_context.description else "")
        )

    srs_data = srs.model_dump(mode="json", exclude_none=True) if hasattr(srs, "model_dump") else {}
    if srs_data:
        parts.append(
            "--- SOFTWARE REQUIREMENTS SPECIFICATION ---\n"
            + _json.dumps(srs_data, indent=2)
        )
    else:
        parts.append(
            "--- SOFTWARE REQUIREMENTS SPECIFICATION ---\n"
            "(No SRS available. Generate the document based on the project name/description.)"
        )

    layer_note = f" Focus specifically on the **{job.layer}** layer/service." if job.layer else ""
    doc_label = _DOC_TYPE_LABELS.get(job.doc_type, job.doc_type.upper())
    parts.append(
        f"--- TASK ---\n"
        f"Write a complete {doc_label}{layer_label} document for this project.{layer_note}\n"
        f"Use Markdown with clear headings. Be specific — reference features and requirements by name."
    )

    return "\n\n".join(parts).strip()
