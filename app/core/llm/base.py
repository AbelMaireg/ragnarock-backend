from abc import ABC, abstractmethod


class LLMError(Exception):
    """Raised when an LLM provider returns an unrecoverable error."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


class BaseLLMProvider(ABC):
    """
    All LLM providers must implement this interface.
    Switching providers = swap the implementation, nothing else changes.
    """

    @abstractmethod
    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        """
        Send prompts to the LLM and return the raw response string.
        The caller (agent) is responsible for parsing and validating the output.
        """
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        ...
