import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Namespace, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { ChatBridge } from './chat.bridge';
import { authenticateSocket } from './ws-auth';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ChatStatus, MessageType } from './enums/chat.enum';

/**
 * Customer-facing chat namespace `/chat`.
 *
 * Inbound events:
 *  - `join_chat`    { chatId }              join a chat room
 *  - `send_message` { chatId, content, attachments? }
 *  - `typing`       { chatId }              broadcast typing indicator
 *  - `read`         { chatId }              mark messages read
 *  - `close_chat`   { chatId }              customer ends the chat
 *
 * Outbound events: `message`, `typing`, `read`, `chat_closed`.
 */
@WebSocketGateway({
  namespace: 'chat',
  cors: { origin: true, credentials: true },
})
export class CustomerChatGateway
  implements OnGatewayInit, OnGatewayConnection
{
  private readonly logger = new Logger(CustomerChatGateway.name);

  constructor(
    private readonly chat: ChatService,
    private readonly bridge: ChatBridge,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Namespace): void {
    this.bridge.setServer(server.server);
  }

  handleConnection(client: Socket): void {
    const user = this.authenticate(client);
    if (!user) {
      client.disconnect(true);
      return;
    }
    client.data.user = user;
  }

  /** @event join_chat */
  @SubscribeMessage('join_chat')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId: string },
  ) {
    await client.join(body.chatId);
    const history = await this.chat.getMessages(body.chatId);
    return { event: 'joined', chatId: body.chatId, history: history.data };
  }

  /** @event send_message */
  @SubscribeMessage('send_message')
  async onMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      chatId: string;
      content: string;
      attachments?: unknown[];
      type?: MessageType;
    },
  ) {
    const user = client.data.user as AuthenticatedUser;
    const message = await this.chat.addMessage({
      chatId: body.chatId,
      sender: { id: user.id, role: user.roles[0] },
      content: body.content,
      type: body.type,
      attachments: (body.attachments as never[]) ?? [],
    });
    this.bridge.toChat(body.chatId, 'message', message);

    // Surface still-waiting chats to the agent lobby.
    const chat = await this.chat.getChat(body.chatId);
    if (chat.status === ChatStatus.WAITING) {
      this.bridge.toAgentLobby('waiting_chat', chat);
    }
    return { event: 'sent', id: String(message._id) };
  }

  /** @event typing */
  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId: string },
  ) {
    const user = client.data.user as AuthenticatedUser;
    this.bridge.toChat(body.chatId, 'typing', {
      chatId: body.chatId,
      userId: user.id,
    });
  }

  /** @event read */
  @SubscribeMessage('read')
  async onRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId: string },
  ) {
    const user = client.data.user as AuthenticatedUser;
    await this.chat.markRead(body.chatId, user.id);
    this.bridge.toChat(body.chatId, 'read', {
      chatId: body.chatId,
      userId: user.id,
    });
  }

  /** @event close_chat */
  @SubscribeMessage('close_chat')
  async onClose(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId: string },
  ) {
    const user = client.data.user as AuthenticatedUser;
    await this.chat.closeChat(body.chatId, user.id);
    this.bridge.toChat(body.chatId, 'chat_closed', { chatId: body.chatId });
  }

  private authenticate(client: Socket): AuthenticatedUser | null {
    return authenticateSocket(
      client,
      this.jwt,
      this.config.get<string>('jwt.accessSecret') as string,
    );
  }
}
