import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { NotificationChannel } from '../enums/notification.enum';

export type NotificationTemplateDocument =
  HydratedDocument<NotificationTemplate>;

/** Handlebars-rendered template addressable by a stable key. */
@Schema({ timestamps: true, collection: 'notification_templates' })
export class NotificationTemplate {
  @Prop({ required: true, unique: true, index: true })
  key: string; // e.g. order.confirmed

  @Prop({ type: String, required: true, enum: NotificationChannel })
  channel: NotificationChannel;

  @Prop({ default: '' })
  subject: string; // Handlebars (email)

  @Prop({ required: true })
  body: string; // Handlebars

  @Prop({ default: true })
  isActive: boolean;
}

export const NotificationTemplateSchema = SchemaFactory.createForClass(
  NotificationTemplate,
);
