import { applyDecorators, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../guards/auth.guard";

export const Auth = (): MethodDecorator & ClassDecorator => applyDecorators(UseGuards(AuthGuard));
