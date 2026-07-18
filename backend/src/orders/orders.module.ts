import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderMailer } from './order-mailer';
import { ProductsModule } from '../products/products.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CouponsModule } from '../coupons/coupons.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    ProductsModule,
    InventoryModule,
    CouponsModule,
    // For the confirmation email: template render + queue, and resolving a
    // registered customer's address.
    NotificationsModule,
    UsersModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderMailer],
  exports: [OrdersService],
})
export class OrdersModule {}
