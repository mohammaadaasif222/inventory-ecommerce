/**
 * Shared layout presets.
 *
 * A theme declares a `layoutPreset` and may override individual fields; the
 * merchant can then pick a different preset in the customiser. Design and
 * arrangement stay orthogonal — five themes × three layouts, all valid — which
 * is the capability the preset system this engine replaced already had, and
 * which baking one layout into each package would have quietly removed.
 *
 * Adding a preset is one entry here. Nothing else changes: every template reads
 * these fields rather than branching on which preset is active.
 */

import type { LayoutTokens } from './config';

export const LAYOUT_PRESETS = ['classic', 'editorial', 'compact'] as const;
export type LayoutPresetId = (typeof LAYOUT_PRESETS)[number];

export const DEFAULT_LAYOUT_PRESET: LayoutPresetId = 'classic';

export interface LayoutPreset extends LayoutTokens {
  id: LayoutPresetId;
  name: string;
  description: string;
}

export const LAYOUT_DEFS: LayoutPreset[] = [
  {
    id: 'classic',
    name: 'Classic',
    description:
      'Logo left, filters in a sidebar, roomy three-column grid. The dependable storefront.',
    container: 'container',
    navbar: 'inline',
    navHeight: 'h-16',
    filters: 'sidebar',
    sidebarWidth: '220px',
    grid: 'grid-cols-2 sm:grid-cols-3',
    gridGap: 'gap-x-5 gap-y-9',
    density: 'comfortable',
    card: {
      aspect: 'aspect-[4/5]',
      align: 'left',
      titleSize: 'text-lg',
      showRating: true,
    },
    pdp: 'split',
    footer: 'minimal',
    sectionPadding: 'py-10',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description:
      'Centred logo over a second nav row, filters in a top bar, two large cards per row. Magazine pacing.',
    container: 'mx-auto w-full max-w-5xl px-6',
    navbar: 'stacked',
    navHeight: 'h-auto',
    filters: 'topbar',
    sidebarWidth: '0',
    grid: 'grid-cols-1 sm:grid-cols-2',
    gridGap: 'gap-x-8 gap-y-14',
    density: 'comfortable',
    card: {
      aspect: 'aspect-[3/4]',
      align: 'center',
      titleSize: 'text-2xl',
      showRating: true,
    },
    pdp: 'stacked',
    footer: 'columns',
    sectionPadding: 'py-16',
  },
  {
    id: 'compact',
    name: 'Compact',
    description:
      'Slim nav with inline search, dense sidebar filters, up to five square cards per row. Marketplace density.',
    container: 'mx-auto w-full max-w-[1600px] px-4',
    navbar: 'slim',
    navHeight: 'h-12',
    filters: 'sidebar',
    sidebarWidth: '180px',
    grid: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    gridGap: 'gap-x-3 gap-y-5',
    density: 'dense',
    card: {
      aspect: 'aspect-square',
      align: 'left',
      titleSize: 'text-sm',
      showRating: false,
    },
    pdp: 'dense',
    footer: 'columns',
    sectionPadding: 'py-6',
  },
];

export function isLayoutPreset(value: unknown): value is LayoutPresetId {
  return (
    typeof value === 'string' && (LAYOUT_PRESETS as readonly string[]).includes(value)
  );
}

/** Falls back to Classic rather than throwing — a shop must still render. */
export function getLayoutPreset(id: string | undefined): LayoutPreset {
  return LAYOUT_DEFS.find((l) => l.id === id) ?? LAYOUT_DEFS[0];
}

/** Strip the preset's metadata, leaving the tokens templates consume. */
export function presetTokens(id: string | undefined): LayoutTokens {
  const { id: _id, name: _name, description: _description, ...tokens } =
    getLayoutPreset(id);
  return tokens;
}
