import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CartsService } from './carts.service';
import { CartsController } from './carts.controller';
import { AbandonedCartProcessor } from './abandoned-cart.processor';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  ABANDONED_CART_QUEUE,
  ABANDONED_CART_SWEEP_JOB,
} from './carts.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem]),
    BullModule.registerQueue({ name: ABANDONED_CART_QUEUE }),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [CartsController],
  providers: [CartsService, AbandonedCartProcessor],
  exports: [CartsService],
})
export class CartsModule implements OnModuleInit {
  constructor(
    @InjectQueue(ABANDONED_CART_QUEUE) private readonly queue: Queue,
  ) {}

  /** Sweep for idle carts every 15 minutes. */
  async onModuleInit(): Promise<void> {
    await this.queue.add(
      ABANDONED_CART_SWEEP_JOB,
      {},
      {
        repeat: { pattern: '*/15 * * * *' },
        jobId: ABANDONED_CART_SWEEP_JOB, // idempotent: one repeatable job
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }
}
