import { All, Controller, Inject, Req, Res } from "@nestjs/common";
import { toNodeHandler } from "better-auth/node";
import { Request, Response } from "express";
import { Public } from "./decorators/public.decorator";
import { BETTER_AUTH_INSTANCE } from "./auth.tokens";
import { AuthInstance } from "./auth.types";

@Public()
@Controller("api/auth")
export class AuthController {
  constructor(
    @Inject(BETTER_AUTH_INSTANCE)
    private readonly auth: AuthInstance,
  ) {}

  @All("*path")
  async handleAuth(@Req() req: Request, @Res() res: Response): Promise<void> {
    await toNodeHandler(this.auth)(req, res);
  }
}
