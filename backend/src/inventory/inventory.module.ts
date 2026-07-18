import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Warehouse } from './entities/warehouse.entity';
import { StockItem } from './entities/stock-item.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { LowStockProcessor } from './low-stock.processor';
import {
  LOW_STOCK_DIGEST_JOB,
  LOW_STOCK_QUEUE,
} from './inventory.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Warehouse, StockItem, StockMovement]),
    BullModule.registerQueue({ name: LOW_STOCK_QUEUE }),
  ],
  controllers: [InventoryController],
  providers: [InventoryService, LowStockProcessor],
  exports: [InventoryService],
})
export class InventoryModule implements OnModuleInit {
  constructor(
    @InjectQueue(LOW_STOCK_QUEUE) private readonly queue: Queue,
  ) {}

  /** Schedule the daily low-stock digest (08:00 server time) on boot. */
  async onModuleInit(): Promise<void> {
    await this.queue.add(
      LOW_STOCK_DIGEST_JOB,
      {},
      {
        repeat: { pattern: '0 8 * * *' },
        jobId: LOW_STOCK_DIGEST_JOB, // idempotent: one repeatable job
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }
}
