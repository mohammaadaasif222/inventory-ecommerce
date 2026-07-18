import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

/**
 * TypeORM (PostgreSQL) connection factory.
 * autoLoadEntities picks up every entity registered via TypeOrmModule.forFeature().
 * synchronize is enabled in development only — use migrations in production.
 */
export const typeOrmConfigFactory = (
  config: ConfigService,
): TypeOrmModuleOptions => {
  const isProd = config.get<string>('app.nodeEnv') === 'production';
  return {
    type: 'postgres',
    url: config.get<string>('database.url'),
    autoLoadEntities: true,
    synchronize: !isProd,
    logging: false,
    namingStrategy: undefined,
  };
};
