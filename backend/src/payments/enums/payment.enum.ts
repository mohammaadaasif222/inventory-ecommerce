export enum PaymentProvider {
  RAZORPAY = 'RAZORPAY',
  STRIPE = 'STRIPE',
  COD = 'COD',
}

export enum PaymentRecordStatus {
  CREATED = 'CREATED', // intent/order created at provider
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED', // money captured
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PENDING = 'PENDING', // COD: due on delivery
}

export enum RefundStatus {
  CREATED = 'CREATED',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}
