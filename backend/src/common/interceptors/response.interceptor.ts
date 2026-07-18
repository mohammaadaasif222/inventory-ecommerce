import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse,
  ResponseMeta,
} from '../interfaces/api-response.interface';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { RAW_RESPONSE_KEY } from '../decorators/raw-response.decorator';

/** Shape a service may return when it wants to attach pagination meta. */
interface Paginated<T> {
  data: T;
  meta: ResponseMeta;
}

function isPaginated<T>(value: unknown): value is Paginated<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value
  );
}

/**
 * Wraps every successful controller return value in the canonical
 * { success, data, message, meta? } envelope. Controllers/services return
 * plain payloads; this interceptor normalises them.
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    // Raw routes (sitemap.xml, robots.txt) bypass the envelope entirely.
    const raw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (raw) {
      return next.handle() as unknown as Observable<ApiResponse<T>>;
    }

    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'OK';

    return next.handle().pipe(
      map((payload): ApiResponse<T> => {
        if (isPaginated<T>(payload)) {
          return {
            success: true,
            data: payload.data,
            message,
            meta: payload.meta,
          };
        }
        return { success: true, data: payload ?? null, message };
      }),
    );
  }
}
