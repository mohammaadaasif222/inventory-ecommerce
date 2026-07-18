import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TICKET_SLA_QUEUE } from './enums/ticket.enum';
import { TicketsService } from './tickets.service';

/** Periodically flags SLA breaches and alerts assignees. */
@Processor(TICKET_SLA_QUEUE)
export class SlaProcessor extends WorkerHost {
  private readonly logger = new Logger(SlaProcessor.name);

  constructor(private readonly tickets: TicketsService) {
    super();
  }

  async process(job: Job): Promise<{ breached: number }> {
    const result = await this.tickets.checkSlaBreaches();
    if (result.breached > 0) {
      this.logger.warn(`[${job.name}] flagged ${result.breached} SLA breach(es)`);
    }
    return result;
  }
}
