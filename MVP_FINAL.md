# AI-Powered SDLC Automation Platform

## MVP Definition & Development Reference Document

**Version:** 2.0  
**Date:** 2026-05-15  
**Status:** Finalized — Active Development Reference

---

## 1. The Problem We Are Solving

### The Core Pain Point

Software projects fail — not because developers can't code, but because **nobody agreed on what to build**.

Here is what happens in almost every software project:

1. A business owner has an idea in their head.
2. They describe it informally — in a meeting, a chat message, or a loosely written document.
3. Developers interpret it and build what they _think_ was meant.
4. The business owner reviews it and says: _"This is not what I wanted."_
5. Rework begins. Deadlines slip. Trust breaks down.
6. Repeat — until the project is over budget, over time, and nobody is happy.

This cycle happens because **requirements are never truly complete before development starts** — and once development begins, there is no system keeping every role aligned to the original intent.

### Why the Full SDLC Breaks Down

- Business owners are domain experts, not technical writers. They don't know what information developers need.
- There is no structured process that forces completeness before handoff.
- Ambiguity goes undetected until it becomes a bug or a missed feature.
- Back-and-forth communication is unstructured — clarifications happen in emails, Slack, meetings, and are never consolidated.
- When requirements finally reach developers, they are still incomplete — and developers make assumptions to fill the gaps.
- Once development starts, there is no mechanism to verify that what is being built still matches what was specified.
- Scope changes cascade invisibly — nobody knows which tasks, which designs, and which tests are affected.

### The Consequence

| What Happens                                | Result                               |
| ------------------------------------------- | ------------------------------------ |
| Unclear requirements reach developers       | Wrong features get built             |
| Developers ask for clarification mid-sprint | Development stops and waits          |
| Business owner gives verbal clarification   | It's not documented, forgotten later |
| Requirements change during development      | Scope creep, rework, delay           |
| Product is delivered                        | It does not match original intent    |
| No traceability from requirement to code    | Nobody can verify what was built     |

**The root cause is not a people problem. It is a process problem. There is no system that validates requirements before development begins — and keeps every role aligned throughout the entire lifecycle.**

---

## 2. The Solution We Are Building

### One-Line Description

> An AI-powered SDLC automation platform that takes a project from raw idea to verified, working software — with a dedicated AI agent serving every role in the development process.

### What Makes This Different

Most tools ask teams to _manage_ work. This platform _drives_ work. Each persona — business owner, project manager, developer, QA engineer — has a dedicated agent that understands their role, speaks their language, and operates at the exact moment in the lifecycle where they need help.

The platform does not stop at requirements. It covers the full journey: idea → specification → task breakdown → architecture → implementation → testing → change management — with every artifact traceable back to the original requirement.

### The Core Promise

- **To the business owner:** "Describe your idea. We will turn it into a complete, developer-ready specification — and keep it aligned with what gets built."
- **To the project manager:** "Your SRS becomes a structured, prioritized backlog automatically — connected to the tools your team already uses."
- **To the developer:** "You have an AI that knows your entire system design, can answer implementation questions, and reads your code to tell you if it matches the spec."
- **To the QA engineer:** "Every feature comes with test cases and acceptance criteria generated directly from the requirements — before a single line of code is written."
- **To the whole team:** "When something changes, you know exactly what is affected before you agree to it."
- **To external coding agents:** "Connect to this platform and build the entire product autonomously — every piece of context you need is structured, ordered, and machine-readable."

---

## 3. Platform Scope — All Five Phases

### The Five Phases

| Phase | Name | Core Capability | Status |
| ----- | ---- | --------------- | ------ |
| Phase 1 | Requirement Engine | Clarification loop + SRS generation | Complete |
| Phase 2 | Persistence & UI | Full-stack wiring, session management, UI workspace | Complete |
| Phase 3 | Vector Memory | pgvector memory, context-aware responses across sessions | Complete |
| Phase 4 | Multi-Agent SDLC | Five specialized agents covering the full development lifecycle | Active |
| Phase 5 | MCP & Autonomous Build | Machine-readable context server; coding agents build the product autonomously | Planned |

---

## 4. How the Platform Works — End to End

### The Communication Architecture (All Phases)

All communication between NestJS and FastAPI flows exclusively through Redis Streams. There are no direct HTTP calls between the two services at runtime.

