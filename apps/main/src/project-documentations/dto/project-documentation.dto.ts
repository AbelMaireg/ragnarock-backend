import { DocumentationStatus, DocumentationType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { PaginatedRequestBase } from "@app/common";

export class ListProjectDocumentationsQueryDto extends PaginatedRequestBase {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  search?: string;

  @IsEnum(DocumentationStatus)
  @IsOptional()
  status?: DocumentationStatus;

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

  @IsEnum(DocumentationStatus)
  @IsOptional()
  status?: DocumentationStatus;

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

  @IsEnum(DocumentationStatus)
  @IsOptional()
  status?: DocumentationStatus;

  @IsString()
  @IsOptional()
  content?: string;
}
