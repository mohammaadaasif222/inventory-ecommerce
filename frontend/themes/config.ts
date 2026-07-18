/**
 * `theme.config.json` — the declarative half of a theme package.
 *
 * A theme is two things: this config (tokens, layout, checkout shape) and its
 * templates. A package that only wants a different *look* ships config alone
 * and inherits every template via `extends` — that is how Maison, Noir and
 * Botanica stay ~40 lines each instead of triplicating the storefront.
 *
 * Tokens become CSS variables on the storefront root, so switching a theme
 * re-skins everything the tokens touch — including checkout — rather than just
 * the homepage.
 */

import type { SlotId, TemplateId } from './contract';
// Type-only in the other direction, so this pair does not form a runtime cycle.
import { DEFAULT_LAYOUT_PRESET, presetTokens } from './layouts';

/** shadcn's bare-HSL form: `"36 46% 52%"`. Not `hsl(...)`, not hex. */
export type HslTriplet = string;

/**
 * The token set every theme defines for both colour modes.
 *
 * The first nineteen are the shadcn token contract, so a theme's palette
 * reaches every existing `components/ui` primitive — and therefore checkout —
 * for free. The last three are storefront-only brand tokens already wired into
 * `tailwind.config.ts` as `bg-brand`, `text-brand-foreground` and `bg-ink`.
 */
export interface ColorTokens {
  background: HslTriplet;
  foreground: HslTriplet;
  card: HslTriplet;
  'card-foreground': HslTriplet;
  popover: HslTriplet;
  'popover-foreground': HslTriplet;
  primary: HslTriplet;
  'primary-foreground': HslTriplet;
  secondary: HslTriplet;
  'secondary-foreground': HslTriplet;
  muted: HslTriplet;
  'muted-foreground': HslTriplet;
  accent: HslTriplet;
  'accent-foreground': HslTriplet;
  destructive: HslTriplet;
  'destructive-foreground': HslTriplet;
  border: HslTriplet;
  input: HslTriplet;
  ring: HslTriplet;
  /** Accent used for rules, prices and emphasis across the storefront. */
  brand: HslTriplet;
  'brand-foreground': HslTriplet;
  /** Deepest surface — full-bleed hero panels and footers. */
  ink: HslTriplet;
}

/**
 * Faces available to themes, self-hosted by `next/font` in `app/layout.tsx`.
 *
 * A theme names a key rather than a family: `next/font` can only load fonts
 * declared statically at build time, so an arbitrary family string would
 * either not load or silently fall back to Georgia. Adding a face means one
 * declaration in the root layout and one entry here.
 */
export const FONT_KEYS = ['cormorant', 'fraunces', 'jost', 'sans'] as const;
export type FontKey = (typeof FONT_KEYS)[number];

/** Font key → the CSS variable the root layout exposes. */
export const FONT_VARS: Record<FontKey, string> = {
  cormorant: 'var(--font-cormorant)',
  fraunces: 'var(--font-fraunces)',
  jost: 'var(--font-jost)',
  sans: 'ui-sans-serif, system-ui, sans-serif',
};

/** Human labels for the customiser's font picker. */
export const FONT_LABELS: Record<FontKey, string> = {
  cormorant: 'Cormorant Garamond',
  fraunces: 'Fraunces',
  jost: 'Jost',
  sans: 'System sans',
};

export interface FontTokens {
  /** Headings and display type. */
  display: FontKey;
  /** Body copy and UI. */
  body: FontKey;
}

export function isFontKey(value: unknown): value is FontKey {
  return typeof value === 'string' && (FONT_KEYS as readonly string[]).includes(value);
}

/**
 * Structure and density — the arrangement half of a theme.
 *
 * Kept as data rather than conditionals: components read these fields instead
 * of branching on a theme slug, so a new package composes a layout it likes
 * without editing any component. This is the one good idea carried over intact
 * from the preset system this engine replaces.
 */