```
Any User (any persona)
     │
     │  submits input via UI
     ▼
┌─────────────────────────────────┐
│         NestJS Backend          │
│                                 │
│  1. Authenticate & authorize    │
│  2. Persist user message to DB  │
│  3. Enqueue job to Redis Stream │
│     (with agentType field)      │
│  4. Immediately return          │
│     { jobId, status: "queued" } │
└────────────┬────────────────────┘
             │ Redis Stream (jobs)
             ▼
┌─────────────────────────────────┐
│         FastAPI AI Layer        │
│                                 │
│  1. Consume job from stream     │
│  2. Router reads agentType      │
│  3. Dispatches to correct agent │
│  4. Agent processes with        │
│     LangGraph orchestration     │
│  5. Publishes result to stream  │
└────────────┬────────────────────┘
             │ Redis Stream (results)
             ▼
┌─────────────────────────────────┐
│         NestJS Backend          │
│                                 │
│  - Consume result               │
│  - Persist agent output to DB   │
│  - Broadcast via WebSocket      │
└─────────────────────────────────┘
             │ WebSocket event
             ▼
     Client UI (role-specific panel)
```

### Job Schema (Extended for Phase 4)

```json
{
  "jobId": "uuid",
  "agentType": "requirements | planner | developer_intelligence | qa_intelligence | change_impact",
  "projectId": "string",
  "organizationId": "string",
  "userId": "string",
  "sessionId": "string",
  "userMessageId": "string",
  "type": "text | url | upload",
  "input": "string",
  "conversationHistory": [{ "role": "user | assistant", "content": "string" }],
  "upload": {
    "key": "string",
    "location": "string",
    "filename": "string",
    "contentType": "string",
    "size": 0
  },
  "attempts": 0,
  "queuedAt": "ISO timestamp"
}
```

The `agentType` field is the routing key. Every job carries it. The FastAPI router reads it and dispatches to the correct agent without any other decision logic.

---

## 5. Phase 1 — Requirement Engine

**Status: Complete**

### What It Does

Accepts raw input from the business owner (text, file, URL), interviews them through a structured clarification loop, and produces a complete, validated SRS JSON when requirements are ready.

### The Clarification Loop

```
Input received
      │
      ▼
AI analyzes content
      │
      ▼
Is input complete enough to build a full SRS?
      │
   ┌──┴──┐
  NO    YES
   │      │
   ▼      ▼
Return   Generate
clarifi- complete
cation   SRS JSON
questions
   │
   ▼
Business owner answers
   │
   ▼
Append to context → re-analyze
   │
   └──── (loop continues)
```

**Key rule:** The loop only exits when every feature has enough detail for a developer to implement it without making assumptions.

### SRS Output Schema (MCP-Ready)

```json
{
  "status": "complete",
  "project_name": "",
  "summary": "",
  "features": [
    {
      "id": "feat_001",
      "name": "",
      "description": "",
      "acceptance_criteria": [""]
    }
  ],
  "functional_requirements": [
    {
      "id": "fr_001",
      "feature_id": "feat_001",
      "description": ""
    }
  ],
  "non_functional_requirements": [
    {
      "id": "nfr_001",
      "category": "performance | security | scalability | reliability",
      "description": ""
    }
  ],
  "user_stories": [
    {
      "id": "us_001",
      "feature_id": "feat_001",
      "role": "",
      "goal": "",
      "benefit": ""
    }
  ],
  "out_of_scope": [""]
}
```

**Note:** Every item carries a stable `id` and a `feature_id` link. This traceability chain — feature → requirement → user story → task → test case → PR — is how Phase 5 MCP delivers context to coding agents step by step.

### Inputs Accepted

| Input Type  | Format              | Processing                            |
| ----------- | ------------------- | ------------------------------------- |
| Text        | Direct description  | Clean and use as-is                   |
| File — PDF  | `.pdf`              | Extracted via pypdf                   |
| File — Word | `.docx`             | Extracted via python-docx             |
| File — Text | `.txt`              | Native read                           |
| URL         | Any public web page | HTTP fetch + BeautifulSoup extraction |

---

## 6. Phase 2 — Persistence & UI

**Status: Complete**

### What It Does

Full-stack wiring of the AI layer to the NestJS backend and Next.js frontend. Every agent conversation is persisted as a session with messages. The SRS is stored as a `ProjectSpecification` record. Real-time delivery is handled via WebSocket.

### Key Deliverables

- `ProjectAiChatSession` with `agentType` field for routing
- `ProjectAiChatMessage` persisting every turn
- `ProjectSpecification` storing the completed SRS
- Redis Stream consumer/producer on NestJS side
- WebSocket gateway broadcasting `turn_completed` / `turn_failed`
- UI workspace: chat panel, SRS live panel, stage progress bar
- Persona system: `business_owner`, `developer`, `qa_engineer`, `project_manager`, `stakeholder`
- Partial SRS tracking: `draftSrs` + `draftSrsProgress` for in-progress sessions

---

## 7. Phase 3 — Vector Memory

**Status: Complete**

### What It Does

Adds pgvector-backed memory to the Requirements Agent. The agent can recall context from previous sessions, reference prior answers, and avoid asking the same clarification questions twice.

### Key Deliverables

