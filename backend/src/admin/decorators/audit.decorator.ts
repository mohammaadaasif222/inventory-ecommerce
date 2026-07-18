import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit_action';

export interface AuditMeta {
  action: string;
  entityType?: string;
}

/**
 * Marks a handler so the AuditInterceptor records an audit log entry after it
 * succeeds.
 * @example @Audit('STORAGE_CONFIG_UPDATED', 'StorageConfig')
 */
export const Audit = (action: string, entityType?: string) =>
  SetMetadata(AUDIT_KEY, { action, entityType } as AuditMeta);
