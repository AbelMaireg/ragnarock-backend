# Ragnarock — AI-Powered SDLC Automation Platform

**Version:** 1.0
**Date:** 2026-06-03
**Status:** Active Development — Phase 4 Complete

---

## 1. Title & Project Overview

Ragnarock is a full-stack, AI-powered Software Development Lifecycle (SDLC) automation platform. It bridges the gap between a business idea and working software by assigning a dedicated AI agent to every role in the development process — business owner, project manager, developer, and QA engineer — and keeping all of them aligned to the same source of truth from the first conversation to the final pull request.

The platform operates across five phases: requirement elicitation, project planning, developer assistance, quality assurance, and autonomous machine-driven builds via the Model Context Protocol (MCP). Every artifact the system produces — requirements, tasks, test cases, architecture documents — carries a stable identifier and a traceable link back to the original business intent. This traceability chain is what enables the platform's most advanced capability: connecting an external AI coding agent such as Claude Code or Cursor and having it build the entire product from specification, autonomously, with zero human prompting.

---

## 2. Problem Statement

### 2.1 The Business Side — Requirements That Never Become Reality

Every software project begins with an idea. That idea lives in someone's head, gets described informally in a meeting or a chat message, and then gets handed to an engineering team that has never built exactly this thing before. What happens next is almost always the same:

- The business owner describes what they want in natural language — rich in intent, empty in technical detail.
- Developers fill in every gap themselves, making hundreds of silent assumptions.
- The product ships. The business owner reviews it and says: *"This is not what I meant."*
- Rework begins. Deadlines slip. Budgets overrun. Trust breaks down.

This cycle is not caused by incompetent developers or unclear business owners. It is caused by the complete absence of a structured process that forces requirements to be complete before development begins. There is no gatekeeper. There is no system that asks every necessary question and refuses to hand off until every answer is documented.

The consequences are measurable and severe:

| Symptom | Root Cause |
|---|---|
| Wrong features get built | Requirements were interpreted, not specified |
| Development stops mid-sprint waiting for answers | Gaps were never detected before coding started |
| Verbal clarifications get forgotten | There was no system to capture and persist them |
| Scope changes cascade silently | No traceability from requirement to code |
| Product delivered does not match intent | No validation gate between idea and implementation |

### 2.2 The Developer Side — Context That Doesn't Exist

When a developer picks up a task, they typically receive a ticket with a title and a few sentences of description. What they do not receive is:

- Why this feature exists and what business problem it solves
- What the complete data model looks like and how this feature fits into it
- What the API contracts are for every endpoint this feature requires
- What the non-functional requirements are — performance targets, security constraints, scalability expectations
- Which other features depend on decisions made here

Before writing the first line of code, a developer must reconstruct this entire context by reading old tickets, asking colleagues, digging through documents in different tools, and making educated guesses about everything that is not explicitly stated. This is not engineering — it is archaeology. It is slow, error-prone, and scales poorly.

The additional problem developers face in the current era of AI-assisted development is even more acute: when using AI coding assistants like Cursor or Claude Code, the context has to be assembled and pasted manually as a prompt. There is no standard format for this. Every developer invents their own approach. The result is that the quality of AI-generated code is directly bounded by the quality of the prompt, which is directly bounded by how much context the developer could find and organize before asking. Most of the time, the prompt is incomplete, and the generated code reflects that.

### 2.3 The QA Side — Testing That Starts Too Late

In the vast majority of projects, test cases are written after the feature is implemented — or not written at all. The reason is that the specification required to write meaningful test cases does not exist in a machine-readable form until after the software is already built. By the time someone thinks about testing, the code exists, the acceptance criteria are still ambiguous, and the team is already behind schedule.

The consequences:

- Test cases cover what the code does, not what it was supposed to do.
- Edge cases and boundary conditions are discovered in production, not in a test suite.
- Acceptance criteria are interpreted differently by the developer who built the feature and the QA engineer testing it.
- There is no structured document that a business owner can read to understand whether what was built matches what they asked for.

