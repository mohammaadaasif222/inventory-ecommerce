import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MessageType } from '../enums/chat.enum';
import { Role } from '../../common/enums/role.enum';

export type MessageDocument = HydratedDocument<Message>;

export class MessageAttachment {
  url: string;
  storageId: string;
  mimetype: string;
  size: number;
  name: string;
}

@Schema({ timestamps: true, collection: 'chat_messages' })
export class Message {
  @Prop({ required: true, index: true })
  chatId: string;

  @Prop({ type: Object, required: true })
  sender: { id: string; role: Role };

  @Prop({ default: '' })
  content: string;

  @Prop({ type: String, enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Prop({ type: [Object], default: [] })
  attachments: MessageAttachment[];

  @Prop({ type: [String], default: [] })
  readBy: string[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);
