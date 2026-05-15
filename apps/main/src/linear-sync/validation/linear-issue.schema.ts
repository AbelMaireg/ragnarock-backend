import { z } from "zod";

const linearUserSchema = z
  .object({
    id: z.string(),
    email: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
  })
  .nullable()
  .optional();

const linearLabelSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const linearIssueNodeSchema = z.object({
  id: z.string(),
  identifier: z.string().optional().nullable(),
  title: z.string(),
  description: z.string().optional().nullable(),
  priority: z.number().optional().nullable(),
  updatedAt: z.coerce.date(),
  dueDate: z.coerce.date().optional().nullable(),
  state: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  assignee: linearUserSchema,
  labels: z
    .object({
      nodes: z.array(linearLabelSchema).default([]),
    })
    .optional(),
});

export type LinearIssueNode = z.infer<typeof linearIssueNodeSchema>;

export const linearWorkflowStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(),
});

export type LinearWorkflowState = z.infer<typeof linearWorkflowStateSchema>;

export const linearProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const linearTeamSchema = z.object({
  id: z.string(),
  name: z.string(),
});
