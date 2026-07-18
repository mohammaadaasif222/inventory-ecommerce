import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { LOW_STOCK_QUEUE } from './inventory.constants';
import { InventoryService } from './inventory.service';

/**
 * Processes the daily low-stock digest job. Gathers every SKU at/below its
 * threshold and (in Phase 3) hands the list to NotificationsModule for an
 * email digest. For now it logs the summary.
 */
@Processor(LOW_STOCK_QUEUE)
export class LowStockProcessor extends WorkerHost {
  private readonly logger = new Logger(LowStockProcessor.name);

  constructor(private readonly inventory: InventoryService) {
    super();
  }

  async process(job: Job): Promise<{ count: number }> {
    const items = await this.inventory.lowStockItems();
    this.logger.warn(
      `[${job.name}] ${items.length} SKU(s) at/below threshold` +
        (items.length
          ? `: ${items.map((i) => `${i.sku}(${i.quantity})`).join(', ')}`
          : ''),
    );
    // TODO(Phase 3): enqueue NotificationsModule email digest with `items`.
    return { count: items.length };
  }
}
