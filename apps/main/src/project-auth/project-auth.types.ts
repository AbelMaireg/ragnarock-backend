import { ProjectMemberRole } from "@prisma/client";

export type RequestUser = {
  id: string;
  email?: string;
};

export type RequestSession = {
  activeOrganizationId?: string | null;
};

export const PROJECT_ROLE_KEY = "projectRole";

export type ProjectScopedRequest = {
  user?: Record<string, unknown>;
  session?: Record<string, unknown>;
  params: Record<string, string | undefined>;
  projectMemberRole?: ProjectMemberRole;
  activeOrganizationId?: string;
};
