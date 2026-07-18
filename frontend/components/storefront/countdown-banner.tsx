'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Reveal } from './motion';

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function remainingUntil(target: number): Remaining {
  const ms = target - Date.now();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: false,
  };
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-14 w-14 overflow-hidden rounded-sm bg-white/10 sm:h-16 sm:w-16">
        <motion.span
          // Re-keying on value gives each tick its own flip-in.
          key={value}
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex items-center justify-center font-display text-2xl font-medium text-white sm:text-3xl"
        >
          {String(value).padStart(2, '0')}
        </motion.span>
      </div>
      <span className="mt-1.5 text-[10px] uppercase tracking-widest text-white/60">
        {label}
      </span>
    </div>
  );
}

export function CountdownBanner({
  title,
  subtitle,
  endsAt,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  subtitle?: string;
  endsAt: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const target = new Date(endsAt).getTime();
  // Start null so server and first client render agree; fill in after mount.
  const [left, setLeft] = useState<Remaining | null>(null);

  useEffect(() => {
    if (Number.isNaN(target)) return;
    setLeft(remainingUntil(target));
    const t = setInterval(() => setLeft(remainingUntil(target)), 1000);
    return () => clearInterval(t);
  }, [target]);

  if (Number.isNaN(target) || left?.done) return null;

  return (
    <section className="bg-ink py-16 text-white">
      <Reveal className="container flex flex-col items-center gap-6 text-center">
        <div className="space-y-2">
          <h2 className="font-display text-3xl font-medium sm:text-4xl">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-sm text-white/70">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex gap-3" suppressHydrationWarning>
          {left ? (
            <>
              <Unit value={left.days} label="days" />
              <Unit value={left.hours} label="hrs" />
              <Unit value={left.minutes} label="min" />
              <Unit value={left.seconds} label="sec" />
            </>
          ) : (
            // Placeholder keeps layout stable until the timer hydrates.
            <div className="h-[74px] sm:h-[82px]" />
          )}
        </div>

        {ctaLabel ? (
          <Button
            asChild
            size="lg"
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <Link href={ctaHref || '/products'}>{ctaLabel}</Link>
          </Button>
        ) : null}
      </Reveal>
    </section>
  );
}
