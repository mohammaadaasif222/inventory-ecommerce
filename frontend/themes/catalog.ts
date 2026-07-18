/**
 * Client-safe view of the installed theme packages.
 *
 * Split from `resolver.ts` on purpose: the resolver is `server-only` because it
 * dynamically imports template code, but the admin's theme manager runs in the
 * browser and needs the same *metadata* — names, versions, swatches, which
 * layout a theme prefers — to render its picker.
 *
 * Only configs cross this boundary. No template ever reaches the client through
 * here, so an inactive theme still costs the storefront nothing.
 */

import { resolveConfig, type ResolvedThemeConfig } from './config';
import { THEME_SOURCES, INSTALLED_THEMES } from './registry.generated';

export function getThemeConfigOrNull(slug: string): ResolvedThemeConfig | null {
  try {
    return resolveConfig(slug, THEME_SOURCES);
  } catch {
    // A broken package must not take the manager down with it — the manager is
    // where an admin would go to switch away from it.
    return null;
  }
}

/**
 * Every installed theme's flattened config.
 *
 * Includes hidden packages: callers that render a picker filter on `hidden`,
 * while callers that reconcile the registry with the database need the full
 * list — `base` is installed whether or not a merchant can choose it.
 */
export function listThemeConfigs(): ResolvedThemeConfig[] {
  return INSTALLED_THEMES.map(getThemeConfigOrNull).filter(
    (c): c is ResolvedThemeConfig => c !== null,
  );
}

/** Themes a merchant may actually activate. */
export function listSelectableThemes(): ResolvedThemeConfig[] {
  return listThemeConfigs().filter((c) => !c.hidden);
}

export function isInstalled(slug: string): boolean {
  return slug in THEME_SOURCES;
}
