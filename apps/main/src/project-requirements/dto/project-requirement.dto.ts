import { RequirementStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class ListProjectRequirementsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @IsEnum(RequirementStatus)
  @IsOptional()
  status?: RequirementStatus;
}

export class CreateProjectRequirementDto {
  @IsString()
  @MaxLength(180)
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  @IsOptional()
  acceptanceCriteria?: string;

  @IsEnum(RequirementStatus)
  @IsOptional()
  status?: RequirementStatus;
}

export class UpdateProjectRequirementDto {
  @IsString()
  @IsOptional()
  @MaxLength(180)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  acceptanceCriteria?: string;

  @IsEnum(RequirementStatus)
  @IsOptional()
  status?: RequirementStatus;
}
