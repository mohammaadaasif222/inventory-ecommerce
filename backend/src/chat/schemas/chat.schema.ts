import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ChatStatus } from '../enums/chat.enum';

export type ChatDocument = HydratedDocument<Chat>;

@Schema({ timestamps: true, collection: 'chats' })
export class Chat {
  @Prop({ required: true, index: true })
  customerId: string;

  @Prop({ type: String, index: true, default: null })
  agentId: string | null;

  @Prop({
    type: String,
    required: true,
    enum: ChatStatus,
    default: ChatStatus.WAITING,
    index: true,
  })
  status: ChatStatus;

  @Prop({ default: '' })
  subject: string;

  @Prop({ default: () => new Date() })
  lastMessageAt: Date;

  @Prop({ type: Date, default: null })
  closedAt: Date | null;

  /** Set when a chat is escalated to a ticket. */
  @Prop({ type: String, default: null })
  ticketId: string | null;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
