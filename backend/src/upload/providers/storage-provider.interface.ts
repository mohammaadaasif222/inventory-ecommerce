export type StorageProviderType = 'cloudinary' | 's3' | 'local';

/** Normalised result returned by every provider after an upload. */
export interface UploadResult {
  /** Publicly reachable URL (secure_url / object URL / static path). */
  url: string;
  /** Identifier used to delete the file later (public_id | s3 key | rel path). */
  storageId: string;
  provider: StorageProviderType;
  folder: string;
  originalName: string;
  mimetype: string;
  size: number;
  width?: number;
  height?: number;
  // provider-specific extras (present when applicable)
  bucket?: string;
  key?: string;
  publicId?: string;
}

/** Response for direct-to-provider uploads (large files). */
export interface PresignedUpload {
  /** URL the client PUTs/POSTs the file to. */
  uploadUrl: string;
  /** Form fields to include (S3 POST policy); absent for PUT-style URLs. */
  fields?: Record<string, string>;
  /** HTTP method the client should use. */
  method: 'PUT' | 'POST';
  /** Key/identifier the file will live under once uploaded. */
  storageId: string;
  /** URL the file will be reachable at after a successful upload. */
  publicUrl: string;
  expiresIn: number;
}

export interface PresignOptions {
  folder: string;
  filename: string;
  mimetype: string;
  expiresIn: number;
}

/**
 * Storage abstraction implemented by Cloudinary, S3 and Local providers.
 * The active implementation is selected at runtime from the storage_config
 * row in the database (see StorageService).
 */
export interface IStorageProvider {
  readonly type: StorageProviderType;

  uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadResult>;

  deleteFile(identifier: string): Promise<void>;

  /** Time-limited read URL (S3 private objects). Optional. */
  getSignedUrl?(key: string, expiresIn: number): Promise<string>;

  /** Presigned direct-upload target for large files. Optional. */
  getPresignedUpload?(opts: PresignOptions): Promise<PresignedUpload>;

  /** Lightweight connectivity/credential check. Throws on failure. */
  testConnection(): Promise<void>;
}
