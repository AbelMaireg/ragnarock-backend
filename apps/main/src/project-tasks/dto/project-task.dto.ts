import { TaskPhase, TaskPriority, TaskStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class ListProjectTasksQueryDto {
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

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPhase)
  @IsOptional()
  phase?: TaskPhase;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  assigneeId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  search?: string;
}

export class CreateProjectTaskDto {
  @IsString()
  @MaxLength(140)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPhase)
  @IsOptional()
  phase?: TaskPhase;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class UpdateProjectTaskDto {
  @IsString()
  @IsOptional()
  @MaxLength(140)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPhase)
  @IsOptional()
  phase?: TaskPhase | null;

  @IsString()
  @IsOptional()
  assigneeId?: string | null;

  @IsDateString()
  @IsOptional()
  startDate?: string | null;

  @IsDateString()
  @IsOptional()
  dueDate?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class ReorderProjectTaskItemDto {
  @IsString()
  id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder!: number;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;
}

export class ReorderProjectTasksDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderProjectTaskItemDto)
  updates!: ReorderProjectTaskItemDto[];
}
