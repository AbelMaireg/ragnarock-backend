from __future__ import annotations

import logging

from app.core.graph.router import run_planner_graph
from app.schemas.planner import TaskBreakdown, PlannerTask
from app.schemas.queue import AiPlannerJob, AiPlannerSucceededResult

logger = logging.getLogger(__name__)


class PlannerProcessor:
    async def process_job(self, job: AiPlannerJob) -> AiPlannerSucceededResult:
        logger.info(
            "PlannerProcessor | project_id=%s | job_id=%s",
            job.project_id,
            job.job_id,
        )

        breakdown: TaskBreakdown = await run_planner_graph(job)

        tasks_payload = [
            _task_to_dict(task) for task in breakdown.tasks
        ]

        logger.info(
            "PlannerProcessor | project_id=%s | tasks_generated=%d",
            job.project_id,
            len(tasks_payload),
        )

        return AiPlannerSucceededResult(
            jobId=job.job_id,
            projectId=job.project_id,
            userId=job.user_id,
            tasks=tasks_payload,
        )


def _task_to_dict(task: PlannerTask) -> dict:
    """
    Serialise a PlannerTask to a dict that NestJS can consume directly.
    Uses camelCase aliases to match CreateProjectTaskDto field names.
    """
    return task.model_dump(mode="json", by_alias=True)
