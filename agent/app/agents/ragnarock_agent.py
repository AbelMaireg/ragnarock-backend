from __future__ import annotations

import json
import logging
import re

from app.schemas.ragnarock_chat import (
    DetectedAction,
    ProjectSnapshot,
    RagnarockChatJob,
)

logger = logging.getLogger(__name__)

# ─── Intent detection — keyword matching, no LLM cost ────────────────────────

_SRS_PATTERNS = re.compile(
    r"\b(generate|create|start|make|write)\b.{0,30}\b(srs|requirements?|spec)\b",
    re.IGNORECASE,
)
_PLAN_PATTERNS = re.compile(
    r"\b(generate|create|make|build)\b.{0,30}\b(plan|tasks?|project plan)\b",
    re.IGNORECASE,
)
_DOC_PATTERNS = re.compile(
    r"\b(generate|create|make|write)\b.{0,30}\b(doc(ument)?|sad|hld|lld|adr)\b",
    re.IGNORECASE,
)
_DOC_TYPE_PATTERNS: dict[str, re.Pattern[str]] = {
    "sad": re.compile(r"\b(sad|software architecture)\b", re.IGNORECASE),
    "hld": re.compile(r"\b(hld|high.?level design)\b", re.IGNORECASE),
    "lld": re.compile(r"\b(lld|low.?level design)\b", re.IGNORECASE),
    "adr": re.compile(r"\b(adr|architecture decision)\b", re.IGNORECASE),
}


_SLASH_SRS = re.compile(r"^\s*/srs\s*$", re.IGNORECASE)
_SLASH_PLAN = re.compile(r"^\s*/plan\s*$", re.IGNORECASE)
_SLASH_DOC = re.compile(r"^\s*/doc\s+(sad|hld|lld|adr)\s*$", re.IGNORECASE)


def detect_intent(message: str) -> DetectedAction | None:
    # Explicit slash commands take priority
    if _SLASH_SRS.match(message):
        return DetectedAction(
            type="generate_srs",
            confirmationText=(
                "I can start a requirements session for this project. "
                "This will walk you through the SRS with the AI."
            ),
        )
    if _SLASH_PLAN.match(message):
        return DetectedAction(
            type="generate_plan",
            confirmationText=(
                "I can generate a task plan from your project SRS. "
                "This will create tasks in your backlog based on the requirements."
            ),
        )
    m = _SLASH_DOC.match(message)
    if m:
        doc_type = m.group(1).lower()
        labels = {"sad": "Software Architecture Document", "hld": "High-Level Design", "lld": "Low-Level Design", "adr": "Architecture Decision Record"}
        return DetectedAction(
            type="generate_doc",
            docType=doc_type,
            confirmationText=f"I can generate a {labels[doc_type]} from your project SRS.",
        )

    # Natural language fallback
    if _SRS_PATTERNS.search(message):
        return DetectedAction(
            type="generate_srs",
            confirmationText=(
                "I can start a requirements session for this project. "
                "This will walk you through the SRS with the AI."
            ),
        )
    if _PLAN_PATTERNS.search(message):
        return DetectedAction(
            type="generate_plan",
            confirmationText=(
                "I can generate a task plan from your project SRS. "
                "This will create tasks in your backlog based on the requirements."
            ),
        )
    if _DOC_PATTERNS.search(message):
        doc_type = next(
            (t for t, pat in _DOC_TYPE_PATTERNS.items() if pat.search(message)),
            "sad",
        )
        labels = {"sad": "Software Architecture Document", "hld": "High-Level Design", "lld": "Low-Level Design", "adr": "Architecture Decision Record"}
        return DetectedAction(
            type="generate_doc",
            docType=doc_type,
            confirmationText=f"I can generate a {labels[doc_type]} from your project SRS.",
        )
    return None


# ─── System prompt ────────────────────────────────────────────────────────────

def _build_system_prompt(snapshot: ProjectSnapshot) -> str:
    srs_status = "Yes" if snapshot.has_srs else "No — requirements session not yet done"
    return f"""You are Ragnarock, the project intelligence assistant for the software project {snapshot.name}.

You have complete read access to this project. Answer questions about the project clearly and concisely.
You do NOT modify anything — you are a read-only assistant.

## Project Context

Name: {snapshot.name}
Description: {snapshot.description or "Not provided"}
Status: {snapshot.status}
SRS completed: {srs_status}

### Team ({len(snapshot.members)} members)
{_format_members(snapshot.members)}

### Tasks ({len(snapshot.tasks)} total)
{_format_tasks(snapshot.tasks)}

### Documentation ({len(snapshot.docs)} docs)
{_format_docs(snapshot.docs)}

### Recent Activity
{_format_activity(snapshot.recent_activity)}

{f"### SRS Summary{chr(10)}{snapshot.srs_summary}" if snapshot.srs_summary else ""}

## Instructions

- Answer in plain, conversational prose. Never return JSON, YAML, or any structured format.
- Be concise — 2-5 sentences unless the user asks for detail.
- If data is not in your context, say "I don't have that information in the current snapshot."
- Do NOT perform any write operations or claim you can modify data.
- Do NOT suggest the user do things via other pages — you can refer to actions they can take within this chat (e.g. type /plan to generate a plan).

## Slash commands — STRICT rules

If the user message starts with "/" treat it as a command. Follow these rules exactly with NO deviation:

- "/plan" → Reply: "Your task plan is being generated now — it will appear in the panel on the right once ready."
- "/doc sad" → Reply: "Generating the Software Architecture Document now — it will appear in the panel on the right once ready."
- "/doc hld" → Reply: "Generating the High-Level Design document now — it will appear in the panel on the right once ready."
- "/doc lld" → Reply: "Generating the Low-Level Design document now — it will appear in the panel on the right once ready."
- "/doc adr" → Reply: "Generating the Architecture Decision Record now — it will appear in the panel on the right once ready."
"""


def _format_members(members: list) -> str:
    if not members:
        return "  No members."
    lines = []
    for m in members:
        name = m.name or m.email or m.user_id
        personas = ", ".join(m.personas) if m.personas else "none"
        lines.append(f"  - {name} | role: {m.role} | personas: {personas}")
    return "\n".join(lines)


def _format_tasks(tasks: list) -> str:
    if not tasks:
        return "  No tasks yet."
    # Group by status
    by_status: dict[str, list] = {}
    for t in tasks:
        by_status.setdefault(t.status, []).append(t)
    lines = []
    for status, ts in by_status.items():
        lines.append(f"  {status}: {len(ts)} task(s)")
        for t in ts[:5]:
            assignee = f" (→ {t.assignee_name})" if t.assignee_name else ""
            lines.append(f"    • {t.title}{assignee}")
        if len(ts) > 5:
            lines.append(f"    … and {len(ts) - 5} more")
    return "\n".join(lines)


def _format_docs(docs: list) -> str:
    if not docs:
        return "  No documents."
    return "\n".join(f"  - [{d.type.upper()}] {d.title} ({d.status})" for d in docs)


def _format_activity(activities: list) -> str:
    if not activities:
        return "  No recent activity."
    return "\n".join(
        f"  - {a.actor_name or 'System'}: {a.action} ({a.entity_type}) at {a.created_at}"
        for a in activities[:10]
    )


# ─── User prompt ──────────────────────────────────────────────────────────────

def build_user_prompt(message: str) -> str:
    return message.strip()