### 2.4 The Project Management Side — Plans That Break Immediately

Converting a requirements document into a task backlog is mechanical, time-consuming, and almost universally done poorly. A project manager reads the SRS, writes tickets by hand, estimates effort by intuition, and assembles a backlog that has no structural relationship to the specification it came from. The moment a requirement changes, nobody knows which tasks are affected unless they read everything again.

The deeper problem is ordering. Most task backlogs are flat lists. They do not encode the dependencies between tasks — which means a developer will frequently pick up a task whose prerequisites are not yet complete, get blocked, and switch to something else. The backlog is nominally organized but functionally chaotic.

### 2.5 The Cross-Tool Fragmentation Problem

A typical software team uses between five and fifteen different tools: a requirements document in Notion or Confluence, tasks in Jira or Linear, code in GitHub or GitLab, test cases in TestRail or a spreadsheet, architecture diagrams in Miro or Lucidchart, and communication in Slack or email. None of these tools talk to each other. Context lives in each tool in a different format. Keeping them aligned is a full-time manual job that nobody actually does.

When a requirement changes, someone has to manually update the ticket, notify the developer, update the test case, and flag the architecture decision. In practice, this synchronization never happens completely. Work proceeds on stale context. Misalignment compounds.

### 2.6 The Emerging Problem — AI Coding Agents Need Structured Context

AI coding agents have arrived. Cursor, Claude Code, GitHub Copilot, and similar tools can write production-quality code when given sufficient context. But the bottleneck has shifted: the limiting factor is no longer whether the AI can write the code — it is whether the team can provide the context the AI needs to write the right code.

Currently, feeding context to a coding agent is an entirely manual, informal process. A developer copies requirements into a prompt, pastes in some architecture notes, describes the expected behavior, and hopes the AI produces something useful. This process:

- Does not scale beyond a single developer's personal workflow
- Produces inconsistent results across a team because every developer prompts differently
- Has no connection to the validated specification — it works from whatever the developer remembered to include
- Cannot drive an autonomous build because there is no structured feed of "what to build next"

No existing tool solves this. Requirements tools produce prose documents. Project management tools produce flat ticket lists. Neither is structured, ordered, and machine-readable in a way that a coding agent can consume programmatically to drive an entire build from start to finish.

---

## 3. Objectives & Goals

### 3.1 Primary Objectives

**O1 — Eliminate requirement ambiguity before development begins.**
Every project that uses this platform must pass through a structured AI-driven clarification process that refuses to generate a specification until every feature has enough detail for a developer to implement it without assumptions. The output is a validated, schema-compliant SRS with stable feature identifiers.

**O2 — Give every project role an AI agent that speaks their language.**
A business owner does not need to understand software architecture. A developer does not need to understand business strategy. Each persona — business owner, project manager, developer, QA engineer — has a dedicated agent that operates at their level, at the exact moment in the lifecycle where they need help.

**O3 — Make every artifact traceable from requirement to delivered code.**
Every task carries the feature ID it implements. Every test case carries the requirement ID it validates. Every architecture decision references the SRS requirement that motivated it. This chain of traceability is what allows the platform to answer the question every stakeholder always asks but can never answer today: *"Did we build what we specified?"*

**O4 — Connect AI coding agents to the platform as first-class consumers.**
The MCP server exposes all platform data as structured tools that any MCP-compatible coding agent can call. The goal is an autonomous build loop: the agent reads the architecture, picks up the next task in dependency order, retrieves the test cases, writes the code, and marks the task complete — without a human writing a single prompt.

**O5 — Replace cross-tool fragmentation with a single source of truth.**
Requirements, tasks, test cases, architecture documents, team members, and external integrations (Linear, GitHub) all live in one platform, all linked to the same project, all accessible through a consistent API.

### 3.2 Design Goals

