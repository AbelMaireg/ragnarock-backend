import { Inject, Injectable } from "@nestjs/common";
import { BETTER_AUTH_INSTANCE } from "./auth.tokens";
import { AuthInstance } from "./auth.types";

@Injectable()
export class AuthService {
  constructor(
    @Inject(BETTER_AUTH_INSTANCE)
    private readonly auth: AuthInstance,
  ) {}

  get instance(): AuthInstance {
    return this.auth;
  }

  getSession(headers: Headers): Promise<unknown> {
    return this.auth.api.getSession({ headers });
  }
}
