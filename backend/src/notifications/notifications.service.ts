import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Model } from 'mongoose';
import { Queue } from 'bullmq';
import * as Handlebars from 'handlebars';
import {
  NotificationTemplate,
  NotificationTemplateDocument,
} from './schemas/notification-template.schema';
import {
  NotificationLog,
  NotificationLogDocument,
} from './schemas/notification-log.schema';
import {
  NotificationPreference,
  NotificationPreferenceDocument,
} from './schemas/notification-preference.schema';
import {
  NOTIFICATION_QUEUES,
  NotificationChannel,
  NotificationStatus,
} from './enums/notification.enum';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';
import {
  NotificationJob,
  SendNotificationDto,
  UpdatePreferenceDto,
  UpsertTemplateDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(NotificationTemplate.name)
    private readonly templates: Model<NotificationTemplateDocument>,
    @InjectModel(NotificationLog.name)
    private readonly logs: Model<NotificationLogDocument>,
    @InjectModel(NotificationPreference.name)
    private readonly prefs: Model<NotificationPreferenceDocument>,
    @InjectQueue(NOTIFICATION_QUEUES.EMAIL) private readonly emailQ: Queue,
    @InjectQueue(NOTIFICATION_QUEUES.SMS) private readonly smsQ: Queue,
    @InjectQueue(NOTIFICATION_QUEUES.PUSH) private readonly pushQ: Queue,
    @InjectQueue(NOTIFICATION_QUEUES.WHATSAPP)
    private readonly whatsappQ: Queue,
  ) {}

  // ── templates ──
  async upsertTemplate(
    dto: UpsertTemplateDto,
  ): Promise<NotificationTemplate> {
    return this.templates
      .findOneAndUpdate({ key: dto.key }, dto, { upsert: true, new: true })
      .lean();
  }
  listTemplates(): Promise<NotificationTemplate[]> {
    return this.templates.find().sort({ key: 1 }).lean();
  }
  async removeTemplate(key: string): Promise<void> {
    await this.templates.deleteOne({ key });
  }

  // ── preferences ──
  async getPreferences(userId: string): Promise<NotificationPreference> {
    const existing = await this.prefs.findOne({ userId }).lean();
    if (existing) return existing;
    return this.prefs.create({ userId });
  }
  async updatePreferences(
    userId: string,
    dto: UpdatePreferenceDto,
  ): Promise<NotificationPreference> {
    return this.prefs
      .findOneAndUpdate({ userId }, dto, { upsert: true, new: true })
      .lean();
  }

  // ── logs ──
  listLogs(limit = 50): Promise<NotificationLog[]> {
    return this.logs.find().sort({ createdAt: -1 }).limit(limit).lean();
  }

  /**
   * Render a template and enqueue delivery on the channel's queue. Respects the
   * user's channel preference. Fire-and-forget: callers don't await delivery.
   */
  async send(dto: SendNotificationDto): Promise<{ logId: string; queued: boolean }> {
    const template = await this.templates.findOne({
      key: dto.templateKey,
      channel: dto.channel,
      isActive: true,
    });
    if (!template) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        `No active template "${dto.templateKey}" for ${dto.channel}`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Respect user preference.
    if (dto.userId && !(await this.channelEnabled(dto.userId, dto.channel))) {
      await this.logs.create({
        channel: dto.channel,
        to: dto.to,
        templateKey: dto.templateKey,
        data: dto.data ?? {},
        userId: dto.userId,
        status: NotificationStatus.SKIPPED,
      });
      return { logId: '', queued: false };
    }

    const subject = this.render(template.subject ?? '', dto.data ?? {});
    const body = this.render(template.body, dto.data ?? {});

    const log = await this.logs.create({
      channel: dto.channel,
      to: dto.to,
      templateKey: dto.templateKey,
      data: dto.data ?? {},
      userId: dto.userId,
      status: NotificationStatus.QUEUED,
    });

    const job: NotificationJob = {
      logId: String(log._id),
      channel: dto.channel,
      to: dto.to,
      subject,
      body,
    };
    await this.queueFor(dto.channel).add('send', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: 500,
    });
    return { logId: job.logId, queued: true };
  }

  /** Called by channel processors to record the delivery outcome. */
  async markResult(
    logId: string,
    status: NotificationStatus,
    error?: string,
  ): Promise<void> {
    await this.logs.updateOne({ _id: logId }, { status, error });
  }

  // ── helpers ──
  private render(template: string, data: Record<string, unknown>): string {
    try {
      return Handlebars.compile(template)(data);
    } catch (err) {
      this.logger.warn(`Template render failed: ${String(err)}`);
      return template;
    }
  }

  private async channelEnabled(
    userId: string,
    channel: NotificationChannel,
  ): Promise<boolean> {
    const pref = await this.getPreferences(userId);
    const map: Record<NotificationChannel, boolean> = {
      [NotificationChannel.EMAIL]: pref.email,
      [NotificationChannel.SMS]: pref.sms,
      [NotificationChannel.PUSH]: pref.push,
      [NotificationChannel.WHATSAPP]: pref.whatsapp,
    };
    return map[channel];
  }

  private queueFor(channel: NotificationChannel): Queue {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return this.emailQ;
      case NotificationChannel.SMS:
        return this.smsQ;
      case NotificationChannel.PUSH:
        return this.pushQ;
      case NotificationChannel.WHATSAPP:
        return this.whatsappQ;
    }
  }
}