- pgvector extension on PostgreSQL
- Embedding generation for all conversation turns
- Semantic similarity search at query time
- Memory-augmented prompts for the Requirements Agent
- Cross-session context awareness

---

## 8. Phase 4 — Multi-Agent SDLC System

**Status: Active Development**

### The Design Principle

One agent per persona. One agent per SDLC moment. Skills grow within an agent — they do not spawn new agents.

> **Rule:** If a new capability serves the same persona at the same SDLC moment, it is a skill added to the existing agent. If it serves a different persona or a different lifecycle moment, it is a new agent.

### Agent Overview

| Agent | Persona | SDLC Moment | External Tools |
| ----- | ------- | ----------- | -------------- |
| Requirements Agent | Business Owner | Before anything starts — idea to SRS | None |
| Project Planner Agent | Project Manager | SRS complete → team needs organized work | Jira, Linear, Trello |
| Developer Intelligence Agent | Developer | Implementation — architecture to merged PR | GitHub, GitLab |
| QA Intelligence Agent | QA Engineer | Before and during testing | Phase 4: none. Phase 5: TestRail, Jira |
| Change Impact Agent | Business Owner + PM | Mid-development scope change request | Jira, Linear, GitHub |

---

### Agent 1 — Requirements Agent

**Persona:** Business Owner  
**SDLC Moment:** Before development starts  
**Status:** Built (Phase 1–3)

**Purpose:** Interview the business owner through a structured clarification loop and produce a complete, validated SRS JSON that every other agent and the MCP server can consume.

**Skills:**
- Multi-format input (text, file, URL)
- Gap detection and targeted clarification questions
- Complete SRS generation with stable feature IDs
- Business owner plain-language summary
- Vector memory for cross-session context

**Output:** `ProjectSpecification` — the single source of truth for the entire project.

---

### Agent 2 — Project Planner Agent

**Persona:** Project Manager  
**SDLC Moment:** SRS is signed off → team needs an actionable work breakdown  

**Purpose:** Read the completed SRS and produce a structured, prioritized, effort-estimated task backlog. Every task is traceable back to the SRS feature that requires it. The PM never manually re-enters requirements into their project management tool — this agent pushes directly to where the team works.

**Skills:**
- SRS → task breakdown (title, description, priority, effort estimate)
- Dependency graph: which tasks must complete before others can start
- Execution ordering: the correct sequence for a coding agent to follow
- Traceability: every task carries the `feature_id` and `requirement_id` it implements
- External push: create tasks in Jira / Linear / Trello via API integration

**Output schema (MCP-ready):**
```json
{
  "tasks": [
    {
      "id": "task_001",
      "feature_id": "feat_001",
      "requirement_id": "fr_001",
      "title": "",
      "description": "",
      "priority": "critical | high | medium | low",
      "effort_estimate": "xs | s | m | l | xl",
      "depends_on": ["task_id"],
      "execution_order": 1,
      "status": "not_started"
    }
  ]
}
```

**Why execution_order matters:** Phase 5 MCP's `get_next_task()` traverses this dependency graph to always return the correct next task for a coding agent — one whose dependencies are already complete.

**External integrations:**
- Jira: create issues via Jira REST API, map priority and effort to story points
- Linear: create issues via Linear GraphQL API
- Trello: create cards via Trello REST API

---

### Agent 3 — Developer Intelligence Agent

**Persona:** Developer  
**SDLC Moment:** From first line of code to merged PR  

**Purpose:** A conversational agent that holds the entire project context — SRS, architecture decisions, task details — and answers implementation questions grounded in what was actually specified. It can also read the project's Git repository to verify that what is being built matches what was specified.

**Skills:**

*Architecture (one-shot on first access):*
- Tech stack recommendation based on SRS requirements
- System design: services, APIs, data flow
- Database schema derived from the data model in the SRS
- API contracts for every feature

*Implementation Q&A (conversational):*
- "How should I implement feature X?" — answered with reference to the SRS requirement
- "What does this non-functional requirement mean in practice?" — answered with concrete patterns
- Context window always carries the full SRS + architecture decisions

*Git integration (read-only skills):*
- Read repository structure, file diffs, commit history
- Map commits to tasks via commit message conventions or PR descriptions
- Identify which SRS requirements have been addressed in the codebase
- Analyze a PR diff and report in plain language: what was built, what is missing, whether it matches the requirement it claims to address
- Flag deviations: code that implements something not in the SRS, or skips something that is

**Architecture output schema (MCP-ready):**
```json
{
  "stack": {
    "frontend": "",
    "backend": "",
    "database": "",
    "infrastructure": ""
  },
  "services": [
    {
      "name": "",
      "responsibility": "",
      "exposes": ["endpoint"]
    }
  ],
  "database_schema": [
    {
      "table": "",
      "columns": [{ "name": "", "type": "", "constraints": "" }],
      "relations": [{ "to": "", "type": "one_to_many | many_to_many" }]
    }
  ],
  "api_contracts": [
    {
      "feature_id": "feat_001",
      "method": "GET | POST | PUT | DELETE",
      "path": "",
      "request_body": {},
      "response_body": {}
    }
  ]
}
```

