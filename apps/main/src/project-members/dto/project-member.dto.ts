import { ProjectMemberRole, ProjectPersona } from "@prisma/client";
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, ValidateIf } from "class-validator";

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

  @IsArray()
  @IsEnum(ProjectPersona, { each: true })
  @IsOptional()
  personas?: ProjectPersona[];
}

export class UpdateProjectMemberRoleDto {
  @IsEnum(ProjectMemberRole)
  role!: ProjectMemberRole;
}

export class UpdateProjectMemberPersonasDto {
  @IsArray()
  @IsEnum(ProjectPersona, { each: true })
  personas!: ProjectPersona[];
}
