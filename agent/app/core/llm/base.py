from abc import ABC, abstractmethod
from typing import TypedDict


class ConversationMessage(TypedDict):
    role: str  # "user" | "assistant"
    content: str


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
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        history: list[ConversationMessage] | None = None,
    ) -> str:
        """
        Send prompts to the LLM and return the raw response string.
        history is a list of prior turns in chronological order (oldest first),
        each with 'role' and 'content' keys.
        """
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        ...
