import { TaskStatus } from "@prisma/client";

/** Heuristic mapping from Linear workflow state names to app TaskStatus. */
export const DEFAULT_LINEAR_STATE_TO_TASK_STATUS: Record<string, TaskStatus> = {
  backlog: TaskStatus.backlog,
  todo: TaskStatus.todo,
  "to do": TaskStatus.todo,
  "in progress": TaskStatus.in_progress,
  in_progress: TaskStatus.in_progress,
  started: TaskStatus.in_progress,
  reviewing: TaskStatus.reviewing,
  "in review": TaskStatus.reviewing,
  review: TaskStatus.reviewing,
  reviewed: TaskStatus.reviewed,
  done: TaskStatus.done,
  completed: TaskStatus.done,
  canceled: TaskStatus.cancelled,
  cancelled: TaskStatus.cancelled,
};

export const DEFAULT_TASK_STATUS_TO_LINEAR_STATE_NAME: Partial<Record<TaskStatus, string>> = {
  [TaskStatus.backlog]: "Backlog",
  [TaskStatus.todo]: "Todo",
  [TaskStatus.in_progress]: "In Progress",
  [TaskStatus.reviewing]: "In Review",
  [TaskStatus.reviewed]: "Reviewed",
  [TaskStatus.done]: "Done",
  [TaskStatus.cancelled]: "Canceled",
};
