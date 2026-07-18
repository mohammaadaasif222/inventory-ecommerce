import { PaymentProvider, PaymentRecordStatus } from '../enums/payment.enum';

export interface CheckoutInput {
  orderId: string;
  /** Amount in MINOR units (paise/cents). */
  amountMinor: number;
  currency: string;
  receipt: string;
}

/** Provider-specific data the frontend needs to open the payment UI. */
export interface CheckoutInit {
  provider: PaymentProvider;
  status: PaymentRecordStatus;
  providerOrderId?: string;
  /** Stripe PaymentIntent client secret. */
  clientSecret?: string;
  /** Razorpay public key id (frontend checkout). */
  keyId?: string;
  amountMinor: number;
  currency: string;
}

/** Normalised webhook event mapped from a provider payload. */
export interface NormalizedEvent {
  providerOrderId: string | null;
  providerPaymentId: string | null;
  status: PaymentRecordStatus;
}

export interface IPaymentProvider {
  readonly provider: PaymentProvider;
  createCheckout(input: CheckoutInput): Promise<CheckoutInit>;
  verifyWebhook(rawBody: Buffer, signature: string): boolean;
  parseEvent(payload: unknown): NormalizedEvent | null;
  refund(
    providerPaymentId: string,
    amountMinor: number,
  ): Promise<{ providerRefundId: string }>;
}
