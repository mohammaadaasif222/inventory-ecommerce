/**
 * Shared constants for the Essence package. Not a template or slot — the
 * registry generator only looks for the known template/slot filenames, so this
 * file is plain importable code shared by them.
 */

/** Orders at or above this subtotal ship free; the cart drawer tracks it. */
export const FREE_SHIPPING_THRESHOLD = 999;

/**
 * Window event that opens the slide-out cart. Dispatched by add-to-cart
 * actions in templates; the header slot listens. An event rather than a store
 * so the drawer state stays private to the header.
 */
export const OPEN_CART_EVENT = 'essence:open-cart';

export function openCartDrawer() {
  window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT));
}

/** Payment methods shown by the safe-checkout box and the footer. */
export const PAYMENT_BADGES = ['VISA', 'Mastercard', 'AmEx', 'UPI', 'GPay'];