**Why structured over prose:** A coding agent connecting via MCP in Phase 5 reads this schema to scaffold the project. Prose cannot be consumed programmatically.

**External integrations:**
- GitHub REST API: read repos, commits, pull requests, file diffs
- GitLab API: same capabilities for GitLab-hosted projects

---

### Agent 4 — QA Intelligence Agent

**Persona:** QA Engineer  
**SDLC Moment:** Before development starts (test planning) and during testing (coverage verification)  

**Purpose:** Read the SRS and generate test cases and acceptance criteria for every feature — before a single line of code is written. The QA engineer has a complete testing specification the moment the SRS is signed off.

**Skills:**
- Feature-by-feature test case generation (unit, integration, E2E)
- Acceptance criteria in plain language (readable by business owner and developer alike)
- Edge case detection: boundary conditions and negative scenarios the SRS implies but does not state
- Traceability: every test case linked to its `feature_id` and `requirement_id`
- Coverage gap detection: identify requirements that have no test coverage

**Output schema (MCP-ready):**
```json
{
  "test_suites": [
    {
      "feature_id": "feat_001",
      "feature_name": "",
      "acceptance_criteria": [""],
      "test_cases": [
        {
          "id": "tc_001",
          "type": "unit | integration | e2e",
          "title": "",
          "preconditions": [""],
          "steps": [""],
          "expected_result": "",
          "requirement_id": "fr_001"
        }
      ]
    }
  ]
}
```

**Output destination:** Persisted as a `Documentation` record in the platform. Downloadable as Markdown or PDF.

**Future skills (Phase 5+):**
- TestRail integration: push test cases directly into test management tool
- Jira integration: create bug report templates from failed acceptance criteria

---

### Agent 5 — Change Impact Agent

**Persona:** Business Owner + Project Manager  
**SDLC Moment:** Mid-development when a scope change is proposed  

**Purpose:** When the business owner or PM proposes a change to requirements mid-development, this agent analyzes the full impact before anyone agrees to it. It reads the existing SRS, task backlog, and codebase state, and produces a plain-language impact report that both technical and non-technical stakeholders can read.

**Skills:**
- SRS diff: what exactly changes in the specification if this request is accepted
- Task impact: which existing tasks are affected, invalidated, or require new work
- Effort re-estimation: rough additional work required
- Test impact: which test cases need to be updated or rewritten
- Code impact (if Git connected): which files or modules are likely affected
- Plain-language summary: a report that a business owner can read without technical knowledge

**Output schema:**
```json
{
  "change_summary": "",
  "srs_changes": [
    {
      "type": "modify | add | remove",
      "item_id": "feat_001 | fr_001",
      "description": ""
    }
  ],
  "affected_tasks": [
    {
      "task_id": "task_001",
      "impact": "invalidated | modified | unaffected",
      "notes": ""
    }
  ],
  "new_tasks_required": [""],
  "affected_test_cases": ["tc_001"],
  "effort_delta": "xs | s | m | l | xl",
  "recommendation": "accept | defer | reject",
  "plain_language_summary": ""
}
```

**External integrations:**
- Jira / Linear: read current task status to determine what has already been started or completed
- GitHub / GitLab: read open PRs to identify in-flight work that the change would affect

---

### Phase 4 FastAPI Project Structure

```
app/
├── api/
│   └── routes/
│       └── health.py                      ← GET /ai/health only
│
├── agents/
│   ├── requirement_agent.py               ← Phase 1–3 (existing)
│   ├── planner_agent.py                   ← Phase 4 (new)
│   ├── developer_intelligence_agent.py    ← Phase 4 (new)
│   ├── qa_intelligence_agent.py           ← Phase 4 (new)
│   └── change_impact_agent.py             ← Phase 4 (new)
│
├── queue/
│   └── worker.py                          ← Single worker, routes by agentType
│
├── services/
│   ├── requirements_processor.py          ← existing
│   ├── planner_processor.py               ← new
│   ├── developer_intelligence_processor.py← new
│   ├── qa_intelligence_processor.py       ← new
│   ├── change_impact_processor.py         ← new
│   └── upload_storage.py                  ← existing
│
├── tools/
│   ├── parser.py                          ← existing
│   ├── cleaner.py                         ← existing
│   ├── extractor.py                       ← existing
│   ├── git_reader.py                      ← new: GitHub/GitLab API read tools
│   └── pm_integrations.py                 ← new: Jira/Linear/Trello push tools
│
├── schemas/
│   ├── requirement.py                     ← existing
│   ├── planner.py                         ← new
│   ├── developer_intelligence.py          ← new
│   ├── qa_intelligence.py                 ← new
│   ├── change_impact.py                   ← new
│   └── queue.py                           ← updated with new agentType values
│
├── core/
│   ├── llm.py                             ← existing
│   ├── config.py                          ← existing
│   ├── orchestrator.py                    ← updated: LangGraph router node
│   └── graph/
│       ├── router.py                      ← LangGraph: reads agentType → routes to node
│       ├── requirement_graph.py           ← existing agent as LangGraph node
│       ├── planner_graph.py               ← new
│       ├── developer_intelligence_graph.py← new
│       ├── qa_intelligence_graph.py       ← new
│       └── change_impact_graph.py         ← new
│
└── main.py
```

