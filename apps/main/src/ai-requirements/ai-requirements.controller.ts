import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { Express } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { Auth } from "@app/auth";
import { CurrentUser } from "@app/auth/decorators/current-user.decorator";
import { ProjectMemberRole } from "@prisma/client";
import { CurrentOrganization } from "../project-auth/current-organization.decorator";
import { ProjectMemberGuard } from "../project-auth/project-member.guard";
import { ProjectRole } from "../project-auth/project-role.decorator";
import { ProjectRoleGuard } from "../project-auth/project-role.guard";
import { AiArchDocService } from "./ai-arch-doc.service";
import { AiChatSessionService } from "./ai-chat-session.service";
import { AiChatTurnService } from "./ai-chat-turn.service";
import { AiPlannerService } from "./ai-planner.service";
import { RagnarockChatService } from "./ragnarock-chat.service";
import {
  CreateAiChatSessionDto,
  GenerateArchDocDto,
  ListAiChatMessagesQueryDto,
  ListAiChatSessionsQueryDto,
  RagnarockChatMessageDto,
  SubmitAiRequirementsDto,
} from "./dto/ai-chat.dto";

@Auth()
@UseGuards(ProjectMemberGuard)
@Controller("projects/:projectId/ai")
export class AiRequirementsController {
  constructor(
    private readonly aiChatSessionService: AiChatSessionService,
    private readonly aiChatTurnService: AiChatTurnService,
    private readonly aiArchDocService: AiArchDocService,
    private readonly aiPlannerService: AiPlannerService,
    private readonly ragnarockChatService: RagnarockChatService,
  ) {}

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin, ProjectMemberRole.member)
  @Post("chat/sessions")
  createChatSession(
    @Param("projectId") projectId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateAiChatSessionDto,
  ) {
    return this.aiChatSessionService.createSession(projectId, userId, dto.title, dto.agentType);
  }

  @Get("chat/sessions")
  listChatSessions(
    @Param("projectId") projectId: string,
    @Query() query: ListAiChatSessionsQueryDto,
  ) {
    return this.aiChatSessionService.listSessions(projectId, query);
  }

  @Get("draft")
  getProjectDraft(@Param("projectId") projectId: string) {
    return this.aiChatSessionService.getProjectDraft(projectId);
  }

  @Get("chat/sessions/:sessionId/messages")
  listChatMessages(
    @Param("projectId") projectId: string,
    @Param("sessionId") sessionId: string,
    @Query() query: ListAiChatMessagesQueryDto,
  ) {
    return this.aiChatSessionService.listMessages(projectId, sessionId, query);
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin, ProjectMemberRole.member)
  @Post("requirements")
  @HttpCode(HttpStatus.ACCEPTED)
  submitRequirements(
    @Param("projectId") projectId: string,
    @CurrentOrganization() organizationId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: SubmitAiRequirementsDto,
  ) {
    return this.aiChatTurnService.executeTextOrUrlTurn({
      projectId,
      organizationId,
      userId,
      sessionId: dto.sessionId,
      input: dto.input,
      type: dto.type,
    });
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin, ProjectMemberRole.member)
  @Post("arch-doc/generate")
  @HttpCode(HttpStatus.ACCEPTED)
  generateArchDoc(
    @Param("projectId") projectId: string,
    @CurrentOrganization() organizationId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: GenerateArchDocDto,
  ) {
    return this.aiArchDocService.requestGeneration({
      projectId,
      organizationId,
      userId,
      docType: dto.docType,
      layer: dto.layer,
    });
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin, ProjectMemberRole.member)
  @Post("plan/generate")
  @HttpCode(HttpStatus.ACCEPTED)
  generatePlan(
    @Param("projectId") projectId: string,
    @CurrentOrganization() organizationId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.aiPlannerService.requestGeneration({ projectId, organizationId, userId });
  }

  @Post("ragnarock/sessions")
  @HttpCode(HttpStatus.CREATED)
  ragnarockCreateSession(
    @Param("projectId") projectId: string,
    @CurrentOrganization() organizationId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.ragnarockChatService.createSession({ projectId, organizationId, userId });
  }

  @Get("ragnarock/sessions")
  ragnarockListSessions(
    @Param("projectId") projectId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.ragnarockChatService.listSessions({ projectId, userId });
  }

  @Get("ragnarock/sessions/:sessionId")
  ragnarockGetSession(
    @Param("projectId") projectId: string,
    @Param("sessionId") sessionId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.ragnarockChatService.getSessionMessages({ sessionId, projectId, userId });
  }

  @Post("ragnarock/chat")
  @HttpCode(HttpStatus.ACCEPTED)
  ragnarockChat(
    @Param("projectId") projectId: string,
    @CurrentOrganization() organizationId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: RagnarockChatMessageDto,
  ) {
    return this.ragnarockChatService.sendMessage({
      projectId,
      organizationId,
      userId,
      sessionId: dto.sessionId,
      message: dto.message,
    });
  }

  @UseGuards(ProjectRoleGuard)
  @ProjectRole(ProjectMemberRole.owner, ProjectMemberRole.admin, ProjectMemberRole.member)
  @Post("requirements/upload")
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  submitRequirementsUpload(
    @Param("projectId") projectId: string,
    @CurrentOrganization() organizationId: string,
    @CurrentUser("id") userId: string,
    @Body("sessionId") sessionId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!sessionId || typeof sessionId !== "string") {
      throw new BadRequestException("sessionId is required");
    }
    if (!file?.buffer) {
      throw new BadRequestException("file is required");
    }
    return this.aiChatTurnService.executeUploadTurn({
      projectId,
      organizationId,
      userId,
      sessionId,
      file,
    });
  }
}
