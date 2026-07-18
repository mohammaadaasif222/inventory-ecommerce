import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationChannel } from '../notifications/enums/notification.enum';
import { UsersService } from '../users/users.service';
import type { Order } from './entities/order.entity';

/** Template key; the body is seeded idempotently by `npm run seed`. */
export const ORDER_CONFIRMED_TEMPLATE = 'order.confirmed';

/**
 * Sends the order-confirmation email.
 *
 * Split from OrdersService so the transactional create path stays free of
 * delivery concerns: this resolves the recipient (account email or guest
 * email), renders through the notifications template system, and — for guest
 * orders — carries the tokenised link that is the guest's only way back to
 * their order. Delivery itself is queued by the notifications module; without
 * SMTP configured it renders and logs, which is the platform's standard
 * dev-mode behaviour.
 */
@Injectable()
export class OrderMailer {
  private readonly logger = new Logger(OrderMailer.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async sendConfirmation(order: Order): Promise<void> {
    const recipient = await this.resolveRecipient(order);
    if (!recipient) {
      this.logger.warn(
        `Order ${order.orderNumber}: no recipient email; confirmation skipped`,
      );
      return;
    }

    const frontendUrl =
      this.config.get<string>('app.frontendUrl') ?? 'http://localhost:3000';

    // A guest's link must carry the token — without it the order page has no
    // way to authorise them. Account holders get the plain signed-in URL.
    const orderUrl = order.guestToken
      ? `${frontendUrl}/orders/${order.id}?guestToken=${order.guestToken}`
      : `${frontendUrl}/orders/${order.id}`;

    await this.notifications.send({
      channel: NotificationChannel.EMAIL,
      to: recipient.email,
      templateKey: ORDER_CONFIRMED_TEMPLATE,
      userId: order.customerId ?? undefined,
      data: {
        firstName: recipient.firstName,
        orderNumber: order.orderNumber,
        grandTotal: order.grandTotal.toFixed(2),
        currency: order.currency,
        itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
        items: order.items.map((i) => ({
          name: i.nameSnapshot,
          quantity: i.quantity,
          price: i.unitPrice.toFixed(2),
        })),
        orderUrl,
      },
    });
  }

  private async resolveRecipient(
    order: Order,
  ): Promise<{ email: string; firstName: string } | null> {
    if (order.guestEmail) {
      return { email: order.guestEmail, firstName: 'there' };
    }
    if (!order.customerId) return null;

    const user = await this.users.findEntityById(order.customerId);
    if (!user?.email) return null;
    return { email: user.email, firstName: user.firstName ?? 'there' };
  }
}
