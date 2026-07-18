import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import type { ActiveTheme } from './themes.service';
import type { ThemeCustomizations } from './schemas/theme.schema';

/** Room every storefront session joins, so a publish reaches all of them. */
export const STOREFRONT_ROOM = 'storefront';

/** Room the admin's preview windows join, keyed per admin session. */
export const previewRoom = (sessionId: string): string => `preview:${sessionId}`;

/**
 * The bridge between the themes service and the socket layer.
 *
 * Exists to break the cycle: the gateway needs the service to read state, and
 * the service needs to emit when state changes. Injecting the gateway into the
 * service would close that loop, so the service depends on this instead and
 * the gateway hands it a server on init — the same pattern `ChatBridge` uses
 * for the chat namespaces.
 *
 * Emits are best-effort: a theme switch must not fail because no socket server
 * is attached (unit tests, a worker process, or a boot ordering where the
 * gateway has not initialised yet).
 */
@Injectable()
export class ThemeEvents {
  private readonly logger = new Logger(ThemeEvents.name);
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * A theme went live. Every storefront session re-fetches and re-skins —
   * this is the "propagate instantly, no redeploy" half of the switch.
   */
  emitThemeChanged(state: ActiveTheme): void {
    this.emit(STOREFRONT_ROOM, 'theme_changed', state);
  }

  /**
   * A draft customisation, for preview windows only.
   *
   * Scoped to one admin's preview room rather than broadcast: two admins
   * customising different themes must not see each other's drafts, and no
   * shopper should ever receive an unpublished one.
   */
  emitPreviewUpdate(
    sessionId: string,
    payload: { slug: string; customizations?: ThemeCustomizations },
  ): void {
    this.emit(previewRoom(sessionId), 'preview_update', payload);
  }

  private emit(room: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.debug(`No socket server attached; dropped "${event}".`);
      return;
    }
    this.server.of('/theme').to(room).emit(event, payload);
  }
}
