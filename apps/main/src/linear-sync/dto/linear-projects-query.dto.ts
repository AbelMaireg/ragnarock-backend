import { IsString, MaxLength } from "class-validator";

export class LinearProjectsQueryDto {
  @IsString()
  @MaxLength(120)
  teamId!: string;
}
