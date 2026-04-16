import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class ListProjectActivityQueryDto {
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
}
