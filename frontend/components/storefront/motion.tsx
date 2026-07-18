'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared motion vocabulary for the storefront. Every helper honours
 * prefers-reduced-motion by collapsing to a plain fade (or nothing), so the
 * animation never becomes an accessibility problem.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

/** Fades/rises its children into view the first time they're scrolled to. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: reduced ? 0.3 : 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Staggers direct children as the container enters the viewport. */
export function RevealGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={
        reduced
          ? {
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { duration: 0.3 } },
            }
          : fadeUp
      }
    >
      {children}
    </motion.div>
  );
}

/** Section heading with the brand's serif treatment and an accent rule. */
export function SectionHeading({
  title,
  subtitle,
  align = 'center',
  className,
}: {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        align === 'center' ? 'text-center' : 'text-left',
        className,
      )}
    >
      <h2 className="font-display text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
        {title}
      </h2>
      {/* mt clears the serif's descenders — at space-y-2 the rule reads as an underline. */}
      <span
        className={cn(
          'mt-4 block h-px w-16 bg-brand',
          align === 'center' && 'mx-auto',
        )}
      />
      {subtitle ? (
        <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </Reveal>
  );
}
