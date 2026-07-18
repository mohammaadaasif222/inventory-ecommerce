import { getActiveTheme } from '@/lib/active-theme';
import { resolveTemplate } from '@/themes/resolver';
import { privateMetadata } from '@/lib/seo';

export function generateMetadata() {
  return privateMetadata('Checkout');
}

/**
 * Checkout.
 *
 * Themed like any other page — the whole point being that checkout is never a
 * generic unstyled fallback. Its *rules* (stock revalidation, payment,
 * webhooks) stay in core and the API; only its presentation is the theme's.
 */
export default async function CheckoutPage() {
  const { slug } = await getActiveTheme();
  const Template = await resolveTemplate(slug, 'checkout');
  return <Template />;
}
