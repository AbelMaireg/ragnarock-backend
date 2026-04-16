import { createParamDecorator, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { ProjectScopedRequest } from "./project-auth.types";

export const CurrentOrganization = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<ProjectScopedRequest>();
    const activeOrganizationId =
      request.activeOrganizationId ??
      (typeof request.session?.activeOrganizationId === "string"
        ? request.session.activeOrganizationId
        : undefined);

    if (!activeOrganizationId) {
      throw new ForbiddenException("Active organization is required");
    }

    return activeOrganizationId;
  },
);
