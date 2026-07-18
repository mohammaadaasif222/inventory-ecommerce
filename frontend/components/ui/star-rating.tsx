'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
} as const;

interface StarRatingProps {
  /** 0–5; fractional values fill the last star proportionally. */
  value: number;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Read-only star display. Use StarRatingInput for the review form. */
export function StarRating({ value, size = 'md', className }: StarRatingProps) {
  const clamped = Math.max(0, Math.min(5, value));
  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        // Fraction of THIS star that should be filled.
        const fill = Math.max(0, Math.min(1, clamped - i));
        return (
          <span key={i} className="relative inline-block">
            <Star className={cn(SIZES[size], 'text-muted-foreground/30')} />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  className={cn(SIZES[size], 'fill-amber-400 text-amber-400')}
                />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

/** Interactive 1–5 star picker. */
export function StarRatingInput({
  value,
  onChange,
  disabled,
  className,
}: StarRatingInputProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          aria-pressed={value === star}
          className="rounded transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Star
            className={cn(
              'h-6 w-6',
              star <= value
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/40',
            )}
          />
        </button>
      ))}
    </div>
  );
}
