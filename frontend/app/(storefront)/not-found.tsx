import { getActiveTheme } from '@/lib/active-theme';
import { resolveTemplate } from '@/themes/resolver';

/**
 * Themed 404 for the storefront subtree.
 *
 * Lives inside the `(storefront)` group so it renders beneath that layout and
 * therefore inside `ThemeRuntime` — a 404 wearing the shop's palette rather
 * than an unstyled dead end. Unmatched URLs outside the group still fall to
 * the root `app/not-found.tsx`, which has no theme to apply.
 */
export default async function StorefrontNotFound() {
  const { slug } = await getActiveTheme();
  const Template = await resolveTemplate(slug, 'not-found');
  return <Template />;
}
