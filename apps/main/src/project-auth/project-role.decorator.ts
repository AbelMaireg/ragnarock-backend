import { SetMetadata } from "@nestjs/common";
import { ProjectMemberRole } from "@prisma/client";
import { PROJECT_ROLE_KEY } from "./project-auth.types";

export const ProjectRole = (...roles: ProjectMemberRole[]) => SetMetadata(PROJECT_ROLE_KEY, roles);
