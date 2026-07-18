'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { StarRating } from '@/components/ui/star-rating';
import { cn } from '@/lib/utils';
import { useBrands, useCategories, type Category } from '@/hooks/use-storefront';

export interface ProductFilterValue {
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
}

interface ProductFiltersProps {
  value: ProductFilterValue;
  onChange: (next: ProductFilterValue) => void;
  /** Sidebar stacks vertically; topbar lays the same choices out as chips. */
  variant?: 'sidebar' | 'topbar';
  /** Tightens spacing for dense layouts. */
  dense?: boolean;
}

/** Preset brackets cover the seeded catalogue's ₹199–₹1,89,999 spread. */
const PRICE_BRACKETS: { label: string; min?: number; max?: number }[] = [
  { label: 'Under ₹1,000', max: 1000 },
  { label: '₹1,000 – ₹5,000', min: 1000, max: 5000 },
  { label: '₹5,000 – ₹20,000', min: 5000, max: 20000 },
  { label: '₹20,000 – ₹50,000', min: 20000, max: 50000 },
  { label: 'Over ₹50,000', min: 50000 },
];

const RATING_OPTIONS = [4, 3, 2, 1];

function FilterRow({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
        active && 'bg-muted font-medium text-foreground',
        !active && 'text-muted-foreground',
      )}
    >
      {children}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

/** Pill used by the topbar variant. */
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-input text-muted-foreground hover:border-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

export function ProductFilters({
  value,
  onChange,
  variant = 'sidebar',
  dense = false,
}: ProductFiltersProps) {
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();

  // Local text state so typing a price doesn't fire a request per keystroke.
  const [minInput, setMinInput] = useState(value.minPrice?.toString() ?? '');
  const [maxInput, setMaxInput] = useState(value.maxPrice?.toString() ?? '');

  // Keep the inputs in step when a bracket or "Clear all" changes the value.
  useEffect(() => {
    setMinInput(value.minPrice?.toString() ?? '');
    setMaxInput(value.maxPrice?.toString() ?? '');
  }, [value.minPrice, value.maxPrice]);

  const patch = (next: Partial<ProductFilterValue>) =>
    onChange({ ...value, ...next });

  const applyCustomPrice = () => {
    const min = minInput.trim() === '' ? undefined : Number(minInput);
    const max = maxInput.trim() === '' ? undefined : Number(maxInput);
    patch({
      minPrice: Number.isFinite(min) ? min : undefined,
      maxPrice: Number.isFinite(max) ? max : undefined,
    });
  };

  const activeCount = Object.values(value).filter((v) => v !== undefined).length;

  const renderCategory = (category: Category, depth: number) => (
    <div key={category.id}>
      <FilterRow
        active={value.categoryId === category.id}
        onClick={() =>
          patch({
            categoryId:
              value.categoryId === category.id ? undefined : category.id,
          })
        }
      >
        <span style={{ paddingLeft: depth * 12 }}>{category.name}</span>
      </FilterRow>
      {category.children?.map((child) => renderCategory(child, depth + 1))}
    </div>
  );

  // ── Topbar: same choices, laid out as chip rows above the grid ──
  if (variant === 'topbar') {
    // Flatten the tree — a horizontal bar has no room for indentation.
    const flat = (categories ?? []).flatMap((c) => [c, ...(c.children ?? [])]);

    return (
      <div className="space-y-3 border-y py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            Category
          </span>
          <Chip
            active={!value.categoryId}
            onClick={() => patch({ categoryId: undefined })}
          >
            All
          </Chip>
          {flat.map((c) => (
            <Chip
              key={c.id}
              active={value.categoryId === c.id}
              onClick={() =>
                patch({
                  categoryId: value.categoryId === c.id ? undefined : c.id,
                })
              }
            >
              {c.name}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            Price
          </span>
          <Chip
            active={value.minPrice === undefined && value.maxPrice === undefined}
            onClick={() => patch({ minPrice: undefined, maxPrice: undefined })}
          >
            Any
          </Chip>
          {PRICE_BRACKETS.map((b) => (
            <Chip
              key={b.label}
              active={value.minPrice === b.min && value.maxPrice === b.max}
              onClick={() => patch({ minPrice: b.min, maxPrice: b.max })}
            >
              {b.label}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            Rating
          </span>
          <Chip
            active={value.minRating === undefined}
            onClick={() => patch({ minRating: undefined })}
          >
            Any
          </Chip>
          {RATING_OPTIONS.map((r) => (
            <Chip
              key={r}
              active={value.minRating === r}
              onClick={() =>
                patch({ minRating: value.minRating === r ? undefined : r })
              }
            >
              {r}★ &amp; up
            </Chip>
          ))}

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-auto px-2 py-1 text-xs"
              onClick={() => onChange({})}
            >
              <X className="mr-1 h-3 w-3" />
              Clear all
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <aside className={cn(dense ? 'space-y-3 text-[13px]' : 'space-y-4')}>
      <div className="flex items-center justify-between px-2">
        <h2 className="text-sm font-semibold">Filters</h2>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs"
            onClick={() => onChange({})}
          >
            <X className="mr-1 h-3 w-3" />
            Clear all
          </Button>
        )}
      </div>

      <Separator />

      <Section title="Category">
        <FilterRow
          active={!value.categoryId}
          onClick={() => patch({ categoryId: undefined })}
        >
          All categories
        </FilterRow>
        {categories?.map((c) => renderCategory(c, 0))}
      </Section>

      <Separator />

      <Section title="Price">
        <FilterRow
          active={value.minPrice === undefined && value.maxPrice === undefined}
          onClick={() => patch({ minPrice: undefined, maxPrice: undefined })}
        >
          Any price
        </FilterRow>
        {PRICE_BRACKETS.map((b) => (
          <FilterRow
            key={b.label}
            active={value.minPrice === b.min && value.maxPrice === b.max}
            onClick={() => patch({ minPrice: b.min, maxPrice: b.max })}
          >
            {b.label}
          </FilterRow>
        ))}
        <div className="flex items-center gap-2 px-2 pt-1">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Min"
            aria-label="Minimum price"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={applyCustomPrice}
            onKeyDown={(e) => e.key === 'Enter' && applyCustomPrice()}
            className="h-8 text-xs"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Max"
            aria-label="Maximum price"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={applyCustomPrice}
            onKeyDown={(e) => e.key === 'Enter' && applyCustomPrice()}
            className="h-8 text-xs"
          />
        </div>
      </Section>

      <Separator />

      <Section title="Customer rating">
        <FilterRow
          active={value.minRating === undefined}
          onClick={() => patch({ minRating: undefined })}
        >
          Any rating
        </FilterRow>
        {RATING_OPTIONS.map((r) => (
          <FilterRow
            key={r}
            active={value.minRating === r}
            onClick={() =>
              patch({ minRating: value.minRating === r ? undefined : r })
            }
          >
            <span className="flex items-center gap-1.5">
              <StarRating value={r} size="sm" />
              <span>&amp; up</span>
            </span>
          </FilterRow>
        ))}
      </Section>

      {brands && brands.length > 0 && (
        <>
          <Separator />
          <Section title="Brand">
            <FilterRow
              active={!value.brandId}
              onClick={() => patch({ brandId: undefined })}
            >
              All brands
            </FilterRow>
            {brands.map((b) => (
              <FilterRow
                key={b.id}
                active={value.brandId === b.id}
                onClick={() =>
                  patch({ brandId: value.brandId === b.id ? undefined : b.id })
                }
              >
                {b.name}
              </FilterRow>
            ))}
          </Section>
        </>
      )}
    </aside>
  );
}
