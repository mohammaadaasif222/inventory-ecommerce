export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_CUSTOMER = 'PENDING_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketSource {
  CHAT = 'CHAT',
  EMAIL = 'EMAIL',
  MANUAL = 'MANUAL',
}

export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ],
  [TicketStatus.IN_PROGRESS]: [
    TicketStatus.PENDING_CUSTOMER,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ],
  [TicketStatus.PENDING_CUSTOMER]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  [TicketStatus.CLOSED]: [],
};

export const TICKET_SLA_QUEUE = 'ticket-sla';
export const TICKET_SLA_JOB = 'sla-check';

/** Default SLA targets (minutes) seeded when no config row exists. */
export const DEFAULT_SLA: Record<
  TicketPriority,
  { responseMinutes: number; resolutionMinutes: number }
> = {
  [TicketPriority.URGENT]: { responseMinutes: 15, resolutionMinutes: 240 },
  [TicketPriority.HIGH]: { responseMinutes: 60, resolutionMinutes: 480 },
  [TicketPriority.MEDIUM]: { responseMinutes: 240, resolutionMinutes: 1440 },
  [TicketPriority.LOW]: { responseMinutes: 480, resolutionMinutes: 2880 },
};
