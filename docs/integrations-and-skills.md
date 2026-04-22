# Integrations and project skills

This note describes how Ragnarock models **organization integrations** and **project skills**, and how that relates to MCP and Cursor.

## MCP vs REST-style connectors

- **MCP (Model Context Protocol)** in the wild often means JSON-RPC over stdio or SSE to a local or hosted server that exposes tools/resources. That shape is ideal when an agent needs a uniform tool surface.
- **SaaS integrations** are usually **OAuth or API keys plus REST/GraphQL**. Ragnarock v1 implements connectors in that style first (e.g. Linear with a PAT), while the product UI can still group them under “integrations / AI tools.”
- A **unified connector abstraction** in code (provider key, auth mode, encrypted credentials, verify ping) lets you add true MCP bridges later without renaming the feature.

## Cursor positioning

- **Cursor Desktop** runs MCP locally from the user’s machine config. Ragnarock does not replace that.
- Ragnarock provides **managed org connections** (setup, rotation, health, RBAC) and **exportable project skills** (Markdown with optional front matter) that users can copy into Cursor, Claude, or other clients.
- A future **hosted MCP bridge** would be a separate product decision: higher operational and security burden than v1’s REST + encrypted storage.

## Organization-wide inheritance

- **Integration connections** are scoped to the **active organization**. Members consume them according to product rules and RBAC; connection management is limited to **organization owners and admins**.
- **Skills** are **project-scoped** (unique slug per project). They describe how to work inside that project; they do not automatically inherit org integration secrets (those stay server-side).

## Security checklist

1. **Secrets:** Store provider tokens only in **encrypted** fields; never log request bodies containing credentials.
2. **Config:** Require a strong **`INTEGRATIONS_CREDENTIALS_SECRET`** (length ≥ 16) in any environment where connect is enabled.
3. **RBAC:** Enforce org admin for connect/disconnect/verify; enforce project membership and project roles for skill CRUD and export.
4. **Transport:** HTTPS only in production; rely on existing session/bearer auth for APIs.
5. **Least privilege:** PATs and API keys should use the minimum scopes the feature needs; document rotation for org admins.
6. **Errors:** Surface **sanitized** messages to clients; keep raw provider errors in logs at appropriate levels only.
