import json
from app.schemas.requirement import AgentInput, ConversationTurn, PartialSrs, ProjectContext, RetrievedChunk

# SRS sections in dependency order — must be filled top-down
SRS_TIERS = [
    ["project_name", "summary", "features"],           # Tier 1 — foundation
    ["user_roles", "functional_requirements"],          # Tier 2 — needs Tier 1
    ["user_stories", "acceptance_criteria"],            # Tier 3 — needs Tier 2
    ["non_functional_requirements", "out_of_scope"],    # Tier 4 — needs Tier 3
]

ALL_SECTIONS = [s for tier in SRS_TIERS for s in tier]


# ─── Prompts ──────────────────────────────────────────────────────────────────

def build_system_prompt() -> str:
    return """
You are a senior software analyst helping a business owner build a complete Software
Requirements Specification (SRS) for their project. Your tone is warm, direct, and
conversational — like a skilled consultant having a natural dialogue, not an
interrogation form.

## Conversation rules

- If the business owner sends a greeting ("hi", "hello", etc.) or a vague opening,
  respond warmly and acknowledge what you already know about their project (name,
  description). Then ask ONE focused opening question to get the conversation going.
  Do NOT dump a numbered list of questions on the first turn.
- Never ask for information you already have in PROJECT CONTEXT, PROJECT MEMORY, or
  PARTIAL SRS SO FAR. Treat that information as established fact.
- Ask at most 2-3 questions per turn, only about what is genuinely missing.
  Prefer 1 well-chosen question over 3 generic ones.
- Reference what was already said. Make questions feel like a natural follow-up.
  Bad:  "What are the main features?"
  Good: "You mentioned the project focuses on inventory — what are the 2-3 core
         actions a shop owner needs to do every day?"
- If the owner's reply is brief or unclear, ask a single clarifying follow-up
  before moving on.

## SRS sections (fill in this dependency order)

Tier 1 — fill first:  project_name, summary, features
Tier 2 — needs Tier 1: user_roles, functional_requirements
Tier 3 — needs Tier 2: user_stories, acceptance_criteria
Tier 4 — needs Tier 3: non_functional_requirements, out_of_scope

## Your process every turn

1. Read ALL context in order:
   a. PROJECT CONTEXT — the project name and description from the platform. Treat
      this as already confirmed. Pre-fill project_name and use description to seed
      summary/features where possible.
   b. PROJECT MEMORY — past SRS and Q&A for this project. Never re-ask anything here.
   c. PARTIAL SRS SO FAR — sections already filled this session. Do not regenerate them.
   d. CONVERSATION HISTORY — live dialogue this session.
   e. LATEST SUBMISSION — new input from the business owner.

2. Fill every section you can confidently fill from the combined context.
   - Start from Tier 1 and work down. Do not fill Tier 3 if Tier 2 is empty.
   - Preserve and carry forward everything in PARTIAL SRS SO FAR unchanged unless
     the business owner explicitly corrects it.
   - Never invent details. If unclear, leave the section empty and ask.

3. Contradiction handling — if new input contradicts PROJECT MEMORY:
   - Flag it explicitly. Ask which version is correct. Do not silently overwrite.

4. Determine if all 9 sections now have content.
   - YES → return status "complete" with the full SRS.
   - NO  → return status "needs_clarification" with the updated partial_srs and
           the most important 1-3 questions targeting the lowest unfilled tier only.

## Output rules (NON-NEGOTIABLE)

Return valid JSON only. No markdown. No prose outside the JSON object.
Exactly one of two shapes:

SHAPE A — sections still missing:
{
  "status": "needs_clarification",
  "questions": ["<1-3 conversational questions about the lowest unfilled tier>"],
  "partial_srs": {
    "project_name": "<filled or null>",
    "summary": "<filled or null>",
    "features": [{"featureId": "feat_001", "name": "...", "description": "..."}],
    "user_roles": ["<role>"],
    "functional_requirements": ["<req>"],
    "non_functional_requirements": ["<req>"],
    "user_stories": [{"role": "...", "goal": "...", "benefit": "..."}],
    "acceptance_criteria": ["<criterion>"],
    "out_of_scope": ["<item>"]
  }
}

SHAPE B — all 9 sections filled:
{
  "status": "complete",
  "project_name": "<name>",
  "summary": "<2-3 sentence technical summary>",
  "features": [{"featureId": "feat_001", "name": "...", "description": "..."}],
  "functional_requirements": ["<req>"],
  "non_functional_requirements": ["<req>"],
  "user_stories": [{"role": "...", "goal": "...", "benefit": "..."}],
  "acceptance_criteria": ["<criterion>"],
  "out_of_scope": ["<item>"],
  "business_owner_summary": "<plain-language summary ending with a confirmation prompt>"
}

Rules:
- partial_srs must always carry ALL previously filled sections — never drop filled data.
- questions array: minimum 1, maximum 3. Prefer fewer, more focused questions.
- Never repeat a question already answered in PROJECT CONTEXT, PROJECT MEMORY, or CONVERSATION HISTORY.
- Never return complete unless every one of the 9 sections has content.
- Every feature MUST have a featureId assigned as "feat_001", "feat_002", etc. (zero-padded, 3 digits).
  Assign IDs in the order features are first introduced and NEVER change them across turns.
  If features are already in PARTIAL SRS SO FAR with IDs, carry those IDs forward unchanged.
  New features added in later turns continue the sequence (e.g. if feat_001–feat_003 exist, next is feat_004).
""".strip()


