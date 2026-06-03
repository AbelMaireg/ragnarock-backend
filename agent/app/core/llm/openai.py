from openai import AsyncOpenAI
from app.core.llm.base import BaseLLMProvider, ConversationMessage
from app.core.config import get_settings


class OpenAIProvider(BaseLLMProvider):
    def __init__(self):
        settings = get_settings()
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._model = settings.openai_model

    @property
    def provider_name(self) -> str:
        return "openai"

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        history: list[ConversationMessage] | None = None,
    ) -> str:
        messages = [{"role": "system", "content": system_prompt}]
        for m in (history or []):
            messages.append({"role": m["role"], "content": m["content"]})
        messages.append({"role": "user", "content": user_prompt})

        response = await self._client.chat.completions.create(
            model=self._model,
            temperature=0.3,
            messages=messages,
        )
        return response.choices[0].message.content
