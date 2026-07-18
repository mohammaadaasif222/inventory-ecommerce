import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLog } from './entities/audit-log.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuditInterceptor } from './interceptors/audit.interceptor';

/**
 * Global so the AuditInterceptor (registered app-wide) and AdminService are
 * available to handlers in every module that use the @Audit() decorator.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AdminController],
  providers: [
    AdminService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AdminService],
})
export class AdminModule {}
