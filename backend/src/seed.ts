import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import { UsersService } from './users/users.service';
import { Role } from './common/enums/role.enum';
import { seedCatalog } from './seed/catalog.seed';
import { seedStorefront } from './seed/storefront.seed';

/**
 * One-shot seed: ensures a SUPER_ADMIN account exists so you can log into the
 * admin panel, then fills a demo catalog (categories, brands, products,
 * stock, reviews). Run with `npm run seed` (infra must be up).
 *   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD override the admin defaults.
 *   SEED_SKIP_CATALOG=1 seeds only the admin account.
 */
async function seed(): Promise<void> {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const users = app.get(UsersService);
  const auth = app.get(AuthService);

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';

  const existing = await users.findByEmail(email);
  if (existing) {
    logger.log(`Super-admin already exists: ${email}`);
  } else {
    await auth.register({
      email,
      password,
      firstName: 'Super',
      lastName: 'Admin',
    });
    const created = await users.findByEmail(email);
    if (created) {
      await users.assignRoles(created.id, { roles: [Role.SUPER_ADMIN] });
    }
    logger.log('──────────────────────────────────────────────');
    logger.log(`✅ Super-admin created`);
    logger.log(`   email:    ${email}`);
    logger.log(`   password: ${password}`);
    logger.log('   (change these via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)');
    logger.log('──────────────────────────────────────────────');
  }

  if (process.env.SEED_SKIP_CATALOG !== '1') {
    await seedCatalog(app, logger);
    // Runs after the catalog: featured rails reference seeded product ids.
    await seedStorefront(app, logger);
  }

  await app.close();
  process.exit(0);
}

void seed();
