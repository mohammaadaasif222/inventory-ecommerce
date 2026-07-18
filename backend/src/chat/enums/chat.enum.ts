export enum ChatStatus {
  WAITING = 'WAITING', // queued, no agent yet
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM',
}

export enum AgentStatus {
  ONLINE = 'ONLINE',
  BUSY = 'BUSY',
  AWAY = 'AWAY',
  OFFLINE = 'OFFLINE',
}

/** Max concurrent active chats per agent for round-robin assignment. */
export const AGENT_MAX_CHATS = 5;
