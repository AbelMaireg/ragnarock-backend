# MCP Implementation Plan

**Version:** 1.0  
**Date:** 2026-05-24  
**Status:** Ready to implement  

---

## 1. What We Are Building

A **Model Context Protocol (MCP) server** that exposes Ragnarock project data as structured tools a coding agent (Claude Code, Cursor, or any MCP-compatible tool) can call.

The server has zero AI logic. It is a thin protocol adapter — it translates MCP tool calls into Prisma queries and returns structured JSON. Every piece of data it exposes was already produced by the Ragnarock agent pipeline.

### End Result

A developer:
1. Opens their project in Ragnarock
2. Copies a project API key from the project settings page
3. Pastes it into their Claude Code or Cursor MCP config
4. The coding agent connects and can now call tools to get the full project context — SRS, architecture, tasks, test cases — with no human prompting

---

## 2. Where It Lives

**Location:** `apps/mcp` — a new NestJS app inside the existing monorepo.

**Why NestJS, not FastAPI:**
- All project data is in PostgreSQL accessed via Prisma — already wired in NestJS
- No HTTP hop needed; service layer calls Prisma directly
- TypeScript MCP SDK (`@modelcontextprotocol/sdk`) is mature and first-class
- FastAPI is the AI layer — it must not own data access (clean separation per MVP design)
- NestJS already has auth, project access guards, and all services the MCP server needs

**Why a new app, not inside `apps/main`:**
- MCP speaks a different protocol (stdio or HTTP/SSE) — not REST
- Keeps main app clean; MCP is a separate surface with its own auth model
- Can be deployed independently (e.g. only exposed to internal network or via tunnel)

---

## 3. Authentication

MCP tool calls are authenticated with a **project API key** — a static token scoped to one project.

### New Prisma model: `ProjectApiKey`

```prisma
model ProjectApiKey {
    id          String   @id @default(cuid())
    projectId   String
    name        String
    keyHash     String   @unique
    lastUsedAt  DateTime?
    createdBy   String
    createdAt   DateTime @default(now())
    expiresAt   DateTime?

    project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
    creator     User     @relation(fields: [createdBy], references: [id], onDelete: Restrict)

    @@index([projectId])
    @@map("projectApiKey")
}
```

### Key generation flow
1. User visits the project settings page → clicks "Generate MCP Key"
2. NestJS generates a random token (`ragnarock_mcp_<32 random bytes hex>`)
3. The token is hashed (SHA-256) and stored in `ProjectApiKey.keyHash`
4. The raw token is shown **once** to the user — never stored
5. The user pastes it into their MCP client config

### Key verification in MCP server
Every tool call passes the key in the MCP request metadata. The MCP server:
1. SHA-256 hashes the incoming key
2. Looks up `ProjectApiKey` by `keyHash`
3. Verifies the key is not expired
4. Updates `lastUsedAt`
5. Returns the `projectId` — all tool queries are scoped to this project

---

## 4. The 7 MCP Tools

### Tool 1: `get_project_srs`
Returns the complete SRS from `ProjectSpecification`.

**Input:** _(none — project is inferred from the API key)_

**Output:**
```json
{
  "project_name": "string",
  "summary": "string",
  "features": [{ "featureId": "feat_001", "name": "string", "description": "string" }],
  "functional_requirements": ["string"],
  "non_functional_requirements": ["string"],
  "user_stories": [{ "role": "string", "goal": "string", "benefit": "string" }],
  "acceptance_criteria": ["string"],
  "out_of_scope": ["string"]
}
```

**Source:** `ProjectSpecification.payload` (JSON) — latest record for the project.

---

### Tool 2: `get_features`
Returns all project features with their linked requirements and counts.

**Input:** _(none)_

**Output:**
```json
[
  {
    "id": "feat_001",
    "name": "string",
    "description": "string",
    "requirementCount": 3,
    "taskCount": 5,
    "testCaseCount": 8,
    "requirements": [
      { "id": "feat_001_fr_001", "title": "string", "status": "draft" }
    ]
  }
]
```

