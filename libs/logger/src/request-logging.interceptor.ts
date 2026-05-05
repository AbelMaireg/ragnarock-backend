import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { finalize } from "rxjs/operators";
import { LoggerService } from "./logger.service";

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<{
      method?: string;
      originalUrl?: string;
      url?: string;
    }>();
    const response = httpContext.getResponse<{ statusCode?: number }>();
    const startedAt = Date.now();
    const method = request?.method ?? "UNKNOWN";
    const path = request?.originalUrl ?? request?.url ?? "/";

    this.logger.log(`${method} ${path} - incoming`, RequestLoggingInterceptor.name);

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Date.now() - startedAt;
        const statusCode = response?.statusCode ?? 0;

        this.logger.log(
          `${method} ${path} - ${statusCode} (${durationMs}ms)`,
          RequestLoggingInterceptor.name,
        );
      }),
    );
  }
}
