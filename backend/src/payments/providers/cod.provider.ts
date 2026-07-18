import { randomUUID } from 'crypto';
import { PaymentProvider, PaymentRecordStatus } from '../enums/payment.enum';
import {
  CheckoutInit,
  CheckoutInput,
  IPaymentProvider,
  NormalizedEvent,
} from './payment-provider.interface';

/** Cash on delivery: no external gateway. Captured on delivery. */
export class CodProvider implements IPaymentProvider {
  readonly provider = PaymentProvider.COD;

  async createCheckout(input: CheckoutInput): Promise<CheckoutInit> {
    return {
      provider: this.provider,
      status: PaymentRecordStatus.PENDING,
      amountMinor: input.amountMinor,
      currency: input.currency,
    };
  }

  verifyWebhook(): boolean {
    return false; // COD has no webhooks
  }

  parseEvent(): NormalizedEvent | null {
    return null;
  }

  async refund(): Promise<{ providerRefundId: string }> {
    // Refunds for COD are handled out-of-band (cash returned); record only.
    return { providerRefundId: `cod_refund_${randomUUID()}` };
  }
}
