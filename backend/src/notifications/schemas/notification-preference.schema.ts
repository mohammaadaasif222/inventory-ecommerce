import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationPreferenceDocument =
  HydratedDocument<NotificationPreference>;

/** Per-user channel opt-in. Missing channel defaults to enabled. */
@Schema({ timestamps: true, collection: 'notification_preferences' })
export class NotificationPreference {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({ default: true })
  email: boolean;

  @Prop({ default: true })
  sms: boolean;

  @Prop({ default: true })
  push: boolean;

  @Prop({ default: true })
  whatsapp: boolean;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(
  NotificationPreference,
);
