import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

// ANSI color codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req: Request = context.switchToHttp().getRequest();
    const res: Response = context.switchToHttp().getResponse();

    const method = req.method;
    const url = req.originalUrl ?? req.url;
    // Ưu tiên X-Forwarded-For khi đứng sau reverse proxy (nginx trên VPS)
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.ip ?? '-';
    // Lấy userId từ JWT payload nếu đã qua AuthGuard
    const userId: string = (req as any)?.user?.id ?? '-';
    const now = Date.now();

    const buildLog = (statusCode: number) => {
      const duration = Date.now() - now;
      const timestamp = new Date().toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour12: false,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      // Màu theo status code
      let statusColor: string;
      if (statusCode >= 500) statusColor = RED;
      else if (statusCode >= 400) statusColor = YELLOW;
      else if (statusCode >= 300) statusColor = CYAN;
      else statusColor = GREEN;

      // Màu theo HTTP method
      const methodColors: Record<string, string> = {
        GET: GREEN,
        POST: CYAN,
        PATCH: YELLOW,
        PUT: YELLOW,
        DELETE: RED,
      };
      const methodColor = methodColors[method] ?? RESET;

      const line = [
        `${DIM}[${timestamp}]${RESET}`,
        `${statusColor}${BOLD}${statusCode}${RESET}`,
        `${methodColor}${method.padEnd(7)}${RESET}`,
        url,
        `${DIM}${duration}ms | ip:${ip} | uid:${userId}${RESET}`,
      ].join('  ');

      return { line, isError: statusCode >= 400 };
    };

    return next.handle().pipe(
      tap(() => {
        const { line, isError } = buildLog(res.statusCode);
        if (isError) {
          console.error(line);
        } else {
          console.log(line);
        }
      }),
      catchError((err) => {
        const statusCode = err?.status ?? err?.statusCode ?? 500;
        const { line } = buildLog(statusCode);
        console.error(line);
        return throwError(() => err);
      }),
    );
  }
}
