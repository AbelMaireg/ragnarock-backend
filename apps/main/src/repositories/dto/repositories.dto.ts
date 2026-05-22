import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class LinkProjectRepositoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  owner!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

export class ListMyGithubReposQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number;
}

export class ListRepositoryCommitsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  branch?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number;
}

export class ListPullsQueryDto {
  @IsOptional()
  @IsString()
  state?: "open" | "closed" | "all";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number;
}

export class ListIssuesQueryDto {
  @IsOptional()
  @IsString()
  state?: "open" | "closed" | "all";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number;
}

export class BrowseRepositoryQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ref?: string;
}
