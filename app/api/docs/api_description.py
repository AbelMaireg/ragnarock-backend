API_DESCRIPTION = """
## What this service does

This is the **internal AI layer** of the AI-Powered SDLC Automation Platform.
It consumes unstructured business input jobs (text, files, URLs) from Redis Streams
and uses an LLM agent to produce a complete, developer-ready
**Software Requirements Specification (SRS)**.

It communicates with the **NestJS backend** through Redis Streams. It is not
accessible to end clients directly.

---

## HTTP Surface

Only `GET /ai/health` is exposed over HTTP. Requirement generation is queue-only:
NestJS produces jobs to `stream:ai-requirements:jobs`, and this service publishes
results to `stream:ai-requirements:results`.

---

## How the clarification loop works

The agent never produces a partial SRS. It either asks questions or returns a complete document.
NestJS drives the live session loop; the agent retrieves historical context from memory automatically.

```
┌─────────────────────────────────────────────────────────┐
│ 1. Business owner submits description                   │
│    NestJS → Redis job stream                            │
│    { projectId, input, type, conversationHistory: [] }  │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────▼──────────────┐
         │  Agent auto-retrieves      │
         │  past memory from          │
         │  vector DB (if any)        │
         └─────────────┬──────────────┘
                       │
            ┌──────────▼──────────┐
            │     status?         │
            └──────────┬──────────┘
                       │
       ┌───────────────┴───────────────┐
       │                               │
       ▼                               ▼
needs_clarification                 complete
       │                               │
       │  NestJS:                      │  NestJS:
       │  - show questions to          │  - save SRS to DB
       │    business owner             │  - show plain-language
       │  - collect answers            │    summary to owner
       │  - append turns to            │  - mark project ready
       │    conversation_history       │    for dev team
│  - enqueue next job           │
       │                               │
       │  FastAPI (auto):              │  FastAPI (auto):
       │  - stores Q&A pairs           │  - stores SRS in
       │    in vector memory           │    vector memory
       └───────────────────────────────┘
```

---

## NestJS integration contract (Phase 3)

### What NestJS must send in every queue job

| Field | First call | Clarification follow-up | New session (returning project) |
|---|---|---|---|
| `projectId` | Required | Required | Required |
| `input` | Business owner text | Business owner answer | New input |
| `type` | `text` or `url` | `text` | `text` or `url` |
| `conversationHistory` | `[]` | All turns this session | `[]` (fresh session) |

**Phase 3 simplification:** NestJS no longer needs to pass `previous_srs` or
`asked_questions`. The agent retrieves its own historical context from the vector
database automatically using semantic search. NestJS only manages the live
session's `conversationHistory`.

### What NestJS must store after each response

| Response type | NestJS responsibility |
|---|---|
| `needs_clarification` | Append `{ role: "assistant", content: questions.join("\\n") }` and the user's reply `{ role: "user", content: answer }` to `conversationHistory`. Send the updated list in the next queued job. |
| `complete` | Save the full `RequirementResponse` to your DB. Display `business_owner_summary` to the owner for confirmation before releasing to the dev team. |

FastAPI handles all vector memory writes automatically — NestJS does not write to the vector DB.

---

## Vector memory (Phase 3)

When `DATABASE_URL` is configured in FastAPI's environment, the service:

- **Writes** a completed SRS to vector memory after every `complete` response
- **Writes** answered Q&A clarification pairs to vector memory after every `needs_clarification` response (pairs extracted from `conversation_history`)
- **Reads** the top semantically relevant past chunks before every agent call

If `DATABASE_URL` is not set, the service runs without memory (Phase 1/2 behaviour).
`GET /ai/health` returns `memory_enabled: true/false` so NestJS can check the state.

### Required PostgreSQL setup (run once)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS project_memory (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL,
    type        TEXT NOT NULL,       -- 'srs' | 'clarification'
    content     TEXT NOT NULL,
    embedding   vector(768),
    created_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS project_memory_project_idx
    ON project_memory (project_id);
```

This table lives in the **same PostgreSQL instance NestJS uses** — just add the
`DATABASE_URL` to FastAPI's `.env` pointing at the same DB.

---

## Response shapes

### When input is incomplete — `needs_clarification`
```json
{
  "status": "needs_clarification",
  "questions": [
    "Who are the primary users of the system?",
    "Should managers have different permissions than regular staff?"
  ]
}
```

### When requirements are complete — `complete`
```json
{
  "status": "complete",
  "project_name": "Shop POS System",
  "summary": "A point-of-sale system for small retail shops...",
  "features": [
    { "name": "Sales Processing", "description": "..." }
  ],
  "functional_requirements": ["The system shall..."],
  "non_functional_requirements": ["The system must respond within 2 seconds..."],
  "user_stories": [
    { "role": "Cashier", "goal": "Process a sale", "benefit": "Faster checkout" }
  ],
  "acceptance_criteria": ["Given a product is scanned, when..."],
  "out_of_scope": ["Online store integration"],
  "business_owner_summary": "Here is what we have captured for your project..."
}
```

The `business_owner_summary` is written in plain, non-technical language.
NestJS should display it to the business owner for confirmation **before** making
the SRS visible to the development team.

---

## Error reference

| Status | Meaning |
|---|---|
| `400` | Bad request — empty input, invalid file type, malformed JSON fields |
| `413` | Uploaded file exceeds 10 MB |
| `500` | LLM returned unexpected output after retry — ask the user to try again |
"""