- **Strict schema-driven outputs.** AI agents never return free text. Every output is a validated JSON schema with stable identifiers. Malformed outputs are rejected and retried — not passed through to the user.
- **One agent per persona.** Each agent serves exactly one role. New capabilities are skills within an agent — not additional agents.
- **Deterministic AI behavior.** Low temperature (0.2–0.4). Structured prompts. Consistent outputs given consistent input.
- **MCP-readiness from day one.** Every agent output schema is designed to be consumed programmatically by a coding agent, not just displayed in a UI.
- **Read-only external integrations where possible.** Git access is read-only. No external write operations without explicit user action.

---

## 4. System Architecture & Tech Stack

### 4.1 Architectural Overview

The platform is composed of three independent services that communicate exclusively through Redis Streams at runtime. No service calls another directly over HTTP during job processing.

```
Client (Next.js)
      │
      │  REST + WebSocket
      ▼
┌─────────────────────────────────────────┐
│              NestJS Backend             │
│  Auth · Projects · Tasks · Requirements │
│  Docs · Members · Activity · Skills     │
│  Linear Sync · GitHub · MCP Server      │
│                                         │
│  ① Validate & persist user input        │
│  ② Publish job to Redis Stream          │
│  ③ Consume results from Redis Stream    │
│  ④ Persist output & broadcast WebSocket │
└──────────────┬──────────────────────────┘
               │  Redis Streams
               ▼
┌─────────────────────────────────────────┐
│           FastAPI AI Layer              │
│  Requirements · Planner · Dev Intel     │
│  QA Intelligence · Ragnarock Chat       │
│                                         │
│  ① Consume job from stream              │
│  ② Route by agentType                   │
│  ③ Process with LangGraph + Claude API  │
│  ④ Publish result to results stream     │
└─────────────────────────────────────────┘
               │
               ▼
        PostgreSQL + pgvector
```

**Why Redis Streams?** Decoupling NestJS from FastAPI means the AI layer can be scaled, restarted, or replaced independently. Jobs are durable — a FastAPI restart does not lose in-flight work. Multiple workers can consume from the same stream using consumer groups.

### 4.2 MCP Server Architecture

The MCP server is a standalone service embedded in the NestJS application that exposes project data as tools consumable by Claude Code, Cursor, or any MCP-compatible coding agent.

```
Claude Code / Cursor / any MCP client
      │  MCP protocol (tool discovery + tool calls)
      ▼
┌─────────────────────────────────────────┐
│            MCP Server (NestJS)          │
│  get_srs · get_features · get_next_task │
│  get_task_detail · get_test_cases       │
│  mark_task_complete · get_arch_docs     │
└──────────────┬──────────────────────────┘
               │  Internal API calls
               ▼
        NestJS Backend + PostgreSQL
```

Authentication is enforced on every tool call via SHA-256-hashed project API keys. There is no unauthenticated access.

### 4.3 Data Model Traceability Chain

Every artifact carries a stable identifier that links it back to the original requirement:

```
ProjectSpecification (SRS)
  └── ProjectFeature        [externalId: "feat_001"]
        ├── ProjectRequirement  [externalId: "fr_001", featureId]
        ├── ProjectTask         [featureId]
        └── ProjectTestCase     [externalId: "tc_001", featureId]
                                     │
                              ProjectDocumentation
                              (architecture, QA reports)
```

This chain makes `get_next_task` meaningful: it can return a task, its linked requirement, its acceptance criteria, and its test cases — all from a single tool call.

### 4.4 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 15, React 19, TypeScript | Server-rendered UI, real-time updates |
| Styling | Tailwind CSS, shadcn/ui | Design system |
| State | TanStack Query | Server state, caching, optimistic updates |
| Backend | NestJS, TypeScript | Business logic, auth, persistence, WebSocket |
| ORM | Prisma | Type-safe database access |
| Database | PostgreSQL + pgvector | Relational data + vector embeddings for semantic memory |
| Auth | Better Auth | Session management, OAuth, 2FA, organization/team support |
| AI Agents | Python, FastAPI, Pydantic | Agent processing, schema validation |
| LLM | Claude API (Anthropic) | All AI reasoning and generation |
| Agent Orchestration | LangGraph | Stateful multi-step agent workflows |
| Async Transport | Redis Streams | Durable decoupled job queue |
| Real-time | Socket.IO (WebSocket) | Live AI response delivery to browser |
| GitHub Integration | Octokit REST | Repository browsing, commits, PRs, issues |
| Linear Integration | Linear GraphQL API | Bi-directional task sync |
| MCP | Model Context Protocol SDK | Coding agent tool interface |
| Containerization | Docker Compose | Multi-service local and staging deployment |