### Phase 4 NestJS Changes

**New agentType values** in `ai-requirements-queue.types.ts`:
```typescript
type AgentType = 
  | "requirements" 
  | "planner" 
  | "developer_intelligence" 
  | "qa_intelligence" 
  | "change_impact"
```

**Result consumer** extended to handle each agent's output shape:
- `planner` → bulk-create `Task` records, push to external PM tool if integration configured
- `developer_intelligence` → persist architecture as `ProjectSpecification` variant or new `Architecture` entity
- `qa_intelligence` → persist as `Documentation` record
- `change_impact` → persist as `Documentation` record, notify affected task owners

**New frontend surfaces:**

| Agent | UI Location | Pattern |
| ----- | ----------- | ------- |
| Requirements | Ragnarock page, center panel | Conversational chat (existing) |
| Project Planner | Tasks page — "Generate Plan" button | One-shot → populates task board |
| Developer Intelligence | Ragnarock page, right panel (scaffolded) | Conversational chat + architecture card |
| QA Intelligence | Documentation page — "Generate Tests" button | One-shot → documentation card |
| Change Impact | Overview page — "Analyze Change" button | One-shot → impact report card |

### Phase 4 Implementation Order

Build in this sequence — each step depends on the previous:

1. **Developer Intelligence Agent** — conversational, lowest new infrastructure, panel already scaffolded, immediate value to developers. ✅ Complete.
2. **Project Planner Agent** — one-shot, output destination (Tasks) already exists, unblocks Change Impact which depends on a populated task backlog, and PM integrations (Linear) are already scaffolded in the backend.
3. **QA Intelligence Agent** — one-shot, output destination (Documentation) already exists, clear output schema. Placed after Planner because test cases reference `feature_id` and `task_id` links; a populated backlog makes QA output fully traceable end-to-end.
4. **Change Impact Agent** — depends on tasks (Planner) and test cases (QA) both being populated; reads from SRS, task backlog, and optionally the codebase — must come last.

---

## 9. Phase 5 — MCP & Autonomous Build

**Status: Planned (post Phase 4)**

### The Problem Phase 5 Solves

After Phase 4, the platform contains everything needed to build a product:
- A complete SRS with stable feature IDs
- An architecture document with database schema and API contracts
- A dependency-ordered task backlog with traceability to requirements
- Test cases for every feature

But a developer still has to read all of this and translate it into code manually. Phase 5 removes that translation step entirely.

### What MCP Is

MCP (Model Context Protocol) is an open standard that allows AI coding agents — Cursor, Claude Code, GitHub Copilot, or any MCP-compatible tool — to connect to an external context server and call tools to retrieve structured information.

This is exactly what Figma's MCP does for UI: a designer produces a design, and Cursor reads it directly to generate the code — no prompt required.

**Phase 5 does the same for the entire product:** a coding agent connects to the Ragnarock MCP server and builds the full product from specification, step by step, with zero human prompting.

### Why This Is Achievable

Figma's MCP is hard because it must convert visual designs — inherently unstructured — into code. This is lossy and imprecise.

Ragnarock's MCP is more achievable because every artifact Phase 4 produces is already structured JSON with stable IDs and explicit traceability. The MCP server is a thin read layer over data that already exists in exactly the right format. This is why Phase 4 output schemas are designed with MCP in mind from the start.

### The MCP Server Architecture

```
Cursor / Claude Code / any MCP-compatible coding agent
     │
     │  MCP protocol (tool discovery + tool calls)
     ▼
┌──────────────────────────────────────┐
│         Ragnarock MCP Server         │
│         (new thin service)           │
│                                      │
│  Exposes tools the coding agent      │
│  can discover and call:              │
│                                      │
│  get_project_srs(project_id)         │
│  get_architecture(project_id)        │
│  get_next_task(project_id)           │
│  get_task_detail(task_id)            │
│  get_test_cases(feature_id)          │
│  mark_task_complete(task_id, pr_url) │
│  get_change_impacts(project_id)      │
└──────────────┬───────────────────────┘
               │ REST API
               ▼
┌──────────────────────────────────────┐
│         NestJS Backend               │
│   (all Phase 4 data already here)    │
└──────────────────────────────────────┘
               │
               ▼
          PostgreSQL
```

