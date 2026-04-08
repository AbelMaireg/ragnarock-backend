import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthUser } from "../auth.types";

export const CurrentUser = createParamDecorator(
  <TField extends keyof AuthUser | undefined>(field: TField, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!field) {
      return user;
    }
    return user?.[field];
  },
);
