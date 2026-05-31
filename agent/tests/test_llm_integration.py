import asyncio
import json

import pytest
import respx
import httpx

from app.schemas.requirement import AgentInput
import app.core.graph.requirement_graph as requirement_graph


class HttpProvider:
    provider_name = "fake-http"

    def __init__(self, endpoint: str):
        self.endpoint = endpoint

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(self.endpoint, json={"system": system_prompt, "user": user_prompt})
            return resp.text


@pytest.mark.asyncio
async def test_llm_retries_on_invalid_json_then_succeeds():
    ai_url = "http://llm.test/generate"
    provider = HttpProvider(ai_url)

    # Patch the module-level _llm used by requirement_graph
    requirement_graph._llm = provider

    # Agent input minimal
    agent_input = AgentInput(content="hello", project_id="proj-1")

    # First response: invalid JSON, second: valid requirement response JSON
    invalid_body = "not-a-json"
    valid_payload = json.dumps({
        "status": "complete",
        "project_name": "P",
        "summary": "S",
        "features": [],
        "functional_requirements": [],
        "non_functional_requirements": [],
        "user_stories": [],
        "acceptance_criteria": [],
        "business_owner_summary": "OK",
    })

    with respx.mock(assert_all_called=False) as mock:
        r1 = mock.post(ai_url).mock(return_value=httpx.Response(200, content=invalid_body))
        r2 = mock.post(ai_url).mock(return_value=httpx.Response(200, content=valid_payload))

        result = await requirement_graph._call_llm(agent_input)

        assert result.status == "complete"


@pytest.mark.asyncio
async def test_llm_retry_exhausts_and_raises():
    ai_url = "http://llm.test/generate"
    provider = HttpProvider(ai_url)
    requirement_graph._llm = provider

    agent_input = AgentInput(content="hello", project_id="proj-1")

    # Always return invalid JSON to trigger retry exhaustion (stop_after_attempt=2)
    with respx.mock(assert_all_called=False) as mock:
        mock.post(ai_url).mock(return_value=httpx.Response(200, content="bad"))

        with pytest.raises(json.JSONDecodeError):
            await requirement_graph._call_llm(agent_input)
