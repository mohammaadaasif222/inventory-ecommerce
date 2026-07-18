/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Written by `scripts/sync-themes.mjs` from the contents of `themes/*`.
 * Run `npm run themes:sync` after adding, removing or renaming a theme
 * package, a template, or a slot component. `predev`/`prebuild` run it too,
 * so a forgotten sync cannot reach a build.
 *
 * The dynamic imports below are literal on purpose: Next.js can only code-split
 * what it can see statically, so an inactive theme costs nothing at runtime.
 *
 * Themes discovered: base, botanica, decor, essence, maison, noir, universal
 */

import type { SlotId, TemplateId } from './contract';
import type { ThemeConfigSource } from './config';

import baseConfig from './base/theme.config.json';
import botanicaConfig from './botanica/theme.config.json';
import decorConfig from './decor/theme.config.json';
import essenceConfig from './essence/theme.config.json';
import maisonConfig from './maison/theme.config.json';
import noirConfig from './noir/theme.config.json';
import universalConfig from './universal/theme.config.json';

/** Raw configs, keyed by slug — flattened by `resolveConfig`. */
export const THEME_SOURCES: Record<string, ThemeConfigSource> = {
  'base': baseConfig as ThemeConfigSource,
  'botanica': botanicaConfig as ThemeConfigSource,
  'decor': decorConfig as ThemeConfigSource,
  'essence': essenceConfig as ThemeConfigSource,
  'maison': maisonConfig as ThemeConfigSource,
  'noir': noirConfig as ThemeConfigSource,
  'universal': universalConfig as ThemeConfigSource,
};

type Loader = () => Promise<{ default: unknown }>;

export interface ThemePackageLoaders {
  templates: Partial<Record<TemplateId, Loader>>;
  slots: Partial<Record<SlotId, Loader>>;
}

/**
 * What each package implements *itself*. A gap here is not an error — the
 * resolver walks the `extends` chain to fill it.
 */
export const THEME_LOADERS: Record<string, ThemePackageLoaders> = {
  'base': {
    templates: {
      'home': () => import('./base/templates/home'),
      'category': () => import('./base/templates/category'),
      'product': () => import('./base/templates/product'),
      'cart': () => import('./base/templates/cart'),
      'checkout': () => import('./base/templates/checkout'),
      'account': () => import('./base/templates/account'),
      'search': () => import('./base/templates/search'),
      'blog': () => import('./base/templates/blog'),
      'not-found': () => import('./base/templates/not-found'),
    },
    slots: {
    },
  },
  'botanica': {
    templates: {
    },
    slots: {
    },
  },
  'decor': {
    templates: {
      'home': () => import('./decor/templates/home'),
    },
    slots: {
      'header': () => import('./decor/components/header'),
      'footer': () => import('./decor/components/footer'),
    },
  },
  'essence': {
    templates: {
      'home': () => import('./essence/templates/home'),
      'product': () => import('./essence/templates/product'),
      'checkout': () => import('./essence/templates/checkout'),
    },
    slots: {
      'header': () => import('./essence/components/header'),
      'footer': () => import('./essence/components/footer'),
    },
  },
  'maison': {
    templates: {
    },
    slots: {
    },
  },
  'noir': {
    templates: {
    },
    slots: {
    },
  },
  'universal': {
    templates: {
      'home': () => import('./universal/templates/home'),
      'product': () => import('./universal/templates/product'),
    },
    slots: {
    },
  },
};

/** Slugs of every installed theme, in directory order. */
export const INSTALLED_THEMES = ["base","botanica","decor","essence","maison","noir","universal"] as const;
