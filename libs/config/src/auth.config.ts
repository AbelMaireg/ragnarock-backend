import { registerAs } from "@nestjs/config";
import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsString, Min, MinLength } from "class-validator";
import { validateConfig } from "./validate-config";

class AuthEnvironmentVariables {
  @IsString()
  @MinLength(32)
  BETTER_AUTH_SECRET!: string;

  @IsString()
  BETTER_AUTH_URL!: string;

  /** Public web app origin for links in emails (invitations). Example: http://localhost:3000 */
  @IsString()
  AUTH_PUBLIC_APP_URL = "http://localhost:3000";

  @IsString()
  BETTER_AUTH_BASE_PATH = "/api/auth";

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  SESSION_EXPIRES_IN_SECONDS = 604800;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  SESSION_UPDATE_AGE_SECONDS = 86400;

  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  AUTH_USE_SECURE_COOKIES = false;

  /** Comma-separated list of origins that can make auth requests (CSRF whitelist). */
  @IsString()
  AUTH_TRUSTED_ORIGINS =
    "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,http://main.localhost,http://admin.localhost,http://app.localhost";

  /** Parent domain for cross-subdomain cookies, e.g. "localhost" or "example.com". Empty disables. */
  @IsString()
  AUTH_COOKIE_DOMAIN = "localhost";

  /**
   * Force cookies to use SameSite=None; Secure so they're sent on cross-site XHR.
   * Safe for local dev because browsers treat *.localhost as a secure context.
   */
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  AUTH_CROSS_SITE_COOKIES = true;

  @IsString()
  AUTH_APP_NAME = "Application";

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(4)
  AUTH_EMAIL_OTP_LENGTH = 6;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(30)
  AUTH_EMAIL_OTP_EXPIRES_IN_SECONDS = 300;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  AUTH_EMAIL_OTP_ALLOWED_ATTEMPTS = 3;

  @IsString()
  @IsIn(["rotate", "reuse"])
  AUTH_EMAIL_OTP_RESEND_STRATEGY: "rotate" | "reuse" = "rotate";

  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  AUTH_EMAIL_OTP_SEND_ON_SIGNUP = false;

  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  AUTH_EMAIL_OTP_DISABLE_SIGNUP = false;

  @IsString()
  @IsIn(["plain", "encrypted", "hashed"])
  AUTH_EMAIL_OTP_STORE: "plain" | "encrypted" | "hashed" = "encrypted";

  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  AUTH_EMAIL_OTP_OVERRIDE_DEFAULT_EMAIL_VERIFICATION = false;

  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  AUTH_EMAIL_OTP_CHANGE_EMAIL_ENABLED = false;

  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  AUTH_EMAIL_OTP_CHANGE_EMAIL_VERIFY_CURRENT = false;
}

export default registerAs("auth", () => {
  const env = validateConfig(AuthEnvironmentVariables, process.env);

  return {
    secret: env.BETTER_AUTH_SECRET,
    url: env.BETTER_AUTH_URL,
    publicAppUrl: (env.AUTH_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
    basePath: env.BETTER_AUTH_BASE_PATH,
    sessionExpiresInSeconds: env.SESSION_EXPIRES_IN_SECONDS,
    sessionUpdateAgeSeconds: env.SESSION_UPDATE_AGE_SECONDS,
    useSecureCookies: env.AUTH_USE_SECURE_COOKIES,
    trustedOrigins: env.AUTH_TRUSTED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    cookieDomain: env.AUTH_COOKIE_DOMAIN.trim() || undefined,
    crossSiteCookies: env.AUTH_CROSS_SITE_COOKIES,
    appName: env.AUTH_APP_NAME,
    emailOtp: {
      otpLength: env.AUTH_EMAIL_OTP_LENGTH,
      expiresIn: env.AUTH_EMAIL_OTP_EXPIRES_IN_SECONDS,
      allowedAttempts: env.AUTH_EMAIL_OTP_ALLOWED_ATTEMPTS,
      resendStrategy: env.AUTH_EMAIL_OTP_RESEND_STRATEGY,
      sendVerificationOnSignUp: env.AUTH_EMAIL_OTP_SEND_ON_SIGNUP,
      disableSignUp: env.AUTH_EMAIL_OTP_DISABLE_SIGNUP,
      storeOTP: env.AUTH_EMAIL_OTP_STORE,
      overrideDefaultEmailVerification: env.AUTH_EMAIL_OTP_OVERRIDE_DEFAULT_EMAIL_VERIFICATION,
      changeEmail: {
        enabled: env.AUTH_EMAIL_OTP_CHANGE_EMAIL_ENABLED,
        verifyCurrentEmail: env.AUTH_EMAIL_OTP_CHANGE_EMAIL_VERIFY_CURRENT,
      },
    },
  };
});
