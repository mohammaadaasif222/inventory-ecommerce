import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import {
  PaymentProvider,
  PaymentRecordStatus,
  RefundStatus,
} from './enums/payment.enum';
import { IPaymentProvider } from './providers/payment-provider.interface';
import { CodProvider } from './providers/cod.provider';
import { StripeProvider } from './providers/stripe.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { OrdersService } from '../orders/orders.service';
import {
  OrderStatus,
  PaymentStatus,
} from '../orders/enums/order-status.enum';
import { AppException, ErrorCode } from '../common/exceptions/app.exception';
import { InitiatePaymentDto, RefundDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    @InjectRepository(Refund) private readonly refunds: Repository<Refund>,
    private readonly orders: OrdersService,
    private readonly config: ConfigService,
  ) {}

  /** Build the provider implementation for the requested gateway. */
  providerFor(provider: PaymentProvider): IPaymentProvider {
    switch (provider) {
      case PaymentProvider.COD:
        return new CodProvider();
      case PaymentProvider.STRIPE:
        return new StripeProvider({
          secretKey: this.config.get<string>('payments.stripe.secretKey') ?? '',
          webhookSecret:
            this.config.get<string>('payments.stripe.webhookSecret') ?? '',
        });
      case PaymentProvider.RAZORPAY:
        return new RazorpayProvider({
          keyId: this.config.get<string>('payments.razorpay.keyId') ?? '',
          keySecret:
            this.config.get<string>('payments.razorpay.keySecret') ?? '',
          webhookSecret:
            this.config.get<string>('payments.razorpay.webhookSecret') ?? '',
        });
      default:
        throw new AppException(
          ErrorCode.VALIDATION_FAILED,
          `Unsupported payment provider: ${provider}`,
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  async initiate(dto: InitiatePaymentDto, customerId: string | null) {
    // Two ways to own an order: a session whose customer id matches, or —
    // for guest orders — the creation token. findGuestOrder 404s on any
    // mismatch, so both paths end with the same guarantee.
    const order = customerId
      ? await this.orders.findOne(dto.orderId, customerId)
      : await this.orders.findGuestOrder(dto.orderId, dto.guestToken ?? '');
    const provider = this.providerFor(dto.provider);
    const amountMinor = Math.round(order.grandTotal * 100);

    const init = await provider.createCheckout({
      orderId: order.id,
      amountMinor,
      currency: order.currency,
      receipt: order.orderNumber,
    });

    const payment = await this.payments.save(
      this.payments.create({
        orderId: order.id,
        provider: dto.provider,
        amount: order.grandTotal,
        currency: order.currency,
        status: init.status,
        providerOrderId: init.providerOrderId ?? null,
      }),
    );

    // COD is accepted immediately; confirm the order, due on delivery.
    if (dto.provider === PaymentProvider.COD) {
      if (order.status === OrderStatus.PENDING) {
        await this.orders.updateStatus(order.id, OrderStatus.CONFIRMED);
      }
    }

    return { paymentId: payment.id, checkout: init };
  }

  /** Webhook entry point. Verifies signature, then reconciles payment + order. */
  async handleWebhook(
    providerName: PaymentProvider,
    rawBody: Buffer,
    signature: string,
  ): Promise<{ received: true }> {
    const provider = this.providerFor(providerName);
    if (!provider.verifyWebhook(rawBody, signature)) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        'Invalid webhook signature',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const event = provider.parseEvent(payload);
    if (!event) return { received: true }; // event we don't act on

    const payment = await this.payments.findOne({
      where: event.providerOrderId
        ? { providerOrderId: event.providerOrderId }
        : { providerPaymentId: event.providerPaymentId ?? undefined },
    });
    if (!payment) {
      this.logger.warn(
        `Webhook for unknown payment (order ${event.providerOrderId})`,
      );
      return { received: true };
    }

    payment.status = event.status;
    payment.providerPaymentId =
      event.providerPaymentId ?? payment.providerPaymentId;
    payment.raw = payload;
    await this.payments.save(payment);

    if (event.status === PaymentRecordStatus.CAPTURED) {
      await this.orders.setPaymentStatus(payment.orderId, PaymentStatus.PAID);
      const order = await this.orders.findOne(payment.orderId).catch(() => null);
      if (order?.status === OrderStatus.PENDING) {
        await this.orders.updateStatus(order.id, OrderStatus.CONFIRMED);
      }
    } else if (event.status === PaymentRecordStatus.FAILED) {
      await this.orders.setPaymentStatus(payment.orderId, PaymentStatus.FAILED);
    }

    return { received: true };
  }

  async refund(paymentId: string, dto: RefundDto): Promise<Refund> {
    const payment = await this.payments.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Payment not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (
      payment.status !== PaymentRecordStatus.CAPTURED &&
      payment.provider !== PaymentProvider.COD
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        `Cannot refund a payment in status ${payment.status}`,
        HttpStatus.CONFLICT,
      );
    }

    const amount = dto.amount ?? payment.amount;
    if (amount > payment.amount) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        'Refund amount exceeds payment amount',
        HttpStatus.BAD_REQUEST,
      );
    }

    const provider = this.providerFor(payment.provider);
    let providerRefundId: string | null = null;
    try {
      const res = await provider.refund(
        payment.providerPaymentId ?? '',
        Math.round(amount * 100),
      );
      providerRefundId = res.providerRefundId;
    } catch (err) {
      this.logger.error('Provider refund failed', err as Error);
      throw err;
    }

    const refund = await this.refunds.save(
      this.refunds.create({
        paymentId: payment.id,
        amount,
        status: RefundStatus.PROCESSED,
        providerRefundId,
        reason: dto.reason ?? null,
      }),
    );

    const isFull = amount >= payment.amount;
    payment.status = isFull
      ? PaymentRecordStatus.REFUNDED
      : payment.status;
    await this.payments.save(payment);
    await this.orders.setPaymentStatus(
      payment.orderId,
      isFull ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
    );

    return refund;
  }

  listByOrder(orderId: string): Promise<Payment[]> {
    return this.payments.find({
      where: { orderId },
      relations: { refunds: true },
      order: { createdAt: 'DESC' },
    });
  }
}