**Source:** `ProjectFeature` → includes `requirements`, `_count.tasks`, `_count.testCases`

---

### Tool 3: `get_next_task`
Returns the next unblocked task the coding agent should work on, in dependency order.

**Input:** _(none)_

**Output:**
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "priority": "high",
  "phase": "build",
  "featureId": "feat_001",
  "featureName": "string",
  "labels": ["feat:feat_001", "backend"],
  "sortOrder": 1
}
```

**Source:** `ProjectTask` — filtered to `status IN (backlog, todo, in_progress)`, ordered by `sortOrder ASC`, first result returned.

---

### Tool 4: `get_task_detail`
Returns a single task with its full feature context and linked requirements.

**Input:** `{ "taskId": "string" }`

**Output:**
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "priority": "high",
  "phase": "build",
  "status": "todo",
  "feature": {
    "id": "feat_001",
    "name": "string",
    "description": "string",
    "requirements": [{ "id": "string", "title": "string", "status": "draft" }]
  },
  "labels": ["feat:feat_001"]
}
```

**Source:** `ProjectTask` joined with `ProjectFeature` → `ProjectRequirement`

---

### Tool 5: `get_test_cases`
Returns all test cases for a given feature.

**Input:** `{ "featureId": "feat_001" }` — the external ID (e.g. `feat_001`)

**Output:**
```json
[
  {
    "id": "tc_001",
    "title": "string",
    "type": "unit | integration | e2e",
    "preconditions": ["string"],
    "steps": ["string"],
    "expectedResult": "string"
  }
]
```

**Source:** `ProjectTestCase` filtered by `ProjectFeature.externalId = featureId`

---

### Tool 6: `get_architecture`
Returns the latest architecture documents (SAD → HLD → LLD) as structured content.

**Input:** _(none)_

**Output:**
```json
[
  {
    "type": "sad | hld | lld | adr",
    "title": "string",
    "content": "string (markdown)",
    "version": 1,
    "updatedAt": "ISO timestamp"
  }
]
```

**Source:** `ProjectDocumentation` filtered to `type IN (sad, hld, lld, adr)` AND `generationMode = ai`, ordered by type hierarchy then `updatedAt DESC`

---

### Tool 7: `mark_task_complete`
Updates a task status to `done`.

**Input:** `{ "taskId": "string", "prUrl": "string (optional)" }`

**Output:**
```json
{
  "taskId": "string",
  "status": "done",
  "nextTask": { /* same shape as get_next_task output, or null if all done */ }
}
```

**Source:** `ProjectTask.update` + re-runs `get_next_task` logic to return what's next

---

## 5. File Structure

```
apps/mcp/
├── src/
│   ├── main.ts                         ← Bootstrap: stdio or HTTP/SSE transport
│   ├── mcp.module.ts                   ← NestJS module wiring
│   ├── mcp.server.ts                   ← MCP server setup, tool registration
│   ├── auth/
│   │   └── api-key.guard.ts            ← Verifies project API key, resolves projectId
│   └── tools/
│       ├── srs.tool.ts                 ← get_project_srs
│       ├── features.tool.ts            ← get_features
│       ├── tasks.tool.ts               ← get_next_task, get_task_detail, mark_task_complete
│       ├── test-cases.tool.ts          ← get_test_cases
│       └── architecture.tool.ts        ← get_architecture
├── tsconfig.app.json
└── tsconfig.json
```

### Also needed in `apps/main`:

```
apps/main/src/
└── project-api-keys/
    ├── project-api-keys.controller.ts  ← POST /projects/:id/api-keys, GET, DELETE
    ├── project-api-keys.service.ts     ← generate, hash, verify, list, revoke
    └── project-api-keys.module.ts
```

---

## 6. MCP Transport

MCP supports two transports:

| Transport | When to use |
|---|---|
| **stdio** | Claude Code CLI — the agent spawns the MCP server as a subprocess |
| **HTTP/SSE** | Cursor, web-based agents — the server runs persistently and agents connect over HTTP |