export interface LayoutTokens {
  /** Tailwind container class for storefront pages. */
  container: string;
  navbar: 'inline' | 'stacked' | 'slim';
  navHeight: string;
  filters: 'sidebar' | 'topbar';
  sidebarWidth: string;
  grid: string;
  gridGap: string;
  /**
   * Overall information density.
   *
   * An explicit token rather than something inferred from the theme's slug:
   * templates ask *what kind of layout is this* instead of *is this the compact
   * preset*, so a new theme opts into a dense treatment without any template
   * learning its name.
   */
  density: 'comfortable' | 'dense';
  card: {
    aspect: string;
    align: 'left' | 'center';
    titleSize: string;
    showRating: boolean;
  };
  pdp: 'split' | 'stacked' | 'dense';
  footer: 'minimal' | 'columns';
  sectionPadding: string;
}

/**
 * Checkout presentation. The *rules* of checkout (stock validation, payment,
 * webhooks) are core and theme-independent; only its shape is themeable.
 *
 * `steps` may collapse the standard five into fewer screens — Essence runs a
 * single column, Universal runs the full stepper — but may not invent steps
 * core does not implement.
 */
export const CHECKOUT_STEPS = [
  'cart',
  'address',
  'shipping',
  'payment',
  'review',
] as const;

export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

export interface CheckoutTokens {
  /** Ordered screens. Multiple steps in one entry render on one screen. */
  steps: CheckoutStep[][];
  style: 'single-column' | 'stepper';
  /** Trust badges under the summary — authenticity, secure packaging, etc. */
  trustBadges: string[];
  /** Offer gift-wrap / sample upsell before payment. */
  upsell: boolean;
}

/** Swatches for admin preview cards, so previews render without mounting. */
export interface PreviewTokens {
  thumbnail?: string;
  swatch: { bg: string; fg: string; brand: string; muted: string };
  swatchDark: { bg: string; fg: string; brand: string; muted: string };
}

/**
 * The raw shape authored in `theme.config.json`.
 *
 * Every field except identity is optional — an inheriting package overrides a
 * few tokens and lets the rest resolve through its parent.
 */
export interface ThemeConfigSource {
  name: string;
  slug: string;
  version: string;
  description: string;
  author?: string;
  /** Slug of the parent package, or null/absent for a standalone theme. */
  extends?: string | null;
  /**
   * Hide from the admin's theme picker.
   *
   * For packages that exist to be inherited rather than activated — `base`
   * carries the shared templates every other theme builds on, and is not a
   * design a merchant would choose.
   */
  hidden?: boolean;
  tokens?: {
    colors?: { light?: Partial<ColorTokens>; dark?: Partial<ColorTokens> };
    fonts?: Partial<FontTokens>;
    radius?: string;
  };
  /**
   * Category slug this theme's storefront is scoped to (`"perfume"`,
   * `"home-decor"`). A single-vertical theme shows only that category's
   * subtree in its menus, listings and rails; absent/null means the whole
   * catalog. Data is never touched — other products simply don't render
   * while this theme is active. Unresolvable slugs degrade to unscoped.
   */
  catalogScope?: string | null;
  /**
   * Which shared layout the theme is designed around (see `themes/layouts.ts`).
   *
   * Named rather than inlined so design and arrangement stay orthogonal: the
   * merchant can pick a different preset in the customiser without the theme
   * author anticipating it.
   */
  layoutPreset?: string;
  /** Field-level overrides on top of `layoutPreset`, for an opinionated theme. */
  layout?: Partial<LayoutTokens>;
  checkout?: Partial<CheckoutTokens>;
  preview?: Partial<PreviewTokens>;
  /** Templates this package implements itself; the rest inherit. */
  templates?: TemplateId[];
  /** Slots this package overrides itself; the rest inherit. */
  slots?: SlotId[];
}

