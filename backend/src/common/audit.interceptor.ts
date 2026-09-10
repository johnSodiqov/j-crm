import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly db: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    if (request.path === '/audit') return next.handle();
    const record = (statusCode: number) => this.db.auditLog.create({ data: {
      userId: request.user?.sub,
      method: request.method,
      path: request.path,
      statusCode,
      ip: request.ip,
    } }).catch(() => undefined);
    return next.handle().pipe(
      tap(() => { void record(context.switchToHttp().getResponse().statusCode || 200); }),
      catchError((error) => { void record(error.status || 500); return throwError(() => error); }),
    );
  }
}