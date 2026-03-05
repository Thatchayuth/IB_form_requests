import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global HTTP Exception Filter
 * จัดการ error response ให้เป็นรูปแบบเดียวกันทั้งระบบ
 *
 * รูปแบบ response เมื่อเกิด error:
 * {
 *   success: false,
 *   statusCode: 400,
 *   message: "ข้อความ error",
 *   errors: [...],        // รายละเอียด validation errors (ถ้ามี)
 *   path: "/api/users",
 *   timestamp: "2026-03-05T10:00:00.000Z"
 * }
 *
 * ใช้ใน main.ts:
 *   app.useGlobalFilters(new HttpExceptionFilter());
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // กำหนด status code
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'เกิดข้อผิดพลาดภายในระบบ';
    let errors: string[] | null = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // กรณี ValidationPipe ส่ง error เป็น array
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || exception.message;

        // ถ้า message เป็น array (จาก class-validator)
        if (Array.isArray(responseObj.message)) {
          errors = responseObj.message;
          message = 'ข้อมูลไม่ถูกต้อง';
        }
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log error (เฉพาะ 500+ log เป็น error, อื่นๆ log เป็น warn)
    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${statusCode}: ${message}`,
        exception instanceof Error ? exception.stack : '',
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} - ${statusCode}: ${message}`);
    }

    // ส่ง response กลับ
    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      errors,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
