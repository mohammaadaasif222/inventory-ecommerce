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

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
}

const STRIPE_API = 'https://api.stripe.com/v1';

/**
 * Stripe via REST (no SDK dependency). Creates PaymentIntents, verifies webhook
 * signatures with the standard scheme, and issues refunds.
 */
export class StripeProvider implements IPaymentProvider {
  readonly provider = PaymentProvider.STRIPE;

  constructor(private readonly config: StripeConfig) {
    if (!config.secretKey) {
      throw new AppException(
        ErrorCode.STORAGE_PROVIDER_NOT_CONFIGURED,
        'Stripe secret key is not configured',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async post(path: string, form: Record<string, string>) {
    const res = await fetch(`${STRIPE_API}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(form).toString(),
    });
    const json = (await res.json()) as Record<string, any>;
    if (!res.ok) {
      throw new AppException(
        ErrorCode.UPLOAD_FAILED,
        `Stripe error: ${json?.error?.message ?? res.statusText}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
    return json;
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutInit> {
    const intent = await this.post('/payment_intents', {
      amount: String(input.amountMinor),
      currency: input.currency.toLowerCase(),
      'metadata[orderId]': input.orderId,
      'automatic_payment_methods[enabled]': 'true',
    });
    return {
      provider: this.provider,
      status: PaymentRecordStatus.CREATED,
      providerOrderId: intent.id,
      clientSecret: intent.client_secret,
      amountMinor: input.amountMinor,
      currency: input.currency,
    };
  }

  verifyWebhook(rawBody: Buffer, signature: string): boolean {
    if (!this.config.webhookSecret || !signature) return false;
    // signature header: t=timestamp,v1=hex
    const parts = Object.fromEntries(
      signature.split(',').map((kv) => kv.split('=') as [string, string]),
    );
    const timestamp = parts['t'];
    const expected = parts['v1'];
    if (!timestamp || !expected) return false;
    const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
    const digest = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(signedPayload)
      .digest('hex');
    return timingSafeEqual(digest, expected);
  }

  parseEvent(payload: unknown): NormalizedEvent | null {
    const event = payload as {
      type?: string;
      data?: { object?: Record<string, any> };
    };
    const obj = event.data?.object ?? {};
    switch (event.type) {
      case 'payment_intent.succeeded':
        return {
          providerOrderId: obj.id ?? null,
          providerPaymentId: obj.id ?? null,
          status: PaymentRecordStatus.CAPTURED,
        };
      case 'payment_intent.payment_failed':
        return {
          providerOrderId: obj.id ?? null,
          providerPaymentId: obj.id ?? null,
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
    const refund = await this.post('/refunds', {
      payment_intent: providerPaymentId,
      amount: String(amountMinor),
    });
    return { providerRefundId: refund.id };
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
