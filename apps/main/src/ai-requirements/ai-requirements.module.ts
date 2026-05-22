import { Module } from "@nestjs/common";
import { PrismaModule } from "@app/prisma";
import { UploaderModule } from "@app/uploader";
import { ProjectAuthModule } from "../project-auth/project-auth.module";
import { LinearSyncModule } from "../linear-sync/linear-sync.module";
import { AiChatBroadcastService } from "./ai-chat-broadcast.service";
import { AiChatGateway } from "./ai-chat.gateway";
import { AiChatSessionService } from "./ai-chat-session.service";
import { AiChatTurnService } from "./ai-chat-turn.service";
import { AiRequirementsQueueProducer } from "./ai-requirements-queue.producer";
import { AiRequirementsResultConsumer } from "./ai-requirements-result.consumer";
import { AiRequirementsController } from "./ai-requirements.controller";
import { ProjectSpecificationsController } from "./project-specifications.controller";
import { ProjectSpecificationsService } from "./project-specifications.service";
import { AgentDefinitionSeedService } from "./agent-definition-seed.service";
import { AiArchDocService } from "./ai-arch-doc.service";
import { AiPlannerService } from "./ai-planner.service";
import { AiQaIntelligenceService } from "./ai-qa-intelligence.service";
import { RagnarockChatService } from "./ragnarock-chat.service";

@Module({
  imports: [PrismaModule, ProjectAuthModule, UploaderModule, LinearSyncModule],
  controllers: [AiRequirementsController, ProjectSpecificationsController],
  providers: [
    AiChatBroadcastService,
    AiChatSessionService,
    AiChatTurnService,
    AiRequirementsQueueProducer,
    AiRequirementsResultConsumer,
    ProjectSpecificationsService,
    AiChatGateway,
    AgentDefinitionSeedService,
    AiArchDocService,
    AiPlannerService,
    AiQaIntelligenceService,
    RagnarockChatService,
  ],
})
export class AiRequirementsModule {}
