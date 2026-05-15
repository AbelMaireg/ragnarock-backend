import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GraphQLClient, type ClientError } from "graphql-request";
import { verifyLinearPat } from "../../integrations/linear-api";
import { LinearApiError } from "../errors/linear-api.error";
import { ISSUE_CREATE_MUTATION, ISSUE_UPDATE_MUTATION } from "../graphql/mutations";
import {
  ISSUES_INCREMENTAL_QUERY,
  ISSUES_PAGE_QUERY,
  PROJECTS_QUERY,
  TEAM_LABELS_QUERY,
  TEAMS_QUERY,
  WORKFLOW_STATES_QUERY,
} from "../graphql/queries";
import {
  linearIssueNodeSchema,
  linearProjectSchema,
  linearTeamSchema,
  linearWorkflowStateSchema,
  type LinearIssueNode,
  type LinearWorkflowState,
} from "../validation/linear-issue.schema";

const MAX_RETRIES = 3;

/** Linear `TimelessDate` — date-only, no time component. */
function toLinearDueDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type IssueWriteInput = {
  title?: string;
  description?: string | null;
  priority?: number;
  stateId?: string;
  assigneeId?: string | null;
  dueDate?: Date | null;
  labelIds?: string[];
};

@Injectable()
export class LinearGraphqlService {
  private readonly logger = new Logger(LinearGraphqlService.name);
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.getOrThrow<string>("linear.apiUrl");
  }

  async verifyPat(pat: string) {
    return verifyLinearPat(pat);
  }

  private client(pat: string) {
    return new GraphQLClient(this.apiUrl, {
      headers: { Authorization: pat },
    });
  }

  private formatError(e: unknown): { message: string; status?: number } {
    if (e && typeof e === "object" && "response" in e) {
      const clientError = e as ClientError;
      const gqlErrors = clientError.response?.errors;
      if (gqlErrors?.length) {
        return {
          message: gqlErrors.map((err) => err.message).join("; "),
          status: clientError.response.status,
        };
      }
      return {
        message: clientError.message,
        status: clientError.response?.status,
      };
    }
    return {
      message: e instanceof Error ? e.message : "Linear API request failed",
    };
  }

  private async request<T>(
    pat: string,
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const client = this.client(pat);
        const data = await client.request<T>(query, variables);
        return data;
      } catch (e) {
        lastError = e;
        const { message, status } = this.formatError(e);
        const retryable = status === 429 || (status !== undefined && status >= 500);
        if (!retryable || attempt === MAX_RETRIES - 1) {
          throw new LinearApiError(message, status, retryable);
        }
        const delayMs = Math.min(1000 * 2 ** attempt, 8000);
        this.logger.warn(`Linear API retry ${attempt + 1} after ${delayMs}ms: ${message}`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw lastError;
  }

  private buildIssueMutationInput(input: IssueWriteInput): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    if (input.title !== undefined) payload.title = input.title;
    if (input.description !== undefined && input.description !== null) {
      payload.description = input.description;
    }
    if (input.priority !== undefined) payload.priority = input.priority;
    if (input.stateId) payload.stateId = input.stateId;
    if (input.assigneeId) payload.assigneeId = input.assigneeId;
    if (input.dueDate) payload.dueDate = toLinearDueDate(input.dueDate);
    if (input.labelIds && input.labelIds.length > 0) payload.labelIds = input.labelIds;
    return payload;
  }

  async listTeams(pat: string) {
    const data = await this.request<{ teams: { nodes: unknown[] } }>(pat, TEAMS_QUERY);
    return data.teams.nodes.map((n) => linearTeamSchema.parse(n));
  }

  async listProjects(pat: string, teamId: string) {
    const data = await this.request<{ team: { projects: { nodes: unknown[] } } | null }>(
      pat,
      PROJECTS_QUERY,
      { teamId },
    );
    if (!data.team) {
      return [];
    }
    return data.team.projects.nodes.map((n) => linearProjectSchema.parse(n));
  }

  async listWorkflowStates(pat: string, teamId: string): Promise<LinearWorkflowState[]> {
    const data = await this.request<{ team: { states: { nodes: unknown[] } } | null }>(
      pat,
      WORKFLOW_STATES_QUERY,
      { teamId },
    );
    if (!data.team) {
      return [];
    }
    return data.team.states.nodes.map((n) => linearWorkflowStateSchema.parse(n));
  }

  async listTeamLabels(pat: string, teamId: string) {
    const data = await this.request<{ team: { labels: { nodes: { id: string; name: string }[] } } | null }>(
      pat,
      TEAM_LABELS_QUERY,
      { teamId },
    );
    return data.team?.labels.nodes ?? [];
  }

  async fetchIssuesPage(
    pat: string,
    projectId: string,
    options: { first: number; after?: string; updatedAfter?: Date },
  ): Promise<{ issues: LinearIssueNode[]; hasNextPage: boolean; endCursor: string | null }> {
    const useIncremental = Boolean(
      options.updatedAfter &&
        options.updatedAfter.getTime() > new Date("2000-01-01T00:00:00.000Z").getTime(),
    );

    const data = useIncremental
      ? await this.request<{
          issues: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: unknown[] };
        }>(pat, ISSUES_INCREMENTAL_QUERY, {
          projectId,
          first: options.first,
          after: options.after ?? null,
          updatedAtFilter: options.updatedAfter!.toISOString(),
        })
      : await this.request<{
          issues: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: unknown[] };
        }>(pat, ISSUES_PAGE_QUERY, {
          projectId,
          first: options.first,
          after: options.after ?? null,
        });

    const issues = data.issues.nodes.map((n) => linearIssueNodeSchema.parse(n));
    return {
      issues,
      hasNextPage: data.issues.pageInfo.hasNextPage,
      endCursor: data.issues.pageInfo.endCursor,
    };
  }

  async createIssue(
    pat: string,
    input: {
      teamId: string;
      projectId: string;
      title: string;
      description?: string | null;
      priority?: number;
      stateId?: string;
      assigneeId?: string;
      dueDate?: Date | null;
      labelIds?: string[];
    },
  ) {
    const issueInput = this.buildIssueMutationInput(input);
    const data = await this.request<{
      issueCreate: {
        success: boolean;
        issue: { id: string; identifier: string | null; updatedAt: string } | null;
      };
    }>(pat, ISSUE_CREATE_MUTATION, {
      input: {
        teamId: input.teamId,
        projectId: input.projectId,
        ...issueInput,
      },
    });
    if (!data.issueCreate.success || !data.issueCreate.issue) {
      throw new LinearApiError("Linear issueCreate failed");
    }
    return data.issueCreate.issue;
  }

  async updateIssue(pat: string, issueId: string, input: IssueWriteInput) {
    const issueInput = this.buildIssueMutationInput(input);
    const data = await this.request<{
      issueUpdate: {
        success: boolean;
        issue: { id: string; identifier: string | null; updatedAt: string } | null;
      };
    }>(pat, ISSUE_UPDATE_MUTATION, {
      id: issueId,
      input: issueInput,
    });
    if (!data.issueUpdate.success || !data.issueUpdate.issue) {
      throw new LinearApiError("Linear issueUpdate failed");
    }
    return data.issueUpdate.issue;
  }
}
