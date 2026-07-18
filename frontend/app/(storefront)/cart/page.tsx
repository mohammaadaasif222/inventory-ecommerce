import { getActiveTheme } from '@/lib/active-theme';
import { resolveTemplate } from '@/themes/resolver';
import { privateMetadata } from '@/lib/seo';

export function generateMetadata() {
  return privateMetadata('Cart');
}

export default async function CartPage() {
  const { slug } = await getActiveTheme();
  const Template = await resolveTemplate(slug, 'cart');
  return <Template />;
}
