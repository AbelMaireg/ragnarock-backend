import { Injectable } from "@nestjs/common";
import type { Server } from "socket.io";

@Injectable()
export class AiChatBroadcastService {
  private server: Server | null = null;

  attachServer(server: Server) {
    this.server = server;
  }

  emitToProjectSession(projectId: string, sessionId: string, event: string, payload: unknown) {
    const room = `${projectId}:${sessionId}`;
    this.server?.to(room).emit(event, payload);
  }

  /** Broadcast to all sockets subscribed to any session in the project. */
  emitToProject(projectId: string, event: string, payload: unknown) {
    this.server?.to(projectId).emit(event, payload);
  }
}
