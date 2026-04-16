import { DocumentationType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class ListProjectDocumentationsQueryDto {
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

  @IsEnum(DocumentationType)
  @IsOptional()
  type?: DocumentationType;
}

export class CreateProjectDocumentationDto {
  @IsString()
  @MaxLength(180)
  title!: string;

  @IsEnum(DocumentationType)
  type!: DocumentationType;

  @IsString()
  content!: string;
}

export class UpdateProjectDocumentationDto {
  @IsString()
  @IsOptional()
  @MaxLength(180)
  title?: string;

  @IsEnum(DocumentationType)
  @IsOptional()
  type?: DocumentationType;

  @IsString()
  @IsOptional()
  content?: string;
}
