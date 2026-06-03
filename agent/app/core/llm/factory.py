from functools import lru_cache
from app.core.llm.base import BaseLLMProvider
from app.core.config import get_settings


@lru_cache
def get_llm_provider() -> BaseLLMProvider:
    provider = get_settings().llm_provider.lower()

    if provider == "gemini":
        from app.core.llm.gemini import GeminiProvider
        return GeminiProvider()

    if provider == "anthropic":
        from app.core.llm.anthropic import AnthropicProvider
        return AnthropicProvider()

    if provider == "openai":
        from app.core.llm.openai import OpenAIProvider
        return OpenAIProvider()

    if provider == "deepseek":
        from app.core.llm.deepseek import DeepSeekProvider
        return DeepSeekProvider()

    raise ValueError(
        f"Unknown LLM_PROVIDER '{provider}'. "
        "Valid options: gemini | anthropic | openai | deepseek"
    )
