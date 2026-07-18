'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface HeroSlide {
  heading: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
  image?: string;
  align?: 'left' | 'center' | 'right';
}

const ALIGN: Record<string, string> = {
  left: 'items-start text-left',
  center: 'items-center text-center',
  right: 'items-end text-right',
};

export function HeroCarousel({
  slides,
  autoplayMs = 6000,
}: {
  slides: HeroSlide[];
  autoplayMs?: number;
}) {
  const reduced = useReducedMotion();
  const [emblaRef, embla] = useEmblaCarousel(
    { loop: true, duration: 32 },
    // Autoplay is a motion effect too — don't hijack the page if it's off.
    reduced || slides.length < 2
      ? []
      : [Autoplay({ delay: autoplayMs, stopOnInteraction: false })],
  );
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (embla) setSelected(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on('select', onSelect);
    return () => {
      embla.off('select', onSelect);
    };
  }, [embla, onSelect]);

  if (slides.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-ink">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((slide, i) => (
            <div key={i} className="relative min-w-0 flex-[0_0_100%]">
              <div className="relative h-[68vh] min-h-[440px] w-full">
                {slide.image ? (
                  // Ken Burns drift on the active slide only.
                  <motion.img
                    src={slide.image}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 h-full w-full object-cover"
                    animate={
                      reduced || selected !== i
                        ? { scale: 1 }
                        : { scale: 1.08 }
                    }
                    transition={{ duration: 8, ease: 'linear' }}
                  />
                ) : null}
                {/* Scrim keeps the serif legible over any photo. */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/45 to-ink/20" />

                <div className="container relative flex h-full items-center">
                  <AnimatePresence mode="wait">
                    {selected === i && (
                      <motion.div
                        key={`slide-${i}`}
                        className={cn(
                          'flex max-w-xl flex-col gap-4',
                          ALIGN[slide.align ?? 'left'],
                          slide.align === 'center' && 'mx-auto',
                          slide.align === 'right' && 'ml-auto',
                        )}
                        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduced ? { opacity: 0 } : { opacity: 0, y: -16 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <span className="text-xs uppercase tracking-[0.3em] text-brand">
                          Maison
                        </span>
                        <h1 className="font-display text-4xl font-medium leading-[1.05] text-white sm:text-6xl">
                          {slide.heading}
                        </h1>
                        {slide.subheading ? (
                          <p className="max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
                            {slide.subheading}
                          </p>
                        ) : null}
                        {slide.ctaLabel ? (
                          <Button
                            asChild
                            size="lg"
                            className="mt-2 w-fit bg-brand text-brand-foreground hover:bg-brand/90"
                          >
                            <Link href={slide.ctaHref || '/products'}>
                              {slide.ctaLabel}
                            </Link>
                          </Button>
                        ) : null}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => embla?.scrollPrev()}
            className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/25 bg-black/20 p-2 text-white backdrop-blur transition-colors hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:block"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => embla?.scrollNext()}
            className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/25 bg-black/20 p-2 text-white backdrop-blur transition-colors hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:block"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={selected === i}
                onClick={() => embla?.scrollTo(i)}
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  selected === i ? 'w-8 bg-brand' : 'w-4 bg-white/40',
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
