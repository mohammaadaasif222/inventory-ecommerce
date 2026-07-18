import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ShippingZone } from './entities/shipping-zone.entity';
import { ShippingMethod } from './entities/shipping-method.entity';
import { Shipment } from './entities/shipment.entity';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { TrackingProcessor } from './tracking.processor';
import {
  POLL_TRACKING_JOB,
  SHIPPING_TRACKING_QUEUE,
} from './enums/shipping.enum';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShippingZone, ShippingMethod, Shipment]),
    BullModule.registerQueue({ name: SHIPPING_TRACKING_QUEUE }),
  ],
  controllers: [ShippingController],
  providers: [ShippingService, TrackingProcessor],
  exports: [ShippingService],
})
export class ShippingModule implements OnModuleInit {
  constructor(
    @InjectQueue(SHIPPING_TRACKING_QUEUE) private readonly queue: Queue,
  ) {}

  /** Poll carrier tracking every 6 hours. */
  async onModuleInit(): Promise<void> {
    await this.queue.add(
      POLL_TRACKING_JOB,
      {},
      {
        repeat: { pattern: '0 */6 * * *' },
        jobId: POLL_TRACKING_JOB,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }
}
