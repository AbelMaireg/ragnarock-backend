# SDLC AI Service — FastAPI

The AI layer of the **AI-Powered Software Development Lifecycle Automation Platform**.

This service accepts unstructured business input (text, files, URLs) and uses an LLM agent to produce a complete, developer-ready **Software Requirements Specification (SRS)** through an iterative clarification loop.

> **Internal service only.** Requirements are exchanged with the NestJS backend through Redis Streams — not direct client or backend HTTP calls.

---

## Architecture

```
Frontend → NestJS (business logic, auth, DB) → Redis Streams → FastAPI worker → LLM
                                                             ↕
                                                      PostgreSQL + pgvector
                                                      (vector memory store)
```

---

## Features

- **Clarification loop** — agent asks targeted follow-up questions until requirements are complete. Never produces a partial SRS.
- **Multi-format input** — plain text, PDF, DOCX, TXT, and public URLs
- **Pluggable LLM** — switch between Gemini, Claude, or OpenAI via a single environment variable
- **Vector memory (Phase 3)** — past SRS documents and clarification Q&A are stored as embeddings. The agent retrieves relevant history automatically on every call
- **Redis Streams worker** — consumes requirement jobs and publishes result events without service-to-service HTTP timeouts
- **Health endpoint** — HTTP is retained only for `/ai/health`

---

## Project Structure

```
app/
├── agents/
│   └── requirement_agent.py      # System + user prompt builder
├── api/
│   ├── dependencies.py           # Legacy internal API-key guard
│   ├── docs/
│   │   ├── api_description.py    # Main Scalar page documentation
│   │   └── requirement_docs.py   # Per-endpoint documentation strings
│   └── routes/
│       └── requirement.py        # GET /ai/health only
├── core/
│   ├── config.py                 # Settings via pydantic-settings (.env)
│   ├── orchestrator.py           # Memory retrieval → agent → memory storage
│   └── llm/
│       ├── base.py               # Abstract LLM provider interface
│       ├── factory.py            # Reads LLM_PROVIDER, returns correct provider
│       ├── gemini.py             # Gemini implementation
│       ├── anthropic.py          # Claude implementation
│       └── openai.py             # OpenAI implementation
├── memory/
│   ├── embeddings.py             # Text → vector via Gemini embedding API
│   ├── vector_store.py           # Write chunks to pgvector
│   └── retrieval.py              # Semantic search over project memory
├── queue/
│   └── requirements_worker.py    # Redis Streams consumer/producer
├── schemas/
│   └── requirement.py            # All Pydantic request/response models
├── services/
│   ├── requirements_processor.py # Shared queue processing logic
│   └── upload_storage.py         # Local/S3 upload reference loading
├── tools/
│   ├── cleaner.py                # Text normalization
│   ├── parser.py                 # PDF / DOCX / TXT extraction
│   └── extractor.py              # URL fetch + HTML cleaning
└── main.py                       # FastAPI app, CORS, Scalar docs mount
```

---

## Quick Start

### 1. Clone and set up environment

```bash
cd fastapi
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
```

### 2. Configure `.env`

```env
# Required
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key     # get free at aistudio.google.com

# Optional — leave empty to run without vector memory
DATABASE_URL=postgresql://user:pass@localhost:5432/sdlc_db

# Redis Streams queue shared with NestJS
REDIS_URL=redis://localhost:6379
```

### 3. Run

```bash
./run.sh
```

Server starts at `http://localhost:8100` (default; avoids clashing with Nest on `8000`).
Open `http://localhost:8100/docs` for the interactive Scalar UI.

---

## HTTP Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/ai/health` | None | Health check + memory status |

Requirement generation is queue-only. NestJS writes jobs to
`stream:ai-requirements:jobs`; this service publishes results to
`stream:ai-requirements:results`.

---

## Redis Queue Contract

NestJS produces jobs to `stream:ai-requirements:jobs` with `jobId`, `projectId`,
`userId`, `sessionId`, `userMessageId`, `type`, `input`, `conversationHistory`,
and optional `upload` metadata. The agent consumes those jobs and publishes
`succeeded` or `failed` result events to `stream:ai-requirements:results`.

---

## Switching LLM Providers

Change one line in `.env` — no code changes needed:

