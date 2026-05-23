import asyncio
import logging

import google.generativeai as legacy_genai
from google.genai import types as genai_types

from app.core.config import get_settings
from app.core.llm.base import BaseLLMProvider, LLMError
from app.core.llm.google_genai_runtime import get_vertex_genai_client

logger = logging.getLogger(__name__)


class GeminiProvider(BaseLLMProvider):
    def __init__(self) -> None:
        self._settings = get_settings()
        self._use_vertex = self._settings.google_genai_use_vertexai

        if self._use_vertex:
            # google.genai (Vertex + ADC)
            self._client = get_vertex_genai_client()
            self._model_name = self._settings.gemini_model
        else:
            # Legacy: google-generativeai + AI Studio API key
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
                    response_mime_type="application/json",
                ),
            )
            self._client = None
            self._model_name = self._settings.gemini_model

    @property
    def provider_name(self) -> str:
        return "gemini"

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        if self._use_vertex:
            return await self._generate_vertex(system_prompt, user_prompt)
        return await self._generate_legacy(system_prompt, user_prompt)

    async def _generate_vertex(self, system_prompt: str, user_prompt: str) -> str:
        client = self._client
        if client is None:
            raise RuntimeError("Vertex client not initialized")

        def _call() -> str:
            config = genai_types.GenerateContentConfig(
                temperature=0.3,
                response_mime_type="application/json",
                system_instruction=system_prompt,
            )
            response = client.models.generate_content(
                model=self._model_name,
                contents=user_prompt,
                config=config,
            )
            text = getattr(response, "text", None)
            if text is None:
                raise RuntimeError("Gemini returned empty response (Vertex)")
            return text

        return await asyncio.to_thread(_call)

    async def _generate_legacy(self, system_prompt: str, user_prompt: str) -> str:
        combined = f"{system_prompt}\n\n{user_prompt}"
        try:
            response = await self._model.generate_content_async(combined)
            return response.text
        except NotFound as e:
            logger.error("Gemini model not found: %s", e)
            raise LLMError(
                "The configured AI model was not found. Please check the model name in your settings.",
                status_code=503,
            ) from e
        except PermissionDenied as e:
            logger.error("Gemini API key invalid or lacks permission: %s", e)
            raise LLMError(
                "AI service authentication failed. Please check your API key.",
                status_code=503,
            ) from e
        except ResourceExhausted as e:
            logger.error("Gemini quota exceeded: %s", e)
            raise LLMError(
                "AI service quota exceeded. Please try again later.",
                status_code=429,
            ) from e
        except GoogleAPICallError as e:
            logger.error("Gemini API error: %s", e)
            raise LLMError(
                "AI service is temporarily unavailable. Please try again.",
                status_code=503,
            ) from e