---

## 5. Core Modules & Features

### 5.1 Requirement Engine — AI-Driven SRS Generation

**The problem it solves:** Business owners cannot write complete software specifications. They describe intent informally. Developers cannot build from informal intent.

**What it does:** The Requirement Agent conducts a structured interview with the business owner. It analyzes their input — text, uploaded PDF, Word document, or any public URL — identifies every gap, and generates targeted clarification questions. It does not stop asking until every feature has enough detail for a developer to implement it without making an assumption. When requirements are complete, it generates a schema-compliant SRS with stable feature identifiers.

**Input formats:** Direct text, `.pdf`, `.docx`, `.txt`, and any public URL (fetched and cleaned automatically).

**SRS structure:** Nine sections generated in four dependency tiers — project summary and features first, then functional requirements, then user stories and acceptance criteria, then non-functional requirements and out-of-scope boundaries.

**Vector memory:** All conversation history and prior SRS drafts are stored as embeddings in pgvector. When a business owner returns to a project, the agent retrieves relevant prior context and never asks the same question twice.

**Shared draft:** A single `draftSrs` object is shared across all chat sessions in a project. Every turn updates it. Progress is tracked as a percentage (0–100%). Any team member can continue a session from where another left off.

**Output:** A `ProjectSpecification` record — the single source of truth that every other agent reads from.

---

### 5.2 Project Planner Agent — SRS to Dependency-Ordered Task Backlog

**The problem it solves:** Converting a specification into an actionable, correctly-ordered task backlog is time-consuming and consistently done poorly. Most backlogs are flat lists with no dependency structure. Developers pick up tasks out of order, get blocked, and context-switch. Project managers re-estimate by hand when requirements change.

**What it does:** The Planner Agent reads the completed SRS and generates a structured task backlog in a single operation. Every task carries the feature ID and requirement ID it implements. Tasks are assigned to SDLC phases (discovery, planning, build, test, release), prioritized (critical/high/medium/low), estimated (xs/s/m/l/xl), and placed in a dependency-respecting execution order. No task appears before its prerequisites.

**Output fields per task:** title, description, phase, priority, effort estimate, `featureId`, `requirementId`, `dependsOn` (list of prerequisite task IDs), `executionOrder` (globally unique integer).

**Why execution order matters:** The MCP server's `get_next_task` tool traverses this dependency graph. A coding agent always receives the correct next task — the one whose prerequisites are complete and which unblocks the most subsequent work.

**Linear integration:** If the project has a connected Linear workspace, tasks are pushed directly to Linear as issues after generation. The mapping is bi-directional: status changes in Linear propagate back to Ragnarock, and vice versa.

---

### 5.3 Developer Intelligence Agent — Grounded Implementation Assistance

**The problem it solves:** Developers working from incomplete context make assumptions. Developers using AI coding assistants feed incomplete prompts and get incomplete code. There is no system that knows the entire specification and can answer implementation questions grounded in what was actually agreed upon.

**What it does:** The Developer Intelligence Agent is a conversational agent that holds the complete project context — SRS, architecture decisions, task details — and answers implementation questions with direct references to specific SRS features and requirements. It flags when a question touches on something not specified. It suggests follow-up questions when a developer's framing implies a gap.

**Grounded answers:** Every response includes references to the specific SRS items it is drawing from, so developers can see whether they are working from the specification or from the agent's inference.

