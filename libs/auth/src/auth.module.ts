import { MailerService } from "@app/mailer";
import { PrismaService } from "@app/prisma";
import { Global, Inject, Module, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { RedisClientType } from "redis";
import { AuthController } from "./auth.controller";
import { createBetterAuthInstance } from "./auth.instance";
import { AuthService } from "./auth.service";
import { AUTH_REDIS_CLIENT, AUTH_SECONDARY_STORAGE, BETTER_AUTH_INSTANCE } from "./auth.tokens";
import { AuthGuard } from "./guards/auth.guard";
import { createAuthRedisClient, createAuthSecondaryStorage } from "./redis/auth-redis.provider";

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createAuthRedisClient(configService),
    },
    {
      provide: AUTH_SECONDARY_STORAGE,
      inject: [AUTH_REDIS_CLIENT],
      useFactory: (redisClient: RedisClientType) => createAuthSecondaryStorage(redisClient),
    },
    {
      provide: BETTER_AUTH_INSTANCE,
      inject: [ConfigService, PrismaService, AUTH_SECONDARY_STORAGE, MailerService],
      useFactory: (
        configService: ConfigService,
        prismaService: PrismaService,
        secondaryStorage: ReturnType<typeof createAuthSecondaryStorage>,
        mailerService: MailerService,
      ) =>
        createBetterAuthInstance(
          {
            secret: configService.getOrThrow<string>("auth.secret"),
            url: configService.getOrThrow<string>("auth.url"),
            basePath: configService.get<string>("auth.basePath", "/api/auth"),
            sessionExpiresInSeconds: configService.get<number>(
              "auth.sessionExpiresInSeconds",
              604800,
            ),
            sessionUpdateAgeSeconds: configService.get<number>(
              "auth.sessionUpdateAgeSeconds",
              86400,
            ),
            useSecureCookies: configService.get<boolean>("auth.useSecureCookies", false),
            appName: configService.get<string>("auth.appName", "Makeup App"),
            emailOtp: {
              otpLength: configService.get<number>("auth.emailOtp.otpLength", 6),
              expiresIn: configService.get<number>("auth.emailOtp.expiresIn", 300),
              allowedAttempts: configService.get<number>("auth.emailOtp.allowedAttempts", 3),
              resendStrategy: configService.get<"rotate" | "reuse">(
                "auth.emailOtp.resendStrategy",
                "rotate",
              ),
              sendVerificationOnSignUp: configService.get<boolean>(
                "auth.emailOtp.sendVerificationOnSignUp",
                false,
              ),
              disableSignUp: configService.get<boolean>("auth.emailOtp.disableSignUp", false),
              storeOTP: configService.get<"plain" | "encrypted" | "hashed">(
                "auth.emailOtp.storeOTP",
                "encrypted",
              ),
              overrideDefaultEmailVerification: configService.get<boolean>(
                "auth.emailOtp.overrideDefaultEmailVerification",
                false,
              ),
              changeEmail: {
                enabled: configService.get<boolean>("auth.emailOtp.changeEmail.enabled", false),
                verifyCurrentEmail: configService.get<boolean>(
                  "auth.emailOtp.changeEmail.verifyCurrentEmail",
                  false,
                ),
              },
            },
          },
          prismaService,
          secondaryStorage,
          mailerService,
        ),
    },
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [BETTER_AUTH_INSTANCE, AuthService],
})
export class AuthModule implements OnModuleDestroy {
  constructor(@Inject(AUTH_REDIS_CLIENT) private readonly redisClient: RedisClientType) {}

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient.isOpen) {
      await this.redisClient.quit();
    }
  }
}