/** A config after the `extends` chain is flattened — every field present. */
export interface ResolvedThemeConfig {
  name: string;
  slug: string;
  version: string;
  description: string;
  author: string;
  extends: string | null;
  hidden: boolean;
  /** Resolution order, nearest first: `['maison', 'base']`. */
  chain: string[];
  tokens: {
    colors: { light: ColorTokens; dark: ColorTokens };
    fonts: FontTokens;
    radius: string;
  };
  /** Category slug the storefront is scoped to, or null for the whole catalog. */
  catalogScope: string | null;
  /** The preset the theme was authored against; the customiser may replace it. */
  layoutPreset: string;
  layout: LayoutTokens;
  checkout: CheckoutTokens;
  preview: PreviewTokens;
  templates: TemplateId[];
  slots: SlotId[];
}

/**
 * Merge a child config over its already-resolved parent.
 *
 * Deep for the nested token groups, replace-wholesale for arrays: a theme that
 * declares `checkout.steps` means *those* steps, not those appended to its
 * parent's. `templates`/`slots` are the exception — they union, because they
 * describe what exists on disk across the chain, not a preference.
 */
export function mergeConfig(
  parent: ResolvedThemeConfig,
  child: ThemeConfigSource,
): ResolvedThemeConfig {
  return {
    name: child.name,
    slug: child.slug,
    version: child.version,
    description: child.description,
    author: child.author ?? parent.author,
    extends: child.extends ?? null,
    // Not inherited: `base` is hidden precisely so its children can be the
    // themes merchants actually pick.
    hidden: child.hidden ?? false,
    chain: [child.slug, ...parent.chain],
    tokens: {
      colors: {
        light: { ...parent.tokens.colors.light, ...child.tokens?.colors?.light },
        dark: { ...parent.tokens.colors.dark, ...child.tokens?.colors?.dark },
      },
      fonts: { ...parent.tokens.fonts, ...child.tokens?.fonts },
      radius: child.tokens?.radius ?? parent.tokens.radius,
    },
    catalogScope:
      child.catalogScope !== undefined ? child.catalogScope : parent.catalogScope,
    layoutPreset: child.layoutPreset ?? parent.layoutPreset,
    layout: resolveLayout(parent, child),
    checkout: { ...parent.checkout, ...child.checkout },
    preview: {
      thumbnail: child.preview?.thumbnail ?? parent.preview.thumbnail,
      swatch: { ...parent.preview.swatch, ...child.preview?.swatch },
      swatchDark: { ...parent.preview.swatchDark, ...child.preview?.swatchDark },
    },
    templates: union(parent.templates, child.templates),
    slots: union(parent.slots, child.slots),
  };
}

function union<T>(a: readonly T[], b: readonly T[] = []): T[] {
  return Array.from(new Set([...a, ...b]));
}

/**
 * Resolve a child's layout against its parent's.
 *
 * Two cases, kept deliberately distinct:
 *
 *  - The child names its own `layoutPreset` → start from that preset, not from
 *    the parent's resolved layout. Inheriting the parent's field-level tweaks
 *    across a preset change would smuggle (say) Editorial's centred cards into
 *    Compact, which is never what "I want the Compact layout" means.
 *  - The child does not → inherit the parent's layout wholesale and apply only
 *    its own field overrides.
 */
function resolveLayout(
  parent: ResolvedThemeConfig,
  child: ThemeConfigSource,
): LayoutTokens {
  const base = child.layoutPreset
    ? presetTokens(child.layoutPreset)
    : parent.layout;

  return {
    ...base,
    ...child.layout,
    card: { ...base.card, ...child.layout?.card },
  };
}

/**
 * Flatten a config's `extends` chain against a lookup of raw sources.
 *
 * Throws on a missing parent or a cycle rather than resolving to a partial
 * theme: a half-merged config yields a storefront with undefined CSS vars,
 * which fails silently and looks like a styling bug rather than a config one.
 */