**Architecture document generation:** On demand, the agent generates structured architecture documents — System Architecture Document (SAD), High-Level Design (HLD), Low-Level Design (LLD), and Architecture Decision Records (ADR). These are stored as versioned `ProjectDocumentation` records and are also made available to the MCP server for coding agents to consume during scaffolding.

**For AI coding agents:** The architecture output — stack recommendation, service decomposition, database schema, API contracts — is a structured JSON schema, not prose. A coding agent consuming it via MCP can scaffold the entire project structure from this single document.

---

### 5.4 QA Intelligence Agent — Pre-Implementation Test Suites

**The problem it solves:** Test cases are written after the feature is built, based on what the code does rather than what it was supposed to do. Edge cases are discovered in production. Acceptance criteria are interpreted inconsistently. There is no testable specification that a business owner can read.

**What it does:** The QA Intelligence Agent reads the completed SRS and generates a comprehensive test suite for every feature before a single line of code is written. Each feature gets acceptance criteria in plain language (readable by the business owner and the developer), and a set of test cases covering happy paths, edge cases, boundary conditions, and negative scenarios.

**Test case structure:** Each test case carries a stable identifier (`tc_001`, `tc_002`...), a type (unit/integration/e2e), preconditions, step-by-step instructions, the expected result, and a link to the `featureId` and `requirementId` it validates. Every SRS feature gets at least one happy-path end-to-end test.

**Integration context:** If architecture documents exist for the project, the agent uses them to name real endpoints and services in the test steps — not generic placeholders.

**Output:** Test suites are stored as `ProjectDocumentation` records and exposed via the MCP server's `get_test_cases` tool, enabling a coding agent to write tests before implementation (TDD).

**Traceability:** The link from `tc_001` → `fr_001` → `feat_001` → `ProjectTask` means a QA engineer — or a coding agent — can always answer: *"Which requirements have test coverage? Which do not?"*

---

### 5.5 Ragnarock Chat — Project-Aware AI Assistant

**The problem it solves:** Teams have questions about their project constantly — about requirements, about tasks, about what has been done and what has not. The answers exist somewhere across multiple tools, but retrieving them requires context-switching and searching. New team members spend days ramping up on project state.

**What it does:** Ragnarock Chat is a conversational assistant that has a complete snapshot of the project — metadata, team composition, task status breakdown, recent documentation, and activity log. It answers questions in the context of the actual project state, not generic knowledge.

**Intent detection:** Beyond answering questions, Ragnarock Chat detects when a user's message implies they want to trigger a platform action — start a requirements session, generate a task plan, generate architecture documents. It surfaces the detected intent and confirms with the user before acting, so the assistant is both informational and actionable without requiring the user to navigate to a specific page.

---

### 5.6 Task Management — Full SDLC Lifecycle Board

**The problem it solves:** Task boards exist in isolation from the specification that generated the tasks. There is no connection between what a developer is working on and why it exists in the specification. Re-prioritization is manual and context-free.

**What it does:** A full task management system with seven statuses (backlog → todo → in progress → reviewing → reviewed → done → cancelled), four priority levels, five SDLC phases, per-task assignees, start and due dates, and custom sort ordering within status columns. Every task can optionally carry a `featureId` linking it to the SRS feature it implements.

**Linear sync:** Any project can be linked to a Linear team and project. Tasks can be imported from Linear, exported to Linear, or kept in continuous bi-directional sync with configurable status mappings. Sync runs are logged with full audit trails including counts, errors, and timestamps.

---

### 5.7 Documentation System — 20 Document Types with AI Generation

**The problem it solves:** Architecture documents, design specifications, test plans, and operational guides live in different tools in different formats. They go stale immediately after they are written because there is no connection between the document and the evolving specification.

**What it does:** A versioned document management system supporting 20 document types — BRD, PRD, FRD, SRS, SRD, TRD, SAD, ADR, HLD, LLD, ICD, DBD, API documentation, STP, STD, RTM, User Guide, Operations Manual, WBS, and RACI. Documents can be created manually or generated by AI agents. Each document carries a version number, status (draft/pending review/completed/rejected), generation mode, and the source agent key if AI-generated.