```env
LLM_PROVIDER=gemini      # default
LLM_PROVIDER=anthropic   # Claude
LLM_PROVIDER=openai      # GPT-4o
```

Set the corresponding API key for whichever provider you select.

---

## Vector Memory Setup (Phase 3)

Requires PostgreSQL with the `pgvector` extension. Run once on the database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS project_memory (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL,
    type        TEXT NOT NULL,
    content     TEXT NOT NULL,
    embedding   vector(768),
    created_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS project_memory_project_idx
    ON project_memory (project_id);
```

Then set `DATABASE_URL` in `.env`. If left empty the service runs without memory (Phase 1/2 behaviour) and degrades gracefully.

---

## NestJS Integration Contract

### Queue job shape (text/URL)

```json
{
  "jobId": "job_abc123",
  "projectId": "proj_abc123",
  "userId": "user_abc123",
  "sessionId": "session_abc123",
  "userMessageId": "msg_abc123",
  "type": "text",
  "input": "I want to build a POS system for my small shop",
  "conversationHistory": []
}
```

### Clarification loop

When the agent returns `needs_clarification`, append the questions and the business owner's answers to `conversationHistory` and enqueue another job:

```json
{
  "projectId": "proj_abc123",
  "type": "text",
  "input": "Cashiers and a manager. Manager can see reports.",
  "conversationHistory": [
    { "role": "assistant", "content": "Who are the users?" },
    { "role": "user",      "content": "Cashiers and a manager. Manager can see reports." }
  ]
}
```

Repeat until `status: complete`.

### What NestJS must do after each response

| Response | Action |
|----------|--------|
| `needs_clarification` | Append assistant + user turns to `conversation_history`. Call again. |
| `complete` | Save the `RequirementResponse` to DB. Show `business_owner_summary` to the business owner for confirmation before releasing to the dev team. |

FastAPI handles all vector memory reads and writes automatically.

---

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 — MVP | Done | Requirement agent, clarification loop, structured SRS output |
| 2 — Persistence | Done | Agent aware of previous SRS and asked questions within a project |
| 3 — Vector Memory | Done | Agent auto-retrieves past SRS + Q&A from pgvector; NestJS simplified |
| 4 — Multi-agent | Planned | Planner, architect advisor, test generator, developer assistant (LangGraph) |

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_PROVIDER` | Yes | `gemini` | Active LLM: `gemini`, `anthropic`, `openai` |
| `GEMINI_API_KEY` | If using Gemini | — | Gemini API key |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model name |
| `ANTHROPIC_API_KEY` | If using Anthropic | — | Anthropic API key |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-6` | Claude model name |
| `OPENAI_API_KEY` | If using OpenAI | — | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o` | OpenAI model name |
| `REDIS_URL` | Yes | `redis://localhost:6379` | Redis connection URL |
| `AI_REQUIREMENTS_QUEUE_JOBS_STREAM` | No | `stream:ai-requirements:jobs` | Jobs stream produced by NestJS |
| `AI_REQUIREMENTS_QUEUE_JOBS_GROUP` | No | `ai-requirements-agent-workers` | Agent consumer group |
| `AI_REQUIREMENTS_QUEUE_RESULTS_STREAM` | No | `stream:ai-requirements:results` | Results stream consumed by NestJS |
| `AI_UPLOAD_LOCAL_ROOT` | If local uploads | — | Shared local upload root for backend file keys |
| `AI_UPLOAD_S3_BUCKET` | If S3 uploads | — | S3 bucket fallback when queued location is not `s3://` |
| `ALLOWED_ORIGINS` | Yes | `http://localhost:3000` | Comma-separated CORS origins |
| `DATABASE_URL` | No | — | PostgreSQL URL for vector memory (Phase 3) |
| `EMBEDDING_MODEL` | No | `models/text-embedding-004` | Gemini embedding model |
| `APP_ENV` | No | `development` | Environment name |
| `APP_PORT` | No | `8100` | Server port |

---

## Docker

```bash
# Build and run
docker compose up --build

# Run in background
docker compose up -d --build
```

The service runs on port `8100` by default (Nest/docker often uses `8000`). In production, remove the port mapping from `docker-compose.yml` and let NestJS reach it via the internal Docker network name (`http://sdlc-ai:8100`).
