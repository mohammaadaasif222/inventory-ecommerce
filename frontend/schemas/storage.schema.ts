import { z } from 'zod';

/**
 * Storage-config form schema (Zod). Mirrors the backend UpdateStorageConfigDto.
 * Secrets are optional on update — leaving them blank keeps the stored value.
 * Conditional `superRefine` enforces required non-secret fields per provider.
 */
export const storageProviderEnum = z.enum(['cloudinary', 's3', 'local']);
export type StorageProvider = z.infer<typeof storageProviderEnum>;

export const storageConfigSchema = z
  .object({
    provider: storageProviderEnum,
    cloudinaryCloudName: z.string().optional().default(''),
    cloudinaryApiKey: z.string().optional().default(''),
    cloudinaryApiSecret: z.string().optional().default(''),
    s3AccessKey: z.string().optional().default(''),
    s3SecretKey: z.string().optional().default(''),
    s3Bucket: z.string().optional().default(''),
    s3Region: z.string().optional().default(''),
    s3Endpoint: z.string().optional().default(''),
    isActive: z.boolean().optional().default(true),
  })
  .superRefine((val, ctx) => {
    if (val.provider === 'cloudinary' && !val.cloudinaryCloudName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cloudinaryCloudName'],
        message: 'Cloud name is required for Cloudinary',
      });
    }
    if (val.provider === 's3') {
      if (!val.s3Bucket) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['s3Bucket'],
          message: 'Bucket is required for S3',
        });
      }
      if (!val.s3Region && !val.s3Endpoint) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['s3Region'],
          message: 'Region (or a custom endpoint) is required for S3',
        });
      }
    }
  });

export type StorageConfigFormValues = z.infer<typeof storageConfigSchema>;

/** Secret-masked view returned by GET /upload/storage-config. */
export interface StorageConfigView {
  id: string;
  provider: StorageProvider;
  isActive: boolean;
  cloudinaryCloudName: string | null;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  s3AccessKey: string;
  s3SecretKey: string;
  s3Bucket: string | null;
  s3Region: string | null;
  s3Endpoint: string | null;
  updatedBy: string | null;
  updatedAt: string;
}
