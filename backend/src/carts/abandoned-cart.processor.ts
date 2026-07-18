import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { CartsService } from './carts.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationChannel } from '../notifications/enums/notification.enum';
import {
  ABANDONED_CART_QUEUE,
  CART_ABANDONED_TEMPLATE,
  DEFAULT_IDLE_MINUTES,
} from './carts.constants';

/**
 * Flags carts left idle and emails the customer a recovery nudge.
 * One email per abandonment — `recoveryEmailSentAt` is the guard, and any
 * further cart activity resets it.
 */
@Processor(ABANDONED_CART_QUEUE)
export class AbandonedCartProcessor extends WorkerHost {
  private readonly logger = new Logger(AbandonedCartProcessor.name);

  constructor(
    private readonly carts: CartsService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<{ flagged: number; emailed: number }> {
    const idleMinutes = Number(
      process.env.ABANDONED_CART_IDLE_MINUTES ?? DEFAULT_IDLE_MINUTES,
    );
    const stale = await this.carts.flagAbandoned(idleMinutes);
    if (stale.length === 0) return { flagged: 0, emailed: 0 };

    const frontendUrl =
      this.config.get<string>('app.frontendUrl') ?? 'http://localhost:3000';

    let emailed = 0;
    for (const cart of stale) {
      try {
        const user = await this.users.findEntityById(cart.userId);
        if (!user?.email) continue;

        await this.notifications.send({
          channel: NotificationChannel.EMAIL,
          to: user.email,
          templateKey: CART_ABANDONED_TEMPLATE,
          userId: cart.userId,
          data: {
            firstName: user.firstName ?? 'there',
            itemCount: cart.items.reduce((n, i) => n + i.quantity, 0),
            subtotal: cart.subtotal.toFixed(2),
            currency: cart.currency,
            items: cart.items.map((i) => ({
              name: i.nameSnapshot,
              quantity: i.quantity,
              price: i.unitPrice.toFixed(2),
            })),
            cartUrl: `${frontendUrl}/cart`,
          },
        });
        await this.carts.markRecoveryEmailSent(cart.id);
        emailed += 1;
      } catch (err) {
        // One bad recipient must not stop the sweep.
        this.logger.warn(
          `[${job.name}] recovery email failed for cart ${cart.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    this.logger.log(
      `[${job.name}] flagged ${stale.length} abandoned cart(s), emailed ${emailed}`,
    );
    return { flagged: stale.length, emailed };
  }
}
