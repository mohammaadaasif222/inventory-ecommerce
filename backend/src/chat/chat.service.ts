import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Chat, ChatDocument } from './schemas/chat.schema';
import {
  Message,
  MessageAttachment,
  MessageDocument,
} from './schemas/message.schema';
import {
  AgentPresence,
  AgentPresenceDocument,
} from './schemas/agent-presence.schema';
import {
  CannedResponse,
  CannedResponseDocument,
} from './schemas/canned-response.schema';
import {
  AGENT_MAX_CHATS,
  AgentStatus,
  ChatStatus,
  MessageType,
} from './enums/chat.enum';
import { Role } from '../common/enums/role.enum';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';

interface AddMessageInput {
  chatId: string;
  sender: { id: string; role: Role };
  content: string;
  type?: MessageType;
  attachments?: MessageAttachment[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Chat.name) private readonly chats: Model<ChatDocument>,
    @InjectModel(Message.name)
    private readonly messages: Model<MessageDocument>,
    @InjectModel(AgentPresence.name)
    private readonly presence: Model<AgentPresenceDocument>,
    @InjectModel(CannedResponse.name)
    private readonly canned: Model<CannedResponseDocument>,
  ) {}

  // ── chats ──
  async createChat(customerId: string, subject = ''): Promise<ChatDocument> {
    const chat = await this.chats.create({ customerId, subject });
    await this.tryAssign(chat);
    return chat;
  }

  async getChat(chatId: string): Promise<ChatDocument> {
    const chat = await this.chats.findById(chatId);
    if (!chat) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Chat not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return chat;
  }

  /** Round-robin: assign the least-loaded ONLINE agent with spare capacity. */
  async tryAssign(chat: ChatDocument): Promise<string | null> {
    const candidates = await this.presence
      .find({
        status: AgentStatus.ONLINE,
        activeChats: { $lt: AGENT_MAX_CHATS },
      })
      .sort({ activeChats: 1, updatedAt: 1 })
      .limit(1);

    const agent = candidates[0];
    if (!agent) return null;

    chat.agentId = agent.agentId;
    chat.status = ChatStatus.ACTIVE;
    await chat.save();
    await this.presence.updateOne(
      { agentId: agent.agentId },
      { $inc: { activeChats: 1 } },
    );
    await this.systemMessage(
      String(chat._id),
      `Agent ${agent.agentId} joined the chat`,
    );
    return agent.agentId;
  }

  listWaitingChats(): Promise<ChatDocument[]> {
    return this.chats
      .find({ status: ChatStatus.WAITING })
      .sort({ createdAt: 1 });
  }

  listAgentChats(agentId: string): Promise<ChatDocument[]> {
    return this.chats
      .find({ agentId, status: { $ne: ChatStatus.CLOSED } })
      .sort({ lastMessageAt: -1 });
  }

  listCustomerChats(customerId: string): Promise<ChatDocument[]> {
    return this.chats.find({ customerId }).sort({ lastMessageAt: -1 });
  }

  // ── messages ──
  async addMessage(input: AddMessageInput): Promise<MessageDocument> {
    const chat = await this.getChat(input.chatId);
    if (chat.status === ChatStatus.CLOSED) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        'Cannot post to a closed chat',
        HttpStatus.CONFLICT,
      );
    }
    const message = await this.messages.create({
      chatId: input.chatId,
      sender: input.sender,
      content: input.content,
      type: input.type ?? MessageType.TEXT,
      attachments: input.attachments ?? [],
      readBy: [input.sender.id],
    });
    chat.lastMessageAt = new Date();
    await chat.save();
    return message;
  }

  /** Cursor pagination (newest first); cursor is a message _id. */
  async getMessages(
    chatId: string,
    cursor?: string,
    limit = 30,
  ): Promise<{ data: MessageDocument[]; nextCursor: string | null }> {
    const filter: Record<string, unknown> = { chatId };
    if (cursor && Types.ObjectId.isValid(cursor)) {
      filter._id = { $lt: new Types.ObjectId(cursor) };
    }
    const docs = await this.messages
      .find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1);
    const hasMore = docs.length > limit;
    const data = hasMore ? docs.slice(0, limit) : docs;
    return {
      data,
      nextCursor: hasMore ? String(data[data.length - 1]._id) : null,
    };
  }

  async markRead(chatId: string, userId: string): Promise<void> {
    await this.messages.updateMany(
      { chatId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } },
    );
  }

  async closeChat(chatId: string, byUserId: string): Promise<ChatDocument> {
    const chat = await this.getChat(chatId);
    if (chat.status === ChatStatus.CLOSED) return chat;
    chat.status = ChatStatus.CLOSED;
    chat.closedAt = new Date();
    await chat.save();
    if (chat.agentId) {
      await this.presence.updateOne(
        { agentId: chat.agentId, activeChats: { $gt: 0 } },
        { $inc: { activeChats: -1 } },
      );
    }
    await this.systemMessage(chatId, `Chat closed by ${byUserId}`);
    return chat;
  }

  async transfer(chatId: string, toAgentId: string): Promise<ChatDocument> {
    const chat = await this.getChat(chatId);
    const previous = chat.agentId;
    chat.agentId = toAgentId;
    chat.status = ChatStatus.ACTIVE;
    await chat.save();
    if (previous) {
      await this.presence.updateOne(
        { agentId: previous, activeChats: { $gt: 0 } },
        { $inc: { activeChats: -1 } },
      );
    }
    await this.presence.updateOne(
      { agentId: toAgentId },
      { $inc: { activeChats: 1 } },
      { upsert: true },
    );
    await this.systemMessage(chatId, `Chat transferred to agent ${toAgentId}`);
    return chat;
  }

  // ── presence ──
  async setAgentStatus(
    agentId: string,
    status: AgentStatus,
  ): Promise<AgentPresence> {
    return this.presence
      .findOneAndUpdate({ agentId }, { status }, { upsert: true, new: true })
      .lean();
  }

  listOnlineAgents(): Promise<AgentPresence[]> {
    return this.presence.find({ status: { $ne: AgentStatus.OFFLINE } }).lean();
  }

  // ── canned responses ──
  createCanned(
    input: Partial<CannedResponse>,
  ): Promise<CannedResponseDocument> {
    return this.canned.create(input);
  }
  listCanned(): Promise<CannedResponse[]> {
    return this.canned.find().sort({ shortcut: 1 }).lean();
  }
  async removeCanned(id: string): Promise<void> {
    await this.canned.deleteOne({ _id: id });
  }

  // ── helpers ──
  private async systemMessage(chatId: string, content: string): Promise<void> {
    await this.messages.create({
      chatId,
      sender: { id: 'system', role: Role.SUPPORT_AGENT },
      content,
      type: MessageType.SYSTEM,
      readBy: [],
    });
  }
}
