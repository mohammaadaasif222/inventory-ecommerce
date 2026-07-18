/**
 * The theme contract — the stable API between core and every theme package.
 *
 * Core routes know only this file. They resolve a template by id and render it
 * with these props; they never import a theme. A theme package is therefore
 * addable (or removable) without touching routing, which is the whole point of
 * the engine — see `themes/README.md`.
 *
 * Data flow: core routes pass *route-derived* input only (params, search
 * params). Templates fetch their own domain data through the shared hooks in
 * `hooks/`, exactly as the pages did before the port. That keeps the contract
 * narrow — a new theme does not have to re-declare the catalog's shape — and
 * means adding a field to a product never breaks a theme.
 *
 * Changing anything in this file is a breaking change for every installed
 * theme. Add optional props rather than reshaping existing ones.
 */

import type { ComponentType } from 'react';
import type { ProductSort } from '@/hooks/use-storefront';

/**
 * Every page a theme can template, mirroring WordPress's template hierarchy.
 *
 * A theme need not implement all of them — the resolver falls back up the
 * `extends` chain, and ultimately to `base`, so a package can override only
 * what it wants to look different.
 */
export const TEMPLATE_IDS = [
  'home',
  'category',
  'product',
  'cart',
  'checkout',
  'account',
  'search',
  'blog',
  'not-found',
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

/**
 * Component slots a theme can override independently of a full template.
 *
 * These are the pieces that recur across pages: overriding `product-card` once
 * re-skins the card everywhere it appears without templating every page.
 */
export const SLOT_IDS = [
  'header',
  'footer',
  'product-card',
  'hero',
  'filter-sidebar',
  'checkout-stepper',
  'order-confirmation',
] as const;

export type SlotId = (typeof SLOT_IDS)[number];

// ── Template props ────────────────────────────────────────────────────────

/** Home renders the admin's homepage-builder sections, its own way. */
export interface HomeTemplateProps {
  /** Draft preview renders even unpublished sections; live never does. */
  preview?: boolean;
}

export interface CategoryTemplateProps {
  /** Category slug from the route, or undefined for the all-products listing. */
  slug?: string;
  /** Parsed listing state — themes render the controls, core owns the shape. */
  query: ListingQuery;
}

export interface SearchTemplateProps {
  q: string;
  query: ListingQuery;
}

export interface ProductTemplateProps {
  slug: string;
}

export interface BlogTemplateProps {
  /** Absent on the index, present on a single post. */
  slug?: string;
}

/** Cart, checkout, account and 404 derive everything from client state. */
export type CartTemplateProps = Record<string, never>;
export type CheckoutTemplateProps = Record<string, never>;
export type AccountTemplateProps = Record<string, never>;
export type NotFoundTemplateProps = Record<string, never>;

/**
 * Listing state shared by category and search.
 *
 * Kept as one object so a theme's filter UI reads fields rather than
 * destructuring a growing argument list.
 */
export interface ListingQuery {
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: ProductSort;
  page: number;
}

/** Maps each template id to the props core will hand it. */
export interface TemplatePropsMap {
  home: HomeTemplateProps;
  category: CategoryTemplateProps;
  product: ProductTemplateProps;
  cart: CartTemplateProps;
  checkout: CheckoutTemplateProps;
  account: AccountTemplateProps;
  search: SearchTemplateProps;
  blog: BlogTemplateProps;
  'not-found': NotFoundTemplateProps;
}

export type TemplateComponent<K extends TemplateId> = ComponentType<
  TemplatePropsMap[K]
>;

/**
 * A theme module's default export, as the resolver expects to find it.
 *
 * Templates live at `themes/<slug>/templates/<template-id>.tsx` and default-export
 * the component. The generator (`scripts/sync-themes.mjs`) discovers them by
 * that path convention — no manual wiring.
 */
export type TemplateModule<K extends TemplateId> = {
  default: TemplateComponent<K>;
};

export function isTemplateId(value: unknown): value is TemplateId {
  return (
    typeof value === 'string' && (TEMPLATE_IDS as readonly string[]).includes(value)
  );
}

export function isSlotId(value: unknown): value is SlotId {
  return typeof value === 'string' && (SLOT_IDS as readonly string[]).includes(value);
}
