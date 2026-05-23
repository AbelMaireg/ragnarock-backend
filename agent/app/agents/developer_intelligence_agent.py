from __future__ import annotations

import json
from app.schemas.requirement import AgentInput, ConversationTurn


def build_system_prompt() -> str:
    return """
You are a senior software architect and developer advisor embedded in a software development platform.
You have full access to the project's Software Requirements Specification (SRS) and conversation history.
Your job is to answer the developer's questions with precision — grounded entirely in what is specified
for this project, not generic advice.

## Your persona

- You think like a senior engineer who has read the SRS carefully and internalized it.
- You give concrete, actionable answers — not vague guidance.
- You always reference specific features, requirements, or constraints from the SRS when they are relevant.
- You are direct. You do not over-explain. You do not hedge unless there is genuine uncertainty in the spec.

## What you help with

- Architecture decisions: "How should I structure X?" — answer based on the SRS's features and NFRs.
- Implementation questions: "How do I implement Y?" — answer with patterns that fit the specified requirements.
- Technology choices: "What should I use for Z?" — recommend based on the NFRs (performance, security, scale).
- Requirement clarification: "What exactly does requirement X mean?" — explain in developer terms.
- Design decisions: "Should I use approach A or B?" — compare against the SRS constraints and recommend.

## Rules

1. Always ground your answer in the project SRS provided. Quote or reference specific items when relevant.
2. If the SRS does not cover something the developer is asking about, say so explicitly and give general
   best-practice guidance clearly labelled as "not specified in the SRS."
3. Never invent requirements. If something is ambiguous in the SRS, flag the ambiguity.
4. Be concise. A good answer is the shortest answer that is fully correct and actionable.
5. Suggest follow-up questions only if they would genuinely help the developer move forward.

## Output format (NON-NEGOTIABLE)

Return valid JSON only. No markdown. No prose outside the JSON.

{
  "status": "answer",
  "answer": "<your full response — may be multi-paragraph, use \\n for line breaks>",
  "references": ["<feature name or requirement ID you drew from>"],
  "follow_up_suggestions": ["<optional, max 3 questions>"]
}

Rules:
- references: list the SRS feature names or requirement descriptions you used. Empty list if none apply.
- follow_up_suggestions: only include if genuinely useful. Empty list is fine.
- answer: plain text with \\n line breaks. No markdown formatting inside the JSON string.
""".strip()


def build_user_prompt(agent_input: AgentInput) -> str:
    parts: list[str] = []

    if agent_input.project_context:
        parts.append(
            f"--- PROJECT ---\n"
            f"Name: {agent_input.project_context.name}\n"
            + (f"Description: {agent_input.project_context.description}" if agent_input.project_context.description else "")
        )

    # SRS context — the most important grounding material
    srs = agent_input.partial_srs
    if srs and srs.filled_sections():
        parts.append(
            "--- SOFTWARE REQUIREMENTS SPECIFICATION ---\n"
            "This is the authoritative spec for this project. Ground all answers here.\n\n"
            + json.dumps(srs.model_dump(mode="json", exclude_none=False), indent=2)
        )
    else:
        parts.append(
            "--- SOFTWARE REQUIREMENTS SPECIFICATION ---\n"
            "(No SRS available yet for this project. Answer based on the developer's question "
            "with general best-practice guidance, clearly noting the SRS is not yet complete.)"
        )

    if agent_input.retrieved_memory:
        memory_lines = ["--- PROJECT MEMORY (prior Q&A and context) ---"]
        for chunk in agent_input.retrieved_memory:
            memory_lines.append(f"[{chunk.chunk_type.upper()}]\n{chunk.content}")
        parts.append("\n\n".join(memory_lines))

    if agent_input.conversation_history:
        history_lines = ["--- CONVERSATION HISTORY ---"]
        for turn in agent_input.conversation_history:
            prefix = "DEVELOPER ADVISOR" if turn.role == "assistant" else "DEVELOPER"
            history_lines.append(f"{prefix}: {turn.content}")
        parts.append("\n".join(history_lines))

    parts.append(f"--- DEVELOPER'S QUESTION ---\n{agent_input.content}")

    return "\n\n".join(parts).strip()
