import { Module } from "@nestjs/common";
import { PrismaModule } from "@app/prisma";
import { ProjectAuthModule } from "../project-auth/project-auth.module";
import { AiAgentHttpService } from "./ai-agent-http.service";
import { AiChatBroadcastService } from "./ai-chat-broadcast.service";
import { AiChatGateway } from "./ai-chat.gateway";
import { AiChatSessionService } from "./ai-chat-session.service";
import { AiChatTurnService } from "./ai-chat-turn.service";
import { AiRequirementsController } from "./ai-requirements.controller";
import { ProjectSpecificationsController } from "./project-specifications.controller";
import { ProjectSpecificationsService } from "./project-specifications.service";

@Module({
  imports: [PrismaModule, ProjectAuthModule],
  controllers: [AiRequirementsController, ProjectSpecificationsController],
  providers: [
    AiAgentHttpService,
    AiChatBroadcastService,
    AiChatSessionService,
    AiChatTurnService,
    ProjectSpecificationsService,
    AiChatGateway,
  ],
})
export class AiRequirementsModule {}
