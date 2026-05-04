import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class CreateAiChatSessionDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;
}

export class ListAiChatSessionsQueryDto {
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

export class ListAiChatMessagesQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 50;
}

export class ConversationTurnDto {
  @IsIn(["assistant", "user"])
  role!: "assistant" | "user";

  @IsString()
  content!: string;
}

export class SubmitAiRequirementsDto {
  @IsString()
  sessionId!: string;

  @IsString()
  input!: string;

  @IsIn(["text", "url"])
  type!: "text" | "url";

  /** Ignored by server; conversation is rebuilt from stored chat messages. */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ConversationTurnDto)
  conversation_history?: ConversationTurnDto[];
}

export class ListProjectSpecificationsQueryDto {
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
