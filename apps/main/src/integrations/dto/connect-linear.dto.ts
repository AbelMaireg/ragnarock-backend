import { IsString, MinLength, MaxLength } from "class-validator";

export class ConnectLinearDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  pat!: string;
}
