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
const KNOWN_AGENT_TYPES = [
  "requirements",
  "developer_intelligence",
  "project_planner",
  "qa_intelligence",
  "change_impact",
] as const;

export type AgentTypeKey = (typeof KNOWN_AGENT_TYPES)[number];

export class CreateAiChatSessionDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsIn(KNOWN_AGENT_TYPES)
  @IsOptional()
  agentType?: AgentTypeKey;
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

const ARCH_DOC_TYPES = ["sad", "hld", "lld", "adr"] as const;
export type ArchDocTypeKey = (typeof ARCH_DOC_TYPES)[number];

export class GenerateArchDocDto {
  @IsIn(ARCH_DOC_TYPES)
  docType!: ArchDocTypeKey;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  layer?: string;
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
