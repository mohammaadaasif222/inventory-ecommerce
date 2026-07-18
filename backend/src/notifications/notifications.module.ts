import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from './schemas/notification-template.schema';
import {
  NotificationLog,
  NotificationLogSchema,
} from './schemas/notification-log.schema';
import {
  NotificationPreference,
  NotificationPreferenceSchema,
} from './schemas/notification-preference.schema';
import { NOTIFICATION_QUEUES } from './enums/notification.enum';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsTransport } from './notifications.transport';
import {
  EmailProcessor,
  PushProcessor,
  SmsProcessor,
  WhatsAppProcessor,
} from './notifications.processors';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: NotificationLog.name, schema: NotificationLogSchema },
      {
        name: NotificationPreference.name,
        schema: NotificationPreferenceSchema,
      },
    ]),
    BullModule.registerQueue(
      { name: NOTIFICATION_QUEUES.EMAIL },
      { name: NOTIFICATION_QUEUES.SMS },
      { name: NOTIFICATION_QUEUES.PUSH },
      { name: NOTIFICATION_QUEUES.WHATSAPP },
    ),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsTransport,
    EmailProcessor,
    SmsProcessor,
    PushProcessor,
    WhatsAppProcessor,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