The MCP server does not contain any AI logic. It is a protocol adapter — it translates MCP tool calls into NestJS API calls and returns the structured JSON that Phase 4 agents already produce.

### The Autonomous Build Flow

```
Coding agent connects to Ragnarock MCP server
     │
     ▼
get_architecture(project_id)
→ receives: stack, services, database schema, API contracts
→ coding agent scaffolds the project structure
     │
     ▼
get_next_task(project_id)
→ receives: Task 1 (execution_order: 1, no unfulfilled dependencies)
→ coding agent knows exactly what to build first
     │
     ▼
get_task_detail(task_id)
→ receives: full task description + linked SRS requirement + acceptance criteria
→ coding agent knows what "done" looks like before writing a line
     │
     ▼
get_test_cases(feature_id)
→ receives: test cases for this feature
→ coding agent writes tests before implementation (TDD)
     │
     ▼
[coding agent implements the feature]
     │
     ▼
mark_task_complete(task_id, pr_url)
→ triggers Developer Intelligence Agent PR review skill
→ returns: requirement coverage report (what was built vs. what was specified)
→ if gaps found: coding agent receives specific missing items and continues
→ if complete: task marked done, dependency graph updated
     │
     ▼
get_next_task(project_id)
→ returns next task whose dependencies are now satisfied
     │
     ▼
[repeat until all tasks complete]
     │
     ▼
Project is built. Every feature traceable to its original requirement.
```

### Zero Human Prompts

At no point in this flow does a human write a prompt. The coding agent receives all context from the platform. The platform drives the build sequence. The PR review agent validates that what was built matches what was specified.

This is the end state of the platform: **connect a coding agent and ship the product.**

### MCP Tools Specification

| Tool | Input | Output | Source |
| ---- | ----- | ------ | ------ |
| `get_project_srs` | `project_id` | Full SRS JSON | `ProjectSpecification` |
| `get_architecture` | `project_id` | Stack, schema, API contracts | `Architecture` entity |
| `get_next_task` | `project_id` | Next unblocked task with full context | `Task` + dependency graph |
| `get_task_detail` | `task_id` | Task + requirement + acceptance criteria | `Task` + `ProjectSpecification` |
| `get_test_cases` | `feature_id` | All test cases for the feature | `Documentation` (QA output) |
| `mark_task_complete` | `task_id`, `pr_url` | PR review result + requirement coverage | Developer Intelligence Agent |
| `get_change_impacts` | `project_id` | All pending change impact reports | `Documentation` (Change Impact output) |

### What Phase 4 Must Get Right for Phase 5 to Work

These four things must be built correctly in Phase 4 for Phase 5 to be a thin layer rather than a full rebuild:

1. **Stable feature IDs across all agents.** The `feature_id` from the SRS must propagate unchanged through tasks, test cases, and architecture. If IDs drift, `get_task_detail` cannot join across them.

2. **Structured JSON over prose everywhere.** Architecture documents, impact reports, and test cases must be typed schemas. Any agent that returns markdown prose cannot be consumed by a coding agent.

3. **Task dependency graph with execution ordering.** The Project Planner Agent must produce a valid dependency graph. `get_next_task` is only useful if the ordering is correct.

4. **Task state machine.** Tasks must have explicit states: `not_started → in_progress → pr_raised → reviewed → complete`. The MCP server cannot track build progress without it.

### Phase 5 Implementation Plan

1. **Design MCP server** — define all tool signatures and map them to NestJS endpoints
2. **Build MCP server** — implement as a standalone service using the MCP SDK; no AI logic inside
3. **Validate tool outputs** — each tool's output must be fully consumable by a coding agent without additional context
4. **Test with Claude Code** — connect Claude Code (via MCP) to a test project and verify it can complete a feature end-to-end
5. **Test with Cursor** — validate cross-agent-tool compatibility
6. **PR review integration** — wire `mark_task_complete` to trigger Developer Intelligence Agent and return result synchronously to the calling coding agent

---

## 10. Inputs the System Accepts

| Input Type  | Format                  | How It's Processed                       | Used By |
| ----------- | ----------------------- | ---------------------------------------- | ------- |
| Text        | Direct chat/description | Used as-is after cleaning                | All agents |
| File — PDF  | `.pdf`                  | Extracted via pypdf                      | Requirements, Change Impact |
| File — Word | `.docx`                 | Extracted via python-docx                | Requirements, Change Impact |
| File — Text | `.txt`                  | Native read                              | Requirements, Change Impact |
| URL         | Any public web page     | HTTP fetch + BeautifulSoup HTML cleaning | Requirements |
| SRS JSON    | Internal                | Passed directly from DB                  | Planner, Dev Intelligence, QA, Change Impact |
| Git repo    | GitHub / GitLab URL     | Read via API (read-only)                 | Developer Intelligence, Change Impact |

