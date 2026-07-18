/**
 * Theme discovery — scans `themes/*` and writes `themes/registry.generated.ts`.
 *
 * This exists so installing a theme is a filesystem operation, the way it is in
 * WordPress: drop a package in `themes/`, run `npm run themes:sync`, and it is
 * installable from the admin. Nothing in `app/` or `lib/` changes.
 *
 * Why generate rather than glob at runtime: Next.js has to see every dynamic
 * import as a literal to bundle it, so the loader map must exist in source.
 * Generating it keeps that requirement from leaking into anyone's workflow —
 * the map is a build artifact, not something a theme author maintains by hand.
 *
 * Run: `npm run themes:sync` (also runs automatically via `predev`/`prebuild`).
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const THEMES_DIR = join(HERE, '..', 'themes');
const OUT_FILE = join(THEMES_DIR, 'registry.generated.ts');

/** Mirrors `TEMPLATE_IDS` in `themes/contract.ts`. */
const TEMPLATE_IDS = [
  'home',
  'category',
  'product',
  'cart',
  'checkout',
  'account',
  'search',
  'blog',
  'not-found',
];

/** Mirrors `SLOT_IDS` in `themes/contract.ts`. */
const SLOT_IDS = [
  'header',
  'footer',
  'product-card',
  'hero',
  'filter-sidebar',
  'checkout-stepper',
  'order-confirmation',
];

async function isDir(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

/** A theme package is any directory in `themes/` holding a `theme.config.json`. */
async function discover() {
  const entries = await readdir(THEMES_DIR);
  const packages = [];

  for (const slug of entries.sort()) {
    const dir = join(THEMES_DIR, slug);
    if (!(await isDir(dir))) continue;

    const configPath = join(dir, 'theme.config.json');
    if (!existsSync(configPath)) continue;

    let config;
    try {
      config = JSON.parse(await readFile(configPath, 'utf8'));
    } catch (err) {
      throw new Error(`themes/${slug}/theme.config.json is not valid JSON: ${err.message}`);
    }

    if (config.slug !== slug) {
      throw new Error(
        `themes/${slug}/theme.config.json declares slug "${config.slug}". ` +
          `The slug must match the directory name, since that is what the ` +
          `registry and the database's active-theme field agree on.`,
      );
    }

    packages.push({
      slug,
      config,
      templates: await presentFiles(join(dir, 'templates'), TEMPLATE_IDS),
      slots: await presentFiles(join(dir, 'components'), SLOT_IDS),
    });
  }

  return packages;
}

/** Which of `ids` exist as `<dir>/<id>.tsx`. */
async function presentFiles(dir, ids) {
  if (!(await isDir(dir))) return [];
  const files = await readdir(dir);
  const present = new Set(files.filter((f) => f.endsWith('.tsx')).map((f) => f.slice(0, -4)));
  return ids.filter((id) => present.has(id));
}

/** Fail before writing a registry that would throw at request time. */
function validate(packages) {
  const bySlug = new Map(packages.map((p) => [p.slug, p]));
  const errors = [];

  for (const pkg of packages) {
    const parent = pkg.config.extends;
    if (parent && !bySlug.has(parent)) {
      errors.push(
        `themes/${pkg.slug} extends "${parent}", which is not installed. ` +
          `Installed: ${[...bySlug.keys()].join(', ')}.`,
      );
    }

    // Walk to a root, catching cycles before `resolveConfig` meets them.
    const seen = [pkg.slug];
    let cursor = parent;
    while (cursor) {
      if (seen.includes(cursor)) {
        errors.push(`themes/${pkg.slug} has a circular extends chain: ${[...seen, cursor].join(' → ')}`);
        break;
      }
      seen.push(cursor);
      cursor = bySlug.get(cursor)?.config.extends;
    }

    // A root theme must be able to render every page by itself, or a visitor
    // hits an unresolvable template and gets nothing.
    if (!parent) {
      const missing = TEMPLATE_IDS.filter((id) => !pkg.templates.includes(id));
      if (missing.length > 0) {
        errors.push(
          `themes/${pkg.slug} is a root theme (no \`extends\`) but implements no ` +
            `template for: ${missing.join(', ')}. Either add them or extend a theme that has them.`,
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Theme registry is invalid:\n\n  - ${errors.join('\n  - ')}\n`);
  }
}

function render(packages) {
  const importPath = (slug, kind, id) => `./${slug}/${kind}/${id}`;

  const configImports = packages
    .map((p) => `import ${ident(p.slug)}Config from './${p.slug}/theme.config.json';`)
    .join('\n');

  const sources = packages
    .map((p) => `  '${p.slug}': ${ident(p.slug)}Config as ThemeConfigSource,`)
    .join('\n');

  const loaders = packages
    .map((p) => {
      const templates = p.templates
        .map(
          (id) =>
            `      '${id}': () => import('${importPath(p.slug, 'templates', id)}'),`,
        )
        .join('\n');
      const slots = p.slots
        .map(
          (id) =>
            `      '${id}': () => import('${importPath(p.slug, 'components', id)}'),`,
        )
        .join('\n');
      return [
        `  '${p.slug}': {`,
        `    templates: {`,
        templates,
        `    },`,
        `    slots: {`,
        slots,
        `    },`,
        `  },`,
      ]
        .filter((line) => line !== '')
        .join('\n');
    })
    .join('\n');

  return `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Written by \`scripts/sync-themes.mjs\` from the contents of \`themes/*\`.
 * Run \`npm run themes:sync\` after adding, removing or renaming a theme
 * package, a template, or a slot component. \`predev\`/\`prebuild\` run it too,
 * so a forgotten sync cannot reach a build.
 *
 * The dynamic imports below are literal on purpose: Next.js can only code-split
 * what it can see statically, so an inactive theme costs nothing at runtime.
 *
 * Themes discovered: ${packages.length ? packages.map((p) => p.slug).join(', ') : 'none'}
 */

import type { SlotId, TemplateId } from './contract';
import type { ThemeConfigSource } from './config';

${configImports}

/** Raw configs, keyed by slug — flattened by \`resolveConfig\`. */
export const THEME_SOURCES: Record<string, ThemeConfigSource> = {
${sources}
};

type Loader = () => Promise<{ default: unknown }>;

export interface ThemePackageLoaders {
  templates: Partial<Record<TemplateId, Loader>>;
  slots: Partial<Record<SlotId, Loader>>;
}

/**
 * What each package implements *itself*. A gap here is not an error — the
 * resolver walks the \`extends\` chain to fill it.
 */
export const THEME_LOADERS: Record<string, ThemePackageLoaders> = {
${loaders}
};

/** Slugs of every installed theme, in directory order. */
export const INSTALLED_THEMES = ${JSON.stringify(packages.map((p) => p.slug))} as const;
`;
}

/** `not-found` → `notFound`, so the slug is usable as an identifier. */
function ident(slug) {
  return slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

async function main() {
  if (!(await isDir(THEMES_DIR))) {
    throw new Error(`No themes directory at ${THEMES_DIR}`);
  }

  const packages = await discover();
  validate(packages);
  await writeFile(OUT_FILE, render(packages), 'utf8');

  const summary = packages
    .map((p) => {
      const parent = p.config.extends ? ` extends ${p.config.extends}` : '';
      return `  ${p.slug}@${p.config.version}${parent} — ${p.templates.length} templates, ${p.slots.length} slots`;
    })
    .join('\n');

  console.log(`Theme registry → ${relative(process.cwd(), OUT_FILE)}\n${summary}`);
}

main().catch((err) => {
  console.error(`\n${err.message}\n`);
  process.exit(1);
});
