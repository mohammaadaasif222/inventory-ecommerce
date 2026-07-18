import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
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
import { Role } from '../common/enums/role.enum';
import { AgentStatus, MessageType } from './enums/chat.enum';

const AGENT_ROLES = [Role.SUPPORT_AGENT, Role.ADMIN, Role.SUPER_ADMIN];

/**
 * Support-agent chat namespace `/agent`.
 *
 * Inbound events:
 *  - `set_status`     { status }            ONLINE | BUSY | AWAY
 *  - `join_chat`      { chatId }
 *  - `send_message`   { chatId, content, attachments? }
 *  - `typing`         { chatId }
 *  - `read`           { chatId }
 *  - `close_chat`     { chatId }
 *  - `transfer_agent` { chatId, toAgentId }
 *
 * Outbound events: `message`, `typing`, `read`, `chat_closed`,
 * `waiting_chat`, `chat_transferred`.
 */
@WebSocketGateway({
  namespace: 'agent',
  cors: { origin: true, credentials: true },
})
export class AgentChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AgentChatGateway.name);

  constructor(
    private readonly chat: ChatService,
    private readonly bridge: ChatBridge,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Namespace): void {
    this.bridge.setServer(server.server);
  }

  async handleConnection(client: Socket): Promise<void> {
    const user = this.authenticate(client);
    if (!user || !user.roles.some((r) => AGENT_ROLES.includes(r))) {
      client.disconnect(true);
      return;
    }
    client.data.user = user;
    await client.join('lobby');
    await client.join(`agent:${user.id}`);
    await this.chat.setAgentStatus(user.id, AgentStatus.ONLINE);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const user = client.data.user as AuthenticatedUser | undefined;
    if (user) await this.chat.setAgentStatus(user.id, AgentStatus.OFFLINE);
  }

  /** @event set_status */
  @SubscribeMessage('set_status')
  async onStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { status: AgentStatus },
  ) {
    const user = client.data.user as AuthenticatedUser;
    return this.chat.setAgentStatus(user.id, body.status);
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
      sender: { id: user.id, role: Role.SUPPORT_AGENT },
      content: body.content,
      type: body.type,
      attachments: (body.attachments as never[]) ?? [],
    });
    this.bridge.toChat(body.chatId, 'message', message);
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

  /** @event transfer_agent */
  @SubscribeMessage('transfer_agent')
  async onTransfer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId: string; toAgentId: string },
  ) {
    const chat = await this.chat.transfer(body.chatId, body.toAgentId);
    this.bridge.toChat(body.chatId, 'chat_transferred', chat);
    this.bridge.toAgent(body.toAgentId, 'chat_assigned', chat);
    return { event: 'transferred', chatId: body.chatId };
  }

  private authenticate(client: Socket): AuthenticatedUser | null {
    return authenticateSocket(
      client,
      this.jwt,
      this.config.get<string>('jwt.accessSecret') as string,
    );
  }
}
