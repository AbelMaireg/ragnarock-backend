import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateLinearSettingsDto {
  @IsBoolean()
  @IsOptional()
  autoSyncEnabled?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  defaultLinearStateId?: string;

  @IsObject()
  @IsOptional()
  stateMap?: Record<string, string>;
}