---

## 11. The Communication Layer (Redis Streams)

### Stream: Jobs (NestJS → FastAPI)

**Stream key:** `stream:ai:jobs`

One stream for all agents. The `agentType` field routes each job to the correct processor.

### Stream: Results (FastAPI → NestJS)

**Stream key:** `stream:ai:results`

FastAPI publishes a result after each job. NestJS consumes and dispatches based on `agentType` in the result.

### Dead Letter Queue

**Stream key:** `stream:ai:jobs:dlq`

Jobs that fail after maximum retries (5) are moved here for inspection.

### FastAPI Exposed Endpoints

FastAPI exposes only one HTTP endpoint, used for infrastructure health checks:

```
GET /ai/health
```

```json
{ "status": "ok", "agents": ["requirements", "planner", "developer_intelligence", "qa_intelligence", "change_impact"] }
```

---

## 12. Technical Architecture

### Stack

| Layer                     | Technology                        |
| ------------------------- | --------------------------------- |
| AI Service                | FastAPI + Uvicorn                 |
| Agent Orchestration       | LangGraph                         |
| LLM                       | Claude API (Anthropic)            |
| Schema Validation         | Pydantic                          |
| File Parsing              | pypdf, python-docx                |
| URL Parsing               | BeautifulSoup4, httpx             |
| Git Integration           | PyGitHub, python-gitlab           |
| PM Integrations           | jira, linear-sdk, py-trello       |
| Business Logic            | NestJS                            |
| Database                  | PostgreSQL via Prisma             |
| Vector Memory             | pgvector                          |
| Async Transport           | Redis Streams                     |
| Real-time Client Delivery | Socket.IO (WebSocket)             |
| MCP Server (Phase 5)      | MCP SDK (TypeScript or Python)    |
| Containerization          | Docker                            |

### LLM Configuration

| Setting          | Value                         | Reason                                                |
| ---------------- | ----------------------------- | ----------------------------------------------------- |
| Temperature      | 0.2 – 0.4                     | Deterministic, consistent outputs — not creative      |
| Output format    | JSON mode / structured output | No free-text responses from agents                    |
| Validation       | Pydantic on every response    | Malformed outputs are rejected and retried            |
| Retry on failure | Yes                           | LLM invalid output triggers one retry before fallback |

---

## 13. Security

| Concern             | Approach                                                                           |
| ------------------- | ---------------------------------------------------------------------------------- |
| File uploads        | Validate file type and size at NestJS before enqueueing                            |
| Input sanitization  | Strip scripts, executable content, and injections in FastAPI tools                 |
| LLM API key         | Environment variable, never in code                                                |
| File size limit     | Enforced at NestJS layer (15 MB limit) before the job reaches FastAPI              |
| Empty input         | Rejected by processor before reaching the agent                                    |
| Inter-service trust | Services communicate only via Redis, not exposed HTTP                              |
| Redis access        | Redis instance is internal to the Docker network, not exposed externally           |
| Git integration     | Read-only token scopes only. No write access granted to any repository             |
| PM integrations     | OAuth tokens stored encrypted. Scoped to create/read only                         |
| MCP server          | Authenticated via project API key. No unauthenticated tool calls accepted          |

---

## 14. Error Handling

| Error Case                   | Where Handled        | Behavior                                                                      |
| ---------------------------- | -------------------- | ----------------------------------------------------------------------------- |
| Empty or blank input         | NestJS controller    | Reject before enqueueing; 400 returned immediately                            |
| Invalid file type            | NestJS controller    | Reject before enqueueing; 400 returned immediately                            |
| File too large               | NestJS (Multer)      | Reject before enqueueing; 413 returned immediately                            |
| Invalid job payload          | FastAPI worker       | Move to DLQ immediately, publish failed result                                |
| URL unreachable              | FastAPI processor    | Job fails, retried up to 5 times, then failed result published                |
| LLM returns malformed JSON   | FastAPI orchestrator | Retry LLM call once; on second failure the job fails and is retried by worker |
| Max retries exceeded         | FastAPI worker       | Publish failed result to results stream, move job to DLQ                      |
| NestJS result consumer error | NestJS consumer      | Log error; WebSocket event not emitted for that turn                          |
| Git API rate limit           | FastAPI git_reader   | Exponential backoff, surface error to user if unresolvable                    |
| PM integration auth failure  | FastAPI pm_integrations | Surface actionable error: re-authenticate integration in settings           |

---

## 15. Success Criteria by Phase

### Phase 4 Complete When