export function resolveConfig(
  slug: string,
  sources: Record<string, ThemeConfigSource>,
  seen: string[] = [],
): ResolvedThemeConfig {
  if (seen.includes(slug)) {
    throw new Error(
      `Theme "${slug}" has a circular extends chain: ${[...seen, slug].join(' → ')}`,
    );
  }

  const source = sources[slug];
  if (!source) {
    const known = Object.keys(sources).join(', ') || 'none';
    throw new Error(`Theme "${slug}" not found. Installed themes: ${known}`);
  }

  // A root package must be self-sufficient — there is nothing above it to fill
  // gaps, so an incomplete one is a packaging error, not a runtime fallback.
  if (!source.extends) return assertComplete(source);

  const parent = resolveConfig(source.extends, sources, [...seen, slug]);
  return mergeConfig(parent, source);
}

/** Narrow a root source to a resolved config, failing loudly on omissions. */
function assertComplete(source: ThemeConfigSource): ResolvedThemeConfig {
  const missing: string[] = [];
  if (!source.tokens?.colors?.light) missing.push('tokens.colors.light');
  if (!source.tokens?.colors?.dark) missing.push('tokens.colors.dark');
  if (!source.tokens?.fonts) missing.push('tokens.fonts');
  if (!source.checkout) missing.push('checkout');

  if (missing.length > 0) {
    throw new Error(
      `Theme "${source.slug}" declares no \`extends\`, so it must define every ` +
        `token itself. Missing: ${missing.join(', ')}.`,
    );
  }

  return {
    name: source.name,
    slug: source.slug,
    version: source.version,
    description: source.description,
    author: source.author ?? 'unknown',
    extends: null,
    hidden: source.hidden ?? false,
    chain: [source.slug],
    tokens: {
      colors: {
        light: source.tokens!.colors!.light as ColorTokens,
        dark: source.tokens!.colors!.dark as ColorTokens,
      },
      fonts: source.tokens!.fonts as FontTokens,
      radius: source.tokens?.radius ?? '0.5rem',
    },
    catalogScope: source.catalogScope ?? null,
    // A root theme may omit `layout` entirely and take the preset as-is —
    // unlike tokens, there is always a sane shared default to fall back to.
    layoutPreset: source.layoutPreset ?? DEFAULT_LAYOUT_PRESET,
    layout: {
      ...presetTokens(source.layoutPreset ?? DEFAULT_LAYOUT_PRESET),
      ...source.layout,
      card: {
        ...presetTokens(source.layoutPreset ?? DEFAULT_LAYOUT_PRESET).card,
        ...source.layout?.card,
      },
    },
    checkout: source.checkout as CheckoutTokens,
    preview: {
      thumbnail: source.preview?.thumbnail,
      swatch: source.preview?.swatch ?? FALLBACK_SWATCH,
      swatchDark: source.preview?.swatchDark ?? FALLBACK_SWATCH,
    },
    templates: source.templates ?? [],
    slots: source.slots ?? [],
  };
}

const FALLBACK_SWATCH = {
  bg: 'hsl(0 0% 100%)',
  fg: 'hsl(0 0% 10%)',
  brand: 'hsl(0 0% 40%)',
  muted: 'hsl(0 0% 96%)',
};

/**
 * The merchant's customiser overrides, as stored by the backend.
 *
 * Structurally a subset of `ThemeConfigSource['tokens']` plus the branding the
 * customiser owns. Mirrors `ThemeCustomizations` in the backend schema.
 */
export interface ThemeCustomizations {
  colors?: { light?: Partial<ColorTokens>; dark?: Partial<ColorTokens> };
  fonts?: Partial<FontTokens>;
  radius?: string;
  /**
   * Merchant's layout choice, overriding the theme's own.
   *
   * Keeps design and arrangement orthogonal: any theme pairs with any layout,
   * so the five packages offer fifteen valid storefronts rather than five.
   */
  layoutPreset?: string;
  /**
   * Default colour mode for new visitors.
   *
   * Per-theme rather than site-wide, because it is a property of the design:
   * Noir may want to open dark where Botanica wants light. A visitor's own
   * toggle still wins — this only decides what they see before they choose.
   */
  appearance?: 'light' | 'dark' | 'system';
  logoUrl?: string;
  faviconUrl?: string;
  sectionOrder?: string[];
}

