import 'server-only';
import { cache } from 'react';
import { config } from './config';
import type { ThemeCustomizations } from '@/themes/config';

/** What `GET /themes/active` returns, unwrapped from the API envelope. */
export interface ActiveTheme {
  slug: string;
  customizations: ThemeCustomizations;
}

/**
 * Fallback when the API cannot be reached at render time.
 *
 * A storefront that renders the default theme during an API blip still sells;
 * one that throws does not. The slug must be an installed package — the
 * resolver falls back again if it is not.
 */
const FALLBACK: ActiveTheme = { slug: 'universal', customizations: {} };

/**
 * The active theme, read server-side on every storefront render.
 *
 * `cache()` dedupes it per request: the layout and any page that needs the
 * config both call this, and one request should mean one fetch.
 *
 * `no-store` is deliberate despite this being the hottest read in the app. The
 * expensive part is already cached in Redis on the backend, so this fetch is a
 * cheap hop; caching it *again* in Next's data cache would add a second TTL to
 * invalidate on switch, and a theme switch that takes effect everywhere except
 * the Next cache is exactly the bug this engine exists to avoid.
 */
export const getActiveTheme = cache(async (): Promise<ActiveTheme> => {
  try {
    const res = await fetch(`${config.apiUrl}/themes/active`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });

    if (!res.ok) {
      console.warn(
        `[themes] GET /themes/active returned ${res.status}; using "${FALLBACK.slug}".`,
      );
      return FALLBACK;
    }

    const body = (await res.json()) as { data?: ActiveTheme };
    if (!body?.data?.slug) {
      console.warn('[themes] GET /themes/active returned no slug; using fallback.');
      return FALLBACK;
    }

    return {
      slug: body.data.slug,
      customizations: body.data.customizations ?? {},
    };
  } catch (err) {
    // The storefront must render with the API down — this is the one place
    // where swallowing a network error is the correct behaviour.
    console.warn(
      `[themes] Could not reach the API for the active theme; using ` +
        `"${FALLBACK.slug}". ${(err as Error).message}`,
    );
    return FALLBACK;
  }
});
