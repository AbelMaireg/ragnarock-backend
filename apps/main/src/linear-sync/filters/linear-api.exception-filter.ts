import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import { LinearApiError } from "../errors/linear-api.error";

@Catch(LinearApiError)
export class LinearApiExceptionFilter implements ExceptionFilter {
  catch(exception: LinearApiError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.statusCode ?? HttpStatus.BAD_GATEWAY;
    response.status(status).json({
      statusCode: status,
      message: exception.message,
    });
  }
}
