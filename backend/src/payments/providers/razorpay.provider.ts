import * as crypto from 'crypto';
import { HttpStatus } from '@nestjs/common';
import { PaymentProvider, PaymentRecordStatus } from '../enums/payment.enum';
import {
  CheckoutInit,
  CheckoutInput,
  IPaymentProvider,
  NormalizedEvent,
} from './payment-provider.interface';
import { AppException, ErrorCode } from '../../common/exceptions/app.exception';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

const RAZORPAY_API = 'https://api.razorpay.com/v1';

/** Razorpay via REST (no SDK dependency). */
export class RazorpayProvider implements IPaymentProvider {
  readonly provider = PaymentProvider.RAZORPAY;

  constructor(private readonly config: RazorpayConfig) {
    if (!config.keyId || !config.keySecret) {
      throw new AppException(
        ErrorCode.STORAGE_PROVIDER_NOT_CONFIGURED,
        'Razorpay credentials are not configured',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private authHeader(): string {
    const token = Buffer.from(
      `${this.config.keyId}:${this.config.keySecret}`,
    ).toString('base64');
    return `Basic ${token}`;
  }

  private async request(
    path: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, any>> {
    const res = await fetch(`${RAZORPAY_API}${path}`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as Record<string, any>;
    if (!res.ok) {
      throw new AppException(
        ErrorCode.UPLOAD_FAILED,
        `Razorpay error: ${json?.error?.description ?? res.statusText}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    return json;
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutInit> {
    const order = await this.request('/orders', {
      amount: input.amountMinor,
      currency: input.currency,
      receipt: input.receipt,
      notes: { orderId: input.orderId },
    });
    return {
      provider: this.provider,
      status: PaymentRecordStatus.CREATED,
      providerOrderId: order.id,
      keyId: this.config.keyId,
      amountMinor: input.amountMinor,
      currency: input.currency,
    };
  }

  verifyWebhook(rawBody: Buffer, signature: string): boolean {
    if (!this.config.webhookSecret || !signature) return false;
    const digest = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(rawBody)
      .digest('hex');
    const a = Buffer.from(digest);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  parseEvent(payload: unknown): NormalizedEvent | null {
    const event = payload as {
      event?: string;
      payload?: { payment?: { entity?: Record<string, any> } };
    };
    const entity = event.payload?.payment?.entity ?? {};
    switch (event.event) {
      case 'payment.captured':
        return {
          providerOrderId: entity.order_id ?? null,
          providerPaymentId: entity.id ?? null,
          status: PaymentRecordStatus.CAPTURED,
        };
      case 'payment.failed':
        return {
          providerOrderId: entity.order_id ?? null,
          providerPaymentId: entity.id ?? null,
          status: PaymentRecordStatus.FAILED,
        };
      default:
        return null;
    }
  }

  async refund(
    providerPaymentId: string,
    amountMinor: number,
  ): Promise<{ providerRefundId: string }> {
    const refund = await this.request(`/payments/${providerPaymentId}/refund`, {
      amount: amountMinor,
    });
    return { providerRefundId: refund.id };
  }
}
