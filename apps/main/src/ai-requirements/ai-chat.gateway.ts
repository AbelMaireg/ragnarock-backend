import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { HttpException } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from "@nestjs/websockets";
import { PrismaService } from "@app/prisma";
import { BETTER_AUTH_INSTANCE, type AuthInstance } from "@app/auth";
import type { Server, Socket } from "socket.io";
import { ProjectAccessService } from "../project-auth/project-access.service";
import { AiChatBroadcastService } from "./ai-chat-broadcast.service";
import { AiChatTurnService } from "./ai-chat-turn.service";

function socketHandshakeHeaders(raw: Socket["handshake"]["headers"]): Headers {
  const headers = new Headers();
  const cookieVal = raw.cookie as string | string[] | undefined;
  if (cookieVal !== undefined && cookieVal !== null) {
    const cookieStr = Array.isArray(cookieVal) ? cookieVal.join("; ") : cookieVal;
    if (cookieStr) {
      headers.set("cookie", cookieStr);
    }
  }
  const authorization = raw.authorization;
  if (typeof authorization === "string") {
    headers.set("authorization", authorization);
  }
  return headers;
}

function activeOrganizationIdFromSocket(client: Socket): string | undefined {
  const sessionRecord = client.data.authSession?.session as Record<string, unknown> | undefined;
  const id = sessionRecord?.activeOrganizationId;
  return typeof id === "string" ? id : undefined;
}

function httpExceptionMessage(e: HttpException): string {
  const r = e.getResponse();
  if (typeof r === "string") {
    return r;
  }
  if (typeof r === "object" && r !== null && "message" in r) {
    const m = (r as { message?: unknown }).message;
    if (typeof m === "string") {
      return m;
    }
    if (Array.isArray(m)) {
      return m.map(String).join(", ");
    }
  }
  return e.message;
}

@Injectable()
@WebSocketGateway({
  namespace: "/ai-chat",
  cors: { origin: true, credentials: true },
})
export class AiChatGateway implements OnGatewayInit {
  private readonly logger = new Logger(AiChatGateway.name);

  constructor(
    @Inject(BETTER_AUTH_INSTANCE)
    private readonly auth: AuthInstance,
    private readonly prismaService: PrismaService,
    private readonly projectAccessService: ProjectAccessService,
    private readonly broadcastService: AiChatBroadcastService,
    private readonly turnService: AiChatTurnService,
  ) {}

  afterInit(server: Server) {
    this.broadcastService.attachServer(server);

    server.use(async (socket: Socket, next: (err?: Error) => void) => {
      try {
        const headers = socketHandshakeHeaders(socket.handshake.headers);
        const authSession = await this.auth.api.getSession({ headers });
        if (!authSession?.user?.id || typeof authSession.user.id !== "string") {
          return next(new Error("Unauthorized"));
        }
        socket.data.userId = authSession.user.id;
        socket.data.authSession = authSession;
        next();
      } catch (err) {
        this.logger.warn(`WS auth failed: ${err instanceof Error ? err.message : err}`);
        next(err instanceof Error ? err : new Error("Unauthorized"));
      }
    });
  }

  @SubscribeMessage("join_session")
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId?: string },
  ) {
    try {
      const sessionId = payload?.sessionId;
      if (!sessionId || typeof sessionId !== "string") {
        return { ok: false as const, code: "INVALID_PAYLOAD", message: "sessionId is required" };
      }

      const userId = client.data.userId as string;
      const organizationId = activeOrganizationIdFromSocket(client);
      if (!organizationId) {
        throw new ForbiddenException("Active organization is required");
      }

      const chatSession = await this.prismaService.projectAiChatSession.findFirst({
        where: { id: sessionId },
        include: { project: { select: { id: true, organizationId: true } } },
      });

      if (!chatSession) {
        throw new NotFoundException("Chat session not found");
      }

      if (chatSession.project.organizationId !== organizationId) {
        throw new ForbiddenException("Chat session is not in the active organization");
      }

      await this.projectAccessService.validateProjectMembership({
        projectId: chatSession.projectId,
        userId,
        organizationId,
      });

      const room = `${chatSession.projectId}:${sessionId}`;
      await client.join(room);
      return { ok: true as const, room };
    } catch (e) {
      const message =
        e instanceof ForbiddenException || e instanceof NotFoundException
          ? e.message
          : e instanceof Error
            ? e.message
            : "Join failed";
      return { ok: false as const, code: "JOIN_FAILED", message };
    }
  }

  @SubscribeMessage("leave_session")
  async handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { projectId?: string; sessionId?: string },
  ) {
    const projectId = payload?.projectId;
    const sessionId = payload?.sessionId;
    if (!projectId || !sessionId) {
      return { ok: false as const, message: "projectId and sessionId are required" };
    }
    await client.leave(`${projectId}:${sessionId}`);
    return { ok: true as const };
  }

  @SubscribeMessage("submit_turn")
  async handleSubmitTurn(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { sessionId?: string; input?: string; type?: "text" | "url" },
  ) {
    try {
      const sessionId = payload?.sessionId;
      const input = payload?.input;
      const type = payload?.type;
      if (!sessionId || typeof sessionId !== "string") {
        return { ok: false as const, code: "INVALID_PAYLOAD", message: "sessionId is required" };
      }
      if (!input || typeof input !== "string") {
        return { ok: false as const, code: "INVALID_PAYLOAD", message: "input is required" };
      }
      if (type !== "text" && type !== "url") {
        return { ok: false as const, code: "INVALID_PAYLOAD", message: "type must be text or url" };
      }

      const userId = client.data.userId as string;
      const organizationId = activeOrganizationIdFromSocket(client);
      if (!organizationId) {
        throw new ForbiddenException("Active organization is required");
      }

      const chatSession = await this.prismaService.projectAiChatSession.findFirst({
        where: { id: sessionId },
        select: { projectId: true },
      });
      if (!chatSession) {
        throw new NotFoundException("Chat session not found");
      }

      const queued = await this.turnService.executeTextOrUrlTurn({
        projectId: chatSession.projectId,
        organizationId,
        userId,
        sessionId,
        input,
        type,
      });

      return { ok: true as const, ...queued };
    } catch (e) {
      const message =
        e instanceof HttpException
          ? httpExceptionMessage(e)
          : e instanceof Error
            ? e.message
            : "Turn failed";
      const code = e instanceof HttpException ? e.getStatus() : "TURN_FAILED";
      client.emit("error", { code, message });
      return { ok: false as const, code: String(code), message };
    }
  }
}
