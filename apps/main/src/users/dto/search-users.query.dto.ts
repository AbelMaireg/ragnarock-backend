import { IsOptional, IsString } from "class-validator";
import { PaginatedRequestBase } from "@app/common";

export class SearchUsersQueryDto extends PaginatedRequestBase {
  @IsOptional()
  @IsString()
  q = "*";
}
