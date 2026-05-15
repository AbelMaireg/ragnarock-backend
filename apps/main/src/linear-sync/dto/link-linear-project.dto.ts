import { IsString, MaxLength } from "class-validator";

export class LinkLinearProjectDto {
  @IsString()
  @MaxLength(120)
  linearProjectId!: string;

  @IsString()
  @MaxLength(120)
  linearTeamId!: string;
}