---

### 5.8 Repository Integration — GitHub Connected to the Specification

**The problem it solves:** Code lives in GitHub. Specifications live somewhere else. There is no way to look at a pull request and answer the question: *"Does this code implement the requirement it claims to address?"*

**What it does:** Any GitHub repository can be linked to a project. From within the platform, team members can browse the repository's directory structure, view file contents, paginate through commit history, see top contributors, and review open and closed pull requests and issues — all without leaving the project workspace. Repository metadata is cached with a TTL to avoid GitHub API rate limits.

**For coding agents:** The repository integration provides the read-only access the Developer Intelligence Agent needs to analyze code against the specification. In the MCP flow, `mark_task_complete` with a PR URL triggers a coverage analysis that returns exactly which requirements the PR addresses and which are still missing.

---

### 5.9 Skills / Knowledge Base — Project-Specific Institutional Memory

**The problem it solves:** Every project accumulates decisions, conventions, gotchas, and lessons learned that live in no one's head consistently. New team members cannot find this knowledge. It gets repeated from memory in meetings and Slack threads and then lost again.

**What it does:** A markdown-based knowledge base scoped to each project. Each skill has a title, URL slug, summary, and full markdown body. Skills are exportable as Markdown or plain text. They serve as the institutional memory layer for the project — architectural decisions that did not make it into a formal ADR, naming conventions, integration-specific notes, and anything else the team needs to know.

---

### 5.10 MCP Server — Coding Agents as First-Class Consumers

**The problem it solves:** AI coding agents can write production-quality code when given sufficient, structured context. That context does not exist in any standard machine-readable form today. Every developer assembles it manually as a prompt, inconsistently, incompletely, and without any connection to the validated specification.

**What it does:** The MCP server exposes all platform data as structured tools that any MCP-compatible coding agent (Claude Code, Cursor, or any tool implementing the Model Context Protocol) can discover and call. Authentication is enforced via project API keys on every call.

| Tool | What It Returns |
|---|---|
| `get_srs` | Full SRS with all nine sections and stable feature IDs |
| `get_features` | All SRS features with task and test case counts |
| `get_next_task` | The highest-priority task whose dependencies are satisfied, with its linked requirement and acceptance criteria |
| `get_task_detail` | Full task context — description, phase, priority, linked SRS requirement, acceptance criteria |
| `get_test_cases` | All test cases for a given feature, with steps, preconditions, and expected results |
| `mark_task_complete` | Mark a task done (optionally with a PR URL), return the next unblocked task |
| `get_architecture_docs` | SAD, HLD, LLD documents — stack, service decomposition, database schema, API contracts |

**The autonomous build loop:** A coding agent connects to the MCP server, calls `get_architecture_docs` to scaffold the project, calls `get_next_task` to know what to build first, calls `get_test_cases` to write tests before implementation, implements the feature, calls `mark_task_complete` with the PR URL, and receives the next task. This loop continues until all tasks are complete. No human writes a single prompt.

---

### 5.11 Team & Organization Management

**Multi-tenant organization model:** Every user belongs to one or more organizations. Every project belongs to an organization. Project membership is independent of organization membership — a team member can be added to a specific project without being added to the entire organization.

**Roles:** Organization-level roles (owner, admin, member) and project-level roles (owner, admin, member, viewer) are enforced independently. Every API endpoint is guarded by both organization membership and project membership checks.

**Personas:** Each project member carries one or more personas — business owner, developer, QA engineer, project manager, stakeholder. Personas determine which AI agents and UI surfaces are most relevant to them, and they are surfaced in the project overview for context.

**Invitations:** Members are invited by email. Invitations carry an expiry date and a target role. The invitation flow works independently of whether the invitee already has an account.

---

### 5.12 Activity Audit Log

Every meaningful action in the platform — task created, requirement updated, AI session started, document generated, Linear sync completed — is written to a `ProjectActivity` record with the actor, action type, entity type, entity ID, and a metadata JSON payload. The audit log is paginated and filterable by entity type and action. Teams can always answer: *"Who changed this, and when?"*

