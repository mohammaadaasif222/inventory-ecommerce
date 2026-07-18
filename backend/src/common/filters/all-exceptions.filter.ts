import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';
import { ErrorCode } from '../exceptions/app.exception';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Global filter: converts any thrown error into the canonical envelope:
 *   { success:false, data:null, message, error:{ code, details? } }
 * Never leaks stack traces to the client; logs them server-side.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.normalize(exception);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} ${body.code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} -> ${status} ${body.code}: ${body.message}`,
      );
    }

    const payload: ApiResponse<null> & { error: ErrorBody } = {
      success: false,
      data: null,
      message: body.message,
      error: body,
    };

    response.status(status).json(payload);
  }

  private normalize(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      // AppException / structured throw: { code, message, details }
      if (typeof res === 'object' && res !== null && 'code' in res) {
        const r = res as Record<string, unknown>;
        return {
          status,
          body: {
            code: String(r.code),
            message: String(r.message ?? exception.message),
            details: r.details,
          },
        };
      }

      // Nest's built-in exceptions (incl. ValidationPipe array messages)
      let message = exception.message;
      let details: unknown;
      if (typeof res === 'object' && res !== null && 'message' in res) {
        const m = (res as Record<string, unknown>).message;
        if (Array.isArray(m)) {
          message = 'Validation failed';
          details = m;
        } else if (typeof m === 'string') {
          message = m;
        }
      }
      return {
        status,
        body: { code: this.codeFromStatus(status), message, details },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Internal server error',
      },
    };
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
