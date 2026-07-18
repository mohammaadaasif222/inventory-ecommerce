'use client';

import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from './product-card';
import { SectionHeading } from './motion';
import { cn } from '@/lib/utils';
import type { Product } from '@/schemas/product.schema';

/** Horizontally scrollable product rail with arrow affordances. */
export function ProductRail({
  title,
  subtitle,
  products,
}: {
  title: string;
  subtitle?: string;
  products: Product[];
}) {
  const [emblaRef, embla] = useEmblaCarousel({
    align: 'start',
    dragFree: true,
    containScroll: 'trimSnaps',
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setCanPrev(embla.canScrollPrev());
    setCanNext(embla.canScrollNext());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on('select', onSelect);
    embla.on('reInit', onSelect);
    return () => {
      embla.off('select', onSelect);
      embla.off('reInit', onSelect);
    };
  }, [embla, onSelect]);

  if (products.length === 0) return null;

  return (
    <section className="container py-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <SectionHeading title={title} subtitle={subtitle} align="left" />
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            aria-label="Scroll left"
            disabled={!canPrev}
            onClick={() => embla?.scrollPrev()}
            className={cn(
              'rounded-full border p-2 transition-opacity',
              !canPrev && 'opacity-30',
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            disabled={!canNext}
            onClick={() => embla?.scrollNext()}
            className={cn(
              'rounded-full border p-2 transition-opacity',
              !canNext && 'opacity-30',
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-5">
          {products.map((p) => (
            <div
              key={p.id}
              className="min-w-0 flex-[0_0_65%] sm:flex-[0_0_38%] lg:flex-[0_0_23%]"
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
