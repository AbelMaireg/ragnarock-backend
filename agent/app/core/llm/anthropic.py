import anthropic
from app.core.llm.base import BaseLLMProvider
from app.core.config import get_settings


class AnthropicProvider(BaseLLMProvider):
    def __init__(self):
        settings = get_settings()
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self._model = settings.anthropic_model

    @property
    def provider_name(self) -> str:
        return "anthropic"

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        message = await self._client.messages.create(
            model=self._model,
            max_tokens=4096,
            temperature=0.3,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return message.content[0].text
