'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Tag, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useCouponStore } from '@/store/coupon-store';
import { useValidateCoupon } from '@/hooks/use-coupons';
import { formatPrice } from './product-card';

/**
 * Coupon entry for the cart. Validates against the server for a preview; the
 * authoritative discount is recomputed when the order is placed.
 */
export function CouponBox({
  subtotal,
  shippingTotal = 0,
  currency = 'INR',
}: {
  subtotal: number;
  shippingTotal?: number;
  currency?: string;
}) {
  const signedIn = useAuthStore((s) => !!s.user);
  const applied = useCouponStore((s) => s.applied);
  const apply = useCouponStore((s) => s.apply);
  const clear = useCouponStore((s) => s.clear);
  const validate = useValidateCoupon();
  const [code, setCode] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedIn) {
      toast.error('Sign in to use a coupon');
      return;
    }
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      const result = await validate.mutateAsync({
        code: trimmed,
        subtotal,
        shippingTotal,
      });
      apply(result);
      setCode('');
      toast.success(`${result.code} applied — you saved ${formatPrice(result.discount, currency)}`);
    } catch (err) {
      // The API returns a specific code per rejection reason; show its message.
      toast.error(
        err instanceof ApiError ? err.message : 'Could not apply that code',
      );
    }
  };

  return (
    <div className="space-y-2">
      <AnimatePresence mode="wait">
        {applied ? (
          <motion.div
            key="applied"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center justify-between rounded-sm border border-dashed border-brand bg-brand/10 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Tag className="h-3.5 w-3.5 text-brand" />
                {applied.code}
              </p>
              {applied.description ? (
                <p className="truncate text-xs text-muted-foreground">
                  {applied.description}
                </p>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              aria-label="Remove coupon"
              onClick={() => {
                clear();
                toast('Coupon removed', { icon: 'ℹ️' });
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="entry"
            onSubmit={submit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-2"
          >
            <Input
              placeholder="Coupon code"
              aria-label="Coupon code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="h-9 uppercase"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="h-9 shrink-0"
              disabled={validate.isPending || !code.trim()}
            >
              {validate.isPending && (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              )}
              Apply
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
