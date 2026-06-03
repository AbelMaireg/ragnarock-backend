import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any

from pydantic import ValidationError
from redis.asyncio import Redis
from redis.exceptions import ResponseError

from app.core.config import get_settings
from app.schemas.queue import (
    AiArchDocFailedResult,
    AiArchDocJob,
    AiPlannerFailedResult,
    AiPlannerJob,
    AiQaIntelligenceFailedResult,
    AiQaIntelligenceJob,
    AiRequirementsFailedResult,
    AiRequirementsJob,
    AiRequirementsSucceededResult,
    RagnarockChatFailedResult,
)
from app.schemas.ragnarock_chat import RagnarockChatJob
from app.services.requirements_processor import RequirementsProcessor
from app.services.arch_doc_processor import ArchDocProcessor
from app.services.planner_processor import PlannerProcessor
from app.services.qa_intelligence_processor import QaIntelligenceProcessor
from app.services.ragnarock_chat_processor import RagnarockChatProcessor

logger = logging.getLogger(__name__)


class RequirementsQueueWorker:
    def __init__(self, processor: RequirementsProcessor | None = None):
        self.settings = get_settings()
        self.processor = processor or RequirementsProcessor()
        self.arch_doc_processor = ArchDocProcessor()
        self.planner_processor = PlannerProcessor()
        self.qa_intelligence_processor = QaIntelligenceProcessor()
        self.ragnarock_chat_processor = RagnarockChatProcessor()
        self.redis: Redis | None = None
        self.running = False
        self.task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        if self.task is not None:
            return

        self.redis = Redis.from_url(self.settings.redis_url, decode_responses=True)
        await self.redis.ping()
        await self._ensure_consumer_group()
        self.running = True
        self.task = asyncio.create_task(self._consume_loop())
        logger.info(
            "AI requirements queue worker started | stream=%s | group=%s | consumer=%s",
            self.settings.ai_requirements_queue_jobs_stream,
            self.settings.ai_requirements_queue_jobs_group,
            self.settings.ai_requirements_queue_jobs_consumer,
        )

    async def stop(self) -> None:
        self.running = False
        if self.task is not None:
            await self.task
            self.task = None

        if self.redis is not None:
            await self.redis.aclose()
            self.redis = None

    async def _consume_loop(self) -> None:
        while self.running:
            try:
                await self._claim_stale_messages()
                messages = await self._read_new_messages()
                for message_id, payload in messages:
                    await self._process_message(message_id, payload)
            except Exception as error:
                logger.exception("AI requirements queue loop failed: %s", error)
                await asyncio.sleep(1)

    async def _process_message(self, message_id: str, payload: str) -> None:
        try:
            raw = json.loads(payload)
        except json.JSONDecodeError as error:
            await self._send_to_dead_letter(message_id, payload, error)
            await self._ack(message_id)
            return

        job_type = raw.get("jobType", "chat_turn") if isinstance(raw, dict) else "chat_turn"

        if job_type == "arch_doc":
            await self._process_arch_doc_message(message_id, payload, raw)
        elif job_type == "planner":
            await self._process_planner_message(message_id, payload, raw)
        elif job_type == "qa_intelligence":
            await self._process_qa_intelligence_message(message_id, payload, raw)
        elif job_type == "ragnarock_chat":
            await self._process_ragnarock_chat_message(message_id, payload, raw)
        else:
            await self._process_chat_turn_message(message_id, payload, raw)

    async def _process_chat_turn_message(
        self, message_id: str, payload: str, raw: dict
    ) -> None:
        try:
            job = AiRequirementsJob.model_validate(raw)
        except ValidationError as error:
            await self._send_to_dead_letter(message_id, payload, error)
            await self._ack(message_id)
            return

        try:
            result = await self.processor.process_job(job)
            event = AiRequirementsSucceededResult(
                jobId=job.job_id,
                projectId=job.project_id,
                userId=job.user_id,
                sessionId=job.session_id,
                userMessageId=job.user_message_id,
                response=result,
                attempts=job.attempts,
            )
            await self._publish_result(event.model_dump(mode="json", by_alias=True))
            await self._ack(message_id)
        except Exception as error:
            await self._handle_processing_failure(message_id, job, payload, error)

    async def _process_arch_doc_message(
        self, message_id: str, payload: str, raw: dict
    ) -> None:
        try:
            job = AiArchDocJob.model_validate(raw)
        except ValidationError as error:
            await self._send_to_dead_letter(message_id, payload, error)
            await self._ack(message_id)
            return

        try:
            result = await self.arch_doc_processor.process_job(job)
            await self._publish_result(result.model_dump(mode="json", by_alias=True))
            await self._ack(message_id)
        except Exception as error:
            reason = str(error) or error.__class__.__name__
            failed = AiArchDocFailedResult(
                jobId=job.job_id,
                projectId=job.project_id,
                userId=job.user_id,
                error=reason,
            )
            await self._publish_result(failed.model_dump(mode="json", by_alias=True))
            await self._send_to_dead_letter(message_id, payload, error)
            await self._ack(message_id)

    async def _process_planner_message(
        self, message_id: str, payload: str, raw: dict
    ) -> None:
        try:
            job = AiPlannerJob.model_validate(raw)
        except ValidationError as error:
            await self._send_to_dead_letter(message_id, payload, error)
            await self._ack(message_id)
            return

        try:
            result = await self.planner_processor.process_job(job)
            await self._publish_result(result.model_dump(mode="json", by_alias=True))
            await self._ack(message_id)
        except Exception as error:
            reason = str(error) or error.__class__.__name__
            failed = AiPlannerFailedResult(
                jobId=job.job_id,
                projectId=job.project_id,
                userId=job.user_id,
                error=reason,
            )
            await self._publish_result(failed.model_dump(mode="json", by_alias=True))
            await self._send_to_dead_letter(message_id, payload, error)
            await self._ack(message_id)

    async def _process_qa_intelligence_message(
        self, message_id: str, payload: str, raw: dict
    ) -> None:
        try:
            job = AiQaIntelligenceJob.model_validate(raw)
        except ValidationError as error:
            await self._send_to_dead_letter(message_id, payload, error)
            await self._ack(message_id)
            return

        try:
            result = await self.qa_intelligence_processor.process_job(job)
            await self._publish_result(result.model_dump(mode="json", by_alias=True))
            await self._ack(message_id)
        except Exception as error:
            reason = str(error) or error.__class__.__name__
            failed = AiQaIntelligenceFailedResult(
                jobId=job.job_id,
                projectId=job.project_id,
                userId=job.user_id,
                error=reason,
            )
            await self._publish_result(failed.model_dump(mode="json", by_alias=True))
            await self._send_to_dead_letter(message_id, payload, error)
            await self._ack(message_id)

    async def _process_ragnarock_chat_message(
        self, message_id: str, payload: str, raw: dict
    ) -> None:
        from pydantic import ValidationError as PydanticValidationError
        try:
            job = RagnarockChatJob.model_validate(raw)
        except PydanticValidationError as error:
            await self._send_to_dead_letter(message_id, payload, error)
            await self._ack(message_id)
            return

        try:
            result = await self.ragnarock_chat_processor.process_job(job)
            await self._publish_result(result.model_dump(mode="json", by_alias=True))
            await self._ack(message_id)
        except Exception as error:
            reason = str(error) or error.__class__.__name__
            failed = RagnarockChatFailedResult(
                jobId=job.job_id,
                projectId=job.project_id,
                userId=job.user_id,
                sessionId=job.session_id,
                error=reason,
            )
            await self._publish_result(failed.model_dump(mode="json", by_alias=True))
            await self._send_to_dead_letter(message_id, payload, error)
            await self._ack(message_id)

    async def _handle_processing_failure(
        self,
        message_id: str,
        job: AiRequirementsJob,
        payload: str,
        error: Exception,
    ) -> None:
        import asyncio
        next_attempts = job.attempts + 1
        reason = str(error) or error.__class__.__name__

        is_quota_error = "quota" in reason.lower() or "429" in reason
        if is_quota_error or next_attempts <= self.settings.ai_requirements_queue_max_retries:
            # Exponential backoff: 2s, 4s, 8s … capped at 30s; quota errors always wait at least 5s
            delay = min(30, max(5 if is_quota_error else 2, 2 ** next_attempts))
            await asyncio.sleep(delay)
            retry_job = job.model_copy(update={"attempts": next_attempts})
            await self._requeue_job(retry_job)
            await self._ack(message_id)
            logger.warning(
                "AI requirements job requeued | job_id=%s | attempt=%d | delay=%ds | error=%s",
                job.job_id,
                next_attempts,
                delay,
                reason,
            )
            return

        failed = AiRequirementsFailedResult(
            jobId=job.job_id,
            projectId=job.project_id,
            userId=job.user_id,
            sessionId=job.session_id,
            userMessageId=job.user_message_id,
            error=reason,
            attempts=next_attempts,
        )
        await self._publish_result(failed.model_dump(mode="json", by_alias=True))
        await self._send_to_dead_letter(message_id, payload, error)
        await self._ack(message_id)

    async def _read_new_messages(self) -> list[tuple[str, str]]:
        assert self.redis is not None
        raw = await self.redis.xreadgroup(
            groupname=self.settings.ai_requirements_queue_jobs_group,
            consumername=self.settings.ai_requirements_queue_jobs_consumer,
            streams={self.settings.ai_requirements_queue_jobs_stream: ">"},
            count=self.settings.ai_requirements_queue_batch_size,
            block=self.settings.ai_requirements_queue_block_ms,
        )
        return self._parse_stream_messages(raw)

    async def _claim_stale_messages(self) -> None:
        assert self.redis is not None
        raw = await self.redis.execute_command(
            "XAUTOCLAIM",
            self.settings.ai_requirements_queue_jobs_stream,
            self.settings.ai_requirements_queue_jobs_group,
            self.settings.ai_requirements_queue_jobs_consumer,
            self.settings.ai_requirements_queue_claim_idle_ms,
            "0-0",
            "COUNT",
            self.settings.ai_requirements_queue_batch_size,
        )
        for message_id, payload in self._parse_autoclaim_messages(raw):
            await self._process_message(message_id, payload)

    async def _requeue_job(self, job: AiRequirementsJob) -> None:
        await self._xadd(
            self.settings.ai_requirements_queue_jobs_stream,
            job.model_dump_json(by_alias=True),
        )

    async def _publish_result(self, event: dict[str, Any]) -> None:
        if event.get("status") == "failed":
            event["failedAt"] = _utc_now()
        else:
            event["completedAt"] = _utc_now()
        await self._xadd(self.settings.ai_requirements_queue_results_stream, json.dumps(event))

    async def _xadd(self, stream: str, payload: str) -> None:
        assert self.redis is not None
        await self.redis.xadd(
            stream,
            {"payload": payload},
            maxlen=self.settings.ai_requirements_queue_stream_maxlen,
            approximate=True,
        )

    async def _send_to_dead_letter(
        self,
        message_id: str,
        payload: str,
        error: Exception,
    ) -> None:
        assert self.redis is not None
        reason = str(error) or error.__class__.__name__
        await self.redis.xadd(
            self.settings.ai_requirements_queue_jobs_dlq_stream,
            {
                "payload": payload,
                "originalMessageId": message_id,
                "error": reason,
                "failedAt": _utc_now(),
            },
        )
        logger.error(
            "AI requirements job moved to DLQ | message_id=%s | error=%s",
            message_id,
            reason,
        )

    async def _ack(self, message_id: str) -> None:
        assert self.redis is not None
        await self.redis.xack(
            self.settings.ai_requirements_queue_jobs_stream,
            self.settings.ai_requirements_queue_jobs_group,
            message_id,
        )

    async def _ensure_consumer_group(self) -> None:
        assert self.redis is not None
        try:
            await self.redis.xgroup_create(
                self.settings.ai_requirements_queue_jobs_stream,
                self.settings.ai_requirements_queue_jobs_group,
                id="0",
                mkstream=True,
            )
        except ResponseError as error:
            if "BUSYGROUP" not in str(error):
                raise

    def _parse_stream_messages(self, raw: Any) -> list[tuple[str, str]]:
        messages: list[tuple[str, str]] = []
        if not raw:
            return messages

        for _stream, entries in raw:
            for message_id, fields in entries:
                payload = fields.get("payload") if isinstance(fields, dict) else None
                if isinstance(payload, str):
                    messages.append((message_id, payload))
        return messages

    def _parse_autoclaim_messages(self, raw: Any) -> list[tuple[str, str]]:
        if not isinstance(raw, (list, tuple)) or len(raw) < 2:
            return []

        entries = raw[1]
        messages: list[tuple[str, str]] = []
        for entry in entries:
            if not isinstance(entry, (list, tuple)) or len(entry) < 2:
                continue
            message_id, fields = entry[0], entry[1]
            payload = fields.get("payload") if isinstance(fields, dict) else None
            if isinstance(message_id, str) and isinstance(payload, str):
                messages.append((message_id, payload))
        return messages


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()
