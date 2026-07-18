import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SHIPPING_TRACKING_QUEUE } from './enums/shipping.enum';
import { ShippingService } from './shipping.service';

/**
 * Polls in-flight shipments for status updates. Carrier integrations
 * (Shiprocket / Delhivery) plug in at the marked TODO — for now it records the
 * poll timestamp without changing status.
 */
@Processor(SHIPPING_TRACKING_QUEUE)
export class TrackingProcessor extends WorkerHost {
  private readonly logger = new Logger(TrackingProcessor.name);

  constructor(private readonly shipping: ShippingService) {
    super();
  }

  async process(job: Job): Promise<{ polled: number }> {
    const shipments = await this.shipping.activeShipments();
    this.logger.log(`[${job.name}] polling ${shipments.length} shipment(s)`);
    for (const s of shipments) {
      // TODO: call carrier API (Shiprocket/Delhivery) with s.trackingNumber
      // and map the response to a ShipmentStatus. For now: record the poll.
      await this.shipping.markPolled(s.id, s.status);
    }
    return { polled: shipments.length };
  }
}
