import * as Joi from 'joi';

/**
 * Validates process.env at boot. Fail-fast on missing critical config.
 * Optional integration secrets are allowed to be empty in development.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(4000),
  API_PREFIX: Joi.string().default('api'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

  DATABASE_URL: Joi.string().required(),
  MONGO_URI: Joi.string().required(),
  REDIS_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().min(8).required(),
  JWT_REFRESH_SECRET: Joi.string().min(8).required(),
  JWT_ACCESS_TTL: Joi.number().default(900),
  JWT_REFRESH_TTL: Joi.number().default(60 * 60 * 24 * 14),

  GOOGLE_CLIENT_ID: Joi.string().allow('').default(''),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').default(''),
  GOOGLE_CALLBACK_URL: Joi.string().allow('').default(''),

  CONFIG_ENCRYPTION_KEY: Joi.string()
    .length(64)
    .hex()
    .required()
    .description('32-byte AES-256 key as 64 hex chars'),

  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').default(''),
  CLOUDINARY_API_KEY: Joi.string().allow('').default(''),
  CLOUDINARY_API_SECRET: Joi.string().allow('').default(''),

  AWS_ACCESS_KEY_ID: Joi.string().allow('').default(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
  AWS_S3_BUCKET: Joi.string().allow('').default(''),
  AWS_S3_REGION: Joi.string().allow('').default(''),
  AWS_S3_ENDPOINT: Joi.string().allow('').default(''),

  LOCAL_UPLOAD_DIR: Joi.string().default('uploads'),
  PUBLIC_BASE_URL: Joi.string().uri().default('http://localhost:4000'),
});
