import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Ticket } from './entities/ticket.entity';
import { TicketNote } from './entities/ticket-note.entity';
import { SlaConfig } from './entities/sla-config.entity';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { SlaProcessor } from './sla.processor';
import { TICKET_SLA_JOB, TICKET_SLA_QUEUE } from './enums/ticket.enum';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketNote, SlaConfig]),
    BullModule.registerQueue({ name: TICKET_SLA_QUEUE }),
    NotificationsModule,
    UsersModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService, SlaProcessor],
  exports: [TicketsService],
})
export class TicketsModule implements OnModuleInit {
  constructor(
    @InjectQueue(TICKET_SLA_QUEUE) private readonly queue: Queue,
  ) {}

  /** Check SLA breaches every 15 minutes. */
  async onModuleInit(): Promise<void> {
    await this.queue.add(
      TICKET_SLA_JOB,
      {},
      {
        repeat: { pattern: '*/15 * * * *' },
        jobId: TICKET_SLA_JOB,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }
}
