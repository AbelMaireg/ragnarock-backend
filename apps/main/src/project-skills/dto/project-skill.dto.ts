import { IsIn, IsOptional, IsString, MaxLength, MinLength, Matches } from "class-validator";

export class CreateProjectSkillDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100_000)
  bodyMarkdown!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "slug must be lowercase letters, numbers, and single hyphens",
  })
  slug?: string;
}

export class UpdateProjectSkillDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100_000)
  bodyMarkdown?: string;
}

export class ExportSkillQueryDto {
  @IsIn(["md", "txt"])
  format!: "md" | "txt";
}
