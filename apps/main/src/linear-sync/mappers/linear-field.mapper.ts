import { TaskPriority, TaskStatus } from "@prisma/client";
import {
  DEFAULT_LINEAR_STATE_TO_TASK_STATUS,
  DEFAULT_TASK_STATUS_TO_LINEAR_STATE_NAME,
} from "../constants/default-state-map";
import type { LinearIssueNode, LinearWorkflowState } from "../validation/linear-issue.schema";

/** Linear priority: 0 = none, 1 = urgent, 2 = high, 3 = medium, 4 = low */
export function linearPriorityToTaskPriority(priority: number | null | undefined): TaskPriority {
  if (priority === 1) return TaskPriority.urgent;
  if (priority === 2) return TaskPriority.high;
  if (priority === 4) return TaskPriority.low;
  return TaskPriority.medium;
}

export function taskPriorityToLinearPriority(priority: TaskPriority): number {
  switch (priority) {
    case TaskPriority.urgent:
      return 1;
    case TaskPriority.high:
      return 2;
    case TaskPriority.low:
      return 4;
    default:
      return 3;
  }
}

export function resolveTaskStatusFromLinearState(
  stateName: string | undefined,
  stateMap?: Record<string, TaskStatus> | null,
): TaskStatus {
  if (!stateName) {
    return TaskStatus.todo;
  }
  const key = stateName.toLowerCase().trim();
  if (stateMap?.[stateName]) {
    return stateMap[stateName];
  }
  if (stateMap?.[key]) {
    return stateMap[key];
  }
  return DEFAULT_LINEAR_STATE_TO_TASK_STATUS[key] ?? TaskStatus.todo;
}

/** Whether Linear issue changes should be applied to an existing linked task. */
export function shouldApplyLinearImport(
  taskUpdatedAt: Date,
  linearIssueUpdatedAt: Date,
  link: { localUpdatedAt: Date | null; linearUpdatedAt: Date | null },
): boolean {
  const linearChanged =
    linearIssueUpdatedAt.getTime() > (link.linearUpdatedAt?.getTime() ?? 0);
  if (!linearChanged) {
    return false;
  }
  const localChanged = taskUpdatedAt.getTime() > (link.localUpdatedAt?.getTime() ?? 0);
  if (localChanged && taskUpdatedAt.getTime() >= linearIssueUpdatedAt.getTime()) {
    return false;
  }
  return true;
}

export function resolveLinearStateIdForTaskStatus(
  status: TaskStatus,
  states: LinearWorkflowState[],
  stateMap?: Record<string, TaskStatus> | null,
  fallbackStateId?: string | null,
  preferredStateId?: string | null,
): string | undefined {
  if (preferredStateId) {
    const preferred = states.find((s) => s.id === preferredStateId);
    if (preferred) {
      const mapped =
        stateMap?.[preferred.name] ?? resolveTaskStatusFromLinearState(preferred.name, stateMap);
      if (mapped === status) {
        return preferredStateId;
      }
    }
  }

  for (const state of states) {
    const mapped = stateMap?.[state.name] ?? resolveTaskStatusFromLinearState(state.name, stateMap);
    if (mapped === status) {
      return state.id;
    }
  }

  const targetName = DEFAULT_TASK_STATUS_TO_LINEAR_STATE_NAME[status];
  if (targetName) {
    const match = states.find((s) => s.name.toLowerCase() === targetName.toLowerCase());
    if (match) {
      return match.id;
    }
  }

  return fallbackStateId ?? states[0]?.id;
}

export function extractLabelNames(issue: LinearIssueNode): string[] {
  return issue.labels?.nodes.map((l) => l.name) ?? [];
}

export function resolveLabelIds(
  labelNames: string[],
  teamLabels: { id: string; name: string }[],
): string[] {
  const byName = new Map(teamLabels.map((l) => [l.name.toLowerCase(), l.id]));
  return labelNames
    .map((name) => byName.get(name.toLowerCase()))
    .filter((id): id is string => Boolean(id));
}

export function buildStateMapFromWorkflowStates(
  states: LinearWorkflowState[],
): Record<string, TaskStatus> {
  const map: Record<string, TaskStatus> = {};
  for (const state of states) {
    map[state.name] = resolveTaskStatusFromLinearState(state.name);
  }
  return map;
}
