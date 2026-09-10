import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const path = request.path || request.originalUrl || '';

    if (path === '/auth/login' || request.method === 'OPTIONS') return true;

    const authHeader = request.headers.authorization || request.headers.Authorization;
    const token = typeof authHeader === 'string'
      ? authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader.trim()
      : '';

    if (!token) throw new UnauthorizedException('Требуется авторизация');

    try {
      request.user = this.jwt.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('Недействительный токен');
    }
  }
}