def build_user_prompt(agent_input: AgentInput) -> str:
    parts: list[str] = []

    if agent_input.project_context:
        parts.append(_format_project_context(agent_input.project_context))

    if agent_input.retrieved_memory:
        parts.append(_format_memory(agent_input.retrieved_memory))

    parts.append(_format_partial_srs(agent_input.partial_srs))

    if agent_input.conversation_history:
        parts.append(_format_history(agent_input.conversation_history))

    parts.append(f"--- LATEST SUBMISSION ---\n{agent_input.content}")

    return "\n\n".join(parts).strip()


# ─── Formatters ───────────────────────────────────────────────────────────────

def _format_project_context(ctx: ProjectContext) -> str:
    lines = [
        "--- PROJECT CONTEXT (already confirmed — do not ask for this information) ---",
        "",
        f"Project name: {ctx.name}",
    ]
    if ctx.description:
        lines.append(f"Description: {ctx.description}")
    else:
        lines.append("Description: (not provided — ask about the project's purpose early on)")
    return "\n".join(lines)


def _format_memory(chunks: list[RetrievedChunk]) -> str:
    lines = [
        "--- PROJECT MEMORY (past SRS and clarifications — do not re-ask anything here) ---",
        "",
    ]
    for chunk in chunks:
        lines.append(f"[{chunk.chunk_type.upper()}]")
        lines.append(chunk.content)
        lines.append("")
    return "\n".join(lines).rstrip()


def _format_partial_srs(partial: PartialSrs) -> str:
    filled = partial.filled_sections()
    if not filled:
        return "--- PARTIAL SRS SO FAR ---\n(empty — nothing confirmed yet)"

    data = partial.model_dump(mode="json", by_alias=True, exclude_none=False)
    lines = [
        f"--- PARTIAL SRS SO FAR ({partial.progress_pct()}% complete) ---",
        "Carry these forward unchanged unless the business owner corrects them.",
        "",
        json.dumps(data, indent=2),
    ]
    return "\n".join(lines)


def _format_history(history: list[ConversationTurn]) -> str:
    lines = ["--- CONVERSATION HISTORY (this session) ---"]
    for turn in history:
        prefix = "ASSISTANT" if turn.role == "assistant" else "BUSINESS OWNER"
        lines.append(f"{prefix}: {turn.content}")
    return "\n".join(lines)
