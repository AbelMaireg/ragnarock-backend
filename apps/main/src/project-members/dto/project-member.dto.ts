import { ProjectMemberRole, ProjectPersona } from "@prisma/client";
import { IsEmail, IsEnum, IsOptional, IsString, ValidateIf } from "class-validator";

export class AddProjectMemberDto {
  @ValidateIf((value: AddProjectMemberDto) => !value.email)
  @IsString()
  @IsOptional()
  userId?: string;

  @ValidateIf((value: AddProjectMemberDto) => !value.userId)
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(ProjectMemberRole)
  role!: ProjectMemberRole;

  @IsEnum(ProjectPersona)
  @IsOptional()
  persona?: ProjectPersona;
}

export class UpdateProjectMemberRoleDto {
  @IsEnum(ProjectMemberRole)
  role!: ProjectMemberRole;
}

export class UpdateProjectMemberPersonaDto {
  @IsEnum(ProjectPersona)
  persona!: ProjectPersona;
}
