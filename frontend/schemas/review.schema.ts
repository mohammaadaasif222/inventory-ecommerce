import { z } from 'zod';

export const reviewFormSchema = z.object({
  rating: z.coerce
    .number()
    .int()
    .min(1, 'Pick a star rating')
    .max(5),
  title: z.string().max(160).optional(),
  body: z.string().max(4000).optional(),
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;

/** Review shape returned by the API, with its author's public fields joined on. */
export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RatingSummary {
  average: number;
  count: number;
  /** Review count per star bucket, keyed '1'–'5'. */
  distribution: Record<string, number>;
}
