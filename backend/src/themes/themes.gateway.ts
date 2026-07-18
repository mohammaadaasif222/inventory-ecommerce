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
import { ThemesService } from './themes.service';
import { ThemeEvents, STOREFRONT_ROOM, previewRoom } from './theme.events';
import { authenticateSocket } from '../chat/ws-auth';
import { ADMIN_ROLES, Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

/** Draft payload the customiser streams; mirrors `PreviewThemeDto`. */
interface PreviewPayload {
  slug: string;
  customizations?: Record<string, unknown>;
}

/**
 * Theme namespace `/theme`.
 *
 * Carries two distinct flows over one namespace:
 *
 *  - **Publish** — a shopper's storefront joins `storefront` anonymously and
 *    receives `theme_changed` when an admin activates a theme. This is what
 *    makes a switch reach live sessions in a second without a redeploy.
 *
 *  - **Preview** — an admin's customiser and its preview window both join
 *    `preview:<sessionId>`; drafts stream between them and are never persisted
 *    or broadcast to shoppers.
 *
 * Inbound:  `join_storefront`, `join_preview` { sessionId }, `preview_update`
 * Outbound: `theme_changed`, `preview_update`
 */
@WebSocketGateway({
  namespace: 'theme',
  cors: { origin: true, credentials: true },
})
export class ThemesGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(ThemesGateway.name);

  constructor(
    private readonly themes: ThemesService,
    private readonly events: ThemeEvents,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Namespace): void {
    this.events.setServer(server.server);
  }

  /**
   * Storefront sessions are shoppers — anonymous by definition — so unlike the
   * chat namespaces this one cannot reject unauthenticated sockets. Instead a
   * token, when present, is decoded and stashed; the privileged events check it
   * themselves.
   */
  handleConnection(client: Socket): void {
    const secret = this.config.get<string>('jwt.accessSecret') ?? '';
    client.data.user = authenticateSocket(client, this.jwt, secret);
  }

  /** @event join_storefront — any visitor, to receive publishes. */
  @SubscribeMessage('join_storefront')
  async onJoinStorefront(@ConnectedSocket() client: Socket) {
    await client.join(STOREFRONT_ROOM);
    // Hand over current state on join: a session that connected mid-switch
    // would otherwise sit on a stale theme until the next publish.
    return { event: 'joined', state: await this.themes.getActive() };
  }

  /** @event join_preview — admin/staff only; both customiser and preview pane. */
  @SubscribeMessage('join_preview')
  async onJoinPreview(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string },
  ) {
    if (!this.isStaff(client)) return { event: 'error', message: 'Forbidden' };
    if (!body?.sessionId) return { event: 'error', message: 'sessionId required' };

    await client.join(previewRoom(body.sessionId));
    return { event: 'joined', room: previewRoom(body.sessionId) };
  }

  /**
   * @event preview_update — relay a draft to this admin's preview window.
   *
   * Re-checks staff on every message rather than trusting the join: a socket
   * outlives the token that opened it, and a draft is an admin-only capability.
   */
  @SubscribeMessage('preview_update')
  onPreviewUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string; payload: PreviewPayload },
  ) {
    if (!this.isStaff(client)) return { event: 'error', message: 'Forbidden' };
    if (!body?.sessionId || !body.payload?.slug) {
      return { event: 'error', message: 'sessionId and payload.slug required' };
    }

    this.events.emitPreviewUpdate(body.sessionId, body.payload);
    return { event: 'ok' };
  }

  private isStaff(client: Socket): boolean {
    const user = client.data.user as AuthenticatedUser | null;
    if (!user?.roles) return false;
    return user.roles.some((r) => ADMIN_ROLES.includes(r as Role));
  }
}