**We implement HTTP/SSE first** — it works with both Claude Code (via `--mcp-server-url`) and Cursor, and is easier to run in Docker alongside the other services.

The MCP server listens on port **3002** (main is 3000, admin is 3001).

---

## 7. Dependencies to Install

```bash
# In ragnarock-backend root
bun add @modelcontextprotocol/sdk zod
```

- `@modelcontextprotocol/sdk` — official MCP TypeScript SDK (tool registration, transport handling)
- `zod` — tool input schema validation (already used in NestJS ecosystem; MCP SDK uses it natively)

---

## 8. Claude Code Config (What the Developer Pastes)

After generating an API key, the developer adds this to their Claude Code MCP config (`.claude/mcp_servers.json`):

```json
{
  "ragnarock": {
    "type": "http",
    "url": "http://localhost:3002/mcp",
    "headers": {
      "x-ragnarock-key": "ragnarock_mcp_<their-key-here>"
    }
  }
}
```

The MCP server reads `x-ragnarock-key` from every request, verifies it, resolves the project, and scopes all tool calls to that project.

---

## 9. Implementation Order

Build in this sequence — each step is independently testable:

| Step | What | Outcome |
|---|---|---|
| 1 | Add `ProjectApiKey` Prisma model + migrate | DB table exists |
| 2 | Build `project-api-keys` service + controller in `apps/main` | Can generate and revoke keys via REST |
| 3 | Scaffold `apps/mcp` — NestJS app + MCP SDK wired up + HTTP/SSE transport on port 3002 | Server starts, no tools yet |
| 4 | Add API key auth guard | Tool calls without a valid key are rejected |
| 5 | Implement `get_project_srs` | First tool works end-to-end |
| 6 | Implement `get_features` | Feature traceability visible to agent |
| 7 | Implement `get_next_task` + `get_task_detail` | Agent can pick up work |
| 8 | Implement `get_test_cases` | Agent knows what done looks like |
| 9 | Implement `get_architecture` | Agent has design context |
| 10 | Implement `mark_task_complete` | Full loop closed |
| 11 | Connect Claude Code to the server on a real project | End-to-end test |

---

## 10. What the Coding Agent Flow Looks Like

Once the server is running and the key is configured:

```
Claude Code connects to Ragnarock MCP server
        │
        ▼
get_project_srs()
→ reads the full SRS — knows what the product is
        │
        ▼
get_features()
→ sees all features with IDs — knows the scope
        │
        ▼
get_architecture()
→ reads SAD/HLD — knows the tech stack and system design
        │
        ▼
get_next_task()
→ receives Task 1 (sortOrder: 0, status: backlog)
        │
        ▼
get_task_detail(taskId)
→ receives full task + feature + requirements — knows what done means
        │
        ▼
get_test_cases(featureId)
→ receives test cases — writes tests before implementation (TDD)
        │
        ▼
[coding agent implements the feature]
        │
        ▼
mark_task_complete(taskId, prUrl)
→ task marked done, returns next task
        │
        ▼
[repeat until all tasks complete]
```

---

## 11. What Is NOT in Scope for This Implementation

- Frontend UI for generating/managing API keys (Phase 2 — for now, keys are generated via REST API directly)
- Change Impact Agent integration (not yet built)
- Git PR review on `mark_task_complete` (Phase 5 — for now, just marks done)
- Multi-project keys (each key is scoped to exactly one project)
- Rate limiting (add after first successful end-to-end test)

---

## 12. Success Criteria

The implementation is complete when:

1. `bun run start:mcp` starts the server on port 3002 with no errors
2. A valid API key resolves to a project and an invalid key returns 401
3. All 7 tools return correct data for a project that has: completed SRS, tasks, test cases, and arch docs
4. Claude Code (via MCP config) can call `get_next_task` and receive the first task
5. `mark_task_complete` updates the task status in the DB and returns the next task
