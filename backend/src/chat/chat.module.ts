import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Chat, ChatSchema } from './schemas/chat.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import {
  AgentPresence,
  AgentPresenceSchema,
} from './schemas/agent-presence.schema';
import {
  CannedResponse,
  CannedResponseSchema,
} from './schemas/canned-response.schema';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatBridge } from './chat.bridge';
import { CustomerChatGateway } from './customer-chat.gateway';
import { AgentChatGateway } from './agent-chat.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Chat.name, schema: ChatSchema },
      { name: Message.name, schema: MessageSchema },
      { name: AgentPresence.name, schema: AgentPresenceSchema },
      { name: CannedResponse.name, schema: CannedResponseSchema },
    ]),
    JwtModule.register({}),
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatBridge,
    CustomerChatGateway,
    AgentChatGateway,
  ],
  exports: [ChatService],
})
export class ChatModule {}
