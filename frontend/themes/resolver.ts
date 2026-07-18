/**
 * The theme resolver — core's only entry point into theme packages.
 *
 * Two jobs:
 *   1. Flatten a theme's config through its `extends` chain (cached per slug).
 *   2. Resolve a template or slot id to a component, walking that same chain
 *      until a package implements it.
 *
 * Resolution is *nearest-first*: asking Maison for `product` checks Maison,
 * then base. That is the WordPress child-theme rule — override what you want,
 * inherit the rest — and it is why a look-only theme needs no templates at all.
 *
 * Everything here is server-side. The active slug comes from the API (which
 * caches it in Redis), so the storefront's first byte is already the right
 * theme: no default-then-swap flash, and crawlers see themed markup.
 */

import 'server-only';
import { cache } from 'react';
import type { ComponentType } from 'react';
import { resolveConfig, type ResolvedThemeConfig } from './config';
import type { SlotId, TemplateId, TemplateComponent } from './contract';
import { THEME_LOADERS, THEME_SOURCES, INSTALLED_THEMES } from './registry.generated';

/**
 * Fallback when the API is unreachable or names a theme that is not installed.
 *
 * Deliberately a real, complete theme rather than an error page: a storefront
 * that renders the wrong palette still sells; one that 500s does not.
 */
export const FALLBACK_THEME = 'universal';

/**
 * Flattened config for a slug.
 *
 * `cache()` dedupes this per request — a page and its layout both ask for the
 * active config, and neither should re-walk the chain.
 */
export const getThemeConfig = cache((slug: string): ResolvedThemeConfig => {
  return resolveConfig(slug, THEME_SOURCES);
});

/** Every installed theme's flattened config — for the admin's manager list. */
export const listThemes = cache((): ResolvedThemeConfig[] => {
  return INSTALLED_THEMES.map((slug) => getThemeConfig(slug));
});

export function isInstalled(slug: string): boolean {
  return slug in THEME_SOURCES;
}

/**
 * Resolve `slug`, or fall back if it is not installed.
 *
 * A theme can be uninstalled (its directory deleted) while the database still
 * names it active. That is a normal state during development, so it degrades
 * to the fallback with a warning rather than throwing.
 */
export function getThemeConfigSafe(slug: string): ResolvedThemeConfig {
  if (isInstalled(slug)) return getThemeConfig(slug);

  console.warn(
    `[themes] Active theme "${slug}" is not installed; falling back to ` +
      `"${FALLBACK_THEME}". Run \`npm run themes:sync\` if you just added it.`,
  );
  return getThemeConfig(FALLBACK_THEME);
}

/**
 * Walk a theme's chain and load the first package implementing `id`.
 *
 * Returns null only when nothing in the chain implements it — which the
 * registry generator already rejects for root themes, so in practice this is
 * null only for an optional slot no one has overridden.
 *
 * Slots take no props (they read everything from `useTheme()`/hooks), hence
 * `ComponentType` with its default empty-props parameter — `<Slot />` must be
 * renderable as-is.
 */
async function resolveFromChain(
  chain: string[],
  kind: 'templates' | 'slots',
  id: string,
): Promise<ComponentType | null> {
  for (const slug of chain) {
    const pkg = THEME_LOADERS[slug];
    if (!pkg) continue;

    // The generated tables are keyed by the narrow TemplateId/SlotId unions, so
    // a plain `string` index needs widening. The id is validated by the callers'
    // types; this only loosens the lookup, not the contract.
    const table = pkg[kind] as Record<string, (() => Promise<unknown>) | undefined>;
    const loader = table[id];
    if (!loader) continue;

    const mod = (await loader()) as { default: ComponentType };
    if (!mod?.default) {
      throw new Error(
        `themes/${slug}/${kind}/${id}.tsx has no default export. Templates and ` +
          `slots are resolved by convention — the component must be the default.`,
      );
    }
    return mod.default;
  }
  return null;
}

/**
 * The component for `id` under the given theme.
 *
 * Throws when nothing in the chain provides it: a missing template means a
 * blank page, and a loud failure at the route is far easier to diagnose than
 * an empty storefront.
 */
export async function resolveTemplate<K extends TemplateId>(
  slug: string,
  id: K,
): Promise<TemplateComponent<K>> {
  const config = getThemeConfigSafe(slug);
  const component = await resolveFromChain(config.chain, 'templates', id);

  if (!component) {
    throw new Error(
      `No template "${id}" in theme "${config.slug}" or its ancestors ` +
        `(${config.chain.join(' → ')}). Add themes/${config.slug}/templates/${id}.tsx ` +
        `and run \`npm run themes:sync\`.`,
    );
  }

  return component as TemplateComponent<K>;
}

/**
 * The component for a slot, or null when no package in the chain overrides it.
 *
 * Null is a valid answer — callers render their own default. Slots are opt-in
 * customisation points, unlike templates.
 */
export async function resolveSlot(
  slug: string,
  id: SlotId,
): Promise<ComponentType | null> {
  const config = getThemeConfigSafe(slug);
  return resolveFromChain(config.chain, 'slots', id);
}

/** Which package in the chain actually provides `id` — for admin diagnostics. */
export function whichProvides(
  slug: string,
  kind: 'templates' | 'slots',
  id: string,
): string | null {
  const config = getThemeConfigSafe(slug);
  for (const ancestor of config.chain) {
    if (THEME_LOADERS[ancestor]?.[kind]?.[id as never]) return ancestor;
  }
  return null;
}
