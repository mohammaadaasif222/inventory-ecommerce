'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useCategories } from '@/hooks/use-storefront';
import { RevealGroup, RevealItem, SectionHeading } from './motion';

export interface CategoryTilesProps {
  /**
   * Show the children of this category instead of the top-level tree — how a
   * single-vertical theme scopes the tiles to its range (Essence could pass
   * `fragrances`). Absent, the tiles are the store's top-level categories,
   * which is the only correct default for a sell-anything storefront.
   */
  parentSlug?: string;
  title?: string;
  subtitle?: string;
}

/**
 * Category browse tiles.
 *
 * Neutral by default — copy and scope are props, because this renders in
 * themes with very different voices. The fragrance-specific wording and the
 * families-only scope that used to live here were a bug in disguise: Universal
 * showed perfume families and told a hardware shopper to follow their nose.
 */
export function CategoryTiles({
  parentSlug,
  title = 'Shop by category',
  subtitle = 'Start where you mean to end up',
}: CategoryTilesProps) {
  const reduced = useReducedMotion();
  const { data: categories } = useCategories();

  const tiles = parentSlug
    ? (categories?.find((c) => c.slug === parentSlug)?.children ?? [])
    : (categories ?? []);
  if (tiles.length === 0) return null;

  return (
    <section className="container py-16">
      <SectionHeading title={title} subtitle={subtitle} className="mb-10" />
      <RevealGroup className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {tiles.slice(0, 10).map((category) => (
          <RevealItem key={category.id}>
            <Link
              href={`/products?categoryId=${category.id}`}
              className="group block"
            >
              <motion.div
                whileHover={reduced ? undefined : { y: -4 }}
                transition={{ duration: 0.25 }}
                className="relative aspect-[3/4] overflow-hidden rounded-sm bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://picsum.photos/seed/family-${category.slug}/500/700`}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-4 text-center font-display text-xl font-medium text-white">
                  {category.name}
                </span>
              </motion.div>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
