GENERATE_REQUIREMENTS_DOC = """
Accepts plain text or a URL and returns either clarification questions or a completed SRS document.

Pass `conversation_history` from previous turns to continue a multi-turn session.
"""

UPLOAD_REQUIREMENTS_DOC = """
Accepts a PDF, DOCX, or TXT file and returns either clarification questions or a completed SRS document.

Pass `conversation_history_json` (JSON-encoded array) from previous turns to continue a multi-turn session.
"""

HEALTH_DOC = """
Returns service status and whether vector memory is active.

Safe to call from NestJS health checks, Docker healthcheck, or any uptime monitor.

```json
{ "status": "ok", "memory_enabled": true }
```

`memory_enabled` is `true` when `DATABASE_URL` is configured in FastAPI's environment.
"""
