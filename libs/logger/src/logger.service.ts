import { Injectable, LoggerService as NestLoggerService, Scope } from "@nestjs/common";
import { winstonLogger } from "./winston.config";

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private context = "Application";

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  log(message: any, ...optionalParams: any[]): void {
    winstonLogger.info(this.formatMessage(message), {
      context: this.resolveContext(optionalParams),
    });
  }

  error(message: any, ...optionalParams: any[]): void {
    winstonLogger.error(this.formatMessage(message), {
      context: this.resolveContext(optionalParams),
      stack: this.resolveStack(optionalParams),
    });
  }

  warn(message: any, ...optionalParams: any[]): void {
    winstonLogger.warn(this.formatMessage(message), {
      context: this.resolveContext(optionalParams),
    });
  }

  debug(message: any, ...optionalParams: any[]): void {
    winstonLogger.debug(this.formatMessage(message), {
      context: this.resolveContext(optionalParams),
    });
  }

  verbose(message: any, ...optionalParams: any[]): void {
    winstonLogger.verbose(this.formatMessage(message), {
      context: this.resolveContext(optionalParams),
    });
  }

  fatal(message: any, ...optionalParams: any[]): void {
    winstonLogger.error(this.formatMessage(message), {
      context: this.resolveContext(optionalParams),
      stack: this.resolveStack(optionalParams),
      fatal: true,
    });
  }

  private formatMessage(message: any): string {
    return typeof message === "object" ? JSON.stringify(message) : String(message);
  }

  // NestJS passes context as the last string param, e.g. logger.log(msg, 'RouterExplorer')
  private resolveContext(params: any[]): string {
    const last = params[params.length - 1];
    return typeof last === "string" ? last : this.context;
  }

  // NestJS passes stack trace as second param for error calls
  private resolveStack(params: any[]): string | undefined {
    const [first] = params;
    return typeof first === "string" && first.includes("\n") ? first : undefined;
  }
}
