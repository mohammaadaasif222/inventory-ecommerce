/**
 * Strongly-typed namespaced config, loaded once at boot and injected via ConfigService.
 * Access with: configService.get('app.port', { infer: true })
 */
export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '4000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:4000',
  },
  database: {
    url: process.env.DATABASE_URL as string,
  },
  mongo: {
    uri: process.env.MONGO_URI as string,
  },
  redis: {
    url: process.env.REDIS_URL as string,
  },
  jwt: {
    accessSecret: process.env.JWT_SECRET as string,
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    accessTtl: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10),
    refreshTtl: parseInt(process.env.JWT_REFRESH_TTL ?? '1209600', 10),
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? '',
  },
  security: {
    configEncryptionKey: process.env.CONFIG_ENCRYPTION_KEY as string,
  },
  payments: {
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID ?? '',
      keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY ?? '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    },
  },
  chatbot: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
    model: process.env.CHATBOT_MODEL ?? 'claude-opus-4-8',
  },
  notifications: {
    smtp: {
      host: process.env.SMTP_HOST ?? '',
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ?? '',
      from: process.env.SMTP_FROM ?? 'no-reply@example.com',
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
      authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
      smsFrom: process.env.TWILIO_SMS_FROM ?? '',
      whatsappFrom: process.env.TWILIO_WHATSAPP_FROM ?? '',
    },
    fcm: {
      serverKey: process.env.FCM_SERVER_KEY ?? '',
    },
  },
  storage: {
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
      apiKey: process.env.CLOUDINARY_API_KEY ?? '',
      apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    },
    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      bucket: process.env.AWS_S3_BUCKET ?? '',
      region: process.env.AWS_S3_REGION ?? '',
      endpoint: process.env.AWS_S3_ENDPOINT ?? '',
    },
    local: {
      dir: process.env.LOCAL_UPLOAD_DIR ?? 'uploads',
    },
  },
});
