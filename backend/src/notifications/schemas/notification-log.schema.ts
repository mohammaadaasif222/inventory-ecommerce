import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  NotificationChannel,
  NotificationStatus,
} from '../enums/notification.enum';

export type NotificationLogDocument = HydratedDocument<NotificationLog>;

@Schema({ timestamps: true, collection: 'notification_logs' })
export class NotificationLog {
  @Prop({ type: String, required: true, enum: NotificationChannel, index: true })
  channel: NotificationChannel;

  @Prop({ required: true })
  to: string;

  @Prop({ index: true })
  templateKey: string;

  @Prop({ type: Object, default: {} })
  data: Record<string, unknown>;

  @Prop({ index: true })
  userId?: string;

  @Prop({
    type: String,
    required: true,
    enum: NotificationStatus,
    default: NotificationStatus.QUEUED,
    index: true,
  })
  status: NotificationStatus;

  @Prop()
  error?: string;
}

export const NotificationLogSchema =
  SchemaFactory.createForClass(NotificationLog);
