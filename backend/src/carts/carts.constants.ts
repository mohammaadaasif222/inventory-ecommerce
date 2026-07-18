export const ABANDONED_CART_QUEUE = 'abandoned-cart';
export const ABANDONED_CART_SWEEP_JOB = 'abandoned-cart-sweep';

/** Template key the recovery email renders (seeded into Mongo). */
export const CART_ABANDONED_TEMPLATE = 'cart.abandoned';

/**
 * How long a cart must sit untouched before it counts as abandoned.
 * Deliberately short in dev so the flow is demonstrable; override with
 * ABANDONED_CART_IDLE_MINUTES.
 */
export const DEFAULT_IDLE_MINUTES = 60;
