import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CannedResponseDocument = HydratedDocument<CannedResponse>;

/** Reusable agent reply, addressable by a "/shortcut". */
@Schema({ timestamps: true, collection: 'canned_responses' })
export class CannedResponse {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, index: true })
  shortcut: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  createdBy?: string;
}

export const CannedResponseSchema =
  SchemaFactory.createForClass(CannedResponse);
