import asyncio
import logging

import google.generativeai as legacy_genai
from google.genai import types as genai_types

from app.core.config import get_settings
from app.core.llm.base import BaseLLMProvider, ConversationMessage, LLMError
from app.core.llm.google_genai_runtime import get_vertex_genai_client

logger = logging.getLogger(__name__)


class GeminiProvider(BaseLLMProvider):
    def __init__(self) -> None:
        self._settings = get_settings()
        self._use_vertex = self._settings.google_genai_use_vertexai

        if self._use_vertex:
            self._client = get_vertex_genai_client()
            self._model_name = self._settings.gemini_model
        else:
            if not (self._settings.gemini_api_key or "").strip():
                raise ValueError(
                    "GEMINI_API_KEY is required when GOOGLE_GENAI_USE_VERTEXAI is false. "
                    "Set it in .env, or enable Vertex mode (see .env.example).",
                )
            legacy_genai.configure(api_key=self._settings.gemini_api_key)
            self._model = legacy_genai.GenerativeModel(
                model_name=self._settings.gemini_model,
                generation_config=legacy_genai.types.GenerationConfig(
                    temperature=0.3,
                ),
            )
            self._client = None
            self._model_name = self._settings.gemini_model

    @property
    def provider_name(self) -> str:
        return "gemini"

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        history: list[ConversationMessage] | None = None,
    ) -> str:
        if self._use_vertex:
            return await self._generate_vertex(system_prompt, user_prompt, history)
        return await self._generate_legacy(system_prompt, user_prompt, history)

    async def _generate_vertex(
        self,
        system_prompt: str,
        user_prompt: str,
        history: list[ConversationMessage] | None,
    ) -> str:
        client = self._client
        if client is None:
            raise RuntimeError("Vertex client not initialized")

        def _call() -> str:
            def _gemini_role(role: str) -> str:
                return "model" if role == "assistant" else "user"

            contents: list[genai_types.Content] = []
            for m in (history or []):
                contents.append(genai_types.Content(role=_gemini_role(m["role"]), parts=[genai_types.Part(text=m["content"])]))
            contents.append(genai_types.Content(role="user", parts=[genai_types.Part(text=user_prompt)]))

            config = genai_types.GenerateContentConfig(
                temperature=0.3,
                system_instruction=system_prompt,
            )
            response = client.models.generate_content(
                model=self._model_name,
                contents=contents,
                config=config,
            )
            text = getattr(response, "text", None)
            if text is None:
                raise RuntimeError("Gemini returned empty response (Vertex)")
            return text

        return await asyncio.to_thread(_call)

    async def _generate_legacy(
        self,
        system_prompt: str,
        user_prompt: str,
        history: list[ConversationMessage] | None,
    ) -> str:
        # Build chat history in the format legacy SDK expects.
        # Gemini uses "model" for assistant turns, not "assistant".
        def _gemini_role(role: str) -> str:
            return "model" if role == "assistant" else "user"

        chat_history = []
        for m in (history or []):
            chat_history.append({"role": _gemini_role(m["role"]), "parts": [m["content"]]})

        try:
            if chat_history:
                chat = self._model.start_chat(history=chat_history)
                # Prepend system prompt to first user message only if no history existed before;
                # here we already have history so just send the new user turn.
                response = await chat.send_message_async(user_prompt)
            else:
                combined = f"{system_prompt}\n\n{user_prompt}"
                response = await self._model.generate_content_async(combined)
            return response.text
        except Exception as e:
            from google.api_core.exceptions import NotFound, PermissionDenied, ResourceExhausted
            from google.api_core.exceptions import GoogleAPICallError
            if isinstance(e, NotFound):
                logger.error("Gemini model not found: %s", e)
                raise LLMError("The configured AI model was not found.", status_code=503) from e
            if isinstance(e, PermissionDenied):
                logger.error("Gemini API key invalid: %s", e)
                raise LLMError("AI service authentication failed.", status_code=503) from e
            if isinstance(e, ResourceExhausted):
                logger.error("Gemini quota exceeded: %s", e)
                raise LLMError("AI service quota exceeded.", status_code=429) from e
            if isinstance(e, GoogleAPICallError):
                logger.error("Gemini API error: %s", e)
                raise LLMError("AI service is temporarily unavailable.", status_code=503) from e
            raise