---

## 6. Significance & Conclusion

### 6.1 What This Platform Replaces

Before Ragnarock, a software team needed at minimum five separate tools and one full-time coordination role to manage what this platform does in one workspace:

| What teams used to need | What Ragnarock replaces it with |
|---|---|
| Notion / Confluence for requirements | AI-driven SRS generation with structured clarification |
| Jira / Linear for task management | Planner agent + automatic backlog with dependency ordering |
| TestRail / spreadsheets for test cases | QA Intelligence Agent generating test suites before implementation |
| Lucidchart / Miro for architecture | Developer Intelligence Agent generating SAD, HLD, LLD, ADR on demand |
| Manual context assembly for AI coding tools | MCP server exposing all structured context as callable tools |
| Email / Slack for cross-role alignment | Single source of truth accessible to every role through its own agent |

### 6.2 The Compounding Effect of Traceability

The platform's most significant technical decision — assigning stable identifiers to every artifact and linking every downstream artifact to the upstream requirement — produces a compounding return. Each phase that uses the platform is more valuable than it would be alone because every artifact it produces connects back to the same specification:

- A task is not just a ticket — it is a traceable implementation of a specific requirement.
- A test case is not just a test — it is a verifiable validation of a specific acceptance criterion.
- A PR is not just code — it can be evaluated against the exact requirement it claims to implement.
- A change request is not just a new idea — its impact on tasks, test cases, and code can be computed before anyone agrees to it.

This is what makes the autonomous build loop possible. Without stable IDs and explicit traceability, the MCP server would be a collection of disconnected lookups. With them, it is a structured feed that a coding agent can traverse step by step to build an entire product from specification.

### 6.3 What This Means for the Industry

Software development has been a human coordination problem for decades. The industry has addressed it with better tools, better methodologies, and better frameworks — all of which require skilled human operators to work. Ragnarock takes a different approach: it addresses the coordination problem with AI agents that understand each role's context and automate the work each role currently does manually.

The implications extend beyond a single team:

**For startups:** A two-person team can operate with the process discipline of a fifty-person organization. The AI agents do the work of the roles they do not yet have.

**For enterprises:** The traceability chain from requirement to delivered code becomes an auditable record. Compliance, impact analysis, and onboarding all improve when every artifact is linked.

**For the AI coding agent ecosystem:** The platform establishes the data contract that coding agents have been missing. Cursor and Claude Code are powerful but context-starved. Ragnarock gives them the structured, ordered, validated context they need to build autonomously — not just assist.

### 6.4 Current State

The platform is in active production-quality development. All five AI agents are operational. The full task management, documentation, requirement, and team management systems are complete. The MCP server is live and has been tested with Claude Code. Linear integration is bi-directional and production-tested. GitHub repository integration is complete. The entire system runs in Docker Compose for both local development and staging.

The next milestone is completing the Change Impact Agent — the final agent in the Phase 4 suite — which will allow business owners and project managers to analyze the full downstream impact of a scope change before committing to it: which tasks are affected, which test cases need to be rewritten, how much additional effort is required, and which in-flight pull requests would be invalidated.

### 6.5 Conclusion

Ragnarock is not a requirements tool. It is not a project management tool. It is not a testing tool or an architecture tool or a coding assistant. It is all of these things, unified by a single data model, driven by AI agents that each understand their role in the lifecycle, and connected to external coding agents through a machine-readable interface that makes autonomous software development achievable today.

The problem it solves — the gap between what a business intends and what a development team delivers — is not new. But the combination of conversational AI, structured schema-driven outputs, full-lifecycle traceability, and the Model Context Protocol creates a solution that was not possible before. Every piece of context a team needs to build software correctly is now in one place, in a format both humans and machines can consume.

---

*This document is the authoritative overview of the Ragnarock platform for investors, evaluators, team members, and any stakeholder seeking to understand what the platform is, what problems it solves, and why those solutions matter.*
