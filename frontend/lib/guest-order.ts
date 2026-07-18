/**
 * Client-side keeper of guest order tokens.
 *
 * A guest has no account, so the token from the order-creation response is
 * their only key to the order page. sessionStorage rather than localStorage:
 * the token authorises reading an order with a delivery address on it, and a
 * shared machine should not surface it to the next person. The durable copy
 * lives in the confirmation email's link (`?guestToken=`).
 */

const key = (orderId: string) => `guest-order:${orderId}`;

export function rememberGuestToken(orderId: string, token: string): void {
  try {
    sessionStorage.setItem(key(orderId), token);
  } catch {
    // Storage blocked (private mode): the email link still works.
  }
}

export function recallGuestToken(orderId: string): string | null {
  try {
    return sessionStorage.getItem(key(orderId));
  } catch {
    return null;
  }
}
