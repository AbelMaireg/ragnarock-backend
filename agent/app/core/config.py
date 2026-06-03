from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM
    llm_provider: str = "gemini"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # Vertex AI + ADC (set GOOGLE_GENAI_USE_VERTEXAI=true; use gcloud auth application-default login)
    google_genai_use_vertexai: bool = Field(
        default=False,
        validation_alias=AliasChoices("GOOGLE_GENAI_USE_VERTEXAI", "google_genai_use_vertexai"),
    )
    google_cloud_project: str = Field(
        default="",
        validation_alias=AliasChoices("GOOGLE_CLOUD_PROJECT", "google_cloud_project"),
    )
    google_cloud_location: str = Field(
        default="global",
        validation_alias=AliasChoices("GOOGLE_CLOUD_LOCATION", "google_cloud_location"),
    )

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"

    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    deepseek_api_key: str = ""
    deepseek_model: str = "deepseek-chat"

    # Vector memory (Phase 3)
    database_url: str = ""
    embedding_model: str = "models/text-embedding-004"

    # AI requirements queue (Redis Streams)
    redis_url: str = "redis://localhost:6379"
    ai_requirements_queue_jobs_stream: str = "stream:ai-requirements:jobs"
    ai_requirements_queue_jobs_group: str = "ai-requirements-agent-workers"
    ai_requirements_queue_jobs_consumer: str = "agent-1"
    ai_requirements_queue_results_stream: str = "stream:ai-requirements:results"
    ai_requirements_queue_batch_size: int = 10
    ai_requirements_queue_block_ms: int = 5000
    ai_requirements_queue_max_retries: int = 5
    ai_requirements_queue_claim_idle_ms: int = 30000
    ai_requirements_queue_stream_maxlen: int = 10000
    ai_requirements_queue_jobs_dlq_stream: str = "stream:ai-requirements:jobs:dlq"

    # Upload references produced by the NestJS uploader module
    ai_upload_local_root: str = ""
    ai_upload_s3_bucket: str = ""
    ai_upload_s3_endpoint_url: str = ""
    ai_upload_s3_region: str = "us-east-1"
    ai_upload_s3_access_key_id: str = ""
    ai_upload_s3_secret_access_key: str = ""

    # CORS
    allowed_origins: str = "http://localhost:3000"

    # App
    app_env: str = "development"
    app_port: int = 8100

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
