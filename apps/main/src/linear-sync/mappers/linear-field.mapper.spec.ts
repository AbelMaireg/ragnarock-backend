import { TaskPriority, TaskStatus } from "@prisma/client";
import {
  linearPriorityToTaskPriority,
  resolveLinearStateIdForTaskStatus,
  resolveTaskStatusFromLinearState,
  shouldApplyLinearImport,
  taskPriorityToLinearPriority,
} from "./linear-field.mapper";

describe("linear-field.mapper", () => {
  it("maps Linear priority to task priority", () => {
    expect(linearPriorityToTaskPriority(1)).toBe(TaskPriority.urgent);
    expect(linearPriorityToTaskPriority(2)).toBe(TaskPriority.high);
    expect(linearPriorityToTaskPriority(4)).toBe(TaskPriority.low);
    expect(linearPriorityToTaskPriority(3)).toBe(TaskPriority.medium);
  });

  it("maps task priority to Linear priority", () => {
    expect(taskPriorityToLinearPriority(TaskPriority.urgent)).toBe(1);
    expect(taskPriorityToLinearPriority(TaskPriority.high)).toBe(2);
    expect(taskPriorityToLinearPriority(TaskPriority.low)).toBe(4);
    expect(taskPriorityToLinearPriority(TaskPriority.medium)).toBe(3);
  });

  it("resolves task status from Linear state name", () => {
    expect(resolveTaskStatusFromLinearState("In Progress")).toBe(TaskStatus.in_progress);
    expect(resolveTaskStatusFromLinearState("Done")).toBe(TaskStatus.done);
    expect(resolveTaskStatusFromLinearState("Unknown State")).toBe(TaskStatus.todo);
  });

  it("uses custom state map when provided", () => {
    const custom = { QA: TaskStatus.reviewing };
    expect(resolveTaskStatusFromLinearState("QA", custom)).toBe(TaskStatus.reviewing);
  });

  it("resolves Linear state id from task status using state map", () => {
    const states = [
      { id: "state-todo", name: "Todo", type: "unstarted" },
      { id: "state-done", name: "Done", type: "completed" },
    ];
    const stateMap = { Todo: TaskStatus.todo, Done: TaskStatus.done };
    expect(resolveLinearStateIdForTaskStatus(TaskStatus.done, states, stateMap, "state-todo")).toBe(
      "state-done",
    );
  });

  it("does not use fallback state id when a matching workflow state exists", () => {
    const states = [
      { id: "state-todo", name: "Todo", type: "unstarted" },
      { id: "state-progress", name: "In Progress", type: "started" },
    ];
    expect(
      resolveLinearStateIdForTaskStatus(TaskStatus.in_progress, states, null, "state-todo"),
    ).toBe("state-progress");
  });

  it("prefers the linked Linear state when status still matches", () => {
    const states = [
      { id: "state-done", name: "Done", type: "completed" },
      { id: "state-completed", name: "Completed", type: "completed" },
    ];
    const stateMap = { Done: TaskStatus.done, Completed: TaskStatus.done };
    expect(
      resolveLinearStateIdForTaskStatus(
        TaskStatus.done,
        states,
        stateMap,
        "state-done",
        "state-completed",
      ),
    ).toBe("state-completed");
  });

  it("skips import when Linear has not changed since last sync", () => {
    const t = new Date("2026-05-15T12:00:00.000Z");
    expect(
      shouldApplyLinearImport(t, t, {
        localUpdatedAt: new Date("2026-05-15T11:00:00.000Z"),
        linearUpdatedAt: t,
      }),
    ).toBe(false);
  });

  it("skips import after export when Linear timestamp matches watermark", () => {
    const linearAt = new Date("2026-05-15T12:00:00.000Z");
    const localAt = new Date("2026-05-15T11:30:00.000Z");
    expect(
      shouldApplyLinearImport(localAt, linearAt, {
        localUpdatedAt: localAt,
        linearUpdatedAt: linearAt,
      }),
    ).toBe(false);
  });

  it("applies import when Linear changed after last acknowledged sync", () => {
    expect(
      shouldApplyLinearImport(
        new Date("2026-05-15T11:00:00.000Z"),
        new Date("2026-05-15T12:00:00.000Z"),
        {
          localUpdatedAt: new Date("2026-05-15T11:00:00.000Z"),
          linearUpdatedAt: new Date("2026-05-15T10:00:00.000Z"),
        },
      ),
    ).toBe(true);
  });

  it("keeps local when both changed but local is newer (app source of truth)", () => {
    expect(
      shouldApplyLinearImport(
        new Date("2026-05-15T13:00:00.000Z"),
        new Date("2026-05-15T12:00:00.000Z"),
        {
          localUpdatedAt: new Date("2026-05-15T11:00:00.000Z"),
          linearUpdatedAt: new Date("2026-05-15T10:00:00.000Z"),
        },
      ),
    ).toBe(false);
  });
});
