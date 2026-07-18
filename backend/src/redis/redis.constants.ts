/**
 * Injection token for the singleton ioredis client. Kept in its own file so the
 * module and the service can both import it without a circular dependency
 * (which would resolve the token to `undefined` at runtime).
 */
export const REDIS_CLIENT = 'REDIS_CLIENT';
