import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthGuard } from './common/auth.guard';
import { RoleGuard } from './common/role.guard';
import { AuditInterceptor } from './common/audit.interceptor';
@Module({ imports: [PrismaModule, JwtModule.register({ secret: process.env.JWT_SECRET || 'change-this-secret', signOptions: { expiresIn: '8h' } })], controllers: [AppController], providers: [AppService, AuthGuard, RoleGuard, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }] }) export class AppModule {}
