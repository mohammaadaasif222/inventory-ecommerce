import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

/**
 * Emits events across the two chat namespaces (/chat for customers, /agent for
 * support). Both gateways register the root Socket.IO server here so a message
 * from one side reaches the other (they share the per-chat room name = chatId).
 */
@Injectable()
export class ChatBridge {
  private io: Server | null = null;

  setServer(io: Server): void {
    if (!this.io) this.io = io;
  }

  /** Deliver to everyone in a chat room on both namespaces. */
  toChat(chatId: string, event: string, payload: unknown): void {
    if (!this.io) return;
    this.io.of('/chat').to(chatId).emit(event, payload);
    this.io.of('/agent').to(chatId).emit(event, payload);
  }

  /** Notify the agent lobby (e.g. a new waiting chat). */
  toAgentLobby(event: string, payload: unknown): void {
    this.io?.of('/agent').to('lobby').emit(event, payload);
  }

  /** Direct message to a specific agent's personal room. */
  toAgent(agentId: string, event: string, payload: unknown): void {
    this.io?.of('/agent').to(`agent:${agentId}`).emit(event, payload);
  }
}
