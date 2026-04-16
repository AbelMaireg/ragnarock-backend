import { ProjectMemberRole } from "@prisma/client";
import { IsEnum, IsString } from "class-validator";

export class AddProjectMemberDto {
  @IsString()
  userId!: string;

  @IsEnum(ProjectMemberRole)
  role!: ProjectMemberRole;
}

export class UpdateProjectMemberRoleDto {
  @IsEnum(ProjectMemberRole)
  role!: ProjectMemberRole;
}
