import { Global, Module } from "@nestjs/common";
import { LoggerService } from "./logger.service";
import { RequestLoggingInterceptor } from "./request-logging.interceptor";

@Global()
@Module({
  providers: [LoggerService, RequestLoggingInterceptor],
  exports: [LoggerService, RequestLoggingInterceptor],
})
export class LoggerModule {}
