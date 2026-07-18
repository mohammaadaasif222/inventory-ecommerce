import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AgentStatus } from '../enums/chat.enum';

export type AgentPresenceDocument = HydratedDocument<AgentPresence>;

@Schema({ timestamps: true, collection: 'agent_presence' })
export class AgentPresence {
  @Prop({ required: true, unique: true, index: true })
  agentId: string;

  @Prop({ type: String, enum: AgentStatus, default: AgentStatus.OFFLINE, index: true })
  status: AgentStatus;

  @Prop({ default: 0 })
  activeChats: number;
}

export const AgentPresenceSchema = SchemaFactory.createForClass(AgentPresence);