| Criteria | Verification |
| -------- | ------------ |
| All five agents process jobs via the shared worker routing by `agentType` | Integration test with each agent type |
| Project Planner produces a dependency-ordered task backlog with feature traceability | Inspect task output, verify `feature_id` links |
| Developer Intelligence answers implementation questions grounded in the SRS | Manual QA conversation test |
| Developer Intelligence reads a GitHub repo and reports PR coverage in plain language | Test with a real PR against a real SRS |
| QA Intelligence produces test cases linked to feature IDs | Verify schema compliance |
| Change Impact Agent produces a full impact report for a proposed change | Test with a mid-project change scenario |
| All output schemas carry stable IDs for Phase 5 MCP readiness | Schema audit against MCP tool signatures |
| External integrations (Jira/Linear, GitHub/GitLab) work with valid credentials | Integration test with real accounts |

### Phase 5 Complete When

| Criteria | Verification |
| -------- | ------------ |
| MCP server exposes all seven tools and they are discoverable | MCP tool listing via Claude Code or Cursor |
| `get_next_task` returns tasks in correct dependency order | Test with a project that has task dependencies |
| `mark_task_complete` triggers PR review and returns structured result | End-to-end test with a real PR |
| Claude Code can scaffold a project from `get_architecture` alone | Manual test: connect, call tool, verify scaffold |
| Claude Code can complete one full feature end-to-end with zero human prompts | Full autonomous build test on a simple project |

---

## 16. Key Design Principles (Non-Negotiable)

These apply to every line of code written in this project:

1. **Strict schema-driven outputs.** Agents never return free text. Every output is a validated JSON schema with stable IDs. If the LLM produces malformed output, it is rejected — not passed through.

2. **One agent per persona.** Each agent serves exactly one role in the SDLC. New capabilities are skills within an existing agent — not new agents.

3. **Clean separation of concerns.** NestJS manages business logic, auth, and persistence. FastAPI manages AI. The MCP server manages protocol translation. No layer does another layer's job.

4. **Traceability as a first-class concern.** Every artifact — task, test case, architecture decision — carries the `feature_id` and `requirement_id` it traces back to. This chain makes Phase 5 MCP possible.

5. **MCP-readiness from Phase 4.** Every agent output schema is designed to be consumed by a coding agent, not just displayed in a UI. Structured JSON. Stable IDs. Explicit ordering. No prose where a schema will do.

6. **Deterministic AI behavior.** Low temperature. Structured prompts. Predictable outputs. The system must behave consistently given the same input.

7. **Read-only external integrations.** Git access is read-only. PM integrations create and read — never modify or delete existing work without explicit user action.

8. **Incremental evolution.** Each phase delivers standalone value. Phase 5 does not require Phase 4 to be fully complete — it can start as Phase 4 agents stabilize.

---

## 17. Glossary

| Term | Definition |
| ---- | ---------- |
| SRS | Software Requirements Specification — the structured document describing what the system must do |
| Feature ID | A stable identifier (`feat_001`) assigned to each SRS feature and carried through every downstream artifact |
| Clarification Loop | The iterative process of asking the business owner questions until requirements are complete |
| Requirements Agent | The AI agent responsible for interviewing the business owner and generating the SRS |
| Project Planner Agent | The AI agent that converts the SRS into an ordered, traceable task backlog |
| Developer Intelligence Agent | The AI agent that answers implementation questions and analyzes code against the SRS |
| QA Intelligence Agent | The AI agent that generates test cases and acceptance criteria from the SRS |
| Change Impact Agent | The AI agent that analyzes the impact of a proposed scope change across the full project |
| LangGraph | Python framework for building stateful multi-agent workflows as directed graphs |
| MCP | Model Context Protocol — an open standard for exposing structured context to AI coding agents |
| MCP Server | A thin service that exposes platform data as MCP tools, consumable by coding agents |
| Execution Order | The dependency-respecting sequence in which a coding agent should build tasks |
| Autonomous Build | A coding agent completing features from specification to merged PR with zero human prompting |
| NestJS | The business logic backend responsible for auth, project management, data persistence, and WebSocket delivery |
| FastAPI | The AI service layer responsible for all agent processing |
| Pydantic | Python library used to validate that LLM outputs conform to the required schema |
| Redis Stream | An append-only log used as the async message transport between NestJS and FastAPI |
| Consumer Group | A Redis Streams mechanism that allows multiple workers to share processing without duplicating work |
| Dead Letter Queue (DLQ) | A separate Redis Stream where jobs are moved after exhausting all retry attempts |
| WebSocket | Persistent connection between the client browser and NestJS for real-time AI result delivery |
| pgvector | PostgreSQL extension for vector embeddings used in the Phase 3 memory layer |

---

_This document is the authoritative reference for all platform development. Any feature, endpoint, agent, or behavior not described here is out of scope until explicitly added._