/** A theme as actually rendered: package config with the merchant's edits on top. */
export interface AppliedTheme extends ResolvedThemeConfig {
  appearance: 'light' | 'dark' | 'system';
  logoUrl: string;
  faviconUrl: string;
  sectionOrder: string[];
}

/**
 * Layer customiser overrides onto a resolved package config.
 *
 * The last step before render, and the reason the customiser can re-brand
 * Universal for a merchant without a new theme package: the package supplies
 * defaults, this supplies the merchant's opinion, and neither knows about the
 * other.
 */
export function applyCustomizations(
  config: ResolvedThemeConfig,
  custom: ThemeCustomizations | undefined,
): AppliedTheme {
  // Switching preset restarts from that preset's tokens rather than layering
  // onto the theme's own — same reasoning as `resolveLayout`: the merchant
  // asked for Compact, not for Compact wearing Editorial's card proportions.
  const layout = custom?.layoutPreset
    ? presetTokens(custom.layoutPreset)
    : config.layout;

  return {
    ...config,
    tokens: {
      colors: {
        light: { ...config.tokens.colors.light, ...custom?.colors?.light },
        dark: { ...config.tokens.colors.dark, ...custom?.colors?.dark },
      },
      fonts: { ...config.tokens.fonts, ...custom?.fonts },
      radius: custom?.radius ?? config.tokens.radius,
    },
    layoutPreset: custom?.layoutPreset ?? config.layoutPreset,
    layout,
    appearance: custom?.appearance ?? 'system',
    logoUrl: custom?.logoUrl ?? '',
    faviconUrl: custom?.faviconUrl ?? '',
    sectionOrder: custom?.sectionOrder ?? [],
  };
}

/**
 * A theme's tokens as inline CSS variables for the storefront root.
 *
 * Emits *both* palettes under `--light-*` / `--dark-*` rather than writing
 * `--background` directly, and leaves the choice to a pair of rules in
 * `globals.css`:
 *
 *     .theme-root      { --background: var(--light-background); }
 *     .dark .theme-root{ --background: var(--dark-background);  }
 *
 * The indirection is not decorative. Inline styles outrank every stylesheet
 * rule, so writing `--background` here would pin the light value and no `.dark`
 * selector could ever override it without `!important`. Shipping raw palettes
 * inline and selecting between them in CSS keeps normal specificity working —
 * and means a visitor's light/dark toggle is a class flip on <html> with no
 * re-render and no round trip.
 *
 * Mode-independent tokens (radius, fonts) are written directly: nothing
 * competes for them.
 */
export function themeStyleVars(config: ResolvedThemeConfig): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const mode of ['light', 'dark'] as const) {
    for (const [token, value] of Object.entries(config.tokens.colors[mode])) {
      vars[`--${mode}-${token}`] = value;
    }
  }

  vars['--radius'] = config.tokens.radius;

  // Resolve the key to a real font stack here rather than shipping the key —
  // an unknown key falls back to the system sans instead of leaving
  // `--font-display` undefined, which silently drops to Georgia.
  vars['--font-display'] =
    FONT_VARS[config.tokens.fonts.display] ?? FONT_VARS.sans;
  vars['--font-body'] = FONT_VARS[config.tokens.fonts.body] ?? FONT_VARS.sans;

  return vars;
}

/** Token names, for generating the light/dark selection rules. */
export const COLOR_TOKEN_NAMES: (keyof ColorTokens)[] = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  'brand',
  'brand-foreground',
  'ink',
];
