'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { StarRating, StarRatingInput } from '@/components/ui/star-rating';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api-client';
import {
  useCreateReview,
  useDeleteReview,
  useMyReview,
  useProductReviews,
  useRatingSummary,
  useUpdateReview,
  type ReviewListParams,
} from '@/hooks/use-reviews';

const SORT_OPTIONS: { value: NonNullable<ReviewListParams['sort']>; label: string }[] = [
  { value: 'newest', label: 'Most recent' },
  { value: 'rating_desc', label: 'Highest rated' },
  { value: 'rating_asc', label: 'Lowest rated' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Star-bucket bars, 5 → 1. Clicking one filters the list. */
function Distribution({
  distribution,
  total,
  active,
  onSelect,
}: {
  distribution: Record<string, number>;
  total: number;
  active?: number;
  onSelect: (rating?: number) => void;
}) {
  return (
    <div className="space-y-1">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[String(star)] ?? 0;
        const pct = total === 0 ? 0 : (count / total) * 100;
        return (
          <button
            key={star}
            type="button"
            disabled={count === 0}
            onClick={() => onSelect(active === star ? undefined : star)}
            className={`flex w-full items-center gap-2 rounded px-1 py-0.5 text-xs transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent ${
              active === star ? 'bg-muted font-medium' : ''
            }`}
          >
            <span className="w-8 shrink-0 text-left text-muted-foreground">
              {star} ★
            </span>
            <Progress value={pct} className="h-1.5 flex-1" />
            <span className="w-8 shrink-0 text-right text-muted-foreground">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const user = useAuthStore((s) => s.user);
  const isSignedIn = !!user;

  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<number | undefined>();
  const [sort, setSort] = useState<ReviewListParams['sort']>('newest');

  const { data: summary } = useRatingSummary(productId);
  const { data, isLoading } = useProductReviews(productId, {
    page,
    rating: ratingFilter,
    sort,
  });
  const { data: myReview } = useMyReview(productId, isSignedIn);

  const createReview = useCreateReview(productId);
  const updateReview = useUpdateReview(productId);
  const deleteReview = useDeleteReview(productId);

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // Load the existing review into the form so the CTA becomes an edit.
  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setTitle(myReview.title ?? '');
      setBody(myReview.body ?? '');
    }
  }, [myReview]);

  useEffect(() => {
    setPage(1);
  }, [ratingFilter, sort]);

  const reviews = data?.data ?? [];
  const meta = data?.meta;
  const saving = createReview.isPending || updateReview.isPending;

  const submit = async () => {
    if (rating < 1) {
      toast.error('Pick a star rating first');
      return;
    }
    const payload = {
      rating,
      title: title.trim() || undefined,
      body: body.trim() || undefined,
    };
    try {
      if (myReview) {
        await updateReview.mutateAsync({ id: myReview.id, payload });
        toast.success('Review updated');
      } else {
        await createReview.mutateAsync(payload);
        toast.success('Thanks for your review');
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not save review');
    }
  };

  const remove = async () => {
    if (!myReview) return;
    try {
      await deleteReview.mutateAsync(myReview.id);
      setRating(0);
      setTitle('');
      setBody('');
      toast.success('Review deleted');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not delete review');
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">
        Ratings &amp; reviews
      </h2>

      {/* Summary */}
      <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="text-center sm:text-left">
          <p className="text-4xl font-bold">
            {(summary?.average ?? 0).toFixed(1)}
          </p>
          <StarRating
            value={summary?.average ?? 0}
            className="mt-1 justify-center sm:justify-start"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {summary?.count ?? 0}{' '}
            {summary?.count === 1 ? 'review' : 'reviews'}
          </p>
        </div>
        {summary && summary.count > 0 && (
          <Distribution
            distribution={summary.distribution}
            total={summary.count}
            active={ratingFilter}
            onSelect={setRatingFilter}
          />
        )}
      </div>

      <Separator />

      {/* Write / edit */}
      {isSignedIn ? (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {myReview ? 'Your review' : 'Write a review'}
            </p>
            {myReview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={remove}
                disabled={deleteReview.isPending}
                className="h-auto px-2 py-1 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Delete
              </Button>
            )}
          </div>
          <StarRatingInput value={rating} onChange={setRating} disabled={saving} />
          <Input
            placeholder="Title (optional)"
            value={title}
            maxLength={160}
            onChange={(e) => setTitle(e.target.value)}
            disabled={saving}
          />
          <Textarea
            placeholder="What did you like or dislike? (optional)"
            value={body}
            maxLength={4000}
            rows={3}
            onChange={(e) => setBody(e.target.value)}
            disabled={saving}
          />
          <Button onClick={submit} disabled={saving} size="sm">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {myReview ? 'Update review' : 'Submit review'}
          </Button>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary underline">
            Sign in
          </Link>{' '}
          to write a review.
        </p>
      )}

      {/* List */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {ratingFilter ? `Showing ${ratingFilter}-star reviews` : 'All reviews'}
          {ratingFilter && (
            <Button
              variant="link"
              size="sm"
              className="h-auto px-1.5 py-0 text-xs"
              onClick={() => setRatingFilter(undefined)}
            >
              clear
            </Button>
          )}
        </p>
        <select
          value={sort}
          onChange={(e) =>
            setSort(e.target.value as ReviewListParams['sort'])
          }
          aria-label="Sort reviews"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No reviews yet. Be the first to review this product.
        </p>
      ) : (
        <ul className="space-y-5">
          {reviews.map((r) => (
            <li key={r.id} className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <StarRating value={r.rating} size="sm" />
                <span className="text-sm font-medium">{r.authorName}</span>
                {r.isVerifiedPurchase && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <ShieldCheck className="h-3 w-3" />
                    Verified purchase
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDate(r.createdAt)}
                </span>
              </div>
              {r.title && <p className="text-sm font-medium">{r.title}</p>}
              {r.body && (
                <p className="text-sm text-muted-foreground">{r.body}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {meta && meta.totalPages && meta.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {meta.page} / {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= (meta.totalPages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </section>
  );
}
