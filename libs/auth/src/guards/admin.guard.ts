import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const role = (request.user as { role?: string } | undefined)?.role;

    if (role === "admin") {
      return true;
    }

    throw new ForbiddenException("Admin access required");
  }
}
