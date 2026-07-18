import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  NOTIFICATION_QUEUES,
  NotificationChannel,
  NotificationStatus,
} from './enums/notification.enum';
import { NotificationsTransport } from './notifications.transport';
import { NotificationsService } from './notifications.service';
import { NotificationJob } from './dto/notification.dto';

/** Shared delivery logic; one concrete subclass per channel queue. */
abstract class BaseChannelProcessor extends WorkerHost {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly transport: NotificationsTransport,
    protected readonly service: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<NotificationJob>): Promise<void> {
    const { logId, channel, to, subject, body } = job.data;
    try {
      await this.transport.send(channel, { to, subject, body });
      await this.service.markResult(logId, NotificationStatus.SENT);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Delivery failed for ${channel} → ${to}: ${message}`);
      await this.service.markResult(
        logId,
        NotificationStatus.FAILED,
        message,
      );
      throw err; // let BullMQ retry per job options
    }
  }
}

@Processor(NOTIFICATION_QUEUES[NotificationChannel.EMAIL])
export class EmailProcessor extends BaseChannelProcessor {}

@Processor(NOTIFICATION_QUEUES[NotificationChannel.SMS])
export class SmsProcessor extends BaseChannelProcessor {}

@Processor(NOTIFICATION_QUEUES[NotificationChannel.PUSH])
export class PushProcessor extends BaseChannelProcessor {}

@Processor(NOTIFICATION_QUEUES[NotificationChannel.WHATSAPP])
export class WhatsAppProcessor extends BaseChannelProcessor {}
