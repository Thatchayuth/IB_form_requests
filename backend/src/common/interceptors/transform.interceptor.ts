import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * รูปแบบ Response มาตรฐานของระบบ
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

/**
 * Transform Interceptor
 * ครอบ response สำเร็จให้เป็นรูปแบบเดียวกันทั้งระบบ
 *
 * รูปแบบ response สำเร็จ:
 * {
 *   success: true,
 *   data: { ... },
 *   timestamp: "2026-03-05T10:00:00.000Z"
 * }
 *
 * ใช้ใน main.ts:
 *   app.useGlobalInterceptors(new TransformInterceptor());
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
