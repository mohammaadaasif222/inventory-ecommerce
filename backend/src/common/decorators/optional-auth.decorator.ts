import { SetMetadata } from '@nestjs/common';

export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';

/**
 * Authenticate the request when a bearer token is present, but let it through
 * anonymously when there is none — `@CurrentUser()` resolves to the user or to
 * undefined accordingly.
 *
 * Exists for routes that serve both audiences with different semantics, like
 * checkout: a signed-in customer's order binds to their account, a guest's
 * binds to an email. Neither `@Public()` (never parses the token, so the
 * signed-in case loses its user) nor the default guard (401s the guest) can
 * express that.
 *
 * An *invalid* token still fails with 401 — a caller who presents credentials
 * is claiming an identity, and silently downgrading a bad claim to "guest"
 * would let an expired session place orders that bind to nobody.
 */
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
