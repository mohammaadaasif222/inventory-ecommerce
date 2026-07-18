export enum CouponType {
  /** `value` is a percentage of the order subtotal (capped by maxDiscount). */
  PERCENT = 'PERCENT',
  /** `value` is a flat amount off the subtotal. */
  FIXED = 'FIXED',
  /** Discount equals the shipping total; `value` is ignored. */
  FREE_SHIPPING = 'FREE_SHIPPING',
}
