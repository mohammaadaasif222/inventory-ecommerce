import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';

import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { typeOrmConfigFactory } from './config/typeorm.config';

import { CommonModule } from './common/common.module';
import { RedisModule } from './redis/redis.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UploadModule } from './upload/upload.module';
import { WebsiteConfigModule } from './website-config/website-config.module';
import { AdminModule } from './admin/admin.module';
import { CatalogModule } from './catalog/catalog.module';
import { ProductsModule } from './products/products.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { InventoryModule } from './inventory/inventory.module';
import { CartsModule } from './carts/carts.module';
import { CouponsModule } from './coupons/coupons.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ShippingModule } from './shipping/shipping.module';
import { ChatModule } from './chat/chat.module';
import { TicketsModule } from './tickets/tickets.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HomepageBuilderModule } from './homepage-builder/homepage-builder.module';
import { PagesModule } from './pages/pages.module';
import { SeoModule } from './seo/seo.module';
import { PopupsModule } from './popups/popups.module';
import { ThemesModule } from './themes/themes.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      // allowUnknown: keep OS/system env vars (PATH, etc.); only validate ours.
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),

    // PostgreSQL (relational: users, orders, inventory, storage_config, ...)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: typeOrmConfigFactory,
    }),

    // MongoDB (flexible: chat, logs, CMS content)
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongo.uri'),
      }),
    }),

    // BullMQ (background jobs: emails, notifications, stock sync)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get<string>('redis.url') as string);
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            password: url.password || undefined,
          },
        };
      },
    }),

    CommonModule,
    RedisModule,

    // Phase 1 — Foundation
    AuthModule,
    UsersModule,
    UploadModule,
    WebsiteConfigModule,
    AdminModule,

    // Phase 2 — Commerce Core
    CatalogModule,
    ProductsModule,
    ReviewsModule,
    WishlistModule,
    InventoryModule,
    CartsModule,
    CouponsModule,
    OrdersModule,
    PaymentsModule,
    ShippingModule,

    // Phase 3 — Support & Chat
    NotificationsModule,
    ChatModule,
    TicketsModule,
    KnowledgeBaseModule,

    // Phase 4 — Marketing & CMS
    HomepageBuilderModule,
    PagesModule,
    SeoModule,
    PopupsModule,
    // The theme engine: installed packages, the active switch, customiser
    // state and the rollback stack.
    ThemesModule,

    // Phase 5 — Intelligence
    AnalyticsModule,
    RecommendationsModule,
    ChatbotModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: authenticate first, then authorize by role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
